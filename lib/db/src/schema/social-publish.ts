import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const socialPublishLogTable = pgTable("social_publish_log", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull(),
  platform: text("platform").notNull(),
  status: text("status").notNull(),
  externalId: text("external_id"),
  externalUrl: text("external_url"),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SocialPublishLog = typeof socialPublishLogTable.$inferSelect;
