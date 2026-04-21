import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useUser } from "@clerk/clerk-react";
import { Link } from "wouter";
import { MessageSquare, X, Send, Minimize2, Maximize2, Loader2, Bot, LogIn, Sparkles, User as UserIcon, Mail, Phone, ArrowRight } from "lucide-react";
import { useT } from "@/lib/i18n";

interface Message {
  id: string | number;
  senderType: "user" | "admin" | "system" | "bot";
  senderName: string;
  message: string;
  createdAt?: string | null;
}

const API_URL = import.meta.env.VITE_API_URL ?? "";

// Quick-reply chips shown at conversation start to drive engagement.
const QUICK_REPLIES = [
  { icon: "💰", label: "Giá phòng", text: "Cho em hỏi giá phòng?" },
  { icon: "📅", label: "Đặt phòng", text: "Em muốn đặt phòng" },
  { icon: "🏊", label: "Tiện ích", text: "Khách sạn có hồ bơi không?" },
  { icon: "📍", label: "Địa chỉ", text: "Cho em xin địa chỉ chi nhánh" },
  { icon: "🎁", label: "Khuyến mại", text: "Có ưu đãi gì không?" },
  { icon: "☎️", label: "Hotline", text: "Số hotline liên hệ?" },
];

// Safely format a timestamp; returns "" for missing/invalid dates so we never
// render the literal text "Invalid Date" in the UI.
function formatTime(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

// Convert simple **bold** markdown markers to <strong> spans inline.
function renderMessageText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export function LiveChat() {
  const { user } = useUser();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [adminOnline, setAdminOnline] = useState(false);
  const [botTyping, setBotTyping] = useState(false);
  // Pre-chat form: collect identity before opening a real session.
  // Skipped automatically when the user is signed in (Clerk).
  const [preForm, setPreForm] = useState({ name: "", email: "", phone: "" });
  const [preFormError, setPreFormError] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionInitialized = useRef(false);
  const botTypingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages, botTyping]);

  // Show typing indicator briefly while waiting for the bot's reply.
  const triggerBotTyping = useCallback(() => {
    setBotTyping(true);
    if (botTypingTimer.current) clearTimeout(botTypingTimer.current);
    botTypingTimer.current = setTimeout(() => setBotTyping(false), 4000);
  }, []);

  const connectWs = useCallback((sid: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${proto}//${window.location.host}${API_URL}/api/chat/ws/${sid}?role=user`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => {
      setWsConnected(false);
      setAdminOnline(false);
      setTimeout(() => connectWs(sid), 3000);
    };
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data?.type === "presence") {
          setAdminOnline(Boolean(data.adminOnline));
          return;
        }
        const msg: Message = data;
        // Stop typing indicator when bot/admin reply arrives.
        if (msg.senderType === "bot" || msg.senderType === "admin") {
          setBotTyping(false);
          if (botTypingTimer.current) clearTimeout(botTypingTimer.current);
        }
        setMessages((prev) => [...prev, msg]);
        if (!open || minimized) setUnread((u) => u + 1);
      } catch { }
    };
  }, [open, minimized]);

  // Restore an existing session from sessionStorage when the chat opens.
  // Logged-in Clerk users get auto-created sessions (no pre-form needed).
  // Guests must fill the pre-chat form first (handled by submitPreForm).
  const restoreOrAutoStart = useCallback(async () => {
    if (sessionInitialized.current) return;
    // Chi restore session cu cho user da login. Khach an danh luon thay form moi
    // de dam bao thong tin lien he duoc xac nhan lai moi lan mo chat.
    const stored = user ? sessionStorage.getItem("chat_session_id") : null;
    if (stored) {
      sessionInitialized.current = true;
      setSessionId(stored);
      try {
        const res = await fetch(`${API_URL}/api/chat/sessions/${stored}/messages`);
        if (res.ok) setMessages(await res.json());
      } catch {}
      connectWs(stored);
      return;
    }
    if (user) {
      // Authenticated user: auto-create using Clerk profile.
      sessionInitialized.current = true;
      const guestName = user.fullName ?? user.firstName ?? "Khách";
      const guestEmail = user.primaryEmailAddress?.emailAddress;
      const guestPhone = user.primaryPhoneNumber?.phoneNumber ?? null;
      const res = await fetch(`${API_URL}/api/chat/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestName, guestEmail, guestPhone, clerkUserId: user.id }),
      });
      if (res.ok) {
        const session = await res.json();
        sessionStorage.setItem("chat_session_id", String(session.id));
        setSessionId(String(session.id));
        setMessages([{
          id: "welcome",
          senderType: "system",
          senderName: "MAISON DELUXE",
          message: t("chat.welcome"),
          createdAt: new Date().toISOString(),
        }]);
        connectWs(String(session.id));
      }
    }
  }, [user, t, connectWs]);

  // Submit handler for the pre-chat form (guest path).
  const submitPreForm = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (sessionInitialized.current || creatingSession) return;
    const name = preForm.name.trim();
    const email = preForm.email.trim();
    const phone = preForm.phone.trim();
    if (name.length < 2) { setPreFormError("Vui lòng nhập họ tên (tối thiểu 2 ký tự)."); return; }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const phoneOk = /^[+()\-\s\d]{8,20}$/.test(phone);
    if (!emailOk && !phoneOk) {
      setPreFormError("Vui lòng nhập email hợp lệ hoặc số điện thoại để chúng tôi liên hệ lại.");
      return;
    }
    setPreFormError(null);
    setCreatingSession(true);
    try {
      const res = await fetch(`${API_URL}/api/chat/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: name,
          guestEmail: email || null,
          guestPhone: phone || null,
          clerkUserId: null,
        }),
      });
      if (!res.ok) throw new Error("create failed");
      const session = await res.json();
      sessionInitialized.current = true;
      sessionStorage.setItem("chat_session_id", String(session.id));
      setSessionId(String(session.id));
      setMessages([{
        id: "welcome",
        senderType: "system",
        senderName: "MAISON DELUXE",
        message: t("chat.welcome") + (session.ticketNumber ? `\nMã ticket: ${session.ticketNumber}` : ""),
        createdAt: new Date().toISOString(),
      }]);
      connectWs(String(session.id));
    } catch {
      setPreFormError("Không thể bắt đầu phiên chat, vui lòng thử lại.");
    } finally {
      setCreatingSession(false);
    }
  }, [preForm, creatingSession, t, connectWs]);

  useEffect(() => {
    if (open && !sessionId) restoreOrAutoStart();
    if (open) setUnread(0);
  }, [open, sessionId, restoreOrAutoStart]);

  // True when we should show the pre-chat form: chat opened, no session yet,
  // user is a guest (not signed in via Clerk), and no stored session restoring.
  // Khach an danh chua co sessionId -> luon show form. Da login -> session duoc tu tao.
  const needsPreForm = open && !sessionId && !user;

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      if (botTypingTimer.current) clearTimeout(botTypingTimer.current);
    };
  }, []);

  const sendMessage = useCallback(async (text?: string) => {
    const payload = (text ?? input).trim();
    if (!payload || !sessionId || sending) return;
    if (!text) setInput("");
    setSending(true);
    triggerBotTyping();
    try {
      await fetch(`${API_URL}/api/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderType: "user",
          senderName: user?.firstName ?? "Khách",
          message: payload,
        }),
      });
    } catch { } finally {
      setSending(false);
    }
  }, [input, sessionId, sending, user, triggerBotTyping]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Show quick-reply chips only when the conversation is fresh (welcome only).
  const showQuickReplies = useMemo(
    () => messages.length <= 1 && messages.every((m) => m.senderType === "system"),
    [messages]
  );

  return (
    <>
      {/* ─────────── Floating launcher ─────────── */}
      <button
        onClick={() => { setOpen(true); setMinimized(false); }}
        className={`fixed bottom-6 right-6 z-50 group transition-all duration-300 ${
          open && !minimized ? "opacity-0 pointer-events-none scale-50" : "opacity-100 scale-100"
        }`}
        aria-label={t("chat.open")}
      >
        <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping" />
        <span className="relative flex items-center justify-center w-16 h-16 rounded-full
                         bg-gradient-to-br from-primary via-amber-500 to-amber-700
                         shadow-[0_8px_30px_-8px_rgba(217,160,69,0.7)]
                         group-hover:shadow-[0_12px_40px_-8px_rgba(217,160,69,0.9)]
                         group-hover:scale-110 transition-transform">
          <MessageSquare size={26} className="text-white drop-shadow" />
        </span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1.5 bg-red-500 text-white
                           text-[11px] font-bold rounded-full flex items-center justify-center
                           ring-2 ring-background shadow-lg">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* ─────────── Chat window ─────────── */}
      {open && (
        <div
          className={`fixed bottom-6 right-6 z-50 w-[min(92vw,400px)] flex flex-col
                      bg-card/95 backdrop-blur-xl
                      shadow-[0_25px_60px_-15px_rgba(0,0,0,0.45)]
                      border border-primary/30 rounded-2xl overflow-hidden
                      transition-[height,transform,opacity] duration-300 ease-out
                      ${minimized ? "h-16" : "h-[600px] max-h-[80vh]"}`}
        >
          {/* Decorative top bar */}
          <div className="absolute top-0 inset-x-0 h-[3px]
                          bg-gradient-to-r from-amber-700 via-primary to-amber-700" />

          {/* ─── Header ─── */}
          <div className="relative flex items-center gap-3 px-4 py-3 shrink-0
                          bg-gradient-to-br from-amber-50 via-amber-50/50 to-amber-100/30
                          dark:from-amber-950/40 dark:via-amber-900/20 dark:to-amber-950/30
                          border-b border-primary/20">
            <div className="relative">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-amber-700
                              flex items-center justify-center shadow-md ring-2 ring-background">
                <Sparkles size={18} className="text-white" />
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ring-2 ring-card
                            ${wsConnected ? (adminOnline ? "bg-green-500" : "bg-amber-400") : "bg-zinc-400"}`}
              >
                {wsConnected && (
                  <span className={`absolute inset-0 rounded-full animate-ping
                                    ${adminOnline ? "bg-green-500/70" : "bg-amber-400/70"}`} />
                )}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-serif text-[15px] text-foreground leading-tight">
                {t("chat.title")}
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                {!wsConnected ? (
                  <span>{t("chat.connecting")}</span>
                ) : adminOnline ? (
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    Tư vấn viên đang trực · phản hồi nhanh
                  </span>
                ) : (
                  <span>Trợ lý ảo · phản hồi tức thì 24/7</span>
                )}
              </div>
            </div>

            <button
              onClick={() => setMinimized((m) => !m)}
              className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10
                         rounded-lg transition-colors"
              aria-label={minimized ? "Mở rộng" : "Thu nhỏ"}
            >
              {minimized ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10
                         rounded-lg transition-colors"
              aria-label="Đóng"
            >
              <X size={15} />
            </button>
          </div>

          {!minimized && needsPreForm && (
            <form
              onSubmit={submitPreForm}
              className="flex-1 overflow-y-auto px-5 py-5 space-y-4 bg-gradient-to-b from-amber-50/30 via-transparent to-amber-50/20 dark:from-amber-950/15 dark:to-amber-950/10"
            >
              <div>
                <h3 className="font-serif text-base text-foreground leading-snug">
                  Trước khi bắt đầu
                </h3>
                <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
                  Vui lòng để lại thông tin để tư vấn viên MAISON DELUXE có thể hỗ trợ &
                  liên hệ lại với quý khách nhanh nhất.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <UserIcon size={11} className="text-primary" /> Họ và tên <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={preForm.name}
                    onChange={(e) => setPreForm((p) => ({ ...p, name: e.target.value }))}
                    autoFocus
                    placeholder="Nguyễn Văn A"
                    className="mt-1 w-full bg-background border border-primary/25 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg px-3 py-2 text-sm outline-none transition-all"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Mail size={11} className="text-primary" /> Email
                  </span>
                  <input
                    type="email"
                    value={preForm.email}
                    onChange={(e) => setPreForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="email@example.com"
                    className="mt-1 w-full bg-background border border-primary/25 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg px-3 py-2 text-sm outline-none transition-all"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Phone size={11} className="text-primary" /> Số điện thoại
                  </span>
                  <input
                    type="tel"
                    value={preForm.phone}
                    onChange={(e) => setPreForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+84 ..."
                    className="mt-1 w-full bg-background border border-primary/25 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg px-3 py-2 text-sm outline-none transition-all"
                  />
                </label>
                <p className="text-[10px] text-muted-foreground/80">
                  * Bắt buộc nhập <strong>email</strong> hoặc <strong>số điện thoại</strong> để chúng tôi có thể liên hệ lại nếu cuộc trò chuyện bị gián đoạn.
                </p>
                {preFormError && (
                  <div className="text-[12px] text-red-500 bg-red-500/5 border border-red-300/40 rounded px-3 py-2">
                    {preFormError}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={creatingSession}
                className="w-full bg-gradient-to-br from-primary to-amber-700 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50"
              >
                {creatingSession ? (
                  <><Loader2 size={14} className="animate-spin" /> Đang khởi tạo...</>
                ) : (
                  <>Bắt đầu trò chuyện <ArrowRight size={14} /></>
                )}
              </button>

              <div className="text-[11px] text-center text-muted-foreground">
                Đã có tài khoản?{" "}
                <Link href="/sign-in" className="text-primary font-medium hover:underline">
                  Đăng nhập
                </Link>{" "}để bỏ qua bước này.
              </div>
            </form>
          )}

          {!minimized && !needsPreForm && (
            <>
              {/* Login hint for guests */}
              {!user && (
                <div className="px-4 py-2 bg-primary/5 border-b border-primary/10
                                text-[11px] text-muted-foreground flex items-center gap-2 shrink-0">
                  <LogIn size={12} className="text-primary shrink-0" />
                  <span>
                    Đang trò chuyện với tư cách khách.{" "}
                    <Link href="/sign-in" className="text-primary font-medium hover:underline">
                      Đăng nhập
                    </Link>{" "}
                    để lưu lịch sử & hỗ trợ ưu tiên.
                  </span>
                </div>
              )}

              {/* ─── Messages ─── */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3
                              bg-gradient-to-b from-transparent via-amber-50/10 to-transparent
                              dark:via-amber-950/5">
                {messages.map((msg) => {
                  if (msg.senderType === "system") {
                    return (
                      <div key={msg.id} className="text-center py-1">
                        <span className="text-[12px] text-muted-foreground italic
                                         bg-muted/40 px-3 py-1.5 rounded-full inline-block
                                         border border-primary/10">
                          {msg.message}
                        </span>
                      </div>
                    );
                  }
                  const isUser = msg.senderType === "user";
                  const isBot = msg.senderType === "bot";
                  const time = formatTime(msg.createdAt);
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
                      {!isUser && (
                        <div
                          className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center mt-1
                                      ring-1 ring-primary/20 shadow-sm
                                      ${isBot
                                        ? "bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800"
                                        : "bg-gradient-to-br from-primary to-amber-700"}`}
                        >
                          {isBot
                            ? <Bot size={14} className="text-zinc-600 dark:text-zinc-300" />
                            : <span className="text-[10px] font-serif text-white font-bold">MD</span>}
                        </div>
                      )}
                      <div className={`max-w-[78%] flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
                        {!isUser && (
                          <div className="text-[10px] text-muted-foreground/80 px-1">
                            {msg.senderName}
                          </div>
                        )}
                        <div
                          className={`px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line
                                      shadow-sm transition-transform
                                      ${isUser
                                        ? "bg-gradient-to-br from-primary to-amber-700 text-white rounded-2xl rounded-br-md"
                                        : isBot
                                          ? "bg-amber-50 dark:bg-amber-950/30 text-foreground rounded-2xl rounded-bl-md border border-amber-200/40 dark:border-amber-800/40"
                                          : "bg-muted text-foreground rounded-2xl rounded-bl-md border border-primary/10"}`}
                        >
                          {renderMessageText(msg.message)}
                        </div>
                        {time && (
                          <div className="text-[10px] text-muted-foreground/70 px-1">{time}</div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Typing indicator */}
                {botTyping && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-8 h-8 shrink-0 rounded-full mt-1 ring-1 ring-primary/20
                                    bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800
                                    flex items-center justify-center">
                      <Bot size={14} className="text-zinc-600 dark:text-zinc-300" />
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl rounded-bl-md px-4 py-3
                                    border border-amber-200/40 dark:border-amber-800/40
                                    flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"
                            style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"
                            style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce"
                            style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                )}

                {/* Quick replies */}
                {showQuickReplies && (
                  <div className="pt-2">
                    <div className="text-[11px] text-muted-foreground mb-2 px-1">
                      Gợi ý câu hỏi:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_REPLIES.map((q) => (
                        <button
                          key={q.label}
                          onClick={() => sendMessage(q.text)}
                          disabled={sending}
                          className="px-3 py-1.5 text-xs bg-card hover:bg-primary/10
                                     border border-primary/30 hover:border-primary/60
                                     rounded-full transition-all duration-200
                                     hover:scale-105 hover:shadow-sm
                                     text-foreground flex items-center gap-1.5
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span>{q.icon}</span>
                          <span>{q.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* ─── Input ─── */}
              <div className="border-t border-primary/15 p-3 shrink-0
                              bg-gradient-to-b from-transparent to-amber-50/20 dark:to-amber-950/10">
                <div className="flex gap-2 items-end">
                  <div className="flex-1 relative">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={t("chat.placeholder")}
                      rows={1}
                      className="w-full bg-background border border-primary/25
                                 focus:border-primary focus:ring-2 focus:ring-primary/20
                                 text-foreground text-sm px-3.5 py-2.5 resize-none outline-none
                                 transition-all rounded-xl placeholder:text-muted-foreground/70"
                      style={{ minHeight: "42px", maxHeight: "100px" }}
                    />
                  </div>
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || sending}
                    className="bg-gradient-to-br from-primary to-amber-700
                               text-white w-[42px] h-[42px] rounded-xl shrink-0
                               disabled:opacity-40 disabled:cursor-not-allowed
                               hover:shadow-lg hover:shadow-primary/30 hover:scale-105
                               active:scale-95
                               flex items-center justify-center transition-all"
                    aria-label="Gửi"
                  >
                    {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                  </button>
                </div>
                <div className="text-[10px] text-muted-foreground/70 mt-1.5 text-center flex items-center justify-center gap-1">
                  <Sparkles size={9} />
                  <span>Phản hồi tự động ngay · Tư vấn viên trả lời trong 30 giây</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
