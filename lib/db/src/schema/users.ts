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
  // Chi nhanh duoc phan cong (cho manager/staff). Null = khong rang buoc (superadmin/admin/khach).
  branchId: integer("branch_id"),
  // Chi nhanh user dang ky lan dau (set 1 lan, khong doi)
  signupHotelId: integer("signup_hotel_id"),
  signupHotelSlug: text("signup_hotel_slug"),
  // Chi nhanh user vua dang nhap gan nhat (cap nhat moi lan login qua URL chi nhanh)
  lastLoginHotelId: integer("last_login_hotel_id"),
  lastLoginHotelSlug: text("last_login_hotel_slug"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserRoleSchema = createInsertSchema(userRolesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UserRoleRow = typeof userRolesTable.$inferSelect;
