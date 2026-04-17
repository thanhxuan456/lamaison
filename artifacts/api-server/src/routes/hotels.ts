import { Router } from "express";
import { db } from "@workspace/db";
import { hotelsTable, roomsTable, bookingsTable, insertHotelSchema } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/hotels", async (req, res) => {
  try {
    const hotels = await db.select().from(hotelsTable);
    const hotelsWithCounts = await Promise.all(
      hotels.map(async (hotel) => {
        const rooms = await db.select().from(roomsTable).where(eq(roomsTable.hotelId, hotel.id));
        const availableRooms = rooms.filter((r) => r.isAvailable).length;
        return { ...hotel, rating: parseFloat(hotel.rating), priceFrom: parseFloat(hotel.priceFrom), availableRooms, totalRooms: rooms.length };
      })
    );
    res.json(hotelsWithCounts);
  } catch (err) {
    req.log.error({ err }, "Failed to list hotels");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/hotels", async (req, res) => {
  try {
    const parsed = insertHotelSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid hotel data", details: parsed.error.flatten() });
      return;
    }
    const [hotel] = await db.insert(hotelsTable).values(parsed.data).returning();
    res.status(201).json({ ...hotel, rating: parseFloat(hotel.rating), priceFrom: parseFloat(hotel.priceFrom) });
  } catch (err) {
    req.log.error({ err }, "Failed to create hotel");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/hotels/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid hotel ID" }); return; }
    const [hotel] = await db.select().from(hotelsTable).where(eq(hotelsTable.id, id));
    if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }
    const rooms = await db.select().from(roomsTable).where(eq(roomsTable.hotelId, id));
    const availableRooms = rooms.filter((r) => r.isAvailable).length;
    res.json({ ...hotel, rating: parseFloat(hotel.rating), priceFrom: parseFloat(hotel.priceFrom), availableRooms, totalRooms: rooms.length });
  } catch (err) {
    req.log.error({ err }, "Failed to get hotel");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/hotels/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid hotel ID" }); return; }
    const parsed = insertHotelSchema.partial().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Invalid hotel data", details: parsed.error.flatten() }); return; }
    const [hotel] = await db.update(hotelsTable).set(parsed.data).where(eq(hotelsTable.id, id)).returning();
    if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }
    res.json({ ...hotel, rating: parseFloat(hotel.rating), priceFrom: parseFloat(hotel.priceFrom) });
  } catch (err) {
    req.log.error({ err }, "Failed to update hotel");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/hotels/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid hotel ID" }); return; }
    const [hotel] = await db.delete(hotelsTable).where(eq(hotelsTable.id, id)).returning();
    if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }
    res.json({ success: true, id });
  } catch (err) {
    req.log.error({ err }, "Failed to delete hotel");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/hotels/:id/rooms", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid hotel ID" }); return; }
    const rooms = await db.select().from(roomsTable).where(eq(roomsTable.hotelId, id));
    res.json(rooms.map((r) => ({ ...r, pricePerNight: parseFloat(r.pricePerNight) })));
  } catch (err) {
    req.log.error({ err }, "Failed to list hotel rooms");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/hotels/:id/summary", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid hotel ID" }); return; }
    const [hotel] = await db.select().from(hotelsTable).where(eq(hotelsTable.id, id));
    if (!hotel) { res.status(404).json({ error: "Hotel not found" }); return; }
    const rooms = await db.select().from(roomsTable).where(eq(roomsTable.hotelId, id));
    const bookings = await db.select().from(bookingsTable).where(eq(bookingsTable.hotelId, id));
    const totalRooms = rooms.length;
    const availableRooms = rooms.filter((r) => r.isAvailable).length;
    const occupancyRate = totalRooms > 0 ? ((totalRooms - availableRooms) / totalRooms) * 100 : 0;
    const roomTypeCounts: Record<string, number> = {};
    rooms.forEach((r) => { roomTypeCounts[r.type] = (roomTypeCounts[r.type] || 0) + 1; });
    const popularRoomType = Object.entries(roomTypeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";
    res.json({ hotelId: id, totalRooms, availableRooms, occupancyRate: Math.round(occupancyRate * 10) / 10, totalBookings: bookings.length, popularRoomType, avgRating: parseFloat(hotel.rating) });
  } catch (err) {
    req.log.error({ err }, "Failed to get hotel summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
