import { db } from "@workspace/db";
import { bookingsTable, roomsTable, paymentAttemptsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";

export type PaymentSource =
  | "sms"
  | "casso"
  | "sepay"
  | "email"
  | "pay_at_hotel"
  | "admin_manual"
  | "momo"
  | "internal";

export type ConfirmStatus =
  | "success"
  | "duplicate"
  | "no_match"
  | "amount_mismatch"
  | "expired"
  | "wrong_status"
  | "error";

interface ConfirmInput {
  bookingId: number | null;
  source: PaymentSource;
  externalRef?: string | null;
  amount?: number | null;
  rawPayload?: unknown;
  /** Neu true, bo qua kiem tra so tien (vd: pay_at_hotel) */
  skipAmountCheck?: boolean;
}

interface ConfirmResult {
  ok: boolean;
  status: ConfirmStatus;
  bookingId?: number;
  message: string;
  attemptId?: number;
}

/**
 * Confirm payment cho 1 booking + log lai vao payment_attempts.
 * Idempotent — duplicate externalRef se khong confirm lai.
 */
export async function confirmBookingPayment(input: ConfirmInput): Promise<ConfirmResult> {
  const { bookingId, source, externalRef, amount, rawPayload, skipAmountCheck } = input;

  async function logAttempt(status: ConfirmStatus, note: string, matchedBookingId?: number | null) {
    try {
      const [row] = await db.insert(paymentAttemptsTable).values({
        bookingId: matchedBookingId ?? bookingId ?? null,
        source,
        status,
        externalRef: externalRef ?? null,
        amount: amount ?? null,
        rawPayload: (rawPayload as any) ?? null,
        note,
      }).returning({ id: paymentAttemptsTable.id });
      return row?.id;
    } catch {
      return undefined;
    }
  }

  // 1) Duplicate detection — neu externalRef da co status=success thi bo qua
  if (externalRef) {
    const dup = await db
      .select({ id: paymentAttemptsTable.id, bookingId: paymentAttemptsTable.bookingId })
      .from(paymentAttemptsTable)
      .where(and(
        eq(paymentAttemptsTable.externalRef, externalRef),
        eq(paymentAttemptsTable.status, "success"),
      ));
    if (dup.length > 0) {
      const attemptId = await logAttempt("duplicate", `External ref ${externalRef} already confirmed`, dup[0].bookingId);
      return { ok: true, status: "duplicate", bookingId: dup[0].bookingId ?? undefined, message: "Already confirmed (duplicate)", attemptId };
    }
  }

  if (!bookingId || !Number.isFinite(bookingId)) {
    const attemptId = await logAttempt("no_match", "No booking matched");
    return { ok: false, status: "no_match", message: "Khong tim thay don dat phong khop", attemptId };
  }

  // 2) Load booking
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
  if (!booking) {
    const attemptId = await logAttempt("no_match", `Booking ${bookingId} not found`);
    return { ok: false, status: "no_match", message: "Booking not found", attemptId };
  }

  // 3) Idempotent: neu da confirm thi return success (cho FE redirect)
  if (booking.status === "confirmed" || booking.status === "checked_in" || booking.status === "checked_out") {
    const attemptId = await logAttempt("duplicate", "Booking already confirmed", booking.id);
    return { ok: true, status: "duplicate", bookingId: booking.id, message: "Booking already confirmed", attemptId };
  }

  if (booking.status !== "pending_payment" && booking.status !== "pending") {
    const attemptId = await logAttempt("wrong_status", `Booking status is ${booking.status}`, booking.id);
    return { ok: false, status: "wrong_status", bookingId: booking.id, message: `Booking khong o trang thai cho thanh toan (${booking.status})`, attemptId };
  }

  // 4) 24h expiry
  const createdAt = booking.createdAt ? new Date(booking.createdAt).getTime() : 0;
  if (createdAt && Date.now() - createdAt > 24 * 60 * 60 * 1000) {
    const attemptId = await logAttempt("expired", "Booking older than 24h", booking.id);
    return { ok: false, status: "expired", bookingId: booking.id, message: "Booking da het han, vui long tao moi", attemptId };
  }

  // 5) Amount check (cho phep sai lech 1% do round-off)
  const expected = Number(booking.totalPrice ?? 0);
  if (!skipAmountCheck && (amount == null || !Number.isFinite(Number(amount)))) {
    const attemptId = await logAttempt(
      "amount_mismatch",
      `Amount missing/invalid for ${source}; expected ${expected} VND`,
      booking.id,
    );
    return {
      ok: false, status: "amount_mismatch", bookingId: booking.id,
      message: `Khong xac dinh duoc so tien giao dich (can ${expected} VND)`, attemptId,
    };
  }
  if (!skipAmountCheck && amount != null && expected > 0) {
    const tolerance = Math.max(1000, expected * 0.01);
    if (Number(amount) < expected - tolerance) {
      const attemptId = await logAttempt(
        "amount_mismatch",
        `Received ${amount} VND, expected ${expected} VND`,
        booking.id,
      );
      return {
        ok: false, status: "amount_mismatch", bookingId: booking.id,
        message: `So tien khong khop: nhan ${amount}, can ${expected}`, attemptId,
      };
    }
  }

  // 6) Update booking + room
  const refToStore = externalRef ?? `${source.toUpperCase()}-${Date.now()}`;
  await db
    .update(bookingsTable)
    .set({ status: "confirmed", externalRef: refToStore })
    .where(eq(bookingsTable.id, booking.id));

  await db
    .update(roomsTable)
    .set({ isAvailable: false, status: "reserved" })
    .where(eq(roomsTable.id, booking.roomId));

  // 7) Auto-invoice
  try {
    const { upsertInvoiceForBooking } = await import("../routes/invoices");
    await upsertInvoiceForBooking(booking.id);
  } catch {
    // non-fatal
  }

  const attemptId = await logAttempt("success", `Confirmed via ${source}`, booking.id);
  return { ok: true, status: "success", bookingId: booking.id, message: "Payment confirmed", attemptId };
}

/**
 * Parse SMS bank message de tim bookingId va so tien.
 * Ho tro nhieu format pho bien cua ngan hang VN.
 */
export function parseBankSms(message: string): { bookingId: number | null; amount: number | null; matchType: string } {
  if (!message || typeof message !== "string") return { bookingId: null, amount: null, matchType: "empty" };
  const text = message.replace(/\s+/g, " ").trim();

  // Booking ID: tim "MDH<digits>", "DAT<digits>", "BOOK<digits>", "BOOKING<digits>", "MD<digits>"
  let bookingId: number | null = null;
  let matchType = "none";
  const idPatterns: { re: RegExp; tag: string }[] = [
    { re: /\bMDH[\s.-]?(\d{1,9})\b/i,     tag: "MDH" },
    { re: /\bMD[\s.-]?(\d{1,9})\b/i,      tag: "MD" },
    { re: /\bBOOKING[\s.-]?(\d{1,9})\b/i, tag: "BOOKING" },
    { re: /\bBOOK[\s.-]?(\d{1,9})\b/i,    tag: "BOOK" },
    { re: /\bDAT[\s.-]?(\d{1,9})\b/i,     tag: "DAT" },
  ];
  for (const { re, tag } of idPatterns) {
    const m = text.match(re);
    if (m) { bookingId = parseInt(m[1], 10); matchType = tag; break; }
  }

  // Amount: tim "+1500000VND", "+1,500,000 VND", "1.500.000 VND", "+1500000.00"
  let amount: number | null = null;
  // Patterns uu tien dau "+" (tien vao)
  const amountPatterns: RegExp[] = [
    /(?:^|\s)\+([\d.,]+)\s*VND/i,
    /(?:^|\s)\+([\d.,]+)(?=\s|$)/,
    /([\d.,]+)\s*VND/i,
    /SO\s*TIEN[:\s]+([\d.,]+)/i,
  ];
  for (const re of amountPatterns) {
    const m = text.match(re);
    if (m) {
      const cleaned = m[1].replace(/[.,](?=\d{3}\b)/g, "").replace(",", ".");
      const num = Math.round(parseFloat(cleaned));
      if (!isNaN(num) && num > 0) { amount = num; break; }
    }
  }

  return { bookingId, amount, matchType };
}
