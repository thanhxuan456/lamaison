import { Router } from "express";
import { db } from "@workspace/db";
import { userRolesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genCode(prefix = "GP") {
  let code = prefix;
  for (let i = 0; i < 6; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

// GET /api/users — list all users with roles
router.get("/users", async (_req, res) => {
  try {
    const rows = await db.select().from(userRolesTable).orderBy(userRolesTable.createdAt);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// POST /api/users — upsert (create or update) a user role entry
router.post("/users", async (req, res) => {
  try {
    const { clerkUserId, email, name, role, notes } = req.body ?? {};
    if (!clerkUserId || !email) { res.status(400).json({ error: "clerkUserId and email are required" }); return; }

    const existing = await db.select().from(userRolesTable).where(eq(userRolesTable.clerkUserId, clerkUserId));
    if (existing.length > 0) {
      const [updated] = await db.update(userRolesTable)
        .set({ email, name, role, notes, updatedAt: new Date() })
        .where(eq(userRolesTable.clerkUserId, clerkUserId))
        .returning();
      res.json(updated); return;
    }

    const [created] = await db.insert(userRolesTable).values({
      clerkUserId,
      email,
      name,
      role: role ?? "guest",
      notes,
    }).returning();
    res.status(201).json(created);
  } catch (e: any) {
    res.status(400).json({ error: e.message ?? "Invalid data" });
  }
});

// PUT /api/users/:id — update role / commission / notes
router.put("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const { role, commissionRate, notes, name } = req.body ?? {};
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (role !== undefined) patch.role = role;
    if (commissionRate !== undefined) patch.commissionRate = Number(commissionRate);
    if (notes !== undefined) patch.notes = notes;
    if (name !== undefined) patch.name = name;

    const [updated] = await db.update(userRolesTable)
      .set(patch)
      .where(eq(userRolesTable.id, id))
      .returning();

    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message ?? "Invalid data" });
  }
});

// DELETE /api/users/:id — remove role entry
router.delete("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    await db.delete(userRolesTable).where(eq(userRolesTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// POST /api/users/:id/affiliate — generate affiliate code
router.post("/users/:id/affiliate", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const code = genCode();
    const rate = Number(req.body?.commissionRate ?? 5);

    const [updated] = await db.update(userRolesTable)
      .set({ affiliateCode: code, commissionRate: rate, updatedAt: new Date() })
      .where(eq(userRolesTable.id, id))
      .returning();

    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    res.json(updated);
  } catch (e: any) {
    res.status(400).json({ error: e.message ?? "Failed to generate code" });
  }
});

export default router;
