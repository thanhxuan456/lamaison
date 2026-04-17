import { Router } from "express";
import { db, invoicesTable, bookingsTable, roomOrdersTable, roomsTable, hotelsTable, type InvoiceLine } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

function generateInvoiceNumber() {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rnd = Math.floor(Math.random() * 9000 + 1000);
  return `INV-${stamp}-${rnd}`;
}

/** Build invoice lines from booking + orders */
async function buildInvoiceForBooking(bookingId: number) {
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
  if (!booking) throw new Error("Booking not found");

  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, booking.roomId));
  const [hotel] = await db.select().from(hotelsTable).where(eq(hotelsTable.id, booking.hotelId));
  const orders = await db.select().from(roomOrdersTable).where(eq(roomOrdersTable.bookingId, bookingId));

  const checkIn = new Date(booking.checkInDate);
  const checkOut = new Date(booking.checkOutDate);
  const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000));

  const lines: InvoiceLine[] = [];

  if (room) {
    const unitPrice = Number(room.pricePerNight);
    lines.push({
      description: `${hotel?.name ?? "Hotel"} — Phòng ${room.roomNumber} (${room.type}) × ${nights} đêm`,
      quantity: nights,
      unitPrice,
      amount: unitPrice * nights,
    });
  }

  for (const order of orders) {
    if (order.status === "cancelled") continue;
    for (const item of order.items) {
      lines.push({
        description: `Room Service · ${item.name}`,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.subtotal,
      });
    }
  }

  const subtotal = lines.reduce((s, l) => s + l.amount, 0);
  const taxRate = 10;
  const taxAmount = Math.round(subtotal * taxRate) / 100;
  const total = subtotal + taxAmount;

  return {
    booking,
    hotel,
    room,
    payload: {
      invoiceNumber: generateInvoiceNumber(),
      bookingId: booking.id,
      customerName: booking.guestName,
      customerEmail: booking.guestEmail,
      customerPhone: booking.guestPhone,
      customerAddress: "",
      lines,
      subtotal: subtotal.toFixed(2),
      taxRate: taxRate.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      discount: "0",
      total: total.toFixed(2),
      currency: "VND",
      status: "issued" as const,
      paymentMethod: "",
      notes: "",
    },
  };
}

router.get("/invoices", async (req, res) => {
  try {
    const bookingId = req.query.bookingId ? Number(req.query.bookingId) : undefined;
    const rows = bookingId
      ? await db.select().from(invoicesTable).where(eq(invoicesTable.bookingId, bookingId)).orderBy(desc(invoicesTable.issuedAt))
      : await db.select().from(invoicesTable).orderBy(desc(invoicesTable.issuedAt));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list invoices");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/invoices/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [row] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, row.bookingId));
    const [hotel] = booking ? await db.select().from(hotelsTable).where(eq(hotelsTable.id, booking.hotelId)) : [null];
    res.json({ ...row, booking, hotel });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** Idempotent: create or update the invoice for a booking */
export async function upsertInvoiceForBooking(bookingId: number) {
  const { payload } = await buildInvoiceForBooking(bookingId);
  const [existing] = await db.select().from(invoicesTable).where(eq(invoicesTable.bookingId, bookingId));
  if (existing) {
    const [row] = await db.update(invoicesTable).set({
      lines: payload.lines,
      subtotal: payload.subtotal,
      taxAmount: payload.taxAmount,
      total: payload.total,
    }).where(eq(invoicesTable.id, existing.id)).returning();
    return { row, created: false };
  }
  const [row] = await db.insert(invoicesTable).values(payload).returning();
  return { row, created: true };
}

router.post("/invoices/generate/:bookingId", async (req, res) => {
  try {
    const bookingId = Number(req.params.bookingId);
    const { row, created } = await upsertInvoiceForBooking(bookingId);
    res.status(created ? 201 : 200).json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/invoices/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const updates: any = {};
    for (const k of ["status", "paymentMethod", "notes", "customerAddress", "discount"]) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    const [row] = await db.update(invoicesTable).set(updates).where(eq(invoicesTable.id, id)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/invoices/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(invoicesTable).where(eq(invoicesTable.id, id));
    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { buildInvoiceForBooking };
export default router;
