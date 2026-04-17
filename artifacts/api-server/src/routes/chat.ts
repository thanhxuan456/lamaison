import { Router } from "express";
import { db } from "@workspace/db";
import { chatSessionsTable, chatMessagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { WebSocketServer, WebSocket } from "ws";

const router = Router();

// In-memory map: sessionId → Set of connected WebSocket clients
const sessions = new Map<string, Set<WebSocket>>();

function broadcast(sessionId: string, data: object) {
  const clients = sessions.get(sessionId);
  if (!clients) return;
  const str = JSON.stringify(data);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(str);
  }
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

// WebSocket upgrade handler — exported so index.ts can use it
export function setupChatWebSocket(wss: WebSocketServer) {
  wss.on("connection", (ws, req) => {
    const url = req.url ?? "";
    const match = url.match(/\/api\/chat\/ws\/(\d+)/);
    if (!match) { ws.close(); return; }
    const sessionId = match[1];

    if (!sessions.has(sessionId)) sessions.set(sessionId, new Set());
    sessions.get(sessionId)!.add(ws);

    ws.on("close", () => {
      sessions.get(sessionId)?.delete(ws);
    });

    // Ping to keep alive
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) ws.ping();
    }, 25000);
    ws.on("close", () => clearInterval(interval));
  });
}

export default router;
