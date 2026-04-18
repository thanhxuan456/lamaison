import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import {
  Hotel, BedDouble, Users, MessageSquare, Calendar, DollarSign, Star, Settings, ChevronRight, ShieldCheck, Plus, Eye, Edit, Trash2, LayoutDashboard
} from "lucide-react";
import { useListHotels, useListBookings } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";
import { useFormatPrice } from "@/lib/branding";

const ADMIN_EMAIL = "tthanhxuan456@gmail.com";

function StatWidget({ label, value, icon: Icon, sub }: { label: string; value: string | number; icon: any; sub?: string }) {
  return (
    <div className="relative bg-card border border-primary/25 p-5 shadow-sm group hover:border-primary/50 transition-all hover:shadow-md">
      <span className="absolute -top-[3px] -left-[3px] w-2 h-2 rotate-45 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="absolute -top-[3px] -right-[3px] w-2 h-2 rotate-45 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="absolute -bottom-[3px] -left-[3px] w-2 h-2 rotate-45 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="absolute -bottom-[3px] -right-[3px] w-2 h-2 rotate-45 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-2">{label}</div>
          <div className="font-serif text-3xl text-foreground font-semibold">{value}</div>
          {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
        </div>
        <div className="p-3 bg-primary/10 text-primary"><Icon size={22} /></div>
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, to, desc }: { icon: any; label: string; to: string; desc?: string }) {
  return (
    <Link href={to}>
      <div className="group flex items-center gap-4 border border-primary/20 hover:border-primary/60 bg-card p-4 cursor-pointer transition-all hover:shadow-md">
        <div className="p-3 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground">{label}</div>
          {desc && <div className="text-xs text-muted-foreground truncate">{desc}</div>}
        </div>
        <ChevronRight size={16} className="text-primary/40 group-hover:text-primary transition-colors" />
      </div>
    </Link>
  );
}

function AdminDashboardContent() {
  const { t } = useT();
  const fmtPrice = useFormatPrice();
  const { data: hotels, isLoading: hotelsLoading } = useListHotels();
  const { data: bookings, isLoading: bookingsLoading } = useListBookings();

  const totalRevenue = bookings?.reduce((s: number, b: any) => s + parseFloat(b.totalPrice ?? 0), 0) ?? 0;
  const pendingBookings = bookings?.filter((b: any) => b.status === "pending").length ?? 0;
  const avgRating = hotels ? (hotels.reduce((s: number, h: any) => s + parseFloat(h.rating), 0) / (hotels.length || 1)).toFixed(1) : "0";

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatWidget label={t("admin.stat.hotels")} value={hotels?.length ?? 0} icon={Hotel} sub={t("admin.stat.branches")} />
        <StatWidget label={t("admin.stat.bookings")} value={bookings?.length ?? 0} icon={Calendar} sub={`${pendingBookings} ${t("admin.stat.pending")}`} />
        <StatWidget label={t("admin.stat.revenue")} value={fmtPrice(totalRevenue)} icon={DollarSign} sub={t("admin.stat.total")} />
        <StatWidget label={t("admin.stat.rating")} value={avgRating} icon={Star} sub={t("admin.stat.avgRating")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1 bg-card border border-primary/20">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-primary/15 bg-primary/5">
            <Settings size={14} className="text-primary" />
            <span className="text-[11px] tracking-[0.3em] uppercase text-primary font-serif">{t("admin.quickActions")}</span>
          </div>
          <div className="p-2 space-y-1">
            <QuickAction icon={Hotel} label={t("admin.action.manageHotels")} to="/admin/hotels" desc={t("admin.action.manageHotelsDesc")} />
            <QuickAction icon={BedDouble} label={t("admin.action.manageRooms")} to="/admin/rooms" desc={t("admin.action.manageRoomsDesc")} />
            <QuickAction icon={Users} label={t("admin.action.manageUsers")} to="/admin/users" desc={t("admin.action.manageUsersDesc")} />
            <QuickAction icon={MessageSquare} label={t("admin.action.liveChat")} to="/admin/chat" desc={t("admin.action.liveChatDesc")} />
            <QuickAction icon={LayoutDashboard} label={t("admin.action.manageTheme")} to="/admin/theme" desc={t("admin.action.manageThemeDesc")} />
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="lg:col-span-2 bg-card border border-primary/20">
          <div className="flex items-center justify-between px-5 py-4 border-b border-primary/15 bg-primary/5">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-primary" />
              <span className="text-[11px] tracking-[0.3em] uppercase text-primary font-serif">{t("admin.recentBookings")}</span>
            </div>
            <Link href="/bookings" className="text-[11px] text-primary hover:underline underline-offset-4 tracking-wide">
              {t("admin.viewAll")} →
            </Link>
          </div>
          {bookingsLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" size={20} /></div>
          ) : !bookings?.length ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No bookings yet.</div>
          ) : (
            <div className="divide-y divide-primary/10">
              {bookings.slice(0, 8).map((b: any) => (
                <div key={b.id} className="flex items-center gap-3 px-5 py-3 hover:bg-primary/5 transition-colors">
                  <div className="w-8 h-8 border border-primary/30 flex items-center justify-center text-[10px] font-serif text-primary">#{b.id}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground font-medium truncate">{b.guestName || `Room #${b.roomId}`}</div>
                    <div className="text-xs text-muted-foreground">{b.checkIn} → {b.checkOut}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-primary">${parseFloat(b.totalPrice ?? 0).toFixed(0)}</div>
                    <span className={`text-[9px] tracking-widest uppercase px-1.5 py-0.5 border ${
                      b.status === "confirmed" ? "border-green-400/40 text-green-600 dark:text-green-400" :
                      b.status === "pending" ? "border-yellow-500/40 text-yellow-600 dark:text-yellow-400" :
                      "border-red-400/40 text-red-500"
                    }`}>{b.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hotels quick table */}
      <div className="bg-card border border-primary/20">
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary/15 bg-primary/5">
          <div className="flex items-center gap-2">
            <Hotel size={14} className="text-primary" />
            <span className="text-[11px] tracking-[0.3em] uppercase text-primary font-serif">{t("admin.hotelsTable")}</span>
          </div>
          <Link href="/admin/hotels">
            <Button size="sm" className="bg-primary text-primary-foreground rounded-none text-[11px] tracking-widest uppercase px-4 h-8 flex items-center gap-1.5">
              <Plus size={12} /> {t("admin.addHotel")}
            </Button>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-primary/10 bg-primary/5">
                {["ID", t("admin.col.name"), t("admin.col.city"), t("admin.col.rooms"), t("admin.col.rating"), t("admin.col.price"), t("admin.col.actions")].map((h) => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-normal whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {hotelsLoading ? (
                <tr><td colSpan={7} className="py-10 text-center"><Loader2 className="animate-spin mx-auto text-primary" size={18} /></td></tr>
              ) : hotels?.map((h: any) => (
                <tr key={h.id} className="hover:bg-primary/5 transition-colors">
                  <td className="px-5 py-3 text-muted-foreground text-xs">#{h.id}</td>
                  <td className="px-5 py-3 font-medium text-foreground">{h.name}</td>
                  <td className="px-5 py-3 text-muted-foreground">{h.city}</td>
                  <td className="px-5 py-3 text-muted-foreground">{h.totalRooms}</td>
                  <td className="px-5 py-3"><span className="flex items-center gap-1 text-primary text-xs"><Star size={11} fill="currentColor" /> {h.rating}</span></td>
                  <td className="px-5 py-3 text-foreground">${parseFloat(h.priceFrom ?? 0).toFixed(0)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <Link href={`/hotels/${h.id}`}><button className="p-1.5 border border-primary/20 text-primary hover:bg-primary/10 transition-colors"><Eye size={12} /></button></Link>
                      <Link href="/admin/hotels"><button className="p-1.5 border border-primary/20 text-primary hover:bg-primary/10 transition-colors"><Edit size={12} /></button></Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const [, setLocation] = useLocation();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  useEffect(() => {
    if (isLoaded && user && email !== ADMIN_EMAIL) setLocation("/profile");
    else if (isLoaded && !user) setLocation("/sign-in");
  }, [isLoaded, email, user, setLocation]);

  if (!isLoaded) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="animate-spin text-primary" size={28} />
    </div>
  );

  if (!user || email !== ADMIN_EMAIL) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <ShieldCheck size={48} className="text-primary/40 mx-auto mb-4" />
        <p className="text-muted-foreground mb-4">Cần đăng nhập để truy cập trang quản trị.</p>
        <Button asChild className="bg-primary text-primary-foreground rounded-none uppercase tracking-widest text-xs px-8 py-5">
          <a href="/sign-in">Đăng nhập</a>
        </Button>
      </div>
    </div>
  );

  return <>{children}</>;
}

export default function AdminDashboard() {
  const { t } = useT();
  return (
    <AdminGuard>
      <AdminLayout title={t("admin.dashboard")} subtitle="Welcome back, Grand Palace administrator">
        <AdminDashboardContent />
      </AdminLayout>
    </AdminGuard>
  );
}
