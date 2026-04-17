import { useUser, Show } from "@clerk/react";
import { useLocation, Route, Switch } from "wouter";
import { useEffect } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import {
  LayoutDashboard, Hotel, BedDouble, Users, MessageSquare,
  TrendingUp, Calendar, DollarSign, Star, Settings, ChevronRight,
  ShieldCheck, LogOut, Plus, Eye, Edit, Trash2
} from "lucide-react";
import { useListHotels, useListBookings } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { Link } from "wouter";

const ADMIN_EMAIL = "tthanhxuan456@gmail.com";

function StatWidget({ label, value, icon: Icon, sub, color = "text-primary" }: {
  label: string; value: string | number; icon: any; sub?: string; color?: string;
}) {
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
        <div className={`p-3 bg-primary/10 ${color}`}>
          <Icon size={22} />
        </div>
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

function AdminContent() {
  const { t } = useT();
  const { data: hotels } = useListHotels();
  const { data: bookings } = useListBookings();
  const [location, setLocation] = useLocation();

  const totalRevenue = bookings?.reduce((s: number, b: any) => s + parseFloat(b.totalPrice ?? 0), 0) ?? 0;
  const pendingBookings = bookings?.filter((b: any) => b.status === "pending").length ?? 0;
  const confirmedBookings = bookings?.filter((b: any) => b.status === "confirmed").length ?? 0;
  const avgRating = hotels ? (hotels.reduce((s: number, h: any) => s + parseFloat(h.rating), 0) / (hotels.length || 1)).toFixed(1) : "0";

  return (
    <section className="pt-28 pb-20 min-h-screen bg-background">
      <div className="container mx-auto px-4 md:px-8 max-w-7xl">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="text-[10px] tracking-[0.4em] uppercase text-primary font-serif mb-1">{t("admin.label")}</div>
            <h1 className="font-serif text-3xl text-foreground">{t("admin.dashboard")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 border border-primary/30 px-3 py-2 text-xs text-primary">
              <ShieldCheck size={14} /> Admin
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatWidget label={t("admin.stat.hotels")} value={hotels?.length ?? 0} icon={Hotel} sub={t("admin.stat.branches")} />
          <StatWidget label={t("admin.stat.bookings")} value={bookings?.length ?? 0} icon={Calendar} sub={`${pendingBookings} ${t("admin.stat.pending")}`} />
          <StatWidget label={t("admin.stat.revenue")} value={`$${(totalRevenue / 1000).toFixed(0)}K`} icon={DollarSign} sub={t("admin.stat.total")} />
          <StatWidget label={t("admin.stat.rating")} value={avgRating} icon={Star} sub={t("admin.stat.avgRating")} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-primary/20 shadow-sm">
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
          </div>

          {/* Recent bookings */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-primary/20 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-primary/15 bg-primary/5">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-primary" />
                  <span className="text-[11px] tracking-[0.3em] uppercase text-primary font-serif">{t("admin.recentBookings")}</span>
                </div>
                <Link href="/bookings" className="text-[11px] text-primary hover:underline underline-offset-4 tracking-wide">
                  {t("admin.viewAll")} →
                </Link>
              </div>
              <div className="p-0">
                {bookings && bookings.length > 0 ? (
                  <div className="divide-y divide-primary/10">
                    {bookings.slice(0, 8).map((b: any) => (
                      <div key={b.id} className="flex items-center gap-3 px-5 py-3 hover:bg-primary/5 transition-colors">
                        <div className="w-8 h-8 border border-primary/30 flex items-center justify-center text-[10px] font-serif text-primary">
                          #{b.id}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-foreground font-medium">Room #{b.roomId}</div>
                          <div className="text-xs text-muted-foreground">{b.checkIn} → {b.checkOut}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-primary">${parseFloat(b.totalPrice ?? 0).toFixed(0)}</div>
                          <span className={`text-[9px] tracking-widest uppercase px-1.5 py-0.5 border ${
                            b.status === "confirmed" ? "border-green-400/40 text-green-600" :
                            b.status === "pending" ? "border-yellow-500/40 text-yellow-600" :
                            "border-red-400/40 text-red-500"
                          }`}>{b.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground text-sm">Không có đặt phòng nào.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Hotels management table */}
        <div className="mt-6 bg-card border border-primary/20 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-primary/15 bg-primary/5">
            <div className="flex items-center gap-2">
              <Hotel size={14} className="text-primary" />
              <span className="text-[11px] tracking-[0.3em] uppercase text-primary font-serif">{t("admin.hotelsTable")}</span>
            </div>
            <Button size="sm" className="bg-primary text-primary-foreground rounded-none text-[11px] tracking-widest uppercase px-4 h-8 flex items-center gap-1.5">
              <Plus size={12} /> {t("admin.addHotel")}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary/10 bg-primary/5">
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-normal">ID</th>
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-normal">{t("admin.col.name")}</th>
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-normal">{t("admin.col.city")}</th>
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-normal">{t("admin.col.rooms")}</th>
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-normal">{t("admin.col.rating")}</th>
                  <th className="text-left px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-normal">{t("admin.col.price")}</th>
                  <th className="text-right px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-normal">{t("admin.col.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {hotels?.map((h: any) => (
                  <tr key={h.id} className="hover:bg-primary/5 transition-colors">
                    <td className="px-5 py-3 text-muted-foreground text-xs">#{h.id}</td>
                    <td className="px-5 py-3 font-medium text-foreground">{h.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{h.city}</td>
                    <td className="px-5 py-3 text-muted-foreground">{h.totalRooms}</td>
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-1 text-primary">
                        <Star size={12} fill="currentColor" /> {h.rating}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-foreground">${parseFloat(h.priceFrom ?? 0).toFixed(0)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button className="p-1.5 border border-primary/20 text-primary hover:bg-primary/10 transition-colors">
                          <Eye size={13} />
                        </button>
                        <button className="p-1.5 border border-primary/20 text-primary hover:bg-primary/10 transition-colors">
                          <Edit size={13} />
                        </button>
                        <button className="p-1.5 border border-red-300/40 text-red-400 hover:bg-red-50 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const [, setLocation] = useLocation();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  useEffect(() => {
    if (isLoaded && email && email !== ADMIN_EMAIL) {
      setLocation("/profile");
    } else if (isLoaded && !user) {
      setLocation("/sign-in");
    }
  }, [isLoaded, email, user, setLocation]);

  if (!isLoaded) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user || email !== ADMIN_EMAIL) return null;

  return <>{children}</>;
}

export default function AdminDashboard() {
  return (
    <PageLayout>
      <Show when="signed-in">
        <AdminGuard>
          <AdminContent />
        </AdminGuard>
      </Show>
      <Show when="signed-out">
        <section className="pt-32 pb-20 min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <ShieldCheck size={48} className="text-primary/40 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Cần đăng nhập để truy cập trang quản trị.</p>
            <Button asChild className="bg-primary text-primary-foreground rounded-none uppercase tracking-widest text-xs px-8 py-5">
              <a href="/sign-in">Đăng nhập</a>
            </Button>
          </div>
        </section>
      </Show>
    </PageLayout>
  );
}
