import { requireAdmin } from "../middlewares/requireAdmin";
import { Router } from "express";
import { db } from "@workspace/db";
import { roomsTable, bookingsTable, insertRoomSchema } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

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

router.post("/rooms", requireAdmin(), async (req, res) => {
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

router.put("/rooms/:id", requireAdmin(), async (req, res) => {
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

const ROOM_STATUSES = ["available", "reserved", "occupied", "cleaning", "maintenance"] as const;
type RoomStatus = (typeof ROOM_STATUSES)[number];

router.put("/rooms/:id/status", requireAdmin(), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid room ID" }); return; }
    const status = String(req.body?.status ?? "") as RoomStatus;
    if (!ROOM_STATUSES.includes(status)) {
      res.status(400).json({ error: "Invalid status. Allowed: " + ROOM_STATUSES.join(", ") });
      return;
    }
    // Guard: refuse to set 'available' or 'maintenance' if there is an active booking on this room.
    if (status === "available" || status === "maintenance") {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(bookingsTable)
        .where(sql`${bookingsTable.roomId} = ${id} AND ${bookingsTable.status} IN ('confirmed','checked_in')`);
      if (Number(count) > 0) {
        res.status(409).json({
          error: `Cannot set room to '${status}': it has ${count} active booking(s). Cancel or check out first.`,
        });
        return;
      }
    }
    const isAvailable = status === "available";
    const [room] = await db
      .update(roomsTable)
      .set({ status, isAvailable })
      .where(eq(roomsTable.id, id))
      .returning();
    if (!room) { res.status(404).json({ error: "Room not found" }); return; }
    res.json({ ...room, pricePerNight: parseFloat(room.pricePerNight) });
  } catch (err) {
    req.log.error({ err }, "Failed to update room status");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/rooms/:id", requireAdmin(), async (req, res) => {
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
