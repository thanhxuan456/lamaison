import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { BackToTop } from "@/components/BackToTop";
import {
  LayoutDashboard, Hotel, BedDouble, Users, MessageSquare,
  Palette, ChevronRight, Menu, FileText, ArrowLeft, Settings,
} from "lucide-react";
import { useT } from "@/lib/i18n";

const NAV_ITEMS = [
  { icon: LayoutDashboard, labelKey: "admin.nav.dashboard", path: "/admin" },
  { icon: Hotel,           labelKey: "admin.nav.hotels",    path: "/admin/hotels" },
  { icon: BedDouble,       labelKey: "admin.nav.rooms",     path: "/admin/rooms" },
  { icon: Users,           labelKey: "admin.nav.users",     path: "/admin/users" },
  { icon: MessageSquare,   labelKey: "admin.nav.chat",      path: "/admin/chat" },
  { icon: FileText,        labelKey: "admin.nav.pages",     path: "/admin/pages" },
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
            <img
              src="/logo.svg"
              alt="Grand Palace"
              className="h-14 w-auto object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
            <div className="text-center">
              <div className="font-serif text-[13px] tracking-[0.2em] text-foreground leading-tight">Grand Palace</div>
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
          {/* Sticky page header */}
          <div className="sticky top-0 z-20 flex items-center gap-4 px-6 py-4 border-b border-primary/15 bg-background/95 backdrop-blur-sm">
            <button
              className="lg:hidden p-1.5 text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-serif text-xl text-foreground truncate">{title}</h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
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
