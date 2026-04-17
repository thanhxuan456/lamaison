import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { MessageSquare, Loader2, Send, User, ShieldCheck, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const API = import.meta.env.VITE_API_URL ?? "";

export default function AdminChat() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadSessions = async () => {
    try {
      const res = await fetch(`${API}/api/chat/sessions`);
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch { toast({ title: "Failed to load sessions", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadSessions(); }, []);

  const selectSession = async (session: any) => {
    setSelectedSession(session);
    wsRef.current?.close();
    try {
      const res = await fetch(`${API}/api/chat/sessions/${session.id}/messages`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {}

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}${API}/api/chat/ws/${session.id}`);
    wsRef.current = ws;
    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "message") setMessages((prev) => [...prev, msg.data]);
      } catch {}
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    };
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedSession) return;
    setSending(true);
    try {
      await fetch(`${API}/api/chat/sessions/${selectedSession.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderType: "admin", senderName: "Grand Palace Support", message: reply }),
      });
      setReply("");
    } catch { toast({ title: "Failed to send", variant: "destructive" }); }
    finally { setSending(false); }
  };

  return (
    <AdminGuard>
      <AdminLayout title="Live Chat Support" subtitle="Monitor and respond to guest messages">
        <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[500px]">
          {/* Sessions list */}
          <div className="w-72 shrink-0 bg-card border border-primary/20 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-primary/15 bg-primary/5">
              <span className="text-[10px] tracking-[0.3em] uppercase text-primary font-serif">Active Sessions</span>
              <button onClick={loadSessions} className="text-muted-foreground hover:text-primary transition-colors"><RefreshCw size={13} /></button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={20} /></div>
              ) : sessions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs px-4">No active chat sessions yet.</div>
              ) : sessions.map((s) => (
                <button key={s.id} onClick={() => selectSession(s)}
                  className={`w-full text-left px-4 py-3 border-b border-primary/10 transition-colors hover:bg-primary/10 ${selectedSession?.id === s.id ? "bg-primary/15" : ""}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-6 h-6 bg-primary/20 border border-primary/40 flex items-center justify-center">
                      <User size={11} className="text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground truncate">{s.guestName || `Guest #${String(s.id).slice(0, 6)}`}</span>
                  </div>
                  <div className="text-xs text-muted-foreground pl-8">
                    {s.status === "active" ? (
                      <span className="text-green-500 dark:text-green-400">● Active</span>
                    ) : (
                      <span className="text-muted-foreground">Closed</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat panel */}
          <div className="flex-1 bg-card border border-primary/20 flex flex-col">
            {!selectedSession ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <MessageSquare size={32} className="text-primary/30" />
                <p className="text-sm">Select a session to view messages</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-5 py-3 border-b border-primary/15 bg-primary/5">
                  <User size={14} className="text-primary" />
                  <span className="font-medium text-foreground text-sm">{selectedSession.guestName || "Guest"}</span>
                  <span className={`text-[10px] ml-auto px-2 py-0.5 border ${wsConnected ? "border-green-400/40 text-green-500" : "border-primary/20 text-muted-foreground"}`}>
                    {wsConnected ? "● Connected" : "○ Offline"}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.senderType === "admin" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] px-3 py-2 text-sm rounded-none ${
                        m.senderType === "admin"
                          ? "bg-primary text-primary-foreground"
                          : m.senderType === "system"
                          ? "bg-muted text-muted-foreground text-xs italic text-center mx-auto"
                          : "bg-secondary text-secondary-foreground border border-primary/15"
                      }`}>
                        {m.senderType !== "system" && (
                          <div className="text-[10px] opacity-70 mb-0.5 flex items-center gap-1">
                            {m.senderType === "admin" && <ShieldCheck size={9} />}
                            {m.senderName}
                          </div>
                        )}
                        {m.message}
                      </div>
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>

                <div className="flex gap-2 p-4 border-t border-primary/15">
                  <input
                    className="flex-1 border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
                    value={reply} onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendReply())}
                    placeholder="Type a reply as Grand Palace Support..."
                  />
                  <Button onClick={sendReply} disabled={sending || !reply.trim()} className="rounded-none bg-primary text-primary-foreground h-9 px-4">
                    {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
