import { pgTable, text, serial, integer, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * branch_pages — Luu noi dung va layout template cua tung trang menu (spa, about, contact...)
 * theo tung chi nhanh (hotel). Neu khong co row tuong ung, FE dung default template + content cung.
 *
 * Unique constraint (hotel_id, page_slug) dam bao 1 trang/chi nhanh chi co 1 ban override.
 */
export const PAGE_SLUGS = ["spa", "about", "contact", "rooms", "news"] as const;
export type PageSlug = typeof PAGE_SLUGS[number];

export const branchPagesTable = pgTable(
  "branch_pages",
  {
    id: serial("id").primaryKey(),
    hotelId: integer("hotel_id").notNull(),
    pageSlug: text("page_slug").notNull(), // 'spa' | 'about' | 'contact' ...
    layoutTemplate: text("layout_template").notNull().default("classic"),
    // JSONB chua noi dung tuy bien — schema rieng cho moi pageSlug, FE tu validate.
    content: jsonb("content").notNull().default({}),
    // Toggle bat/tat override. Khi false, FE dung default cung.
    enabled: integer("enabled").notNull().default(1),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    hotelPageUq: uniqueIndex("branch_pages_hotel_page_uq").on(t.hotelId, t.pageSlug),
  }),
);

export const insertBranchPageSchema = createInsertSchema(branchPagesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertBranchPage = z.infer<typeof insertBranchPageSchema>;
export type BranchPageRow = typeof branchPagesTable.$inferSelect;
