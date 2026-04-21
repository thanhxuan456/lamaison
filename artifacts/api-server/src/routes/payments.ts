import { Router } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { bookingsTable, roomsTable, appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const MOMO_ENDPOINT =
  process.env["MOMO_ENDPOINT"] ?? "https://test-payment.momo.vn/v2/gateway/api/create";

async function getMomoConfig() {
  try {
    const [row] = await db
      .select()
      .from(appSettingsTable)
      .where(eq(appSettingsTable.key, "payment-settings"));
    const saved = (row?.value as any)?.momo ?? {};
    return {
      partnerCode: saved.partnerCode || process.env["MOMO_PARTNER_CODE"] || "MOMO",
      accessKey:   saved.accessKey   || process.env["MOMO_ACCESS_KEY"]   || "F8BBA842ECF85",
      secretKey:   saved.secretKey   || process.env["MOMO_SECRET_KEY"]   || "K951B6PE1waDMi640xX08PD3vg6EkVlz",
    };
  } catch {
    return {
      partnerCode: process.env["MOMO_PARTNER_CODE"] || "MOMO",
      accessKey:   process.env["MOMO_ACCESS_KEY"]   || "F8BBA842ECF85",
      secretKey:   process.env["MOMO_SECRET_KEY"]   || "K951B6PE1waDMi640xX08PD3vg6EkVlz",
    };
  }
}

async function getBankConfig() {
  try {
    const [row] = await db
      .select()
      .from(appSettingsTable)
      .where(eq(appSettingsTable.key, "payment-settings"));
    return (row?.value as any)?.bank ?? null;
  } catch {
    return null;
  }
}

function hmac(secret: string, raw: string): string {
  return crypto.createHmac("sha256", secret).update(raw).digest("hex");
}

/* ── GET /payments/settings — public, tells booking UI which methods are active ── */
router.get("/payments/settings", async (_req, res) => {
  try {
    const [row] = await db
      .select()
      .from(appSettingsTable)
      .where(eq(appSettingsTable.key, "payment-settings"));
    const cfg = (row?.value as any) ?? {};
    const momo = cfg.momo ?? {};
    const bank = cfg.bank ?? {};
    const payAtHotel = cfg.payAtHotel ?? {};
    res.json({
      momo: {
        enabled: !!(momo.enabled ?? false),
        configured: !!(momo.accessKey || process.env["MOMO_ACCESS_KEY"]),
      },
      bank: {
        enabled: !!(bank.enabled ?? true),
        bankCode: bank.bankCode ?? "VCB",
        accountNumber: bank.accountNumber ?? "",
        accountName: bank.accountName ?? "",
        defaultDescription: bank.defaultDescription ?? "Dat phong MAISON DELUXE",
      },
      payAtHotel: { enabled: !!payAtHotel.enabled },
      // KHONG tra ve secret cua cac webhook — chi tra ve enabled flag
    });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /payments/momo/create ── */
router.post("/payments/momo/create", async (req, res) => {
  try {
    const { bookingId } = req.body as { bookingId?: number };
    if (!bookingId) {
      res.status(400).json({ error: "bookingId is required" });
      return;
    }

    const [booking] = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, bookingId));

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    if (booking.status !== "pending_payment") {
      res.status(409).json({ error: "Booking is not awaiting payment" });
      return;
    }

    const cfg = await getMomoConfig();
    const { partnerCode, accessKey, secretKey } = cfg;

    const orderId = `GPHRS-${booking.id}-${Date.now()}`;
    const requestId = orderId;
    const amount = Math.round(parseFloat(booking.totalPrice));
    const orderInfo = `MAISON DELUXE – Đặt phòng #${booking.id.toString().padStart(6, "0")}`;
    const frontendBase = process.env["FRONTEND_URL"] ?? "http://localhost:3000";
    const apiBase = process.env["API_PUBLIC_URL"] ?? `http://localhost:${process.env["PORT"] ?? 8080}`;
    const redirectUrl = `${frontendBase}/bookings/${booking.id}`;
    const ipnUrl = `${apiBase}/api/payments/momo/ipn`;
    const requestType = "captureWallet";
    const extraData = Buffer.from(JSON.stringify({ bookingId: booking.id })).toString("base64");

    const rawSignature = [
      `accessKey=${accessKey}`,
      `amount=${amount}`,
      `extraData=${extraData}`,
      `ipnUrl=${ipnUrl}`,
      `orderId=${orderId}`,
      `orderInfo=${orderInfo}`,
      `partnerCode=${partnerCode}`,
      `redirectUrl=${redirectUrl}`,
      `requestId=${requestId}`,
      `requestType=${requestType}`,
    ].join("&");

    const payload = {
      partnerCode,
      accessKey,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      extraData,
      requestType,
      signature: hmac(secretKey, rawSignature),
      lang: "vi",
    };

    const momoRes = await fetch(MOMO_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const momoData = (await momoRes.json()) as {
      resultCode: number;
      message: string;
      payUrl?: string;
      qrCodeUrl?: string;
      deeplink?: string;
    };

    if (momoData.resultCode !== 0) {
      req.log.error({ momoData }, "MoMo payment creation failed");
      res.status(502).json({ error: "MoMo payment creation failed", detail: momoData.message });
      return;
    }

    res.json({
      payUrl: momoData.payUrl,
      qrCodeUrl: momoData.qrCodeUrl,
      deeplink: momoData.deeplink,
      orderId,
      amount,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create MoMo payment");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ── POST /payments/momo/ipn ── */
router.post("/payments/momo/ipn", async (req, res) => {
  try {
    const {
      partnerCode,
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature,
    } = req.body as Record<string, string | number>;

    const { accessKey, secretKey } = await getMomoConfig();

    const rawSignature = [
      `accessKey=${accessKey}`,
      `amount=${amount}`,
      `extraData=${extraData}`,
      `message=${message}`,
      `orderId=${orderId}`,
      `orderInfo=${orderInfo}`,
      `orderType=${orderType}`,
      `partnerCode=${partnerCode}`,
      `payType=${payType}`,
      `requestId=${requestId}`,
      `responseTime=${responseTime}`,
      `resultCode=${resultCode}`,
      `transId=${transId}`,
    ].join("&");

    if (signature !== hmac(secretKey, rawSignature)) {
      req.log.warn({ orderId }, "MoMo IPN signature mismatch");
      res.status(400).json({ error: "Invalid signature" });
      return;
    }

    if (Number(resultCode) !== 0) {
      req.log.info({ orderId, resultCode, message }, "MoMo IPN — payment not successful");
      res.json({ message: "Payment not successful" });
      return;
    }

    const extra = JSON.parse(Buffer.from(String(extraData), "base64").toString("utf8")) as {
      bookingId: number;
    };
    const bookingId = extra.bookingId;

    const [booking] = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, bookingId));

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    await db
      .update(bookingsTable)
      .set({ status: "confirmed", externalRef: String(transId) })
      .where(eq(bookingsTable.id, bookingId));

    await db
      .update(roomsTable)
      .set({ isAvailable: false, status: "reserved" })
      .where(eq(roomsTable.id, booking.roomId));

    try {
      const { upsertInvoiceForBooking } = await import("./invoices");
      await upsertInvoiceForBooking(bookingId);
    } catch (invErr) {
      req.log.warn({ err: invErr }, "Auto-invoice generation failed (non-fatal)");
    }

    req.log.info({ bookingId, transId }, "MoMo payment confirmed");
    res.json({ message: "Payment confirmed" });
  } catch (err) {
    req.log.error({ err }, "Failed to process MoMo IPN");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ============================================================================
//  AUTO-CONFIRM WEBHOOKS — SMS forwarder, Casso/SePay, Email parser
//  Cac endpoint nay nhan thong bao tu cac nguon ngoai (app forward SMS,
//  Casso/SePay, email parser) va tu dong xac nhan booking khi match.
// ============================================================================

async function getAutoConfirmCfg() {
  const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, "payment-settings"));
  return ((row?.value as any)?.autoConfirm ?? {}) as {
    sms?:   { enabled?: boolean; secret?: string };
    casso?: { enabled?: boolean; secret?: string };
    email?: { enabled?: boolean; secret?: string };
  };
}

function checkSecret(provided: string | undefined, expected: string | undefined): boolean {
  if (!expected) return false;
  if (!provided) return false;
  if (provided.length !== expected.length) return false;
  try { return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected)); }
  catch { return false; }
}

function extractBearerOrHeader(req: any): string | undefined {
  const auth = req.header("authorization") ?? req.header("Authorization");
  if (auth && /^Bearer\s+/i.test(auth)) return auth.replace(/^Bearer\s+/i, "").trim();
  return req.header("x-webhook-secret") ?? req.header("X-Webhook-Secret") ?? undefined;
}

/* ── POST /payments/sms-webhook ──
 * Universal SMS forwarder endpoint.
 * Body chap nhan: { message: string, from?: string } HOAC raw text body.
 * Auth: Authorization: Bearer <secret>  HOAC  X-Webhook-Secret: <secret>
 *
 * Cach dung: cai app SMS Forwarder (Android) tro toi URL nay, copy secret tu admin UI.
 * Khi co SMS bien dong so du tu ngan hang, app POST den day. Server parse "MDH<id>" + so tien,
 * match booking va tu confirm.
 */
router.post("/payments/sms-webhook", async (req, res) => {
  try {
    const cfg = await getAutoConfirmCfg();
    if (!cfg.sms?.enabled) { res.status(403).json({ error: "SMS webhook disabled" }); return; }
    if (!checkSecret(extractBearerOrHeader(req), cfg.sms.secret)) {
      res.status(401).json({ error: "Invalid secret" });
      return;
    }

    const body = req.body ?? {};
    const message: string = typeof body === "string" ? body : (body.message ?? body.text ?? body.body ?? "");
    if (!message) { res.status(400).json({ error: "message field required" }); return; }

    const { parseBankSms, confirmBookingPayment } = await import("../lib/confirm-payment");
    const parsed = parseBankSms(message);
    const externalRef = `SMS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const result = await confirmBookingPayment({
      bookingId: parsed.bookingId,
      source: "sms",
      externalRef,
      amount: parsed.amount,
      rawPayload: { message, from: body.from, parsed },
    });

    req.log.info({ result, parsed }, "SMS webhook processed");
    res.status(result.ok ? 200 : 422).json(result);
  } catch (err: any) {
    req.log.error({ err }, "SMS webhook error");
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

/* ── POST /payments/casso-webhook ──
 * Nhan webhook tu Casso (https://docs.casso.vn) HOAC SePay (https://docs.sepay.vn).
 * Tu dong nhan dien format theo body shape.
 * Auth: Authorization: Apikey <secret> (Casso) HOAC X-Webhook-Secret (SePay)
 */
router.post("/payments/casso-webhook", async (req, res) => {
  try {
    const cfg = await getAutoConfirmCfg();
    if (!cfg.casso?.enabled) { res.status(403).json({ error: "Casso webhook disabled" }); return; }

    // Casso dung "Authorization: Apikey <token>", SePay dung header tuy bien
    const authHeader = req.header("authorization") ?? req.header("Authorization") ?? "";
    const apikeyMatch = authHeader.match(/^Apikey\s+(.+)$/i);
    const provided = apikeyMatch ? apikeyMatch[1].trim() : extractBearerOrHeader(req);
    if (!checkSecret(provided, cfg.casso.secret)) {
      res.status(401).json({ error: "Invalid secret" });
      return;
    }

    const body = req.body ?? {};
    const { parseBankSms, confirmBookingPayment } = await import("../lib/confirm-payment");
    const results: any[] = [];

    // Casso format: { error, data: [{ tid, description, amount, ... }] }
    if (Array.isArray(body.data)) {
      for (const tx of body.data) {
        const description = tx.description ?? tx.content ?? "";
        const amount = Number(tx.amount ?? tx.transferAmount ?? 0);
        const externalRef = `CASSO-${tx.tid ?? tx.id ?? Date.now()}`;
        const parsed = parseBankSms(description);
        const r = await confirmBookingPayment({
          bookingId: parsed.bookingId,
          source: "casso",
          externalRef,
          amount,
          rawPayload: tx,
        });
        results.push(r);
      }
    }
    // SePay flat format: { id, content, transferAmount, transferType, referenceCode, ... }
    else if (body.content || body.transferAmount != null) {
      if (body.transferType && body.transferType !== "in") {
        res.json({ ok: true, ignored: "Not an incoming transfer" });
        return;
      }
      const description = String(body.content ?? body.description ?? body.code ?? "");
      const amount = Number(body.transferAmount ?? body.amount ?? 0);
      const externalRef = `SEPAY-${body.referenceCode ?? body.id ?? Date.now()}`;
      const parsed = parseBankSms(description);
      const r = await confirmBookingPayment({
        bookingId: parsed.bookingId ?? Number(body.code) ?? null,
        source: "sepay",
        externalRef,
        amount,
        rawPayload: body,
      });
      results.push(r);
    } else {
      res.status(400).json({ error: "Unknown payload format (need Casso 'data' array or SePay flat object)" });
      return;
    }

    req.log.info({ count: results.length }, "Casso/SePay webhook processed");
    res.json({ ok: true, results });
  } catch (err: any) {
    req.log.error({ err }, "Casso webhook error");
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

/* ── POST /payments/email-webhook ──
 * Nhan email forward (vd: tu Gmail filter -> Cloudflare Email Worker -> POST den day).
 * Body: { subject?, body, from? }  hoac raw text.
 * Auth: Authorization: Bearer <secret>  HOAC  X-Webhook-Secret: <secret>
 */
router.post("/payments/email-webhook", async (req, res) => {
  try {
    const cfg = await getAutoConfirmCfg();
    if (!cfg.email?.enabled) { res.status(403).json({ error: "Email webhook disabled" }); return; }
    if (!checkSecret(extractBearerOrHeader(req), cfg.email.secret)) {
      res.status(401).json({ error: "Invalid secret" });
      return;
    }

    const body = req.body ?? {};
    const text: string = typeof body === "string" ? body :
      [body.subject, body.body, body.text, body.html].filter(Boolean).join("\n");
    if (!text) { res.status(400).json({ error: "body field required" }); return; }

    const { parseBankSms, confirmBookingPayment } = await import("../lib/confirm-payment");
    const parsed = parseBankSms(text.replace(/<[^>]+>/g, " ")); // strip HTML
    const externalRef = `EMAIL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const result = await confirmBookingPayment({
      bookingId: parsed.bookingId,
      source: "email",
      externalRef,
      amount: parsed.amount,
      rawPayload: { from: body.from, subject: body.subject, parsed, snippet: text.slice(0, 500) },
    });

    req.log.info({ result, parsed }, "Email webhook processed");
    res.status(result.ok ? 200 : 422).json(result);
  } catch (err: any) {
    req.log.error({ err }, "Email webhook error");
    res.status(500).json({ error: err.message ?? "Internal server error" });
  }
});

/* ── POST /payments/pay-at-hotel  (alias: /payments/internal/confirm) ──
 * "Dat giu cho — Tra tien khi den khach san". Khong yeu cau thanh toan online.
 * Phai duoc admin bat trong setting payAtHotel.enabled — neu khong se 403.
 */
async function payAtHotelHandler(req: any, res: any) {
  try {
    const { bookingId, confirmToken } = req.body as { bookingId?: number; confirmToken?: string };
    if (!bookingId || !Number.isFinite(Number(bookingId))) {
      res.status(400).json({ error: "bookingId is required" });
      return;
    }
    if (!confirmToken || typeof confirmToken !== "string") {
      res.status(400).json({ error: "confirmToken is required" });
      return;
    }

    const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, "payment-settings"));
    const enabled = !!((row?.value as any)?.payAtHotel?.enabled);
    if (!enabled) {
      res.status(403).json({ error: "Pay-at-hotel is disabled by admin" });
      return;
    }

    // Verify confirmToken against the booking (constant-time compare).
    const [bk] = await db.select({ token: bookingsTable.confirmToken }).from(bookingsTable).where(eq(bookingsTable.id, Number(bookingId)));
    const stored = bk?.token ?? "";
    const a = Buffer.from(stored);
    const b = Buffer.from(confirmToken);
    if (!stored || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      res.status(403).json({ error: "Invalid confirm token" });
      return;
    }

    const { confirmBookingPayment } = await import("../lib/confirm-payment");
    const result = await confirmBookingPayment({
      bookingId: Number(bookingId),
      source: "pay_at_hotel",
      externalRef: `PAH-${Date.now()}`,
      skipAmountCheck: true,
      rawPayload: { ip: req.ip, ua: req.header("user-agent") },
    });

    req.log.info({ result }, "Pay-at-hotel attempt");
    res.status(result.ok ? 200 : 422).json({
      message: result.message,
      bookingId: result.bookingId,
      alreadyConfirmed: result.status === "duplicate",
    });
  } catch (err) {
    req.log.error({ err }, "Pay-at-hotel failed");
    res.status(500).json({ error: "Internal server error" });
  }
}
router.post("/payments/pay-at-hotel", payAtHotelHandler);
router.post("/payments/internal/confirm", payAtHotelHandler); // backward compat

/* ── POST /payments/bank/confirm — admin manually confirms a bank transfer ── */
router.post("/payments/bank/confirm", async (req, res) => {
  try {
    const { bookingId, transRef } = req.body as { bookingId?: number; transRef?: string };
    if (!bookingId) {
      res.status(400).json({ error: "bookingId is required" });
      return;
    }

    const [booking] = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.id, bookingId));

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    if (booking.status !== "pending_payment" && booking.status !== "pending") {
      res.status(409).json({ error: "Booking is not awaiting payment" });
      return;
    }

    await db
      .update(bookingsTable)
      .set({
        status: "confirmed",
        externalRef: transRef ? `BANK-${transRef}` : `BANK-MANUAL-${Date.now()}`,
      })
      .where(eq(bookingsTable.id, bookingId));

    try {
      const { upsertInvoiceForBooking } = await import("./invoices");
      await upsertInvoiceForBooking(bookingId);
    } catch (invErr) {
      req.log.warn({ err: invErr }, "Auto-invoice generation failed (non-fatal)");
    }

    req.log.info({ bookingId, transRef }, "Bank transfer confirmed by admin");
    res.json({ message: "Bank transfer confirmed" });
  } catch (err) {
    req.log.error({ err }, "Failed to confirm bank transfer");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
