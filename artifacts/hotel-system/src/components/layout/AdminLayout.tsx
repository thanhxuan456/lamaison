import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { Navbar } from "./Navbar";
import { BackToTop } from "@/components/BackToTop";
import {
  LayoutDashboard, Hotel, BedDouble, Users, MessageSquare,
  Palette, ChevronRight, Menu, ShieldCheck,
} from "lucide-react";
import { useT } from "@/lib/i18n";

const NAV_ITEMS = [
  { icon: LayoutDashboard, labelKey: "admin.nav.dashboard", path: "/admin" },
  { icon: Hotel,           labelKey: "admin.nav.hotels",    path: "/admin/hotels" },
  { icon: BedDouble,       labelKey: "admin.nav.rooms",     path: "/admin/rooms" },
  { icon: Users,           labelKey: "admin.nav.users",     path: "/admin/users" },
  { icon: MessageSquare,   labelKey: "admin.nav.chat",      path: "/admin/chat" },
  { icon: Palette,         labelKey: "admin.nav.theme",     path: "/admin/theme" },
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
      {/* Fixed site navbar — sits in normal flow via top spacer below */}
      <Navbar />

      {/* Full-viewport shell that sits below the fixed navbar */}
      <div className="fixed inset-0 flex flex-col" style={{ top: 68 }}>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="absolute inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* Sidebar — scrolls independently */}
          <aside
            className={[
              "absolute inset-y-0 left-0 z-40 w-64 bg-card border-r border-primary/20 flex flex-col transition-transform duration-300 overflow-y-auto",
              "lg:relative lg:translate-x-0 lg:flex lg:shrink-0",
              sidebarOpen ? "translate-x-0" : "-translate-x-full",
            ].join(" ")}
          >
            {/* Sidebar brand header */}
            <div className="flex items-center gap-2 px-5 py-4 border-b border-primary/15 bg-primary/5 shrink-0">
              <ShieldCheck size={13} className="text-primary" />
              <span className="text-[10px] tracking-[0.35em] uppercase text-primary font-serif font-medium">
                {t("admin.label")}
              </span>
            </div>

            {/* Nav items */}
            <nav className="flex-1 py-3">
              {NAV_ITEMS.map(({ icon: Icon, labelKey, path }) => {
                const active = isActive(path);
                return (
                  <Link key={path} href={path} onClick={() => setSidebarOpen(false)}>
                    <div
                      className={[
                        "group relative flex items-center gap-3 px-5 py-3 transition-all cursor-pointer select-none",
                        active
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:bg-primary/8 hover:text-foreground",
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

            {/* Sidebar footer */}
            <div className="px-5 py-4 border-t border-primary/15 shrink-0">
              <Link href="/">
                <div className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                  ← {t("admin.backToSite")}
                </div>
              </Link>
            </div>
          </aside>

          {/* Main content — scrolls independently within viewport */}
          <main className="flex-1 min-w-0 overflow-y-auto">

            {/* Page title bar — sticky within the scrolling main, no overlap possible */}
            <div className="sticky top-0 z-20 flex items-center gap-4 px-6 py-4 border-b border-primary/15 bg-background/95 backdrop-blur-sm">
              <button
                className="lg:hidden p-1.5 text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu size={18} />
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] tracking-[0.4em] uppercase text-primary font-serif mb-0.5">
                  {t("admin.label")}
                </div>
                <h1 className="font-serif text-xl text-foreground truncate">{title}</h1>
                {subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>

            <div className="p-6">{children}</div>
          </main>
        </div>
      </div>

      <BackToTop />
    </>
  );
}
