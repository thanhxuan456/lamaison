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
        defaultDescription: bank.defaultDescription ?? "Dat phong Grand Palace",
      },
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
    const orderInfo = `Grand Palace – Đặt phòng #${booking.id.toString().padStart(6, "0")}`;
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
