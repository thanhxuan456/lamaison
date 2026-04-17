import { useUser, useClerk, Show } from "@clerk/react";
import { useLocation } from "wouter";
import { PageLayout } from "@/components/layout/PageLayout";
import { useT } from "@/lib/i18n";
import { useListBookings } from "@workspace/api-client-react";
import { LogOut, User, Mail, Calendar, Star, Settings, Crown, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

const ADMIN_EMAIL = "tthanhxuan456@gmail.com";

function ProfileContent() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { t } = useT();
  const [, setLocation] = useLocation();
  const { data: bookings } = useListBookings();

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const isAdmin = email === ADMIN_EMAIL;
  const name = user?.fullName ?? user?.firstName ?? "Guest";
  const joined = user?.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : "";
  const totalBookings = bookings?.length ?? 0;
  const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    setLocation("/");
  };

  const stats = [
    { label: t("profile.bookings"), value: totalBookings, icon: Calendar },
    { label: t("profile.points"), value: (totalBookings * 500).toLocaleString(), icon: Star },
    { label: t("profile.tier"), value: totalBookings >= 5 ? "Gold" : "Silver", icon: Crown },
  ];

  return (
    <section className="pt-32 pb-20 bg-background min-h-screen">
      <div className="container mx-auto px-4 md:px-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="flex-1 h-px bg-primary/20"></div>
          <div className="text-[10px] tracking-[0.4em] uppercase text-primary font-serif">{t("profile.title")}</div>
          <div className="flex-1 h-px bg-primary/20"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="relative bg-card border border-primary/30 p-8 flex flex-col items-center text-center shadow-lg">
            <span className="absolute -top-2 -left-2 w-4 h-4 border-t-2 border-l-2 border-primary" />
            <span className="absolute -top-2 -right-2 w-4 h-4 border-t-2 border-r-2 border-primary" />
            <span className="absolute -bottom-2 -left-2 w-4 h-4 border-b-2 border-l-2 border-primary" />
            <span className="absolute -bottom-2 -right-2 w-4 h-4 border-b-2 border-r-2 border-primary" />

            {/* Avatar */}
            <div className="relative mb-5">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt={name} className="w-24 h-24 rounded-full border-2 border-primary object-cover" />
              ) : (
                <div className="w-24 h-24 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center">
                  <span className="font-serif text-2xl text-primary font-semibold">{initials}</span>
                </div>
              )}
              {isAdmin && (
                <div className="absolute -bottom-2 -right-2 bg-primary rounded-full p-1.5">
                  <ShieldCheck size={14} className="text-primary-foreground" />
                </div>
              )}
            </div>

            <h2 className="font-serif text-xl text-foreground mb-1">{name}</h2>
            {isAdmin && (
              <span className="inline-flex items-center gap-1 text-[10px] tracking-widest uppercase bg-primary/15 text-primary border border-primary/40 px-3 py-0.5 mb-2">
                <ShieldCheck size={10} /> Administrator
              </span>
            )}
            <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1.5 justify-center">
              <Mail size={12} className="text-primary" /> {email}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 justify-center">
              <Calendar size={11} className="text-primary" /> {t("profile.joined")}: {joined}
            </p>

            <div className="w-full h-px bg-primary/15 my-6" />

            <div className="w-full space-y-2">
              {isAdmin && (
                <Button
                  onClick={() => setLocation("/admin")}
                  className="w-full bg-primary text-primary-foreground rounded-none uppercase tracking-widest text-xs py-5 flex items-center gap-2"
                >
                  <ShieldCheck size={14} /> {t("profile.adminPanel")}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setLocation("/bookings")}
                className="w-full border-primary/40 text-foreground rounded-none uppercase tracking-widest text-xs py-5 flex items-center gap-2 hover:bg-primary/10"
              >
                <Calendar size={14} /> {t("nav.bookings")}
              </Button>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="w-full border-red-400/40 text-red-500 rounded-none uppercase tracking-widest text-xs py-5 flex items-center gap-2 hover:bg-red-50"
              >
                <LogOut size={14} /> {t("profile.signOut")}
              </Button>
            </div>
          </div>

          {/* Stats + Recent bookings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {stats.map(({ label, value, icon: Icon }) => (
                <div key={label} className="relative bg-card border border-primary/20 p-5 text-center shadow-sm group hover:border-primary/50 transition-colors">
                  <Icon size={20} className="text-primary mx-auto mb-2" />
                  <div className="font-serif text-2xl text-foreground font-semibold">{value}</div>
                  <div className="text-[11px] text-muted-foreground tracking-widest uppercase mt-1">{label}</div>
                </div>
              ))}
            </div>

            {/* Recent bookings */}
            <div className="relative bg-card border border-primary/20 p-6 shadow-sm">
              <h3 className="font-serif text-lg text-foreground mb-4 flex items-center gap-2">
                <Calendar size={16} className="text-primary" />
                {t("profile.recentBookings")}
              </h3>
              {bookings && bookings.length > 0 ? (
                <div className="space-y-3">
                  {bookings.slice(0, 5).map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between border-b border-primary/10 pb-3 last:border-b-0 last:pb-0">
                      <div>
                        <div className="text-sm font-medium text-foreground">{t("profile.booking")} #{b.id}</div>
                        <div className="text-xs text-muted-foreground">{b.checkIn} → {b.checkOut}</div>
                      </div>
                      <span className={`text-[10px] tracking-widest uppercase px-2 py-1 border ${
                        b.status === "confirmed" ? "border-green-400/40 text-green-600 bg-green-50" :
                        b.status === "pending" ? "border-yellow-400/40 text-yellow-600 bg-yellow-50" :
                        "border-red-400/40 text-red-500 bg-red-50"
                      }`}>{b.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Calendar size={40} className="text-primary/30 mx-auto mb-3" />
                  <p className="text-sm">{t("profile.noBookings")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Profile() {
  return (
    <PageLayout>
      <Show when="signed-in">
        <ProfileContent />
      </Show>
      <Show when="signed-out">
        <section className="pt-32 pb-20 min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <User size={48} className="text-primary/40 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Vui lòng đăng nhập để xem hồ sơ của bạn.</p>
            <Button asChild className="bg-primary text-primary-foreground rounded-none uppercase tracking-widest text-xs px-8 py-5">
              <a href="/sign-in">Đăng nhập</a>
            </Button>
          </div>
        </section>
      </Show>
    </PageLayout>
  );
}
