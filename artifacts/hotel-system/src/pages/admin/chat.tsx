import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import {
  MessageSquare, Loader2, Send, User, ShieldCheck, RefreshCw,
  Trash2, Download, CheckSquare, Square, X, FileText, FileJson,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const API = import.meta.env.VITE_API_URL ?? "";

interface ChatSession {
  id: number | string;
  guestName?: string | null;
  guestEmail?: string | null;
  status?: string;
  updatedAt?: string;
}
interface ChatMessage {
  id: number | string;
  sessionId: string | number;
  senderType: "user" | "admin" | "system";
  senderName: string;
  message: string;
  createdAt?: string;
}

function downloadFile(name: string, mime: string, data: string) {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

export default function AdminChat() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadSessions = async () => {
    try {
      const res = await fetch(`${API}/api/chat/sessions`);
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch { toast({ title: "Không tải được danh sách", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadSessions(); }, []);

  const selectSession = async (session: ChatSession) => {
    setSelectedSession(session);
    setExportOpen(false);
    wsRef.current?.close();
    try {
      const res = await fetch(`${API}/api/chat/sessions/${session.id}/messages`);
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {}

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}${API}/api/chat/ws/${session.id}?role=admin`);
    wsRef.current = ws;
    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "presence") return; // ignore — admin already knows it's online
        if (msg.type === "message") setMessages((prev) => [...prev, msg.data]);
        else if (msg.id) setMessages((prev) => [...prev, msg]);
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
        body: JSON.stringify({ senderType: "admin", senderName: "MAISON DELUXE Support", message: reply }),
      });
      setReply("");
    } catch { toast({ title: "Gửi thất bại", variant: "destructive" }); }
    finally { setSending(false); }
  };

  /* ──────────── Selection helpers ──────────── */
  const toggleSelect = (id: string | number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAll = () => setSelectedIds(new Set(sessions.map(s => s.id)));
  const clearSelection = () => setSelectedIds(new Set());

  /* ──────────── Delete (single + bulk) ──────────── */
  const deleteSession = async (id: string | number) => {
    if (!confirm("Xoá phiên chat này? Toàn bộ tin nhắn cũng sẽ bị xoá vĩnh viễn.")) return;
    try {
      const res = await fetch(`${API}/api/chat/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
      setSessions(prev => prev.filter(s => s.id !== id));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      if (selectedSession?.id === id) { setSelectedSession(null); setMessages([]); wsRef.current?.close(); }
      toast({ title: "Đã xoá phiên chat" });
    } catch { toast({ title: "Xoá thất bại", variant: "destructive" }); }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Xoá ${selectedIds.size} phiên chat đã chọn? Hành động không thể hoàn tác.`)) return;
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch(`${API}/api/chat/sessions/bulk-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("bulk delete failed");
      setSessions(prev => prev.filter(s => !selectedIds.has(s.id)));
      if (selectedSession && selectedIds.has(selectedSession.id)) {
        setSelectedSession(null); setMessages([]); wsRef.current?.close();
      }
      clearSelection();
      toast({ title: `Đã xoá ${ids.length} phiên chat` });
    } catch { toast({ title: "Xoá hàng loạt thất bại", variant: "destructive" }); }
  };

  /* ──────────── Export current chat ──────────── */
  const exportCurrent = (format: "txt" | "json") => {
    if (!selectedSession) return;
    const guest = selectedSession.guestName || `guest-${selectedSession.id}`;
    const safeName = String(guest).replace(/[^a-zA-Z0-9-_]/g, "_");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

    if (format === "json") {
      const payload = { session: selectedSession, messages, exportedAt: new Date().toISOString() };
      downloadFile(`chat-${safeName}-${stamp}.json`, "application/json", JSON.stringify(payload, null, 2));
    } else {
      const lines: string[] = [];
      lines.push(`MAISON DELUXE Hotels — Chat Transcript`);
      lines.push(`Khách: ${selectedSession.guestName || "(không tên)"}${selectedSession.guestEmail ? ` <${selectedSession.guestEmail}>` : ""}`);
      lines.push(`Phiên ID: ${selectedSession.id}`);
      lines.push(`Xuất lúc: ${new Date().toLocaleString("vi-VN")}`);
      lines.push(`Tổng số tin nhắn: ${messages.length}`);
      lines.push("─".repeat(60));
      for (const m of messages) {
        const t = m.createdAt ? new Date(m.createdAt).toLocaleString("vi-VN") : "";
        const who = m.senderType === "admin" ? `[ADMIN] ${m.senderName}` :
                    m.senderType === "system" ? "[SYSTEM]" :
                    `[Khách] ${m.senderName}`;
        lines.push(`${t}  ${who}`);
        lines.push(`    ${m.message}`);
        lines.push("");
      }
      downloadFile(`chat-${safeName}-${stamp}.txt`, "text/plain;charset=utf-8", lines.join("\n"));
    }
    setExportOpen(false);
    toast({ title: "Đã xuất file", description: `Định dạng ${format.toUpperCase()}` });
  };

  const allSelected = sessions.length > 0 && selectedIds.size === sessions.length;
  const someSelected = selectedIds.size > 0;

  return (
    <AdminGuard>
      <AdminLayout title="Live Chat Support" subtitle="Theo dõi & trả lời tin nhắn từ khách hàng">
        <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[500px]">
          {/* Sessions list */}
          <div className="w-80 shrink-0 bg-card border border-primary/20 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-primary/15 bg-primary/5">
              <span className="text-[10px] tracking-[0.3em] uppercase text-primary font-serif">Phiên chat ({sessions.length})</span>
              <button onClick={loadSessions} title="Tải lại" className="text-muted-foreground hover:text-primary transition-colors"><RefreshCw size={13} /></button>
            </div>

            {/* Selection toolbar */}
            {sessions.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/10 bg-muted/20 text-[11px]">
                <button onClick={allSelected ? clearSelection : selectAll}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                  {allSelected ? <CheckSquare size={13} className="text-primary" /> : <Square size={13} />}
                  <span>{allSelected ? "Bỏ chọn" : "Chọn tất cả"}</span>
                </button>
                {someSelected && (
                  <>
                    <span className="text-muted-foreground/50">·</span>
                    <span className="text-primary font-medium">{selectedIds.size} đã chọn</span>
                    <button onClick={bulkDelete}
                      className="ml-auto flex items-center gap-1 text-red-500 hover:text-red-600 transition-colors px-2 py-1 border border-red-300/40 hover:bg-red-50 dark:hover:bg-red-950/30">
                      <Trash2 size={11} /> Xoá {selectedIds.size}
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={20} /></div>
              ) : sessions.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs px-4">Chưa có phiên chat nào.</div>
              ) : sessions.map((s) => {
                const isChecked = selectedIds.has(s.id);
                const isActive = selectedSession?.id === s.id;
                return (
                  <div key={s.id}
                    className={`flex items-stretch border-b border-primary/10 transition-colors group ${isActive ? "bg-primary/15" : "hover:bg-primary/10"}`}>
                    <button onClick={(e) => { e.stopPropagation(); toggleSelect(s.id); }}
                      className="px-3 flex items-center text-muted-foreground hover:text-primary transition-colors shrink-0"
                      title={isChecked ? "Bỏ chọn" : "Chọn"}>
                      {isChecked ? <CheckSquare size={14} className="text-primary" /> : <Square size={14} />}
                    </button>
                    <button onClick={() => selectSession(s)} className="flex-1 text-left px-2 py-3 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
                          <User size={11} className="text-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground truncate">{s.guestName || `Khách #${String(s.id).slice(0, 6)}`}</span>
                      </div>
                      <div className="text-xs text-muted-foreground pl-8 flex items-center gap-2">
                        {s.status === "active" || !s.status ? (
                          <span className="text-green-500 dark:text-green-400">● Hoạt động</span>
                        ) : (
                          <span>Đã đóng</span>
                        )}
                        {s.updatedAt && <span className="text-muted-foreground/60 text-[10px]">· {new Date(s.updatedAt).toLocaleDateString("vi-VN")}</span>}
                      </div>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                      className="px-3 flex items-center text-muted-foreground/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                      title="Xoá phiên">
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chat panel */}
          <div className="flex-1 bg-card border border-primary/20 flex flex-col">
            {!selectedSession ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <MessageSquare size={32} className="text-primary/30" />
                <p className="text-sm">Chọn một phiên để xem tin nhắn</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-5 py-3 border-b border-primary/15 bg-primary/5">
                  <User size={14} className="text-primary" />
                  <div className="min-w-0">
                    <div className="font-medium text-foreground text-sm truncate">{selectedSession.guestName || "Khách"}</div>
                    {selectedSession.guestEmail && <div className="text-[10px] text-muted-foreground truncate">{selectedSession.guestEmail}</div>}
                  </div>
                  <span className={`text-[10px] ml-auto px-2 py-0.5 border ${wsConnected ? "border-green-400/40 text-green-500" : "border-primary/20 text-muted-foreground"}`}>
                    {wsConnected ? "● Kết nối" : "○ Offline"}
                  </span>

                  {/* Export dropdown */}
                  <div className="relative">
                    <button onClick={() => setExportOpen(o => !o)}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary border border-primary/20 px-2 py-1 transition-colors">
                      <Download size={11} /> Xuất
                    </button>
                    {exportOpen && (
                      <div className="absolute top-full right-0 mt-1 z-20 bg-card border border-primary/30 shadow-lg min-w-[140px]">
                        <button onClick={() => exportCurrent("txt")}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-primary/10 transition-colors">
                          <FileText size={11} className="text-primary" /> Văn bản (.txt)
                        </button>
                        <button onClick={() => exportCurrent("json")}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-primary/10 transition-colors border-t border-primary/10">
                          <FileJson size={11} className="text-primary" /> JSON (.json)
                        </button>
                      </div>
                    )}
                  </div>

                  <button onClick={() => deleteSession(selectedSession.id)}
                    title="Xoá phiên này"
                    className="flex items-center gap-1 text-[11px] text-red-500 hover:text-red-600 border border-red-300/40 hover:bg-red-50 dark:hover:bg-red-950/30 px-2 py-1 transition-colors">
                    <Trash2 size={11} />
                  </button>
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
                    placeholder="Trả lời với tư cách MAISON DELUXE Support..."
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
