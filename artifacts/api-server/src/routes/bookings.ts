import { Router } from "express";
import { db } from "@workspace/db";
import {
  bookingsTable,
  roomsTable,
  hotelsTable,
  guestsTable,
  normalizeEmail,
  normalizePhone,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";
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

/**
 * Upsert a guest by normalized email — race-safe via ON CONFLICT.
 * Existing name is preserved (we never overwrite a real name with a different one);
 * blank phone gets filled in. Returns the resulting guest row.
 */
export async function upsertGuest(input: { fullName: string; email: string; phone: string }) {
  const normalizedEmail = normalizeEmail(input.email);
  const normalizedPhone = normalizePhone(input.phone);
  const [row] = await db
    .insert(guestsTable)
    .values({
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      normalizedEmail,
      normalizedPhone,
    })
    .onConflictDoUpdate({
      target: guestsTable.normalizedEmail,
      // Preserve existing name; only fill in blank phone.
      set: {
        phone: sql`COALESCE(NULLIF(${guestsTable.phone}, ''), EXCLUDED.phone)`,
        normalizedPhone: sql`COALESCE(NULLIF(${guestsTable.normalizedPhone}, ''), EXCLUDED.normalized_phone)`,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
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
    if (!room.isAvailable || (room.status !== "available" && room.status !== "reserved")) {
      res.status(409).json({ error: "Room is not available" });
      return;
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = parseFloat(room.pricePerNight) * Math.max(nights, 1);

    const guest = await upsertGuest({ fullName: guestName, email: guestEmail, phone: guestPhone });

    const [booking] = await db
      .insert(bookingsTable)
      .values({
        roomId,
        hotelId: room.hotelId,
        guestId: guest.id,
        guestName,
        guestEmail,
        guestPhone,
        checkInDate,
        checkOutDate,
        numberOfGuests,
        specialRequests: specialRequests ?? null,
        status: "pending_payment",
        source: "web",
        totalPrice: totalPrice.toString(),
      })
      .returning();

    // Hold the room immediately to prevent double bookings.
    // The room is released back to available if payment is not completed.
    await db
      .update(roomsTable)
      .set({ isAvailable: false, status: "reserved" })
      .where(eq(roomsTable.id, roomId));

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

router.post("/bookings/:id/check-in", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid booking ID" }); return; }
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    // Only allow check-in from pending/confirmed
    if (!["pending", "confirmed"].includes(booking.status)) {
      res.status(409).json({ error: `Cannot check in booking in '${booking.status}' state` });
      return;
    }
    const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, booking.roomId));
    if (room && room.status === "maintenance") {
      res.status(409).json({ error: "Room is under maintenance" });
      return;
    }
    const [updated] = await db
      .update(bookingsTable)
      .set({ status: "checked_in", checkedInAt: new Date() })
      .where(eq(bookingsTable.id, id))
      .returning();
    await db
      .update(roomsTable)
      .set({ isAvailable: false, status: "occupied" })
      .where(eq(roomsTable.id, booking.roomId));
    res.json(await enrichBooking(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to check in booking");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/bookings/:id/check-out", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid booking ID" }); return; }
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    if (booking.status !== "checked_in") {
      res.status(409).json({ error: "Booking must be checked-in first" });
      return;
    }
    const [updated] = await db
      .update(bookingsTable)
      .set({ status: "checked_out", checkedOutAt: new Date() })
      .where(eq(bookingsTable.id, id))
      .returning();
    await db
      .update(roomsTable)
      .set({ isAvailable: false, status: "cleaning" })
      .where(eq(roomsTable.id, booking.roomId));
    res.json(await enrichBooking(updated));
  } catch (err) {
    req.log.error({ err }, "Failed to check out booking");
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
    // Cannot cancel a guest who has already checked in — they must check out first.
    if (booking.status === "checked_in") {
      res.status(409).json({ error: "Cannot cancel a checked-in booking. Check the guest out first." });
      return;
    }
    if (booking.status === "checked_out") {
      res.status(409).json({ error: "Booking is already checked out" });
      return;
    }
    const [updated] = await db
      .update(bookingsTable)
      .set({ status: "cancelled" })
      .where(eq(bookingsTable.id, id))
      .returning();

    // Only free the room if no other active booking holds it
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookingsTable)
      .where(
        sql`${bookingsTable.roomId} = ${booking.roomId}
            AND ${bookingsTable.id} != ${id}
            AND ${bookingsTable.status} IN ('pending_payment','confirmed','checked_in')`,
      );
    if (Number(count) === 0) {
      await db
        .update(roomsTable)
        .set({ isAvailable: true, status: "available" })
        .where(eq(roomsTable.id, booking.roomId));
    }

    const enriched = await enrichBooking(updated);
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "Failed to cancel booking");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/bookings/:id/force", async (req, res) => {
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

    // Free the room if no other active booking holds it
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookingsTable)
      .where(
        sql`${bookingsTable.roomId} = ${booking.roomId}
            AND ${bookingsTable.id} != ${id}
            AND ${bookingsTable.status} IN ('pending_payment','confirmed','checked_in')`,
      );
    if (Number(count) === 0) {
      await db
        .update(roomsTable)
        .set({ isAvailable: true, status: "available" })
        .where(eq(roomsTable.id, booking.roomId));
    }

    await db.delete(bookingsTable).where(eq(bookingsTable.id, id));
    res.json({ message: "Booking permanently deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to force-delete booking");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
