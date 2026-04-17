import { Router } from "express";
import { db } from "@workspace/db";
import { guestsTable, bookingsTable, roomsTable, hotelsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

router.get("/guests", async (req, res) => {
  try {
    const rows = await db
      .select({
        guest: guestsTable,
        totalBookings: sql<number>`count(${bookingsTable.id})::int`,
        sources: sql<string[]>`coalesce(array_agg(distinct ${bookingsTable.source}) filter (where ${bookingsTable.source} is not null), '{}')`,
        lastStayAt: sql<string | null>`max(${bookingsTable.checkedInAt})`,
      })
      .from(guestsTable)
      .leftJoin(bookingsTable, eq(bookingsTable.guestId, guestsTable.id))
      .groupBy(guestsTable.id)
      .orderBy(desc(guestsTable.updatedAt));
    res.json(
      rows.map((r) => ({
        id: r.guest.id,
        fullName: r.guest.fullName,
        email: r.guest.email,
        phone: r.guest.phone,
        notes: r.guest.notes,
        totalBookings: Number(r.totalBookings ?? 0),
        sources: r.sources ?? [],
        lastStayAt: r.lastStayAt,
        createdAt: r.guest.createdAt,
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list guests");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/guests/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid guest ID" }); return; }
    const [guest] = await db.select().from(guestsTable).where(eq(guestsTable.id, id));
    if (!guest) { res.status(404).json({ error: "Guest not found" }); return; }

    const bookings = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.guestId, id))
      .orderBy(desc(bookingsTable.createdAt));

    const enriched = await Promise.all(
      bookings.map(async (b) => {
        const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, b.roomId));
        const [hotel] = await db.select().from(hotelsTable).where(eq(hotelsTable.id, b.hotelId));
        return {
          ...b,
          totalPrice: parseFloat(b.totalPrice),
          room: room ? { ...room, pricePerNight: parseFloat(room.pricePerNight) } : null,
          hotel: hotel
            ? { ...hotel, rating: parseFloat(hotel.rating), priceFrom: parseFloat(hotel.priceFrom), totalRooms: 0, availableRooms: 0 }
            : null,
        };
      }),
    );

    const sources = Array.from(new Set(bookings.map((b) => b.source)));
    const lastStay = bookings.find((b) => b.checkedInAt)?.checkedInAt ?? null;

    res.json({
      id: guest.id,
      fullName: guest.fullName,
      email: guest.email,
      phone: guest.phone,
      notes: guest.notes,
      totalBookings: bookings.length,
      sources,
      lastStayAt: lastStay,
      createdAt: guest.createdAt,
      bookings: enriched,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get guest");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
