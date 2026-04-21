import { Router } from "express";
import { db } from "@workspace/db";
import { chatSessionsTable, chatMessagesTable, chatReplyTemplatesTable } from "@workspace/db";
import { eq, inArray, asc, desc } from "drizzle-orm";
import { WebSocketServer, WebSocket } from "ws";

// Auto-generate a human-friendly ticket number: MD-YYYYMMDD-<6 chars>
function generateTicketNumber(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `MD-${ymd}-${rand}`;
}

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

// Smart keyword-based auto-replies. Triggered IMMEDIATELY (no 30s delay) when
// the user's message matches one of these patterns. The 30s fallback still
// runs in case nothing matches and no admin is online.
const SMART_REPLIES: Array<{ patterns: RegExp[]; reply: string }> = [
  {
    patterns: [/giá|gia\s*phòng|bao\s*nhiêu|giá\s*ph[òo]ng|price|cost|rate/i],
    reply: "💰 Giá phòng MAISON DELUXE:\n• Deluxe: từ 2.500.000đ/đêm\n• Suite: từ 4.800.000đ/đêm\n• Presidential: từ 12.000.000đ/đêm\nGiá đã gồm bữa sáng buffet & VAT. Xem chi tiết tại trang **Phòng**.",
  },
  {
    patterns: [/đặt\s*ph[òo]ng|đặt\s*chỗ|book|booking|reserve|d[aă]t\s*ph[oò]ng/i],
    reply: "📅 Để đặt phòng nhanh nhất, vui lòng:\n1. Chọn chi nhánh & ngày tại trang **Đặt Phòng**\n2. Hoặc gọi Hotline +84 1800 9999 (24/7)\n3. Hoặc email reservations@maisondeluxe.vn\nQuý khách muốn em hỗ trợ đặt phòng ngay bây giờ?",
  },
  {
    patterns: [/check[\s-]?in|nhận\s*ph[òo]ng|trả\s*ph[òo]ng|check[\s-]?out/i],
    reply: "🕒 Giờ nhận/trả phòng:\n• Check-in: từ 14:00\n• Check-out: trước 12:00\nNhận phòng sớm/trả phòng muộn vui lòng báo trước, có thể tính phí 50% giá phòng tuỳ tình trạng.",
  },
  {
    patterns: [/wifi|wi[\s-]?fi|internet|m[aạ]ng/i],
    reply: "📶 Wifi tốc độ cao MIỄN PHÍ ở tất cả phòng & khu vực công cộng. Mật khẩu được cung cấp khi check-in.",
  },
  {
    patterns: [/h[ồo]\s*b[ơo]i|swimming|pool|bể\s*b[ơo]i/i],
    reply: "🏊 Hồ bơi vô cực tầng thượng tầm nhìn 360°.\n⏰ Mở cửa: 06:00 – 22:00 hằng ngày\nMiễn phí cho khách lưu trú. Có khu trẻ em & jacuzzi nước ấm.",
  },
  {
    patterns: [/spa|massage|m[aá]t[\s-]?xa|sauna/i],
    reply: "💆 MAISON DELUXE Spa — không gian thư giãn 5 sao.\n⏰ 09:00 – 21:00\n• Massage truyền thống: 850.000đ/60 phút\n• Trị liệu đá nóng: 1.250.000đ/90 phút\nĐặt lịch trước 2h tại lễ tân hoặc nhắn em tên dịch vụ.",
  },
  {
    patterns: [/nhà\s*hàng|restaurant|ăn|dining|buffet|bữa/i],
    reply: "🍽 Nhà hàng **La Vue** — ẩm thực Á-Âu fusion.\n⏰ 06:00 – 23:00\n• Buffet sáng: 6h-10h (gồm trong giá phòng)\n• Trưa & tối: à la carte + set menu từ 650.000đ/người\nGọi 1900 9999 ext.5 để đặt bàn.",
  },
  {
    patterns: [/đỗ\s*xe|parking|gửi\s*xe|bãi\s*xe/i],
    reply: "🚗 Bãi đỗ xe ngầm rộng rãi:\n• Khách lưu trú: MIỄN PHÍ\n• Khách vãng lai: 30.000đ/giờ, 200.000đ/ngày\nCó cổng tự động & bảo vệ 24/7.",
  },
  {
    patterns: [/địa\s*ch[ỉi]|address|chi\s*nhánh|where|ở\s*đâu/i],
    reply: "📍 Hệ thống MAISON DELUXE Hotels:\n• **Hà Nội**: 36 Hai Bà Trưng, Hoàn Kiếm\n• **Đà Nẵng**: 88 Võ Nguyên Giáp, Sơn Trà\n• **Phú Quốc**: Resort tại Bãi Trường\nXem bản đồ & hình ảnh tại trang **Chi Nhánh**.",
  },
  {
    patterns: [/khuyến\s*mại|ưu\s*đãi|gi[ảa]m\s*giá|promo|discount|sale|voucher/i],
    reply: "🎁 Ưu đãi đang diễn ra:\n• **Sớm 30 ngày**: giảm 25%\n• **Honeymoon Package**: 4N3Đ từ 9.900.000đ\n• **Family Stay 2+1**: trẻ dưới 12t miễn phí\nXem tất cả tại trang **Ưu Đãi** hoặc nhắn em mã ưu đãi để áp dụng.",
  },
  {
    patterns: [/hotline|liên\s*hệ|s[ốo]\s*điện|phone|email|gọi/i],
    reply: "☎️ Liên hệ MAISON DELUXE:\n• Hotline 24/7: **+84 1800 9999** (miễn phí)\n• Đặt phòng: reservations@maisondeluxe.vn\n• Hỗ trợ khách: contact@maisondeluxe.vn\n• Zalo OA: zalo.me/maisondeluxe",
  },
  {
    patterns: [/cảm\s*ơn|thanks?|thank\s*you|tks/i],
    reply: "💛 Dạ, MAISON DELUXE rất vui được phục vụ quý khách. Chúc quý khách một ngày tốt lành! Nếu cần thêm bất kỳ điều gì, đừng ngại nhắn em nhé.",
  },
  {
    patterns: [/chào|xin\s*chào|hello|hi|hey|halo/i],
    reply: "👋 Xin chào quý khách! Em là trợ lý ảo MAISON DELUXE. Em có thể hỗ trợ:\n• Thông tin phòng & giá\n• Đặt phòng nhanh\n• Tiện ích (spa, hồ bơi, nhà hàng)\n• Khuyến mại đang chạy\nQuý khách cần em giúp việc gì ạ?",
  },
];

