import { Router } from "express";
import { db } from "@workspace/db";
import { roomsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/rooms/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid room ID" });
      return;
    }
    const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, id));
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    res.json({
      ...room,
      pricePerNight: parseFloat(room.pricePerNight),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get room");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
