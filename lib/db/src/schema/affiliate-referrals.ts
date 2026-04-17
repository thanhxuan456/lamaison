import { pgTable, text, serial, integer, decimal, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bookingsTable } from "./bookings";

export const REFERRAL_STATUSES = ["pending", "qualified", "rejected"] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

export const affiliateReferralsTable = pgTable(
  "affiliate_referrals",
  {
    id: serial("id").primaryKey(),
    affiliateClerkId: text("affiliate_clerk_id").notNull(),
    referralCode: text("referral_code").notNull(),
    referredEmail: text("referred_email").notNull(),
    referredName: text("referred_name"),
    bookingId: integer("booking_id").references(() => bookingsTable.id),
    status: text("status").notNull().default("pending"),
    bookingTotal: decimal("booking_total", { precision: 12, scale: 2 }).default("0"),
    commission: decimal("commission", { precision: 12, scale: 2 }).default("0"),
    qualifiedAt: timestamp("qualified_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    uniqBooking: uniqueIndex("affiliate_referrals_booking_idx").on(t.bookingId),
  }),
);

export const insertAffiliateReferralSchema = createInsertSchema(affiliateReferralsTable).omit({ id: true, createdAt: true, qualifiedAt: true });
export type InsertAffiliateReferral = z.infer<typeof insertAffiliateReferralSchema>;
export type AffiliateReferral = typeof affiliateReferralsTable.$inferSelect;
