import { pgTable, varchar, text, timestamp, jsonb } from "drizzle-orm/pg-core";

// CMS pages (gioi thieu, ve chung toi, dich vu...) - quan ly trong /admin/pages.
// Khac voi branch_pages (gan voi tung khach san) va blog_posts (bai bao).
export const pagesTable = pgTable("pages", {
  id: varchar("id", { length: 80 }).primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  content: text("content").notNull().default(""),
  // puckData: JSON output cua trinh keo-tha Puck. Neu co thi uu tien render thay vi `content`.
  puckData: jsonb("puck_data"),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  metaTitle: varchar("meta_title", { length: 300 }).notNull().default(""),
  metaDesc: text("meta_desc").notNull().default(""),
  ogImage: text("og_image").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Page = typeof pagesTable.$inferSelect;
export type NewPage = typeof pagesTable.$inferInsert;
