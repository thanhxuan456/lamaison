import { Router } from "express";
import { db } from "@workspace/db";
import { bookingsTable, roomsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { upsertGuest } from "./bookings";

const router = Router();

const OTA_KEY = "grand-palace-ota-configs";

interface OtaChannelConfig {
  id: string;
  name: string;
  enabled: boolean;
  propertyId: string;
  apiKey: string;
  apiSecret: string;
  rateplanId: string;
  syncInventory: boolean;
  syncRates: boolean;
  syncReservations: boolean;
  lastSync: string | null;
  webhookUrl: string;
  testMode: boolean;
}

let store: OtaChannelConfig[] = [];

function getDefaultChannels(): OtaChannelConfig[] {
  return [
    { id: "booking_com", name: "Booking.com", enabled: false, propertyId: "", apiKey: "", apiSecret: "", rateplanId: "", syncInventory: true, syncRates: true, syncReservations: true, lastSync: null, webhookUrl: "", testMode: true },
    { id: "agoda", name: "Agoda", enabled: false, propertyId: "", apiKey: "", apiSecret: "", rateplanId: "", syncInventory: true, syncRates: true, syncReservations: true, lastSync: null, webhookUrl: "", testMode: true },
    { id: "expedia", name: "Expedia / Hotels.com", enabled: false, propertyId: "", apiKey: "", apiSecret: "", rateplanId: "", syncInventory: true, syncRates: false, syncReservations: true, lastSync: null, webhookUrl: "", testMode: true },
    { id: "airbnb", name: "Airbnb", enabled: false, propertyId: "", apiKey: "", apiSecret: "", rateplanId: "", syncInventory: true, syncRates: false, syncReservations: true, lastSync: null, webhookUrl: "", testMode: true },
    { id: "traveloka", name: "Traveloka", enabled: false, propertyId: "", apiKey: "", apiSecret: "", rateplanId: "", syncInventory: true, syncRates: true, syncReservations: true, lastSync: null, webhookUrl: "", testMode: true },
    { id: "tripadvisor", name: "TripAdvisor", enabled: false, propertyId: "", apiKey: "", apiSecret: "", rateplanId: "", syncInventory: false, syncRates: false, syncReservations: false, lastSync: null, webhookUrl: "", testMode: false },
    { id: "trip_com", name: "Trip.com (Ctrip)", enabled: false, propertyId: "", apiKey: "", apiSecret: "", rateplanId: "", syncInventory: true, syncRates: true, syncReservations: true, lastSync: null, webhookUrl: "", testMode: true },
    { id: "klook", name: "Klook", enabled: false, propertyId: "", apiKey: "", apiSecret: "", rateplanId: "", syncInventory: true, syncRates: false, syncReservations: true, lastSync: null, webhookUrl: "", testMode: true },
  ];
}

// GET all OTA channel configs
router.get("/ota/channels", (_req, res) => {
  if (store.length === 0) store = getDefaultChannels();
  res.json(store);
});

// PUT update a channel config
router.put("/ota/channels/:id", (req, res) => {
  if (store.length === 0) store = getDefaultChannels();
  const { id } = req.params;
  const idx = store.findIndex((c) => c.id === id);
  if (idx === -1) { res.status(404).json({ error: "Channel not found" }); return; }
  store[idx] = { ...store[idx], ...req.body, id };
  res.json(store[idx]);
});

// POST /api/ota/channels/:id/test — simulate a connection test
router.post("/ota/channels/:id/test", (req, res) => {
  if (store.length === 0) store = getDefaultChannels();
  const { id } = req.params;
  const channel = store.find((c) => c.id === id);
  if (!channel) return res.status(404).json({ error: "Channel not found" });
  if (!channel.apiKey || !channel.propertyId) {
    return res.status(400).json({ success: false, message: "API Key và Property ID là bắt buộc để kết nối" });
  }
  // In production: call the real OTA API here
  // For now, simulate a successful connection test
  const idx = store.findIndex((c) => c.id === id);
  store[idx].lastSync = new Date().toISOString();
  return res.json({ success: true, message: `Kết nối thành công với ${channel.name}`, testedAt: store[idx].lastSync });
});

// POST /api/ota/channels/:id/sync — simulate a sync push
router.post("/ota/channels/:id/sync", (req, res) => {
  if (store.length === 0) store = getDefaultChannels();
  const { id } = req.params;
  const channel = store.find((c) => c.id === id);
  if (!channel) return res.status(404).json({ error: "Channel not found" });
  if (!channel.enabled) return res.status(400).json({ success: false, message: "Kênh chưa được kích hoạt" });
  const idx = store.findIndex((c) => c.id === id);
  store[idx].lastSync = new Date().toISOString();
  return res.json({
    success: true,
    message: `Đồng bộ ${channel.name} thành công`,
    syncedAt: store[idx].lastSync,
    details: {
      inventory: channel.syncInventory ? "Đã đồng bộ" : "Bỏ qua",
      rates: channel.syncRates ? "Đã đồng bộ" : "Bỏ qua",
      reservations: channel.syncReservations ? "Đã kéo về" : "Bỏ qua",
    },
  });
});

// POST /api/ota/channels/:id/ingest — ingest a real booking from an OTA channel.
// Idempotent: if a booking with the same (source, externalRef) exists, return it as-is.
router.post("/ota/channels/:id/ingest", async (req, res) => {
  try {
    if (store.length === 0) store = getDefaultChannels();
    const { id } = req.params;
    const channel = store.find((c) => c.id === id);
    if (!channel) return res.status(404).json({ error: "Channel not found" });

    const body = req.body ?? {};
    const required = ["externalRef", "roomId", "guestName", "guestEmail", "guestPhone", "checkInDate", "checkOutDate", "numberOfGuests", "totalPrice"];
    const missing = required.filter((k) => body[k] === undefined || body[k] === null || body[k] === "");
    if (missing.length) return res.status(400).json({ error: "Missing fields", missing });

    const externalRef = String(body.externalRef);

    // Race-safe idempotency: try fast-path lookup, then INSERT ... ON CONFLICT DO NOTHING,
    // then re-select on conflict (handles concurrent ingest of the same externalRef).
    const lookupExisting = async () => {
      const [row] = await db
        .select()
        .from(bookingsTable)
        .where(and(eq(bookingsTable.source, channel.id), eq(bookingsTable.externalRef, externalRef)));
      return row;
    };

    const existing = await lookupExisting();
    if (existing) {
      return res.json({ ...existing, totalPrice: parseFloat(existing.totalPrice), duplicate: true });
    }

    const roomId = Number(body.roomId);
    const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, roomId));
    if (!room) return res.status(404).json({ error: "Room not found" });

    const guest = await upsertGuest({
      fullName: String(body.guestName),
      email: String(body.guestEmail),
      phone: String(body.guestPhone),
    });

    const inserted = await db
      .insert(bookingsTable)
      .values({
        roomId,
        hotelId: room.hotelId,
        guestId: guest.id,
        guestName: String(body.guestName),
        guestEmail: String(body.guestEmail),
        guestPhone: String(body.guestPhone),
        checkInDate: String(body.checkInDate),
        checkOutDate: String(body.checkOutDate),
        numberOfGuests: Number(body.numberOfGuests),
        specialRequests: body.specialRequests ?? null,
        status: "confirmed",
        source: channel.id,
        externalRef,
        totalPrice: String(body.totalPrice),
      })
      .onConflictDoNothing({ target: [bookingsTable.source, bookingsTable.externalRef] })
      .returning();

    if (inserted.length === 0) {
      // Lost the race — another concurrent ingest won. Return that row idempotently.
      const winner = await lookupExisting();
      if (winner) {
        return res.json({ ...winner, totalPrice: parseFloat(winner.totalPrice), duplicate: true });
      }
      return res.status(500).json({ error: "Insert conflicted but no row found" });
    }
    const booking = inserted[0];

    await db
      .update(roomsTable)
      .set({ isAvailable: false, status: "reserved" })
      .where(eq(roomsTable.id, roomId));

    const idx = store.findIndex((c) => c.id === channel.id);
    store[idx].lastSync = new Date().toISOString();

    return res.status(201).json({ ...booking, totalPrice: parseFloat(booking.totalPrice) });
  } catch (err) {
    req.log.error({ err }, "Failed to ingest OTA booking");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
