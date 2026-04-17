import { Router } from "express";
import { db } from "@workspace/db";
import { roomsTable, insertRoomSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/rooms", async (req, res) => {
  try {
    const rooms = await db.select().from(roomsTable);
    res.json(rooms.map((r) => ({ ...r, pricePerNight: parseFloat(r.pricePerNight) })));
  } catch (err) {
    req.log.error({ err }, "Failed to list rooms");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/rooms", async (req, res) => {
  try {
    const parsed = insertRoomSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid room data", details: parsed.error.flatten() });
      return;
    }
    const [room] = await db.insert(roomsTable).values(parsed.data).returning();
    res.status(201).json({ ...room, pricePerNight: parseFloat(room.pricePerNight) });
  } catch (err) {
    req.log.error({ err }, "Failed to create room");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/rooms/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid room ID" }); return; }
    const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, id));
    if (!room) { res.status(404).json({ error: "Room not found" }); return; }
    res.json({ ...room, pricePerNight: parseFloat(room.pricePerNight) });
  } catch (err) {
    req.log.error({ err }, "Failed to get room");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/rooms/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid room ID" }); return; }
    const parsed = insertRoomSchema.partial().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid room data", details: parsed.error.flatten() }); return; }
    const [room] = await db.update(roomsTable).set(parsed.data).where(eq(roomsTable.id, id)).returning();
    if (!room) { res.status(404).json({ error: "Room not found" }); return; }
    res.json({ ...room, pricePerNight: parseFloat(room.pricePerNight) });
  } catch (err) {
    req.log.error({ err }, "Failed to update room");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/rooms/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid room ID" }); return; }
    const [room] = await db.delete(roomsTable).where(eq(roomsTable.id, id)).returning();
    if (!room) { res.status(404).json({ error: "Room not found" }); return; }
    res.json({ success: true, id });
  } catch (err) {
    req.log.error({ err }, "Failed to delete room");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
