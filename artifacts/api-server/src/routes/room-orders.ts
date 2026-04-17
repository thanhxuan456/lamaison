import { Router } from "express";
import { db, roomOrdersTable, menuItemsTable, insertRoomOrderSchema, type OrderLine } from "@workspace/db";
import { eq, desc, inArray } from "drizzle-orm";

const router = Router();

router.get("/room-orders", async (req, res) => {
  try {
    const bookingId = req.query.bookingId ? Number(req.query.bookingId) : undefined;
    const rows = bookingId
      ? await db.select().from(roomOrdersTable).where(eq(roomOrdersTable.bookingId, bookingId)).orderBy(desc(roomOrdersTable.createdAt))
      : await db.select().from(roomOrdersTable).orderBy(desc(roomOrdersTable.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list orders");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/room-orders", async (req, res) => {
  try {
    const rawItems = (req.body.items ?? []) as any[];
    const ids = rawItems.map((it) => Number(it.menuItemId)).filter((n) => Number.isFinite(n));
    if (ids.length === 0) return res.status(400).json({ error: "No items provided" });

    // Authoritative price lookup: never trust client-supplied unitPrice
    const dbItems = await db.select().from(menuItemsTable).where(inArray(menuItemsTable.id, ids));
    const priceMap = new Map(dbItems.map((m) => [m.id, m]));

    const items: OrderLine[] = [];
    for (const raw of rawItems) {
      const menuItem = priceMap.get(Number(raw.menuItemId));
      if (!menuItem) return res.status(400).json({ error: `Menu item ${raw.menuItemId} not found` });
      if (!menuItem.available) return res.status(400).json({ error: `${menuItem.name} hiện không phục vụ` });
      const quantity = Math.max(1, Math.floor(Number(raw.quantity ?? 1)));
      const unitPrice = Number(menuItem.price);
      items.push({
        menuItemId: menuItem.id,
        name: menuItem.name,
        unitPrice,
        quantity,
        subtotal: unitPrice * quantity,
      });
    }
    const total = items.reduce((sum, it) => sum + it.subtotal, 0);
    const payload = {
      bookingId: Number(req.body.bookingId),
      items,
      total: total.toFixed(2),
      status: req.body.status ?? "pending",
      notes: req.body.notes ?? "",
    };
    const parsed = insertRoomOrderSchema.safeParse(payload);
    if (!parsed.success) return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
    const [row] = await db.insert(roomOrdersTable).values(parsed.data).returning();
    res.status(201).json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/room-orders/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updates: any = {};
    if (req.body.status) updates.status = req.body.status;
    if (req.body.notes !== undefined) updates.notes = req.body.notes;
    const [row] = await db.update(roomOrdersTable).set(updates).where(eq(roomOrdersTable.id, id)).returning();
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/room-orders/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(roomOrdersTable).where(eq(roomOrdersTable.id, id));
    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
