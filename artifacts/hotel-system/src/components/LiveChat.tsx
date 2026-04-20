import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@clerk/react";
import { MessageSquare, X, Send, Minimize2, Maximize2, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n";

interface Message {
  id: string;
  senderType: "user" | "admin" | "system";
  senderName: string;
  message: string;
  createdAt: string;
}

const API_URL = import.meta.env.VITE_API_URL ?? "";

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
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionInitialized = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const connectWs = useCallback((sid: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${proto}//${window.location.host}${API_URL}/api/chat/ws/${sid}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => {
      setWsConnected(false);
      setTimeout(() => connectWs(sid), 3000);
    };
    ws.onmessage = (e) => {
      try {
        const msg: Message = JSON.parse(e.data);
        setMessages((prev) => [...prev, msg]);
        if (!open || minimized) setUnread((u) => u + 1);
      } catch { }
    };
  }, [open, minimized, API_URL]);

  const initSession = useCallback(async () => {
    if (sessionInitialized.current) return;
    sessionInitialized.current = true;

    const guestName = user?.fullName ?? user?.firstName ?? "Khách";
    const guestEmail = user?.primaryEmailAddress?.emailAddress;
    const stored = sessionStorage.getItem("chat_session_id");
    if (stored) {
      setSessionId(stored);
      const res = await fetch(`${API_URL}/api/chat/sessions/${stored}/messages`);
      if (res.ok) setMessages(await res.json());
      connectWs(stored);
      return;
    }

    const res = await fetch(`${API_URL}/api/chat/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestName, guestEmail }),
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
  }, [user, t, connectWs, API_URL]);

  useEffect(() => {
    if (open && !sessionId) initSession();
    if (open) setUnread(0);
  }, [open, sessionId, initSession]);

  useEffect(() => {
    return () => { wsRef.current?.close(); };
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || !sessionId || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    try {
      await fetch(`${API_URL}/api/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderType: "user",
          senderName: user?.firstName ?? "Khách",
          message: text,
        }),
      });
    } catch { } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { setOpen(true); setMinimized(false); }}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary text-primary-foreground shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-105 ${open && !minimized ? "opacity-0 pointer-events-none" : "opacity-100"}`}
        aria-label={t("chat.open")}
      >
        <MessageSquare size={24} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div className={`fixed bottom-6 right-6 z-50 w-[360px] shadow-2xl border border-primary/50 bg-card flex flex-col transition-all duration-300 ${minimized ? "h-14" : "h-[520px]"}`}>
          {/* Corner accents */}
          <span className="pointer-events-none absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 border-primary z-10" />
          <span className="pointer-events-none absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-primary z-10" />
          <span className="pointer-events-none absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2 border-primary z-10" />
          <span className="pointer-events-none absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-primary z-10" />

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-primary/10 border-b border-primary/20 shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-8 h-8 bg-primary/20 border border-primary flex items-center justify-center">
                  <MessageSquare size={14} className="text-primary" />
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
              <button onClick={() => setOpen(false)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
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
                      <div className={`max-w-[75%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                        <div className={`px-3 py-2 text-sm leading-relaxed ${
                          isUser
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground border border-primary/15"
                        }`}>
                          {msg.message}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-primary/15 p-3 shrink-0">
                <div className="flex gap-2">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t("chat.placeholder")}
                    rows={1}
                    className="flex-1 bg-background border border-primary/20 focus:border-primary text-foreground text-sm px-3 py-2 resize-none outline-none transition-colors placeholder:text-muted-foreground"
                    style={{ minHeight: "36px", maxHeight: "100px" }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || sending}
                    className="bg-primary text-primary-foreground px-3 disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center justify-center"
                  >
                    {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1.5 text-center">{t("chat.enter")}</div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
