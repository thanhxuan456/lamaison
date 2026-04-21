import { pgTable, serial, integer, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";

/**
 * payment_attempts — audit log moi attempt xac nhan thanh toan tu cac source khac nhau
 * (sms, casso, sepay, email, pay_at_hotel, admin_manual, momo).
 * Dung de debug, doi soat, va detect duplicate (theo external_ref).
 */
export const paymentAttemptsTable = pgTable(
  "payment_attempts",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id"), // null neu khong match duoc booking
    source: text("source").notNull(), // 'sms' | 'casso' | 'sepay' | 'email' | 'pay_at_hotel' | 'admin_manual' | 'momo' | 'internal'
    status: text("status").notNull(), // 'success' | 'duplicate' | 'no_match' | 'amount_mismatch' | 'expired' | 'unauthorized' | 'error'
    externalRef: text("external_ref"), // ID giao dich tu nguon ngoai (transId, casso.tid, sepay.referenceCode...)
    amount: integer("amount"), // VND
    rawPayload: jsonb("raw_payload"), // luu nguyen payload de debug
    note: text("note"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    extRefIdx: index("payment_attempts_ext_ref_idx").on(t.externalRef),
    bookingIdx: index("payment_attempts_booking_idx").on(t.bookingId),
    createdIdx: index("payment_attempts_created_idx").on(t.createdAt),
  }),
);

export type PaymentAttemptRow = typeof paymentAttemptsTable.$inferSelect;
export type InsertPaymentAttempt = typeof paymentAttemptsTable.$inferInsert;
