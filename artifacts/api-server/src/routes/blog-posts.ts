import { Router, type IRouter } from "express";
import { eq, desc, sql, and } from "drizzle-orm";
import { db, blogPostsTable } from "@workspace/db";

const router: IRouter = Router();

const slugify = (s: string) =>
  s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-").slice(0, 180) || `post-${Date.now()}`;

const str = (v: any, max = 5000) => (typeof v === "string" ? v.slice(0, max) : "");
const optStr = (v: any, max = 5000) => (v == null ? undefined : str(v, max));
function parseBody(b: any, partial = false) {
  if (!b || typeof b !== "object") throw new Error("Invalid body");
  const out: any = {};
  if (b.title !== undefined || !partial) {
    const t = String(b.title ?? "").trim();
    if (!t) throw new Error("Tiêu đề bắt buộc");
    if (t.length > 300) throw new Error("Tiêu đề quá dài");
    out.title = t;
  }
  if (b.slug !== undefined)       out.slug       = optStr(b.slug, 200);
  if (b.excerpt !== undefined)    out.excerpt    = str(b.excerpt, 2000);
  if (b.content !== undefined)    out.content    = String(b.content ?? "");
  if (b.coverImage !== undefined) out.coverImage = str(b.coverImage, 2000);
  if (b.category !== undefined)   out.category   = str(b.category, 80) || "news";
  if (b.author !== undefined)     out.author     = str(b.author, 120) || "MAISON DELUXE";
  if (b.tags !== undefined)       out.tags       = str(b.tags, 500);
  if (b.published !== undefined)  out.published  = !!b.published;
  return out;
}

// GET /api/blog-posts?all=true&category=news&limit=20
// Public default: only published posts. Admin must pass ?all=true to see drafts.
router.get("/blog-posts", async (req, res) => {
  try {
    const showAll = req.query.all === "true";
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const limit = Math.min(Number(req.query.limit) || 100, 200);

    const conds: any[] = [];
    if (!showAll) conds.push(eq(blogPostsTable.published, true));
    if (category && category !== "all") conds.push(eq(blogPostsTable.category, category));

    const rows = await db.select().from(blogPostsTable)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(blogPostsTable.publishedAt), desc(blogPostsTable.createdAt))
      .limit(limit);
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "internal" });
  }
});

// GET /api/blog-posts/:slugOrId — also bumps views. Hides drafts unless ?all=true.
router.get("/blog-posts/:slugOrId", async (req, res) => {
  try {
    const k = req.params.slugOrId;
    const isNum = /^\d+$/.test(k);
    const showAll = req.query.all === "true";
    const [row] = await db.select().from(blogPostsTable)
      .where(isNum ? eq(blogPostsTable.id, Number(k)) : eq(blogPostsTable.slug, k))
      .limit(1);
    if (!row || (!showAll && !row.published)) { res.status(404).json({ error: "Not found" }); return; }
    db.update(blogPostsTable).set({ views: sql`${blogPostsTable.views} + 1` })
      .where(eq(blogPostsTable.id, row.id)).catch(() => {});
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "internal" });
  }
});

router.post("/blog-posts", async (req, res) => {
  try {
    const data = parseBody(req.body, false);
    const slug = (data.slug && data.slug.trim()) || slugify(data.title);
    const publishedAt = data.published ? new Date() : null;
    const [row] = await db.insert(blogPostsTable).values({
      ...data, slug, publishedAt,
    }).returning();
    res.status(201).json(row);
  } catch (e: any) {
    if (e?.code === "23505") { res.status(409).json({ error: "Slug đã tồn tại" }); return; }
    res.status(400).json({ error: e.message ?? "invalid" });
  }
});

router.patch("/blog-posts/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const data = parseBody(req.body, true);
    const patch: any = { ...data, updatedAt: new Date() };
    if (data.published === true) {
      const [cur] = await db.select().from(blogPostsTable).where(eq(blogPostsTable.id, id)).limit(1);
      if (cur && !cur.publishedAt) patch.publishedAt = new Date();
    }
    const [row] = await db.update(blogPostsTable).set(patch).where(eq(blogPostsTable.id, id)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (e: any) {
    res.status(400).json({ error: e.message ?? "invalid" });
  }
});

router.delete("/blog-posts/:id", async (req, res) => {
  try {
    await db.delete(blogPostsTable).where(eq(blogPostsTable.id, Number(req.params.id)));
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "internal" });
  }
});

export default router;
