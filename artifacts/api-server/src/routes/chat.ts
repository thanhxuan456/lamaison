import { Router } from "express";
import { db } from "@workspace/db";
import { chatSessionsTable, chatMessagesTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { WebSocketServer, WebSocket } from "ws";

const router = Router();

// In-memory maps
// All clients (user + admin) for a session — receive messages + presence
const sessions = new Map<string, Set<WebSocket>>();
// Admin clients only — used to know if anyone is supporting this session
const adminPresence = new Map<string, Set<WebSocket>>();
// Pending auto-reply timers (one per session)
const pendingAutoReplies = new Map<string, NodeJS.Timeout>();

const AUTO_REPLY_DELAY_MS = 30_000;
const AUTO_REPLY_NAME = "Trợ lý ảo MAISON DELUXE";
const AUTO_REPLY_TEXT =
  "Cảm ơn bạn đã liên hệ MAISON DELUXE Hotels. Hiện tại các tư vấn viên đang bận hoặc ngoài giờ làm việc. " +
  "Chúng tôi sẽ phản hồi sớm nhất có thể qua khung chat này. " +
  "Trong lúc chờ, quý khách có thể liên hệ Hotline +84 1800 9999 hoặc email contact@maisondeluxe.vn để được hỗ trợ trực tiếp.";

function hasAdminOnline(sessionId: string): boolean {
  const set = adminPresence.get(sessionId);
  if (!set || set.size === 0) return false;
  for (const ws of set) if (ws.readyState === WebSocket.OPEN) return true;
  return false;
}

function purgeSession(sessionId: string) {
  const t = pendingAutoReplies.get(sessionId);
  if (t) { clearTimeout(t); pendingAutoReplies.delete(sessionId); }
  const clients = sessions.get(sessionId);
  if (clients) { for (const ws of clients) try { ws.close(); } catch {} sessions.delete(sessionId); }
  adminPresence.delete(sessionId);
}

function broadcast(sessionId: string, data: object) {
  const clients = sessions.get(sessionId);
  if (!clients) return;
  const str = JSON.stringify(data);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(str);
  }
}

function broadcastPresence(sessionId: string) {
  broadcast(sessionId, { type: "presence", adminOnline: hasAdminOnline(sessionId) });
}

async function scheduleAutoReply(sessionId: string) {
  // cancel any earlier scheduled reply for this session
  const existing = pendingAutoReplies.get(sessionId);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(async () => {
    pendingAutoReplies.delete(sessionId);
    if (hasAdminOnline(sessionId)) return; // someone joined, no need
    try {
      const [auto] = await db
        .insert(chatMessagesTable)
        .values({
          sessionId,
          senderType: "bot",
          senderName: AUTO_REPLY_NAME,
          message: AUTO_REPLY_TEXT,
        })
        .returning();
      broadcast(sessionId, auto);
    } catch { /* ignore */ }
  }, AUTO_REPLY_DELAY_MS);
  pendingAutoReplies.set(sessionId, timer);
}

