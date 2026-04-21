import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import {
  Loader2, Filter, RefreshCw, UserCheck, ShieldCheck, Ticket,
  Mail, Phone, Clock, AlertCircle, CheckCircle2, MessageSquare, ChevronRight,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "";

interface Session {
  id: number | string;
  ticketNumber?: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
  guestPhone?: string | null;
  status?: string | null;
  priority?: string | null;
  assigneeUserId?: string | null;
  assigneeName?: string | null;
  assigneeRole?: string | null;
  assignedAt?: string | null;
  resolvedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface AdminUser {
  id: string | number;
  clerkUserId?: string | null;
  email?: string | null;
  name?: string | null;
  role?: string | null;
}

const STATUSES = [
  { value: "all", label: "Tất cả", color: "text-foreground" },
  { value: "open", label: "Mới", color: "text-blue-500" },
  { value: "assigned", label: "Đang xử lý", color: "text-amber-500" },
  { value: "pending", label: "Chờ khách", color: "text-purple-500" },
  { value: "resolved", label: "Đã xử lý", color: "text-green-500" },
  { value: "closed", label: "Đóng", color: "text-muted-foreground" },
];

const PRIORITIES = [
  { value: "low",    label: "Thấp",       cls: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  { value: "normal", label: "Bình thường", cls: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400" },
  { value: "high",   label: "Cao",        cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  { value: "urgent", label: "Khẩn cấp",   cls: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
];

function statusBadge(status?: string | null) {
  const s = status ?? "open";
  const m = STATUSES.find(x => x.value === s);
  return (
    <span className={`text-[10px] px-2 py-0.5 border border-current/30 ${m?.color ?? "text-foreground"}`}>
      {m?.label ?? s}
    </span>
  );
}

function priorityBadge(p?: string | null) {
  const m = PRIORITIES.find(x => x.value === (p ?? "normal"));
  return <span className={`text-[10px] px-2 py-0.5 rounded-full ${m?.cls ?? ""}`}>{m?.label ?? p}</span>;
}

export default function AdminChatTickets() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [sRes, uRes] = await Promise.all([
        fetch(`${API}/api/chat/sessions`),
        fetch(`${API}/api/users`),
      ]);
      const sData = sRes.ok ? await sRes.json() : [];
      const uData = uRes.ok ? await uRes.json() : [];
      setSessions(Array.isArray(sData) ? sData : []);
      setUsers(Array.isArray(uData) ? uData : []);
    } catch { toast({ title: "Không tải được dữ liệu", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Only admins & moderators can be assignees.
  const assignableUsers = useMemo(
    () => users.filter(u => u.role === "admin" || u.role === "moderator"),
    [users]
  );

  const filtered = useMemo(() => {
    let list = sessions.slice().sort((a, b) => {
      const tb = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
      const ta = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
      return tb - ta;
    });
    if (filter !== "all") list = list.filter(s => (s.status ?? "open") === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        (s.ticketNumber ?? "").toLowerCase().includes(q) ||
        (s.guestName ?? "").toLowerCase().includes(q) ||
        (s.guestEmail ?? "").toLowerCase().includes(q) ||
        (s.guestPhone ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [sessions, filter, search]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: sessions.length };
    for (const s of sessions) {
      const k = s.status ?? "open";
      map[k] = (map[k] ?? 0) + 1;
    }
    return map;
  }, [sessions]);

  const patch = async (id: string | number, body: object) => {
    setBusyId(id);
    try {
      const r = await fetch(`${API}/api/chat/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error();
      const updated = await r.json();
      setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
    } catch { toast({ title: "Cập nhật thất bại", variant: "destructive" }); }
    finally { setBusyId(null); }
  };

  const assign = (s: Session, userId: string) => {
    if (!userId) {
      patch(s.id, { assigneeUserId: null, assigneeName: null, assigneeRole: null, status: "open" });
      return;
    }
    const u = assignableUsers.find(x => String(x.clerkUserId ?? x.id) === userId);
    patch(s.id, {
      assigneeUserId: userId,
      assigneeName: u?.name ?? u?.email ?? "Hỗ trợ",
      assigneeRole: u?.role ?? "admin",
      status: "assigned",
    });
  };

  return (
    <AdminGuard>
      <AdminLayout title="Quản Lý Tickets" subtitle="Phân công & xử lý các phiên Live Chat dưới dạng ticket hỗ trợ">
        {/* Filters bar */}
        <div className="bg-card border border-primary/20 mb-3">
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b border-primary/10">
            <Filter size={13} className="text-primary" />
            {STATUSES.map(s => (
              <button
                key={s.value}
                onClick={() => setFilter(s.value)}
                className={`text-[11px] px-3 py-1 border transition-colors ${
                  filter === s.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-primary/20 text-muted-foreground hover:border-primary/40"
                }`}
              >
                {s.label} <span className="opacity-60">({counts[s.value] ?? 0})</span>
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm mã ticket, tên, email, sđt..."
                className="bg-background border border-primary/25 rounded px-2 py-1 text-xs outline-none focus:border-primary w-56"
              />
              <button onClick={load} className="p-1.5 text-muted-foreground hover:text-primary border border-primary/20" title="Tải lại">
                <RefreshCw size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Tickets table */}
        <div className="bg-card border border-primary/20 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" size={22} /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">
              <Ticket size={28} className="mx-auto mb-2 text-primary/40" />
              Không có ticket nào ở trạng thái này.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-primary/5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Mã ticket</th>
                    <th className="px-3 py-2 text-left">Khách hàng</th>
                    <th className="px-3 py-2 text-left">Liên hệ</th>
                    <th className="px-3 py-2 text-left">Trạng thái</th>
                    <th className="px-3 py-2 text-left">Ưu tiên</th>
                    <th className="px-3 py-2 text-left">Phân công</th>
                    <th className="px-3 py-2 text-left">Cập nhật</th>
                    <th className="px-3 py-2 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {filtered.map(s => (
                    <tr key={s.id} className="hover:bg-primary/5">
                      <td className="px-3 py-2 font-mono text-[11px] text-primary whitespace-nowrap">
                        {s.ticketNumber ?? `#${s.id}`}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-foreground text-[13px]">{s.guestName || "Khách"}</div>
                        <div className="text-[10px] text-muted-foreground">ID #{s.id}</div>
                      </td>
                      <td className="px-3 py-2 text-[11px]">
                        {s.guestEmail && (
                          <div className="flex items-center gap-1 text-muted-foreground"><Mail size={10} /> {s.guestEmail}</div>
                        )}
                        {s.guestPhone && (
                          <div className="flex items-center gap-1 text-muted-foreground"><Phone size={10} /> {s.guestPhone}</div>
                        )}
                        {!s.guestEmail && !s.guestPhone && <span className="text-muted-foreground/60">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          disabled={busyId === s.id}
                          value={s.status ?? "open"}
                          onChange={(e) => patch(s.id, { status: e.target.value })}
                          className="bg-background border border-primary/20 rounded px-2 py-1 text-[11px] outline-none focus:border-primary"
                        >
                          {STATUSES.filter(x => x.value !== "all").map(x => (
                            <option key={x.value} value={x.value}>{x.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          disabled={busyId === s.id}
                          value={s.priority ?? "normal"}
                          onChange={(e) => patch(s.id, { priority: e.target.value })}
                          className="bg-background border border-primary/20 rounded px-2 py-1 text-[11px] outline-none focus:border-primary"
                        >
                          {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                        <div className="mt-1">{priorityBadge(s.priority)}</div>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          disabled={busyId === s.id}
                          value={s.assigneeUserId ?? ""}
                          onChange={(e) => assign(s, e.target.value)}
                          className="bg-background border border-primary/20 rounded px-2 py-1 text-[11px] outline-none focus:border-primary max-w-[180px]"
                        >
                          <option value="">— Chưa phân công —</option>
                          {assignableUsers.map(u => {
                            const id = String(u.clerkUserId ?? u.id);
                            return (
                              <option key={id} value={id}>
                                {u.role === "admin" ? "👑 " : "🛡 "}{u.name ?? u.email ?? id}
                              </option>
                            );
                          })}
                        </select>
                        {s.assigneeName && (
                          <div className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1">
                            {s.assigneeRole === "admin" ? <ShieldCheck size={9} className="text-primary" /> : <UserCheck size={9} />}
                            {s.assigneeName}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-[10px] text-muted-foreground whitespace-nowrap">
                        <div className="flex items-center gap-1"><Clock size={9} /> {s.updatedAt ? new Date(s.updatedAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—"}</div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Link href={`/admin/chat?session=${s.id}`}>
                          <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1">
                            <MessageSquare size={10} /> Mở chat <ChevronRight size={10} />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Helper */}
        <div className="mt-3 text-[11px] text-muted-foreground flex items-center gap-2">
          <AlertCircle size={11} /> Chỉ tài khoản có vai trò <strong>admin</strong> hoặc <strong>moderator</strong> mới hiện trong danh sách phân công.
          Quản lý tài khoản tại <Link href="/admin/users" className="text-primary hover:underline">Quản Lý Người Dùng</Link>.
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
