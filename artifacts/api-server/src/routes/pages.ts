import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, pagesTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/requireAdmin";

const router: IRouter = Router();

const slugify = (s: string) =>
  s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-").slice(0, 180) || `page-${Date.now()}`;

function parseBody(b: any, partial = false) {
  if (!b || typeof b !== "object") throw new Error("Invalid body");
  const out: any = {};
  if (b.title !== undefined || !partial) {
    const t = String(b.title ?? "").trim();
    if (!t) throw new Error("Tieu de bat buoc");
    if (t.length > 300) throw new Error("Tieu de qua dai");
    out.title = t;
  }
  // id chi nhan khi tao moi (POST). PATCH khong cho doi id de tranh xung dot identity.
  if (b.slug !== undefined)      out.slug      = String(b.slug).slice(0, 200);
  if (b.content !== undefined)   out.content   = String(b.content ?? "");
  if (b.status !== undefined)    out.status    = b.status === "published" ? "published" : "draft";
  if (b.metaTitle !== undefined) out.metaTitle = String(b.metaTitle ?? "").slice(0, 300);
  if (b.metaDesc !== undefined)  out.metaDesc  = String(b.metaDesc ?? "").slice(0, 5000);
  if (b.ogImage !== undefined)   out.ogImage   = String(b.ogImage ?? "").slice(0, 2000);
  // puckData la JSON tu trinh keo-tha. Cho phep null de xoa, hoac object {content[], root, zones?}.
  // Validation: chan payload qua lon, ep shape co ban, gioi han do sau cay JSON.
  if (b.puckData !== undefined) {
    if (b.puckData === null) {
      out.puckData = null;
    } else if (typeof b.puckData === "object" && !Array.isArray(b.puckData)) {
      const json = JSON.stringify(b.puckData);
      if (json.length > 1_000_000) throw new Error("puckData qua lon (>1MB)");
      // Ham do sau de chan JSON cuc loi long.
      const depth = (() => {
        let max = 0;
        const walk = (v: any, d: number) => {
          if (d > max) max = d;
          if (d > 50) throw new Error("puckData lồng quá sâu (>50)");
          if (v && typeof v === "object") for (const k of Object.keys(v)) walk(v[k], d + 1);
        };
        walk(b.puckData, 0);
        return max;
      })();
      void depth;
      const pd = b.puckData;
      if (pd.content !== undefined && !Array.isArray(pd.content)) throw new Error("puckData.content phai la mang");
      if (pd.root !== undefined && (typeof pd.root !== "object" || pd.root === null)) throw new Error("puckData.root phai la object");
      out.puckData = pd;
    } else {
      throw new Error("puckData phai la object hoac null");
    }
  }
  return out;
}

// ----- ADMIN: list/get tat ca trang (ke ca draft). Phai dat TRUOC route /pages/:key
// de tranh nham "/admin/all" thanh key.

// GET /api/pages/admin/all - admin xem het (cong ca draft)
router.get("/pages/admin/all", requireAdmin(), async (_req, res) => {
  try {
    const rows = await db.select().from(pagesTable).orderBy(desc(pagesTable.updatedAt));
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "internal" });
  }
});

// GET /api/pages/admin/:key - admin xem 1 trang (ke ca draft)
router.get("/pages/admin/:key", requireAdmin(), async (req, res) => {
  try {
    const k = req.params.key;
    const [row] = await db.select().from(pagesTable)
      .where(sql`${pagesTable.id} = ${k} OR ${pagesTable.slug} = ${k}`)
      .limit(1);
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "internal" });
  }
});

// ----- PUBLIC: chi tra ve trang da xuat ban
// GET /api/pages
router.get("/pages", async (_req, res) => {
  try {
    const rows = await db.select().from(pagesTable)
      .where(eq(pagesTable.status, "published"))
      .orderBy(desc(pagesTable.updatedAt));
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "internal" });
  }
});

// GET /api/pages/:idOrSlug - public chi xem published
router.get("/pages/:key", async (req, res) => {
  try {
    const k = req.params.key;
    const [row] = await db.select().from(pagesTable)
      .where(sql`${pagesTable.id} = ${k} OR ${pagesTable.slug} = ${k}`)
      .limit(1);
    if (!row || row.status !== "published") { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "internal" });
  }
});

// POST /api/pages - tao trang moi (admin)
router.post("/pages", requireAdmin(), async (req, res) => {
  try {
    const data = parseBody(req.body, false);
    // Cho phep client truyen id khi tao moi (PATCH thi khong).
    const requestedId = req.body?.id ? String(req.body.id).slice(0, 80) : "";
    const id = requestedId || slugify(data.title);
    const slug = data.slug || (id.startsWith("/") ? id : `/${id}`);
    const [row] = await db.insert(pagesTable).values({
      ...data, id, slug,
    }).returning();
    res.status(201).json(row);
  } catch (e: any) {
    if (e?.code === "23505") { res.status(409).json({ error: "ID hoac slug da ton tai" }); return; }
    res.status(400).json({ error: e.message ?? "invalid" });
  }
});

// PATCH /api/pages/:id - cap nhat (admin)
router.patch("/pages/:id", requireAdmin(), async (req, res) => {
  try {
    const id = req.params.id;
    const data = parseBody(req.body, true);
    const [row] = await db.update(pagesTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(pagesTable.id, id))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (e: any) {
    if (e?.code === "23505") { res.status(409).json({ error: "Slug da ton tai" }); return; }
    res.status(400).json({ error: e.message ?? "invalid" });
  }
});

// DELETE /api/pages/:id (admin)
router.delete("/pages/:id", requireAdmin(), async (req, res) => {
  try {
    const id = req.params.id;
    const result = await db.delete(pagesTable).where(eq(pagesTable.id, id)).returning();
    if (!result.length) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "internal" });
  }
});

export default router;
