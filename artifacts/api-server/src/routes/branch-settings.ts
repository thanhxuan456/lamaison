import { Router } from "express";
import { db } from "@workspace/db";
import {
  branchSettingsTable,
  hotelsTable,
  brandingSchema,
  contactSchema,
  paymentSchema,
  layoutSchema,
  seoSchema,
  featuresSchema,
  socialSchema,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

const SECTION_SCHEMAS = {
  branding: brandingSchema,
  contact: contactSchema,
  payment: paymentSchema,
  layout: layoutSchema,
  seo: seoSchema,
  features: featuresSchema,
  social: socialSchema,
} as const;
type SectionKey = keyof typeof SECTION_SCHEMAS;
const SECTION_KEYS = Object.keys(SECTION_SCHEMAS) as SectionKey[];

const EMPTY_SETTINGS = SECTION_KEYS.reduce(
  (acc, k) => ({ ...acc, [k]: {} }),
  {} as Record<SectionKey, Record<string, unknown>>,
);

async function getOrInitRow(hotelId: number) {
  const [existing] = await db
    .select()
    .from(branchSettingsTable)
    .where(eq(branchSettingsTable.hotelId, hotelId));
  if (existing) return existing;
  const [created] = await db
    .insert(branchSettingsTable)
    .values({ hotelId, ...EMPTY_SETTINGS })
    .returning();
  return created;
}

// GET /api/branch-settings/by-slug/:slug — public, FE doc de render theo chi nhanh
router.get("/branch-settings/by-slug/:slug", async (req, res) => {
  try {
    const slug = String(req.params.slug);
    const [hotel] = await db.select().from(hotelsTable).where(eq(hotelsTable.slug, slug));
    if (!hotel) return res.status(404).json({ error: "hotel not found" });
    const row = await getOrInitRow(hotel.id);
    res.json({ ...row, hotel: { id: hotel.id, slug: hotel.slug, name: hotel.name } });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "server error" });
  }
});

// GET /api/branch-settings/:hotelId — admin xem
router.get("/branch-settings/:hotelId", requireAdmin, async (req, res) => {
  try {
    const hotelId = Number(req.params.hotelId);
    if (!Number.isFinite(hotelId)) return res.status(400).json({ error: "invalid hotelId" });
    const row = await getOrInitRow(hotelId);
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "server error" });
  }
});

// PUT /api/branch-settings/:hotelId — admin update toan bo (merge)
router.put("/branch-settings/:hotelId", requireAdmin, async (req, res) => {
  try {
    const hotelId = Number(req.params.hotelId);
    if (!Number.isFinite(hotelId)) return res.status(400).json({ error: "invalid hotelId" });

    const body = z
      .object({
        branding: brandingSchema.optional(),
        contact: contactSchema.optional(),
        payment: paymentSchema.optional(),
        layout: layoutSchema.optional(),
        seo: seoSchema.optional(),
        features: featuresSchema.optional(),
        social: socialSchema.optional(),
      })
      .parse(req.body);

    await getOrInitRow(hotelId); // dam bao co row
    const update: Record<string, unknown> = { updatedAt: new Date() };
    for (const k of SECTION_KEYS) {
      if (body[k] !== undefined) update[k] = body[k];
    }

    const [updated] = await db
      .update(branchSettingsTable)
      .set(update as any)
      .where(eq(branchSettingsTable.hotelId, hotelId))
      .returning();
    res.json(updated);
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: "validation", details: e.issues });
    res.status(500).json({ error: e?.message ?? "server error" });
  }
});

// PATCH /api/branch-settings/:hotelId/:section — update 1 section (tien cho auto-save)
router.patch("/branch-settings/:hotelId/:section", requireAdmin, async (req, res) => {
  try {
    const hotelId = Number(req.params.hotelId);
    const section = String(req.params.section) as SectionKey;
    if (!Number.isFinite(hotelId)) return res.status(400).json({ error: "invalid hotelId" });
    if (!SECTION_KEYS.includes(section)) return res.status(400).json({ error: "invalid section" });

    const parsed = SECTION_SCHEMAS[section].parse(req.body);
    await getOrInitRow(hotelId);
    const [updated] = await db
      .update(branchSettingsTable)
      .set({ [section]: parsed, updatedAt: new Date() } as any)
      .where(eq(branchSettingsTable.hotelId, hotelId))
      .returning();
    res.json(updated);
  } catch (e: any) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: "validation", details: e.issues });
    res.status(500).json({ error: e?.message ?? "server error" });
  }
});

export default router;