function findSmartReply(message: string): string | null {
  const text = message.trim();
  if (!text) return null;
  for (const rule of SMART_REPLIES) {
    if (rule.patterns.some((re) => re.test(text))) return rule.reply;
  }
  return null;
}

async function sendBotMessage(sessionId: string, text: string) {
  try {
    const [auto] = await db
      .insert(chatMessagesTable)
      .values({
        sessionId,
        senderType: "bot",
        senderName: AUTO_REPLY_NAME,
        message: text,
      })
      .returning();
    broadcast(sessionId, auto);
  } catch { /* ignore */ }
}

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
    await sendBotMessage(sessionId, AUTO_REPLY_TEXT);
  }, AUTO_REPLY_DELAY_MS);
  pendingAutoReplies.set(sessionId, timer);
}

// POST /api/chat/sessions — start a new chat session.
// Auto-generates a ticket number so every conversation can be tracked as a ticket.
router.post("/chat/sessions", async (req, res) => {
  try {
    const { guestName, guestEmail, guestPhone, clerkUserId } = req.body;
    const [session] = await db
      .insert(chatSessionsTable)
      .values({
        guestName: guestName ?? "Guest",
        guestEmail: guestEmail ?? null,
        guestPhone: guestPhone ?? null,
        clerkUserId: clerkUserId ?? null,
        ticketNumber: generateTicketNumber(),
        status: "open",
      })
      .returning();
    res.json(session);
  } catch (err) {
    req.log.error({ err }, "Failed to create chat session");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /api/chat/sessions/:id — update status / priority / assignee fields.
// Used by admin UI to assign sessions and update ticket status.
router.patch("/chat/sessions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const {
      status, priority, assigneeUserId, assigneeName, assigneeRole,
      guestName, guestEmail, guestPhone,
    } = req.body ?? {};
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (status !== undefined) {
      patch.status = status;
      if (status === "resolved" || status === "closed") patch.resolvedAt = new Date();
    }
    if (priority !== undefined) patch.priority = priority;
    if (assigneeUserId !== undefined) {
      patch.assigneeUserId = assigneeUserId;
      patch.assignedAt = assigneeUserId ? new Date() : null;
      if (assigneeUserId && (status === undefined)) patch.status = "assigned";
      // Clear stale display fields when unassigning so the UI doesn't keep
      // showing the previous assignee's name/role.
      if (!assigneeUserId) {
        patch.assigneeName = null;
        patch.assigneeRole = null;
      }
    }
    if (assigneeName !== undefined) patch.assigneeName = assigneeName;
    if (assigneeRole !== undefined) patch.assigneeRole = assigneeRole;
    if (guestName !== undefined) patch.guestName = guestName;
    if (guestEmail !== undefined) patch.guestEmail = guestEmail;
    if (guestPhone !== undefined) patch.guestPhone = guestPhone;
    const [updated] = await db
      .update(chatSessionsTable)
      .set(patch as never)
      .where(eq(chatSessionsTable.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update chat session");
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ─────────────────── Reply Templates (canned responses) ─────────────────── */

// GET /api/chat/templates
router.get("/chat/templates", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(chatReplyTemplatesTable)
      .orderBy(asc(chatReplyTemplatesTable.sortOrder), asc(chatReplyTemplatesTable.id));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/chat/templates
router.post("/chat/templates", async (req, res) => {
  try {
    const { label, body, category, shortcut, sortOrder, isActive } = req.body ?? {};
    if (!label || !body) { res.status(400).json({ error: "label & body required" }); return; }
    const [row] = await db
      .insert(chatReplyTemplatesTable)
      .values({
        label, body,
        category: category ?? "general",
        shortcut: shortcut ?? null,
        sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
        isActive: isActive ?? true,
      })
      .returning();
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/chat/templates/:id
router.put("/chat/templates/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const { label, body, category, shortcut, sortOrder, isActive } = req.body ?? {};
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (label !== undefined) patch.label = label;
    if (body !== undefined) patch.body = body;
    if (category !== undefined) patch.category = category;
    if (shortcut !== undefined) patch.shortcut = shortcut;
    if (sortOrder !== undefined) patch.sortOrder = sortOrder;
    if (isActive !== undefined) patch.isActive = isActive;
    const [row] = await db
      .update(chatReplyTemplatesTable)
      .set(patch as never)
      .where(eq(chatReplyTemplatesTable.id, id))
      .returning();
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/chat/templates/:id
router.delete("/chat/templates/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (Number.isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    await db.delete(chatReplyTemplatesTable).where(eq(chatReplyTemplatesTable.id, id));
    res.json({ ok: true, id });
  } catch (err) {
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

    // Auto-reply logic: only when an end-user posts AND no admin is online.
    if ((senderType ?? "user") === "user" && !hasAdminOnline(req.params.id)) {
      const smart = findSmartReply(message);
      if (smart) {
        // Immediate intelligent reply based on keywords (with small typing delay
        // for natural feel). Cancel any pending fallback reply.
        const pending = pendingAutoReplies.get(req.params.id);
        if (pending) { clearTimeout(pending); pendingAutoReplies.delete(req.params.id); }
        setTimeout(() => sendBotMessage(req.params.id, smart), 800);
      } else {
        // Unknown question -> wait 30s for human, then fallback message.
        scheduleAutoReply(req.params.id);
      }
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
