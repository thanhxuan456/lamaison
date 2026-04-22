import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Bell, Calendar, X } from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "";
const SEEN_KEY = "admin-bookings-last-seen";
const POLL_MS = 30_000;

interface RecentBooking {
  id: number | string;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  totalPrice: number;
  createdAt: string | null;
}

function formatTime(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const now = Date.now();
  const diffMin = Math.round((now - d.getTime()) / 60000);
  if (diffMin < 1) return "vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffMin < 60 * 24) return `${Math.round(diffMin / 60)} giờ trước`;
  return d.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

function formatPrice(n: number) {
  return Number(n).toLocaleString("vi-VN") + " ₫";
}

function statusLabel(s: string): { label: string; cls: string } {
  if (s === "confirmed") return { label: "Đã xác nhận", cls: "text-green-600 dark:text-green-400 border-green-500/30" };
  if (s === "checked_in") return { label: "Đã nhận phòng", cls: "text-blue-600 dark:text-blue-400 border-blue-500/30" };
  if (s === "checked_out") return { label: "Đã trả phòng", cls: "text-muted-foreground border-muted" };
  if (s === "cancelled") return { label: "Đã huỷ", cls: "text-red-600 dark:text-red-400 border-red-500/30" };
  return { label: s, cls: "text-muted-foreground border-muted" };
}

export function BookingNotificationBell() {
  const [bookings, setBookings] = useState<RecentBooking[]>([]);
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<string>(() => {
    try { return localStorage.getItem(SEEN_KEY) ?? ""; } catch { return ""; }
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll API moi 30s.
  useEffect(() => {
    let cancelled = false;
    const fetchRecent = async () => {
      try {
        const r = await fetch(`${API}/api/bookings/recent?limit=15`, { credentials: "include" });
        if (!r.ok || cancelled) return;
        const data = await r.json();
        if (!cancelled) setBookings(Array.isArray(data) ? data : []);
      } catch {
        // im lang - se thu lai vong sau
      }
    };
    fetchRecent();
    const id = setInterval(fetchRecent, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Click ben ngoai → dong dropdown.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Khi mo dropdown → danh dau "da xem" (cap nhat lastSeen = createdAt cua don moi nhat).
  const markAllSeen = () => {
    const newest = bookings[0]?.createdAt;
    if (newest && newest !== lastSeen) {
      try { localStorage.setItem(SEEN_KEY, newest); } catch {}
      setLastSeen(newest);
    }
  };

  // So sanh bang Date.parse de tranh sai khi format ISO khong dong nhat.
  const seenMs = lastSeen ? Date.parse(lastSeen) : NaN;
  const unreadCount = Number.isFinite(seenMs)
    ? bookings.filter((b) => {
        const ms = b.createdAt ? Date.parse(b.createdAt) : NaN;
        return Number.isFinite(ms) && ms > seenMs;
      }).length
    : bookings.length; // lan dau → tat ca tinh la moi

  const cappedBadge = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <div className="fixed top-3 right-3 lg:top-4 lg:right-4 z-50" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) markAllSeen();
        }}
        className="relative w-10 h-10 bg-card border border-primary/30 hover:border-primary hover:bg-primary/10 transition-colors flex items-center justify-center shadow-sm"
        title="Thông báo đặt phòng"
        aria-label="Thông báo đặt phòng"
      >
        <Bell size={16} className="text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-medium flex items-center justify-center border border-card">
            {cappedBadge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-12 right-0 w-[340px] max-h-[480px] bg-card border border-primary/30 shadow-xl flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-primary/15 shrink-0">
            <div>
              <div className="text-sm font-serif text-foreground">Đơn đặt phòng gần đây</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {bookings.length} đơn · cập nhật mỗi 30 giây
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Đóng"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {bookings.length === 0 ? (
              <div className="px-4 py-12 text-center text-xs text-muted-foreground">
                Chưa có đơn đặt phòng nào.
              </div>
            ) : (
              bookings.map((b) => {
                const isNew = !lastSeen || (b.createdAt && b.createdAt > lastSeen);
                const st = statusLabel(b.status);
                return (
                  <Link
                    key={String(b.id)}
                    href="/admin/bookings"
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-3 border-b border-primary/10 hover:bg-primary/5 transition-colors ${isNew ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {isNew && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                          <div className="text-sm text-foreground font-medium truncate">{b.guestName}</div>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-1">
                          <Calendar size={10} /> {b.checkInDate} → {b.checkOutDate}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm text-primary font-medium">{formatPrice(b.totalPrice)}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{formatTime(b.createdAt)}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className={`text-[9px] uppercase tracking-widest px-1.5 py-0.5 border ${st.cls}`}>
                        {st.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">#{b.id}</span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          <Link
            href="/admin/bookings"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-center text-xs text-primary hover:bg-primary/10 border-t border-primary/15 transition-colors shrink-0"
          >
            Xem tất cả đơn đặt phòng →
          </Link>
        </div>
      )}
    </div>
  );
}
