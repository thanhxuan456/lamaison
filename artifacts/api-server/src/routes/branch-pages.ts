import { Router } from "express";
import { db } from "@workspace/db";
import { branchPagesTable, hotelsTable, PAGE_SLUGS } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

const isValidSlug = (s: unknown): s is string =>
  typeof s === "string" && (PAGE_SLUGS as readonly string[]).includes(s);

// ===== Schema validation per page slug =====
const SpaContentSchema = z.object({
  hero: z.object({
    eyebrow: z.string().optional(),
    title: z.string().min(1),
    subtitle: z.string().optional(),
    image: z.string().optional(),
    description: z.string().optional(),
    ctaPrimary: z.object({ label: z.string(), href: z.string() }).optional(),
    ctaSecondary: z.object({ label: z.string(), href: z.string() }).optional(),
  }),
  stats: z.array(z.object({ n: z.string(), label: z.string() })),
  amenities: z.array(z.object({ icon: z.string(), title: z.string(), desc: z.string() })),
  treatments: z.array(z.object({
    category: z.string(),
    icon: z.string(),
    items: z.array(z.object({
      name: z.string(), duration: z.string(), price: z.string(), desc: z.string(),
    })),
  })),
  cta: z.object({
    eyebrow: z.string().optional(),
    title: z.string().min(1),
    description: z.string().optional(),
    phone: z.string().optional(),
    hours: z.string().optional(),
  }),
});

// Khi them template moi cho about/contact thi them schema o day.
const CONTENT_SCHEMAS: Record<string, z.ZodTypeAny> = {
  spa: SpaContentSchema,
};

const VALID_TEMPLATES: Record<string, string[]> = {
  spa: ["classic", "zen", "oriental"],
};

// ===== Public read — chi tra ve khi enabled =====

// GET /api/branch-pages/:hotelId/:pageSlug
router.get("/branch-pages/:hotelId/:pageSlug", async (req, res) => {
  try {
    const hotelId = Number(req.params.hotelId);
    const pageSlug = req.params.pageSlug;
    if (!Number.isFinite(hotelId)) { res.status(400).json({ error: "Invalid hotelId" }); return; }
    if (!isValidSlug(pageSlug)) { res.status(400).json({ error: "Invalid pageSlug" }); return; }

    const [row] = await db.select().from(branchPagesTable)
      .where(and(eq(branchPagesTable.hotelId, hotelId), eq(branchPagesTable.pageSlug, pageSlug)));

    if (!row || row.enabled === 0) { res.json(null); return; }
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "Failed to fetch branch page" });
  }
});

// GET /api/branch-pages/by-slug/:hotelSlug/:pageSlug — tien dung khi FE chi co hotel slug
router.get("/branch-pages/by-slug/:hotelSlug/:pageSlug", async (req, res) => {
  try {
    const { hotelSlug, pageSlug } = req.params;
    if (!isValidSlug(pageSlug)) { res.status(400).json({ error: "Invalid pageSlug" }); return; }

    const [hotel] = await db.select().from(hotelsTable).where(eq(hotelsTable.slug, hotelSlug));
    if (!hotel) { res.json(null); return; }

    const [row] = await db.select().from(branchPagesTable)
      .where(and(eq(branchPagesTable.hotelId, hotel.id), eq(branchPagesTable.pageSlug, pageSlug)));

    if (!row || row.enabled === 0) { res.json(null); return; }
    res.json({ ...row, hotel });
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "Failed to fetch branch page" });
  }
});

// ===== Admin endpoints — bao gom ca disabled rows =====

// GET /api/admin/branch-pages/:hotelId/:pageSlug — admin xem (bat ke enabled hay khong)
router.get("/admin/branch-pages/:hotelId/:pageSlug", requireAdmin(), async (req, res) => {
  try {
    const hotelId = Number(req.params.hotelId);
    const pageSlug = req.params.pageSlug;
    if (!Number.isFinite(hotelId) || !isValidSlug(pageSlug)) { res.status(400).json({ error: "Invalid params" }); return; }
    const [row] = await db.select().from(branchPagesTable)
      .where(and(eq(branchPagesTable.hotelId, hotelId), eq(branchPagesTable.pageSlug, pageSlug)));
    res.json(row ?? null);
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "Failed" });
  }
});

// GET /api/admin/branch-pages/list/:hotelId — admin only
router.get("/admin/branch-pages/list/:hotelId", requireAdmin(), async (req, res) => {
  try {
    const hotelId = Number(req.params.hotelId);
    if (!Number.isFinite(hotelId)) { res.status(400).json({ error: "Invalid hotelId" }); return; }
    const rows = await db.select().from(branchPagesTable).where(eq(branchPagesTable.hotelId, hotelId));
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "Failed to list branch pages" });
  }
});

// PUT /api/branch-pages/:hotelId/:pageSlug
router.put("/branch-pages/:hotelId/:pageSlug", requireAdmin(), async (req, res) => {
  try {
    const hotelId = Number(req.params.hotelId);
    const pageSlug = req.params.pageSlug;
    if (!Number.isFinite(hotelId)) { res.status(400).json({ error: "Invalid hotelId" }); return; }
    if (!isValidSlug(pageSlug)) { res.status(400).json({ error: "Invalid pageSlug" }); return; }

    const { layoutTemplate = "classic", content = {}, enabled = 1 } = req.body ?? {};
    if (typeof layoutTemplate !== "string") { res.status(400).json({ error: "layoutTemplate must be string" }); return; }

    // Validate template key against registered templates for this slug
    const allowedTpl = VALID_TEMPLATES[pageSlug];
    if (allowedTpl && !allowedTpl.includes(layoutTemplate)) {
      res.status(400).json({ error: `Invalid layoutTemplate "${layoutTemplate}" for ${pageSlug}. Allowed: ${allowedTpl.join(", ")}` });
      return;
    }

    // Validate content shape against zod schema for this slug
    const schema = CONTENT_SCHEMAS[pageSlug];
    if (schema) {
      const parsed = schema.safeParse(content);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid content shape", details: parsed.error.flatten() });
        return;
      }
    }

    const [hotel] = await db.select().from(hotelsTable).where(eq(hotelsTable.id, hotelId));
    if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }

    const now = new Date();
    const [row] = await db.insert(branchPagesTable).values({
      hotelId, pageSlug, layoutTemplate, content, enabled: enabled ? 1 : 0,
    }).onConflictDoUpdate({
      target: [branchPagesTable.hotelId, branchPagesTable.pageSlug],
      set: { layoutTemplate, content, enabled: enabled ? 1 : 0, updatedAt: now },
    }).returning();
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "Failed to save branch page" });
  }
});

// DELETE /api/branch-pages/:hotelId/:pageSlug
router.delete("/branch-pages/:hotelId/:pageSlug", requireAdmin(), async (req, res) => {
  try {
    const hotelId = Number(req.params.hotelId);
    const pageSlug = req.params.pageSlug;
    if (!Number.isFinite(hotelId) || !isValidSlug(pageSlug)) { res.status(400).json({ error: "Invalid params" }); return; }

    await db.delete(branchPagesTable).where(and(
      eq(branchPagesTable.hotelId, hotelId),
      eq(branchPagesTable.pageSlug, pageSlug),
    ));
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "Failed to delete branch page" });
  }
});

export default router;
