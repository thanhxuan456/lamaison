import { pgTable, text, serial, integer, decimal, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bookingsTable } from "./bookings";

export interface OrderLine {
  menuItemId: number;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export const roomOrdersTable = pgTable("room_orders", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookingsTable.id).notNull(),
  items: jsonb("items").$type<OrderLine[]>().notNull().default([]),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending | preparing | delivered | cancelled
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRoomOrderSchema = createInsertSchema(roomOrdersTable).omit({ id: true, createdAt: true });
export type InsertRoomOrder = z.infer<typeof insertRoomOrderSchema>;
export type RoomOrder = typeof roomOrdersTable.$inferSelect;
