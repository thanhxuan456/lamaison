import { pgTable, text, serial, integer, decimal, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { roomsTable } from "./rooms";
import { hotelsTable } from "./hotels";
import { guestsTable } from "./guests";

export const bookingsTable = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    roomId: integer("room_id").references(() => roomsTable.id).notNull(),
    hotelId: integer("hotel_id").references(() => hotelsTable.id).notNull(),
    guestId: integer("guest_id").references(() => guestsTable.id),
    guestName: text("guest_name").notNull(),
    guestEmail: text("guest_email").notNull(),
    guestPhone: text("guest_phone").notNull(),
    checkInDate: text("check_in_date").notNull(),
    checkOutDate: text("check_out_date").notNull(),
    numberOfGuests: integer("number_of_guests").notNull(),
    specialRequests: text("special_requests"),
    status: text("status").notNull().default("confirmed"),
    source: text("source").notNull().default("web"),
    externalRef: text("external_ref"),
    confirmToken: text("confirm_token"),
    checkedInAt: timestamp("checked_in_at"),
    checkedOutAt: timestamp("checked_out_at"),
    totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    uniqExternal: uniqueIndex("bookings_source_external_ref_idx").on(t.source, t.externalRef),
  }),
);

export const BOOKING_STATUSES = ["pending", "confirmed", "checked_in", "checked_out", "cancelled", "no_show"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const BOOKING_SOURCES = ["web", "walk_in", "booking_com", "agoda", "expedia", "airbnb", "traveloka", "trip_com", "klook", "tripadvisor"] as const;
export type BookingSource = (typeof BOOKING_SOURCES)[number];

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({ id: true, createdAt: true, status: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
