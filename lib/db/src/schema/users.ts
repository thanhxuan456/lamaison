import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const USER_ROLES = ["superadmin", "admin", "manager", "staff", "affiliate", "vip", "guest"] as const;
export type UserRole = typeof USER_ROLES[number];

export const userRolesTable = pgTable("user_roles", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  role: text("role").notNull().default("guest"),
  affiliateCode: text("affiliate_code"),
  commissionRate: integer("commission_rate").default(5),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserRoleSchema = createInsertSchema(userRolesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UserRoleRow = typeof userRolesTable.$inferSelect;
