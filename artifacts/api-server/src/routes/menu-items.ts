import { requireAdmin } from "../middlewares/requireAdmin";
import { Router } from "express";
import { db, menuItemsTable, insertMenuItemSchema } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

router.get("/menu-items", async (req, res) => {
  try {
    const hotelId = req.query.hotelId ? Number(req.query.hotelId) : undefined;
    const rows = hotelId
      ? await db.select().from(menuItemsTable).where(eq(menuItemsTable.hotelId, hotelId)).orderBy(asc(menuItemsTable.sortOrder), asc(menuItemsTable.name))
      : await db.select().from(menuItemsTable).orderBy(asc(menuItemsTable.sortOrder), asc(menuItemsTable.name));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list menu items");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/menu-items", requireAdmin(), async (req, res) => {
  try {
    const parsed = insertMenuItemSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() }); return; }
    const [row] = await db.insert(menuItemsTable).values(parsed.data).returning();
    res.status(201).json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/menu-items/:id", requireAdmin(), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const parsed = insertMenuItemSchema.partial().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid data" }); return; }
    const [row] = await db.update(menuItemsTable).set(parsed.data).where(eq(menuItemsTable.id, id)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/menu-items/:id", requireAdmin(), async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(menuItemsTable).where(eq(menuItemsTable.id, id));
    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
