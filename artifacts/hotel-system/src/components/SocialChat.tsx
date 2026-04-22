import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/react";
import { MessageSquare, X, Send, Minimize2, Maximize2, Loader2, Phone } from "lucide-react";
import { useT } from "@/lib/i18n";

/* ── Icon paths by social id ── */
const ICONS: Record<string, { path: string; viewBox: string }> = {
  facebook: {
    viewBox: "0 0 24 24",
    path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
  zalo: {
    viewBox: "0 0 64 64",
    path: "M32 8C18.745 8 8 18.745 8 32s10.745 24 24 24 24-10.745 24-24S45.255 8 32 8zm-4 32H20v-2l7-9h-7v-2h8v2l-7 9h7v2zm6 0h-2.5V32H30v-2h3.5v10zm8 0H35v-2l4-6h-4v-2h6v2l-4 6h4v2z",
  },
  whatsapp: {
    viewBox: "0 0 24 24",
    path: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z",
  },
  telegram: {
    viewBox: "0 0 24 24",
    path: "M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z",
  },
  phone: {
    viewBox: "0 0 24 24",
    path: "M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z",
  },
};

function SocialIcon({ id, color }: { id: string; color: string }) {
  const icon = ICONS[id];
  if (!icon) return <MessageSquare size={18} className="text-white" />;
  return (
    <svg width="18" height="18" viewBox={icon.viewBox} fill="white" aria-hidden="true">
      <path d={icon.path} />
    </svg>
  );
}

/* ── Social config ── */
const SOCIAL_STORAGE_KEY = "grand-palace-social-links";

interface SocialLink {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
  color: string;
}

const DEFAULT_SOCIALS: SocialLink[] = [
  { id: "facebook", label: "Facebook", href: "https://m.me/maisondeluxehotels", enabled: true, color: "#1877F2" },
  { id: "zalo", label: "Zalo", href: "https://zalo.me/0900000000", enabled: true, color: "#0068FF" },
  { id: "whatsapp", label: "WhatsApp", href: "https://wa.me/84900000000", enabled: true, color: "#25D366" },
  { id: "telegram", label: "Telegram", href: "https://t.me/maisondeluxe", enabled: false, color: "#229ED9" },
  { id: "phone", label: "Hotline", href: "tel:+84900000000", enabled: true, color: "#b8973e" },
];

function getSocials(): SocialLink[] {
  try { const s = localStorage.getItem(SOCIAL_STORAGE_KEY); return s ? JSON.parse(s) : DEFAULT_SOCIALS; } catch { return DEFAULT_SOCIALS; }
}

/* ── Live chat types ── */
interface Message {
  id: string;
  senderType: "user" | "admin" | "system";
  senderName: string;
  message: string;
  createdAt: string;
}

const API_URL = import.meta.env.VITE_API_URL ?? "";

// Format thoi gian an toan: tra ve "" neu thieu/khong hop le de tranh "Invalid Date".
function formatTime(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

export function SocialChat() {
  const { user } = useUser();
  const { t } = useT();

  const [hubOpen, setHubOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);
  const [socials, setSocials] = useState<SocialLink[]>(DEFAULT_SOCIALS);

  // Pre-chat form cho khach chua dang nhap. User da dang nhap se bo qua buoc nay.
  const [preForm, setPreForm] = useState({ name: "", email: "", phone: "" });
  const [preFormError, setPreFormError] = useState<string | null>(null);
  const [creatingSession, setCreatingSession] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const sessionInitialized = useRef(false);

  useEffect(() => { setSocials(getSocials()); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const connectWs = useCallback((sid: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}${API_URL}/api/chat/ws/${sid}`);
    wsRef.current = ws;
    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => { setWsConnected(false); setTimeout(() => connectWs(sid), 3000); };
    ws.onmessage = (e) => {
      try {
        const msg: Message = JSON.parse(e.data);
        setMessages((p) => [...p, msg]);
        if (!chatOpen || minimized) setUnread((u) => u + 1);
      } catch {}
    };
  }, [chatOpen, minimized]);

  const initSession = useCallback(async (guest?: { name: string; email: string; phone: string }) => {
    if (sessionInitialized.current) return;
    sessionInitialized.current = true;
    const guestName  = guest?.name  || user?.fullName || user?.firstName || "Khách";
    const guestEmail = guest?.email || user?.primaryEmailAddress?.emailAddress || null;
    const guestPhone = guest?.phone || null;
    const stored = sessionStorage.getItem("chat_session_id");
    if (stored) {
      setSessionId(stored);
      const r = await fetch(`${API_URL}/api/chat/sessions/${stored}/messages`);
      if (r.ok) setMessages(await r.json());
      connectWs(stored);
      return;
    }
    setCreatingSession(true);
    try {
      const r = await fetch(`${API_URL}/api/chat/sessions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestName, guestEmail, guestPhone }),
      });
      if (r.ok) {
        const s = await r.json();
        sessionStorage.setItem("chat_session_id", String(s.id));
        setSessionId(String(s.id));
        setMessages([{ id: "w", senderType: "system", senderName: "GP", message: t("chat.welcome"), createdAt: new Date().toISOString() }]);
        connectWs(String(s.id));
      } else {
        sessionInitialized.current = false; // cho phep thu lai
        setPreFormError("Khong khoi tao duoc cuoc tro chuyen. Vui long thu lai.");
      }
    } catch {
      sessionInitialized.current = false;
      setPreFormError("Loi ket noi. Vui long thu lai.");
    } finally {
      setCreatingSession(false);
    }
  }, [user, t, connectWs]);

  const openChat = () => {
    setChatOpen(true); setMinimized(false); setHubOpen(false);
    setUnread(0);
    // Da co session hoac da dang nhap → khoi tao luon. Khach chua login → cho dien form.
    const stored = sessionStorage.getItem("chat_session_id");
    if (sessionId || stored || user) {
      if (!sessionId) initSession();
    }
  };

  const submitPreForm = async () => {
    setPreFormError(null);
    const name  = preForm.name.trim();
    const email = preForm.email.trim();
    const phone = preForm.phone.trim();
    if (!name)  { setPreFormError("Vui long nhap ho ten."); return; }
    if (!email && !phone) { setPreFormError("Vui long nhap email hoac so dien thoai de chung toi lien lac lai."); return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setPreFormError("Email khong hop le."); return; }
    await initSession({ name, email, phone });
  };

  const needsPreForm = chatOpen && !sessionId && !user;

  useEffect(() => { if (chatOpen) setUnread(0); }, [chatOpen]);
  useEffect(() => () => { wsRef.current?.close(); }, []);

  const send = async () => {
    if (!input.trim() || !sessionId || sending) return;
    const text = input.trim(); setInput(""); setSending(true);
    try {
      await fetch(`${API_URL}/api/chat/sessions/${sessionId}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderType: "user", senderName: user?.firstName ?? "Khách", message: text }),
      });
    } finally { setSending(false); }
  };

  const enabledSocials = socials.filter((s) => s.enabled);
  const isOpen = chatOpen || hubOpen;

  return (
    <>
      {/* ── Live chat window ── */}
      {chatOpen && (
        <div className={`fixed bottom-24 right-6 z-50 w-[360px] shadow-2xl border border-primary/50 bg-card flex flex-col transition-all duration-300 ${minimized ? "h-14" : "h-[520px]"}`}>
          <span className="pointer-events-none absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 border-primary z-10" />
          <span className="pointer-events-none absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-primary z-10" />
          <span className="pointer-events-none absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2 border-primary z-10" />
          <span className="pointer-events-none absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-primary z-10" />

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary/10 border-b border-primary/20 shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-8 h-8 bg-primary/20 border border-primary flex items-center justify-center overflow-hidden">
                  <img src="/logo.svg" alt="GP" className="h-5 w-5 object-contain" onError={(e) => {(e.currentTarget as HTMLImageElement).style.display="none";}} />
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-card ${wsConnected ? "bg-green-400" : "bg-yellow-400"}`} />
              </div>
              <div>
                <div className="font-serif text-sm text-foreground">{t("chat.title")}</div>
                <div className="text-[10px] text-muted-foreground">{wsConnected ? t("chat.online") : t("chat.connecting")}</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setMinimized((m) => !m)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                {minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
              <button onClick={() => setChatOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          {!minimized && needsPreForm && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="text-[11px] text-muted-foreground leading-relaxed">
                Vui lòng để lại thông tin để chúng tôi liên hệ hỗ trợ bạn nhanh hơn.
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Họ tên *</label>
                  <input
                    type="text"
                    value={preForm.name}
                    onChange={(e) => setPreForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Nguyễn Văn A"
                    className="w-full bg-background border border-primary/20 focus:border-primary text-foreground text-sm px-3 py-2 outline-none transition-colors placeholder:text-muted-foreground/60 mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Email</label>
                  <input
                    type="email"
                    value={preForm.email}
                    onChange={(e) => setPreForm((p) => ({ ...p, email: e.target.value }))}
                    placeholder="ban@example.com"
                    className="w-full bg-background border border-primary/20 focus:border-primary text-foreground text-sm px-3 py-2 outline-none transition-colors placeholder:text-muted-foreground/60 mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Số điện thoại</label>
                  <input
                    type="tel"
                    value={preForm.phone}
                    onChange={(e) => setPreForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="0900 000 000"
                    className="w-full bg-background border border-primary/20 focus:border-primary text-foreground text-sm px-3 py-2 outline-none transition-colors placeholder:text-muted-foreground/60 mt-1"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">* Bắt buộc nhập họ tên và ít nhất email hoặc số điện thoại.</p>
                {preFormError && (
                  <p className="text-[11px] text-red-500">{preFormError}</p>
                )}
                <button
                  onClick={submitPreForm}
                  disabled={creatingSession}
                  className="w-full bg-primary text-primary-foreground text-sm py-2 hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {creatingSession ? <Loader2 size={14} className="animate-spin" /> : null}
                  Bắt đầu trò chuyện
                </button>
              </div>
            </div>
          )}

          {!minimized && !needsPreForm && (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => {
                  if (msg.senderType === "system") return (
                    <div key={msg.id} className="text-center">
                      <span className="text-[11px] text-muted-foreground bg-muted px-3 py-1 inline-block">{msg.message}</span>
                    </div>
                  );
                  const isUser = msg.senderType === "user";
                  return (
                    <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2`}>
                      {!isUser && (
                        <div className="w-7 h-7 shrink-0 bg-primary/20 border border-primary flex items-center justify-center mt-1">
                          <span className="text-[9px] font-serif text-primary font-bold">GP</span>
                        </div>
                      )}
                      <div className={`max-w-[75%] flex flex-col gap-0.5 ${isUser ? "items-end" : "items-start"}`}>
                        <div className={`px-3 py-2 text-sm leading-relaxed ${isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground border border-primary/15"}`}>
                          {msg.message}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatTime(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              <div className="border-t border-primary/15 p-3 shrink-0">
                <div className="flex gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
                    placeholder={t("chat.placeholder")}
                    rows={1}
                    className="flex-1 bg-background border border-primary/20 focus:border-primary text-foreground text-sm px-3 py-2 resize-none outline-none transition-colors placeholder:text-muted-foreground"
                    style={{ minHeight: "36px", maxHeight: "100px" }}
                  />
                  <button onClick={send} disabled={!input.trim() || sending}
                    className="bg-primary text-primary-foreground px-3 disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center justify-center">
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1.5 text-center">{t("chat.enter")}</div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Social hub panel ── */}
      {hubOpen && !chatOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-56 bg-card border border-primary/40 shadow-2xl overflow-hidden">
          <span className="pointer-events-none absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 border-primary z-10" />
          <span className="pointer-events-none absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-primary z-10" />
          <span className="pointer-events-none absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2 border-primary z-10" />
          <span className="pointer-events-none absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-primary z-10" />

          <div className="flex items-center justify-between px-4 py-3 border-b border-primary/20 bg-primary/5">
            <span className="font-serif text-[11px] tracking-[0.2em] text-primary uppercase">Liên hệ</span>
            <button onClick={() => setHubOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={13} />
            </button>
          </div>

          {/* Live chat */}
          <button onClick={openChat}
            className="w-full flex items-center gap-3 px-4 py-3 border-b border-primary/10 hover:bg-primary/5 transition-colors group text-left">
            <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-primary text-primary-foreground">
              <MessageSquare size={16} />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">Live Chat</div>
              <div className="text-[10px] text-muted-foreground">{t("chat.online")}</div>
            </div>
          </button>

          {/* Social buttons */}
          {enabledSocials.map((s) => (
            <a key={s.id} href={s.href} target={s.id === "phone" ? "_self" : "_blank"} rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 border-b border-primary/10 last:border-b-0 hover:bg-primary/5 transition-colors"
              onClick={() => setHubOpen(false)}>
              <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: s.color }}>
                <SocialIcon id={s.id} color={s.color} />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{s.label}</div>
                <div className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                  {s.href.replace(/https?:\/\/(www\.)?/, "").replace(/^tel:/, "")}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* ── Floating button ── */}
      <button
        onClick={() => {
          if (chatOpen) { setChatOpen(false); setHubOpen(false); }
          else setHubOpen((h) => !h);
        }}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 ${
          isOpen ? "bg-muted-foreground text-background" : "bg-primary text-primary-foreground"
        }`}
        aria-label={t("chat.open")}
      >
        {isOpen ? <X size={22} /> : <MessageSquare size={22} />}
        {unread > 0 && !chatOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
    </>
  );
}
