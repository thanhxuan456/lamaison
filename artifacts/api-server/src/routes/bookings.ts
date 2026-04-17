import { Router } from "express";
import { db } from "@workspace/db";
import { bookingsTable, roomsTable, hotelsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateBookingBody } from "@workspace/api-zod";

const router = Router();

async function enrichBooking(booking: typeof bookingsTable.$inferSelect) {
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, booking.roomId));
  const [hotel] = await db.select().from(hotelsTable).where(eq(hotelsTable.id, booking.hotelId));
  return {
    ...booking,
    totalPrice: parseFloat(booking.totalPrice),
    room: room
      ? { ...room, pricePerNight: parseFloat(room.pricePerNight) }
      : null,
    hotel: hotel
      ? {
          ...hotel,
          rating: parseFloat(hotel.rating),
          priceFrom: parseFloat(hotel.priceFrom),
          availableRooms: 0,
          totalRooms: 0,
        }
      : null,
  };
}

router.get("/bookings", async (req, res) => {
  try {
    const bookings = await db.select().from(bookingsTable);
    const enriched = await Promise.all(bookings.map(enrichBooking));
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Failed to list bookings");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/bookings", async (req, res) => {
  try {
    const parsed = CreateBookingBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request body", details: parsed.error });
      return;
    }
    const { roomId, guestName, guestEmail, guestPhone, checkInDate, checkOutDate, numberOfGuests, specialRequests } = parsed.data;

    const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, roomId));
    if (!room) {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    if (!room.isAvailable) {
      res.status(409).json({ error: "Room is not available" });
      return;
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = parseFloat(room.pricePerNight) * Math.max(nights, 1);

    const [booking] = await db
      .insert(bookingsTable)
      .values({
        roomId,
        hotelId: room.hotelId,
        guestName,
        guestEmail,
        guestPhone,
        checkInDate,
        checkOutDate,
        numberOfGuests,
        specialRequests: specialRequests ?? null,
        status: "confirmed",
        totalPrice: totalPrice.toString(),
      })
      .returning();

    await db.update(roomsTable).set({ isAvailable: false }).where(eq(roomsTable.id, roomId));

    // Auto-generate invoice for the new booking (idempotent upsert)
    try {
      const { upsertInvoiceForBooking } = await import("./invoices");
      await upsertInvoiceForBooking(booking.id);
    } catch (invErr) {
      req.log.warn({ err: invErr }, "Auto-invoice generation failed (non-fatal)");
    }

    const enriched = await enrichBooking(booking);
    res.status(201).json(enriched);
  } catch (err) {
    req.log.error({ err }, "Failed to create booking");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/bookings/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid booking ID" });
      return;
    }
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    const enriched = await enrichBooking(booking);
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Failed to get booking");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/bookings/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid booking ID" });
      return;
    }
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }
    const [updated] = await db
      .update(bookingsTable)
      .set({ status: "cancelled" })
      .where(eq(bookingsTable.id, id))
      .returning();

    await db.update(roomsTable).set({ isAvailable: true }).where(eq(roomsTable.id, booking.roomId));

    const enriched = await enrichBooking(updated);
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Failed to cancel booking");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
