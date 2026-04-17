import { pgTable, text, serial, integer, decimal, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { hotelsTable } from "./hotels";

export const roomsTable = pgTable("rooms", {
  id: serial("id").primaryKey(),
  hotelId: integer("hotel_id").references(() => hotelsTable.id).notNull(),
  roomNumber: text("room_number").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  pricePerNight: decimal("price_per_night", { precision: 10, scale: 2 }).notNull(),
  capacity: integer("capacity").notNull(),
  imageUrl: text("image_url").notNull(),
  amenities: text("amenities").array().notNull().default([]),
  isAvailable: boolean("is_available").notNull().default(true),
  status: text("status").notNull().default("available"),
  floor: integer("floor").notNull(),
  view: text("view").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const ROOM_STATUSES = ["available", "reserved", "occupied", "cleaning", "maintenance"] as const;
export type RoomStatus = (typeof ROOM_STATUSES)[number];

export const insertRoomSchema = createInsertSchema(roomsTable).omit({ id: true, createdAt: true });
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof roomsTable.$inferSelect;
