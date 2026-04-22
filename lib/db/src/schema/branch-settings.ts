import { pgTable, serial, integer, jsonb, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * branch_settings - cau hinh tong the cho tung chi nhanh.
 * Moi chi nhanh chi co 1 row (unique tren hotel_id). Tat ca section luu
 * duoi dang JSONB rieng -> de mo rong them truong moi ma khong can migrate.
 */
export const branchSettingsTable = pgTable(
  "branch_settings",
  {
    id: serial("id").primaryKey(),
    hotelId: integer("hotel_id").notNull(),
    branding: jsonb("branding").notNull().default({}),  // logo, mau, font, banner
    contact: jsonb("contact").notNull().default({}),    // hotline, email, dia chi, gio mo cua
    payment: jsonb("payment").notNull().default({}),    // momo, bank, qr code rieng
    layout: jsonb("layout").notNull().default({}),      // template, hero variant
    seo: jsonb("seo").notNull().default({}),            // title, desc, og image
    features: jsonb("features").notNull().default({}),  // toggle module: spa, gym, pool...
    social: jsonb("social").notNull().default({}),      // FB, IG, TikTok links
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    hotelUq: uniqueIndex("branch_settings_hotel_uq").on(t.hotelId),
  }),
);

// Zod schema cho tung section (linh hoat - cho phep them field bat ki)
export const brandingSchema = z.object({
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  primaryColor: z.string().optional(),     // HEX vd #d4a64e
  accentColor: z.string().optional(),
  bgGradient: z.string().optional(),       // tailwind class vd "from-amber-50 to-white"
  fontHeading: z.string().optional(),      // CSS font-family
  fontBody: z.string().optional(),
  bannerUrl: z.string().optional(),
  tagline: z.string().optional(),
}).passthrough();

export const contactSchema = z.object({
  hotline: z.string().optional(),
  hotline2: z.string().optional(),
  email: z.string().optional(),
  emailBooking: z.string().optional(),
  address: z.string().optional(),
  mapUrl: z.string().optional(),           // Google Maps embed
  hours: z.string().optional(),            // "24/7" hoac "08:00-22:00"
  hoursDetail: z.string().optional(),
}).passthrough();

export const paymentSchema = z.object({
  acceptCash: z.boolean().optional(),
  acceptCard: z.boolean().optional(),
  acceptMomo: z.boolean().optional(),
  acceptBank: z.boolean().optional(),
  momoPhone: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankHolder: z.string().optional(),
  qrImageUrl: z.string().optional(),
}).passthrough();

export const layoutSchema = z.object({
  template: z.enum(["classic", "magazine", "modern"]).optional(),
  heroStyle: z.enum(["video", "image", "carousel"]).optional(),
  showBookingBar: z.boolean().optional(),
  cornerStyle: z.enum(["sharp", "rounded", "soft"]).optional(),
}).passthrough();

export const seoSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  keywords: z.string().optional(),
  ogImage: z.string().optional(),
}).passthrough();

export const featuresSchema = z.object({
  spa: z.boolean().optional(),
  gym: z.boolean().optional(),
  pool: z.boolean().optional(),
  restaurant: z.boolean().optional(),
  bar: z.boolean().optional(),
  laundry: z.boolean().optional(),
  shuttle: z.boolean().optional(),
  liveChat: z.boolean().optional(),
}).passthrough();

export const socialSchema = z.object({
  facebook: z.string().optional(),
  instagram: z.string().optional(),
  tiktok: z.string().optional(),
  youtube: z.string().optional(),
  zalo: z.string().optional(),
}).passthrough();

export const insertBranchSettingsSchema = createInsertSchema(branchSettingsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertBranchSettings = z.infer<typeof insertBranchSettingsSchema>;
export type BranchSettingsRow = typeof branchSettingsTable.$inferSelect;

export type Branding = z.infer<typeof brandingSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type Payment = z.infer<typeof paymentSchema>;
export type Layout = z.infer<typeof layoutSchema>;
export type Seo = z.infer<typeof seoSchema>;
export type Features = z.infer<typeof featuresSchema>;
export type Social = z.infer<typeof socialSchema>;
