import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, X, User, Download, LogOut, Trash2 } from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "";

const SOURCE_LABEL: Record<string, string> = {
  web: "Website", walk_in: "Walk-in", booking_com: "Booking.com",
  agoda: "Agoda", expedia: "Expedia", airbnb: "Airbnb",
  traveloka: "Traveloka", trip_com: "Trip.com", klook: "Klook", tripadvisor: "TripAdvisor",
};
const SOURCE_CLS: Record<string, string> = {
  web: "bg-primary/10 text-primary border-primary/30",
  walk_in: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  booking_com: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30",
  agoda: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
  expedia: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  airbnb: "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/30",
  traveloka: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
};
const cls = (s: string) => SOURCE_CLS[s] ?? "bg-muted text-muted-foreground border-border";

function fmt(s: string | null | undefined) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("vi-VN"); } catch { return s; }
}

function GuestDetailModal({ guestId, onClose }: { guestId: number; onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch(`${API}/api/guests/${guestId}`).then((r) => r.json()).then(setData);
  }, [guestId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-card border border-primary/40 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-primary/5 sticky top-0 backdrop-blur">
          <div>
            <h2 className="font-serif text-xl text-foreground">{data?.fullName ?? "Đang tải…"}</h2>
            <div className="text-xs text-muted-foreground mt-1">{data?.email} · {data?.phone}</div>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>
        <div className="p-6">
          {!data ? <Loader2 className="animate-spin text-primary mx-auto" /> : (
            <>
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-[10px] tracking-widest uppercase px-2 py-0.5 border bg-primary/5 text-primary border-primary/30">
                  {data.totalBookings} lần đặt
                </span>
                {(data.sources ?? []).map((s: string) => (
                  <span key={s} className={`text-[10px] tracking-widest uppercase px-2 py-0.5 border ${cls(s)}`}>
                    {SOURCE_LABEL[s] ?? s}
                  </span>
                ))}
              </div>
              <h3 className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2">Lịch sử đặt phòng (hợp nhất từ tất cả nguồn)</h3>
              <div className="border border-primary/15 divide-y divide-primary/10">
                {(data.bookings ?? []).map((b: any) => (
                  <div key={b.id} className="px-4 py-3 flex items-center gap-4 text-sm hover:bg-primary/5">
                    <div className="text-xs text-muted-foreground w-12">#{b.id}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">{b.room?.roomNumber ? `Phòng ${b.room.roomNumber}` : `Room #${b.roomId}`} · {b.hotel?.name ?? `Hotel #${b.hotelId}`}</div>
                      <div className="text-xs text-muted-foreground">{fmt(b.checkInDate)} → {fmt(b.checkOutDate)}</div>
                    </div>
                    <span className={`text-[10px] tracking-widest uppercase px-2 py-0.5 border ${cls(b.source ?? "web")}`}>
                      {SOURCE_LABEL[b.source ?? "web"] ?? b.source}
                    </span>
                    <span className="text-[10px] tracking-widest uppercase px-2 py-0.5 border border-muted text-muted-foreground bg-muted/20">
                      {b.status}
                    </span>
                    <div className="text-foreground whitespace-nowrap">{new Intl.NumberFormat("vi-VN").format(Math.round(b.totalPrice))} ₫</div>
                  </div>
                ))}
                {(!data.bookings || data.bookings.length === 0) && (
                  <div className="px-4 py-6 text-center text-muted-foreground text-sm">Chưa có đặt phòng</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  title, message, confirmLabel, danger, onConfirm, onCancel,
}: {
  title: string; message: string; confirmLabel: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-primary/40 shadow-2xl">
        <div className="px-6 py-4 border-b border-primary/20">
          <h3 className="font-serif text-lg text-foreground">{title}</h3>
        </div>
        <div className="px-6 py-4 text-sm text-foreground/90 whitespace-pre-line">{message}</div>
        <div className="px-6 py-4 border-t border-primary/20 flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm border border-primary/25 text-foreground hover:bg-primary/5">Hủy</button>
          <button onClick={onConfirm}
            className={`px-3 py-1.5 text-sm border ${danger
              ? "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
              : "border-primary/40 bg-primary text-primary-foreground hover:bg-primary/90"}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function GuestsContent() {
  const { toast } = useToast();
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<null | "checkout" | "delete">(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/guests`);
      setGuests(await res.json());
    } catch { toast({ title: "Không tải được danh sách khách", variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => guests.filter((g) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [g.fullName, g.email, g.phone].some((v: string) => String(v ?? "").toLowerCase().includes(q));
  }), [guests, search]);

  const allSelected = filtered.length > 0 && filtered.every((g) => selected.has(g.id));
  const someSelected = selected.size > 0;

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(filtered.map((g) => g.id)));
  };
  const clear = () => setSelected(new Set());

  const exportCsv = () => {
    const ids = Array.from(selected);
    const url = `${API}/api/guests/export.csv${ids.length ? `?ids=${ids.join(",")}` : ""}`;
    window.open(url, "_blank");
    toast({ title: ids.length ? `Đang tải ${ids.length} khách` : "Đang tải toàn bộ khách" });
  };

  const doCheckout = async () => {
    setConfirm(null);
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/guests/bulk-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Lỗi không xác định");
      toast({
        title: data.checkedOut > 0 ? `Đã xuất ${data.checkedOut} đặt phòng` : "Không có khách đang lưu trú",
        description: data.roomsCleaned ? `${data.roomsCleaned} phòng chuyển sang dọn dẹp` : undefined,
      });
      clear();
      await load();
    } catch (e: any) {
      toast({ title: "Không thể xuất khách", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const doDelete = async () => {
    setConfirm(null);
    setBusy(true);
    try {
      const res = await fetch(`${API}/api/guests`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Lỗi không xác định");
      toast({ title: `Đã xóa ${data.deleted} khách`, description: "Lịch sử đặt phòng được giữ lại (ẩn danh)." });
      clear();
      await load();
    } catch (e: any) {
      toast({ title: "Không thể xóa", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <>
      {openId && <GuestDetailModal guestId={openId} onClose={() => setOpenId(null)} />}
      {confirm === "checkout" && (
        <ConfirmDialog
          title="Xuất khách (Check-out)"
          message={`Hệ thống sẽ check-out toàn bộ đặt phòng đang lưu trú của ${selected.size} khách đã chọn. Phòng sẽ chuyển sang trạng thái Dọn dẹp.\n\nTiếp tục?`}
          confirmLabel="Xác nhận xuất"
          onCancel={() => setConfirm(null)}
          onConfirm={doCheckout}
        />
      )}
      {confirm === "delete" && (
        <ConfirmDialog
          title="Xóa khách"
          message={`Xóa vĩnh viễn ${selected.size} hồ sơ khách đã chọn. Khách có đặt phòng đang hoạt động sẽ bị từ chối.\n\nLịch sử đặt phòng cũ sẽ được giữ lại nhưng gỡ liên kết khách.`}
          confirmLabel="Xóa vĩnh viễn"
          danger
          onCancel={() => setConfirm(null)}
          onConfirm={doDelete}
        />
      )}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên, email, SĐT…"
            className="pl-9 pr-3 py-2 text-sm border border-primary/25 bg-background text-foreground outline-none w-80" />
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs uppercase tracking-widest border border-primary/30 text-foreground hover:bg-primary/5"
          title="Xuất CSV (toàn bộ nếu không chọn)"
        >
          <Download size={14} /> Xuất CSV
        </button>
        <span className="text-sm text-muted-foreground ml-auto">{filtered.length} khách</span>
      </div>

      {someSelected && (
        <div className="mb-3 flex flex-wrap items-center gap-2 px-4 py-2.5 border border-primary/30 bg-primary/5">
          <span className="text-xs uppercase tracking-widest text-primary font-medium">
            Đã chọn {selected.size} khách
          </span>
          <button onClick={clear} className="text-xs text-muted-foreground hover:text-foreground underline">bỏ chọn</button>
          <div className="ml-auto flex gap-2">
            <button
              disabled={busy}
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-widest border border-primary/30 text-foreground hover:bg-primary/10 disabled:opacity-50"
            >
              <Download size={13} /> Xuất CSV
            </button>
            <button
              disabled={busy}
              onClick={() => setConfirm("checkout")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-widest border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
            >
              <LogOut size={13} /> Xuất khách
            </button>
            <button
              disabled={busy}
              onClick={() => setConfirm("delete")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-widest border border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 disabled:opacity-50"
            >
              <Trash2 size={13} /> Xóa
            </button>
          </div>
        </div>
      )}

      <div className="bg-card border border-primary/20">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary/15 bg-primary/5">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="accent-primary cursor-pointer"
                    aria-label="Chọn tất cả"
                  />
                </th>
                {["Khách", "Email", "SĐT", "Số lần đặt", "Nguồn", "Tham gia"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-normal whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-primary" size={20} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-muted-foreground">Chưa có khách nào.</td></tr>
              ) : filtered.map((g) => {
                const isSel = selected.has(g.id);
                return (
                  <tr key={g.id} className={`transition-colors ${isSel ? "bg-primary/10" : "hover:bg-primary/5"}`}>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggle(g.id)}
                        className="accent-primary cursor-pointer"
                        aria-label={`Chọn ${g.fullName}`}
                      />
                    </td>
                    <td onClick={() => setOpenId(g.id)} className="px-4 py-3 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 text-primary border border-primary/30 flex items-center justify-center"><User size={14} /></div>
                        <div className="font-medium text-foreground">{g.fullName}</div>
                      </div>
                    </td>
                    <td onClick={() => setOpenId(g.id)} className="px-4 py-3 text-muted-foreground text-xs cursor-pointer">{g.email}</td>
                    <td onClick={() => setOpenId(g.id)} className="px-4 py-3 text-muted-foreground text-xs cursor-pointer">{g.phone}</td>
                    <td onClick={() => setOpenId(g.id)} className="px-4 py-3 text-foreground cursor-pointer">{g.totalBookings}</td>
                    <td onClick={() => setOpenId(g.id)} className="px-4 py-3 cursor-pointer">
                      <div className="flex flex-wrap gap-1">
                        {(g.sources ?? []).map((s: string) => (
                          <span key={s} className={`text-[10px] tracking-widest uppercase px-2 py-0.5 border ${cls(s)}`}>
                            {SOURCE_LABEL[s] ?? s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td onClick={() => setOpenId(g.id)} className="px-4 py-3 text-muted-foreground text-xs cursor-pointer">{fmt(g.createdAt)}</td>
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

export default function AdminGuests() {
  return (
    <AdminGuard>
      <AdminLayout title="Khách hàng" subtitle="Hồ sơ khách hợp nhất — chọn nhiều để xuất CSV, check-out hoặc xóa">
        <GuestsContent />
      </AdminLayout>
    </AdminGuard>
  );
}
