import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { Users, Loader2, Mail, Calendar, BookOpen } from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "";

export default function AdminUsers() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/bookings`).then((r) => r.json()).then((data) => {
      setBookings(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Aggregate unique guests from bookings
  const userMap = new Map<string, { name: string; email: string; bookings: number; spent: number; lastBooking: string }>();
  bookings.forEach((b) => {
    if (!b.guestName) return;
    const key = b.guestEmail || b.guestName;
    const existing = userMap.get(key);
    if (existing) {
      existing.bookings++;
      existing.spent += parseFloat(b.totalPrice ?? 0);
      if (b.createdAt > existing.lastBooking) existing.lastBooking = b.createdAt;
    } else {
      userMap.set(key, { name: b.guestName, email: b.guestEmail || "—", bookings: 1, spent: parseFloat(b.totalPrice ?? 0), lastBooking: b.createdAt });
    }
  });
  const users = Array.from(userMap.values()).sort((a, b) => b.spent - a.spent);

  return (
    <AdminGuard>
      <AdminLayout title="User Management" subtitle="Guest accounts and booking history">
        <div className="mb-6 flex items-center gap-4">
          <div className="bg-card border border-primary/20 px-4 py-3 flex items-center gap-3">
            <Users size={16} className="text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Total Guests</div>
              <div className="font-serif text-2xl text-foreground">{users.length}</div>
            </div>
          </div>
          <div className="bg-card border border-primary/20 px-4 py-3 flex items-center gap-3">
            <BookOpen size={16} className="text-primary" />
            <div>
              <div className="text-xs text-muted-foreground">Total Bookings</div>
              <div className="font-serif text-2xl text-foreground">{bookings.length}</div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-primary/20">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary/15 bg-primary/5">
                  {["Guest Name", "Email", "Bookings", "Total Spent", "Last Booking"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-normal whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {loading ? (
                  <tr><td colSpan={5} className="py-12 text-center"><Loader2 className="animate-spin mx-auto text-primary" size={20} /></td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">No guests yet. Users will appear here after making bookings.</td></tr>
                ) : users.map((u, i) => (
                  <tr key={i} className="hover:bg-primary/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/15 border border-primary/30 flex items-center justify-center text-[11px] font-serif text-primary">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-foreground">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{u.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.bookings}</td>
                    <td className="px-4 py-3 text-primary font-medium">${u.spent.toFixed(0)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{u.lastBooking ? new Date(u.lastBooking).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