// POST /api/chat/sessions — start a new chat session
router.post("/chat/sessions", async (req, res) => {
  try {
    const { guestName, guestEmail, clerkUserId } = req.body;
    const [session] = await db
      .insert(chatSessionsTable)
      .values({ guestName: guestName ?? "Guest", guestEmail: guestEmail ?? null, clerkUserId: clerkUserId ?? null })
      .returning();
    res.json(session);
  } catch (err) {
    req.log.error({ err }, "Failed to create chat session");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/chat/sessions/:id/messages — fetch history
router.get("/chat/sessions/:id/messages", async (req, res) => {
  try {
    const msgs = await db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.sessionId, req.params.id))
      .orderBy(chatMessagesTable.createdAt);
    res.json(msgs);
  } catch (err) {
    req.log.error({ err }, "Failed to fetch messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/chat/sessions/:id/messages — send a message (REST + broadcast via WS)
router.post("/chat/sessions/:id/messages", async (req, res) => {
  try {
    const { senderType, senderName, message } = req.body;
    const [msg] = await db
      .insert(chatMessagesTable)
      .values({
        sessionId: req.params.id,
        senderType: senderType ?? "user",
        senderName: senderName ?? "Guest",
        message,
      })
      .returning();

    // Update session timestamp
    await db
      .update(chatSessionsTable)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessionsTable.id, parseInt(req.params.id)));

    broadcast(req.params.id, msg);

    // Auto-reply trigger: only when an end-user posts AND no admin is currently
    // attending the session. Wait AUTO_REPLY_DELAY_MS to let an admin join first.
    if ((senderType ?? "user") === "user" && !hasAdminOnline(req.params.id)) {
      scheduleAutoReply(req.params.id);
    }

    res.json(msg);
  } catch (err) {
    req.log.error({ err }, "Failed to send message");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/chat/sessions — list all sessions (admin only)
router.get("/chat/sessions", async (req, res) => {
  try {
    const allSessions = await db
      .select()
      .from(chatSessionsTable)
      .orderBy(chatSessionsTable.updatedAt);
    res.json(allSessions);
  } catch (err) {
    req.log.error({ err }, "Failed to list sessions");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/chat/sessions/:id — remove a single chat session and its messages
router.delete("/chat/sessions/:id", async (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    if (Number.isNaN(sessionId)) { res.status(400).json({ error: "Invalid id" }); return; }
    await db.delete(chatMessagesTable).where(eq(chatMessagesTable.sessionId, String(sessionId)));
    await db.delete(chatSessionsTable).where(eq(chatSessionsTable.id, sessionId));
    purgeSession(String(sessionId));
    res.json({ ok: true, id: sessionId });
  } catch (err) {
    req.log.error({ err }, "Failed to delete chat session");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/chat/sessions/bulk-delete — delete many sessions at once
router.post("/chat/sessions/bulk-delete", async (req, res) => {
  try {
    const ids: unknown = req.body?.ids;
    if (!Array.isArray(ids) || ids.length === 0) { res.status(400).json({ error: "ids[] required" }); return; }
    if (ids.length > 200) { res.status(400).json({ error: "too many ids (max 200)" }); return; }
    const numericIds = ids.map(Number).filter(n => Number.isFinite(n));
    if (numericIds.length === 0) { res.status(400).json({ error: "no valid ids" }); return; }
    await db.delete(chatMessagesTable).where(inArray(chatMessagesTable.sessionId, numericIds.map(String)));
    await db.delete(chatSessionsTable).where(inArray(chatSessionsTable.id, numericIds));
    for (const id of numericIds) purgeSession(String(id));
    res.json({ ok: true, count: numericIds.length });
  } catch (err) {
    req.log.error({ err }, "Failed to bulk-delete chat sessions");
    res.status(500).json({ error: "Internal server error" });
  }
});

// WebSocket upgrade handler — exported so index.ts can use it
export function setupChatWebSocket(wss: WebSocketServer) {
  wss.on("connection", (ws, req) => {
    const url = req.url ?? "";
    const match = url.match(/\/api\/chat\/ws\/(\d+)/);
    if (!match) { ws.close(); return; }
    const sessionId = match[1];

    // Detect role from query string: ?role=admin or ?role=user (default user)
    const roleMatch = url.match(/[?&]role=(admin|user)/);
    const role: "admin" | "user" = roleMatch?.[1] === "admin" ? "admin" : "user";

    if (!sessions.has(sessionId)) sessions.set(sessionId, new Set());
    sessions.get(sessionId)!.add(ws);

    if (role === "admin") {
      if (!adminPresence.has(sessionId)) adminPresence.set(sessionId, new Set());
      adminPresence.get(sessionId)!.add(ws);
      // Cancel any pending auto-reply since a human just joined
      const pending = pendingAutoReplies.get(sessionId);
      if (pending) { clearTimeout(pending); pendingAutoReplies.delete(sessionId); }
      broadcastPresence(sessionId);
    } else {
      // Tell the user immediately whether someone is already attending
      try { ws.send(JSON.stringify({ type: "presence", adminOnline: hasAdminOnline(sessionId) })); } catch {}
    }

    ws.on("close", () => {
      const s = sessions.get(sessionId);
      if (s) { s.delete(ws); if (s.size === 0) sessions.delete(sessionId); }
      if (role === "admin") {
        const a = adminPresence.get(sessionId);
        if (a) { a.delete(ws); if (a.size === 0) adminPresence.delete(sessionId); }
        broadcastPresence(sessionId);
      }
    });

    // Ping to keep alive
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }, 25000);
    ws.on("close", () => clearInterval(interval));
  });
}

export default router;
