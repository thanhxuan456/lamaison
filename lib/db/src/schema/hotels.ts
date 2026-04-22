import { pgTable, text, serial, integer, decimal, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const hotelsTable = pgTable("hotels", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().default(""),
  name: text("name").notNull(),
  location: text("location").notNull(),
  city: text("city").notNull(),
  address: text("address").notNull(),
  description: text("description").notNull(),
  rating: decimal("rating", { precision: 3, scale: 1 }).notNull(),
  imageUrl: text("image_url").notNull(),
  amenities: text("amenities").array().notNull().default([]),
  priceFrom: decimal("price_from", { precision: 10, scale: 2 }).notNull(),
  totalRooms: integer("total_rooms").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  layoutTemplate: text("layout_template").notNull().default("classic"),
  // Noi dung HTML tuy bien cua trang chi nhanh — admin soan bang Tiptap (WYSIWYG),
  // luu duoi dang HTML thuan (KHONG phai JSON), san sang chen vao template + sanitize truoc khi render.
  pageHtml: text("page_html").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const HOTEL_LAYOUT_TEMPLATES = ["classic", "magazine", "modern"] as const;
export type HotelLayoutTemplate = (typeof HOTEL_LAYOUT_TEMPLATES)[number];

export const insertHotelSchema = createInsertSchema(hotelsTable, {
  layoutTemplate: z.enum(HOTEL_LAYOUT_TEMPLATES).default("classic"),
}).omit({ id: true, createdAt: true });
export type InsertHotel = z.infer<typeof insertHotelSchema>;
export type Hotel = typeof hotelsTable.$inferSelect;
