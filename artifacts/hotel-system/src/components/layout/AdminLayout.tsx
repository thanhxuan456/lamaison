import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { BackToTop } from "@/components/BackToTop";
import {
  LayoutDashboard, Hotel, BedDouble, Users, MessageSquare,
  Palette, ChevronRight, Menu, FileText, ArrowLeft, Settings, Search, Layers,
  UtensilsCrossed, Receipt, CalendarCheck, UserCircle2, ListTree, Newspaper,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { useBranding } from "@/lib/branding";

const NAV_ITEMS = [
  { icon: LayoutDashboard, labelKey: "admin.nav.dashboard", path: "/admin" },
  { icon: Hotel,           labelKey: "admin.nav.hotels",    path: "/admin/hotels" },
  { icon: BedDouble,       labelKey: "admin.nav.rooms",     path: "/admin/rooms" },
  { icon: CalendarCheck,   labelKey: "Đặt phòng",           path: "/admin/bookings" },
  { icon: UserCircle2,     labelKey: "Khách hàng",          path: "/admin/guests" },
  { icon: ListTree,        labelKey: "Menu & Footer",       path: "/admin/menus" },
  { icon: Newspaper,       labelKey: "Tin tức & Blog",      path: "/admin/blogs" },
  { icon: Users,           labelKey: "admin.nav.users",     path: "/admin/users" },
  { icon: MessageSquare,   labelKey: "admin.nav.chat",      path: "/admin/chat" },
  { icon: UtensilsCrossed, labelKey: "admin.nav.menu",      path: "/admin/menu" },
  { icon: Receipt,         labelKey: "admin.nav.invoices",  path: "/admin/invoices" },
  { icon: Layers,          labelKey: "admin.nav.builder",   path: "/admin/builder" },
  { icon: FileText,        labelKey: "admin.nav.pages",     path: "/admin/pages" },
  { icon: Search,          labelKey: "admin.nav.seo",       path: "/admin/seo" },
  { icon: Palette,         labelKey: "admin.nav.theme",     path: "/admin/theme" },
  { icon: Settings,        labelKey: "admin.nav.settings",  path: "/admin/settings" },
];

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const { t } = useT();
  const { branding } = useBranding();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) =>
    path === "/admin" ? location === "/admin" : location.startsWith(path);

  return (
    <>
      {/* Full-viewport admin shell — no site navbar */}
      <div className="fixed inset-0 flex">

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="absolute inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Sidebar ── */}
        <aside
          className={[
            "absolute inset-y-0 left-0 z-40 w-64 bg-card border-r border-primary/20 flex flex-col transition-transform duration-300",
            "lg:relative lg:translate-x-0 lg:flex lg:shrink-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          {/* Logo block */}
          <div className="flex flex-col items-center gap-2 px-5 py-6 border-b border-primary/15 bg-gradient-to-b from-primary/10 to-transparent shrink-0">
            {branding.adminLogoUrl && (
              <img
                src={branding.adminLogoUrl}
                alt={branding.brandName}
                className="h-14 w-auto object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <div className="text-center">
              <div className="font-serif text-[13px] tracking-[0.2em] text-foreground leading-tight">{branding.brandName}</div>
              <div className="text-[9px] tracking-[0.35em] uppercase text-primary mt-0.5">
                {t("admin.label")}
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 py-3 overflow-y-auto">
            {NAV_ITEMS.map(({ icon: Icon, labelKey, path }) => {
              const active = isActive(path);
              return (
                <Link key={path} href={path} onClick={() => setSidebarOpen(false)}>
                  <div
                    className={[
                      "group relative flex items-center gap-3 px-5 py-3 transition-all cursor-pointer select-none",
                      active
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:bg-primary/10 hover:text-foreground",
                    ].join(" ")}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r" />
                    )}
                    <Icon size={16} strokeWidth={active ? 2 : 1.5} className="shrink-0" />
                    <span className={`text-sm tracking-wide ${active ? "font-medium" : ""}`}>
                      {t(labelKey as any)}
                    </span>
                    {active && (
                      <ChevronRight size={12} className="ml-auto text-primary/60" />
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Footer — back to site */}
          <div className="px-5 py-4 border-t border-primary/15 shrink-0">
            <Link href="/">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                <ArrowLeft size={12} /> {t("admin.backToSite")}
              </div>
            </Link>
          </div>
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 min-w-0 overflow-y-auto bg-background">
          {/* Sticky page header — luxury treatment with gold accent */}
          <div className="sticky top-0 z-20 flex items-center gap-4 px-6 py-5 border-b border-primary/20 bg-gradient-to-r from-primary/5 via-background to-background backdrop-blur-sm shadow-sm">
            <button
              className="lg:hidden p-1.5 text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>
            {/* Vertical gold accent bar */}
            <div aria-hidden className="hidden sm:block w-1 h-10 bg-gradient-to-b from-primary via-primary/80 to-primary/40 rounded-sm shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-3 flex-wrap">
                <h1 className="font-serif text-2xl md:text-[26px] font-semibold text-foreground tracking-wide truncate">
                  {title}
                </h1>
                <span className="hidden md:inline-block w-8 h-px bg-primary/60" />
                <span className="text-[10px] tracking-[0.35em] uppercase text-primary font-medium hidden md:inline">
                  {t("admin.label")}
                </span>
              </div>
              {subtitle && (
                <p className="text-[13px] text-muted-foreground/90 mt-1 leading-snug">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="p-6">{children}</div>
        </main>
      </div>

      <BackToTop />
    </>
  );
}
