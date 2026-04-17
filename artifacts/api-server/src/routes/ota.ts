import { Router } from "express";

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
  if (idx === -1) return res.status(404).json({ error: "Channel not found" });
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

export default router;
