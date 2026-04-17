import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CalendarCheck, CalendarX, LogIn, LogOut, Loader2, Search, FileSignature } from "lucide-react";
import { Link } from "wouter";

const API = import.meta.env.VITE_API_URL ?? "";

type BookingStatus = "pending" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show";

const STATUS_META: Record<BookingStatus, { label: string; cls: string }> = {
  pending:     { label: "Chờ xác nhận", cls: "border-amber-400/40 text-amber-700 dark:text-amber-400 bg-amber-500/5" },
  confirmed:   { label: "Đã xác nhận",  cls: "border-sky-400/40 text-sky-600 dark:text-sky-400 bg-sky-500/5" },
  checked_in:  { label: "Đang ở",       cls: "border-rose-400/40 text-rose-600 dark:text-rose-400 bg-rose-500/5" },
  checked_out: { label: "Đã trả phòng", cls: "border-zinc-400/40 text-zinc-600 dark:text-zinc-400 bg-zinc-500/10" },
  cancelled:   { label: "Đã hủy",       cls: "border-red-400/40 text-red-500 bg-red-500/5" },
  no_show:     { label: "Không đến",    cls: "border-orange-400/40 text-orange-600 dark:text-orange-400 bg-orange-500/5" },
};

const SOURCE_META: Record<string, { label: string; cls: string }> = {
  web:         { label: "Website",      cls: "bg-primary/10 text-primary border-primary/30" },
  walk_in:     { label: "Walk-in",      cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" },
  booking_com: { label: "Booking.com",  cls: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30" },
  agoda:       { label: "Agoda",        cls: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30" },
  expedia:     { label: "Expedia",      cls: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30" },
  airbnb:      { label: "Airbnb",       cls: "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/30" },
  traveloka:   { label: "Traveloka",    cls: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30" },
  trip_com:    { label: "Trip.com",     cls: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30" },
  klook:       { label: "Klook",        cls: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30" },
  tripadvisor: { label: "TripAdvisor",  cls: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30" },
};

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("vi-VN"); } catch { return s; }
}
function fmtMoney(n: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}

function BookingsContent() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<BookingStatus | "all">("all");
  const [filterSource, setFilterSource] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/bookings`);
      const data = await res.json();
      setBookings(data);
    } catch { toast({ title: "Không tải được danh sách đặt phòng", variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const action = async (id: number, kind: "check-in" | "check-out" | "cancel") => {
    setBusyId(id);
    try {
      const url = kind === "cancel"
        ? `${API}/api/bookings/${id}`
        : `${API}/api/bookings/${id}/${kind}`;
      const method = kind === "cancel" ? "DELETE" : "POST";
      const res = await fetch(url, { method });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Lỗi");
      const labelMap = { "check-in": "Check-in", "check-out": "Check-out", "cancel": "Hủy" };
      toast({ title: `${labelMap[kind]} thành công`, description: `Booking #${id}` });
      load();
    } catch (e: any) {
      toast({ title: "Lỗi", description: e.message, variant: "destructive" });
    } finally { setBusyId(null); }
  };

  const sources = Array.from(new Set(bookings.map((b) => b.source ?? "web")));
  const filtered = bookings
    .filter((b) => filterStatus === "all" || b.status === filterStatus)
    .filter((b) => filterSource === "all" || (b.source ?? "web") === filterSource)
    .filter((b) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return [b.guestName, b.guestEmail, b.guestPhone, b.externalRef, String(b.id)]
        .filter(Boolean).some((v: string) => String(v).toLowerCase().includes(q));
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, email, SĐT, mã OTA…"
            className="pl-9 pr-3 py-2 text-sm border border-primary/25 bg-background text-foreground outline-none w-72"
          />
        </div>
        <select className="border border-primary/25 bg-background text-sm text-foreground px-3 py-2 outline-none"
          value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
          <option value="all">Tất cả trạng thái</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="border border-primary/25 bg-background text-sm text-foreground px-3 py-2 outline-none"
          value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
          <option value="all">Tất cả nguồn</option>
          {sources.map((s) => <option key={s} value={s}>{SOURCE_META[s]?.label ?? s}</option>)}
        </select>
        <span className="text-sm text-muted-foreground ml-auto">{filtered.length} đặt phòng</span>
      </div>

      <div className="bg-card border border-primary/20">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary/15 bg-primary/5">
                {["#", "Khách", "Phòng", "Check-in", "Check-out", "Nguồn", "Trạng thái", "Tổng tiền", "Hành động"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-normal whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {loading ? (
                <tr><td colSpan={9} className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-primary" size={20} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-muted-foreground">Không có đặt phòng nào.</td></tr>
              ) : filtered.map((b) => {
                const status = (b.status ?? "confirmed") as BookingStatus;
                const src = b.source ?? "web";
                const srcMeta = SOURCE_META[src] ?? { label: src, cls: "bg-muted text-muted-foreground border-border" };
                const stMeta = STATUS_META[status] ?? STATUS_META.confirmed;
                return (
                  <tr key={b.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground text-xs">{b.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{b.guestName}</div>
                      <div className="text-[11px] text-muted-foreground">{b.guestEmail}</div>
                      <div className="text-[11px] text-muted-foreground">{b.guestPhone}</div>
                      {b.externalRef && (
                        <div className="text-[10px] text-primary/70 mt-0.5 font-mono">Ref: {b.externalRef}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div>{b.room?.roomNumber ?? `#${b.roomId}`}</div>
                      <div className="text-[11px] text-muted-foreground">{b.room?.type}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{fmtDate(b.checkInDate)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{fmtDate(b.checkOutDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] tracking-widest uppercase px-2 py-0.5 border ${srcMeta.cls}`}>
                        {srcMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] tracking-widest uppercase px-2 py-0.5 border ${stMeta.cls}`}>
                        {stMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">{fmtMoney(b.totalPrice)} ₫</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {(status === "confirmed" || status === "pending") && (
                          <button disabled={busyId === b.id}
                            onClick={() => action(b.id, "check-in")}
                            title="Check-in"
                            className="p-1.5 border border-emerald-400/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-40">
                            {busyId === b.id ? <Loader2 size={12} className="animate-spin" /> : <LogIn size={12} />}
                          </button>
                        )}
                        {status === "checked_in" && (
                          <button disabled={busyId === b.id}
                            onClick={() => action(b.id, "check-out")}
                            title="Check-out"
                            className="p-1.5 border border-sky-400/40 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 disabled:opacity-40">
                            {busyId === b.id ? <Loader2 size={12} className="animate-spin" /> : <LogOut size={12} />}
                          </button>
                        )}
                        <Link href={`/bookings/${b.id}/contract`}>
                          <button title="Tải hợp đồng"
                            className="p-1.5 border border-primary/40 text-primary hover:bg-primary/10">
                            <FileSignature size={12} />
                          </button>
                        </Link>
                        {status !== "cancelled" && status !== "checked_out" && (
                          <button disabled={busyId === b.id}
                            onClick={() => { if (confirm("Hủy đặt phòng này?")) action(b.id, "cancel"); }}
                            title="Hủy"
                            className="p-1.5 border border-red-400/40 text-red-500 hover:bg-red-500/10 disabled:opacity-40">
                            <CalendarX size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function AdminBookings() {
  return (
    <AdminGuard>
      <AdminLayout title="Quản lý đặt phòng" subtitle="Tất cả đặt phòng từ web và OTA — check-in / check-out tại đây">
        <BookingsContent />
      </AdminLayout>
    </AdminGuard>
  );
}
