import { pgTable, text, serial, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const guestsTable = pgTable(
  "guests",
  {
    id: serial("id").primaryKey(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    normalizedEmail: text("normalized_email").notNull(),
    normalizedPhone: text("normalized_phone").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    uniqEmail: uniqueIndex("guests_normalized_email_idx").on(t.normalizedEmail),
  }),
);

export function normalizeEmail(email: string): string {
  return (email ?? "").trim().toLowerCase();
}

export function normalizePhone(phone: string): string {
  return (phone ?? "").replace(/\D+/g, "");
}

export const insertGuestSchema = createInsertSchema(guestsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGuest = z.infer<typeof insertGuestSchema>;
export type Guest = typeof guestsTable.$inferSelect;
