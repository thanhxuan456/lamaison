import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { BackToTop } from "@/components/BackToTop";
import {
  LayoutDashboard, Hotel, BedDouble, Users, MessageSquare,
  Palette, ChevronRight, ChevronDown, Menu, FileText, ArrowLeft,
  Settings, Search, Layers, UtensilsCrossed, Receipt, CalendarCheck,
  UserCircle2, ListTree, Newspaper, Building2, Ruler, Puzzle, Shield,
  Share2,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { useBranding } from "@/lib/branding";

type NavLeaf = {
  kind: "item";
  icon: React.ElementType;
  label: string;
  path: string;
};

type NavGroup = {
  kind: "group";
  icon: React.ElementType;
  label: string;
  children: NavLeaf[];
};

type NavEntry = NavLeaf | NavGroup;

const NAV: NavEntry[] = [
  {
    kind: "item",
    icon: LayoutDashboard,
    label: "admin.nav.dashboard",
    path: "/admin",
  },
  {
    kind: "group",
    icon: Building2,
    label: "Quản Lý Khách Sạn",
    children: [
      { kind: "item", icon: Hotel,         label: "Khách Sạn",  path: "/admin/hotels"   },
      { kind: "item", icon: BedDouble,     label: "Phòng",      path: "/admin/rooms"    },
      { kind: "item", icon: CalendarCheck, label: "Đặt Phòng",  path: "/admin/bookings" },
      { kind: "item", icon: Receipt,       label: "Hóa Đơn",    path: "/admin/invoices" },
    ],
  },
  {
    kind: "group",
    icon: Users,
    label: "Quản Lý Người Dùng",
    children: [
      { kind: "item", icon: UserCircle2, label: "Khách Hàng",          path: "/admin/guests" },
      { kind: "item", icon: Users,       label: "Tài Khoản Hệ Thống",  path: "/admin/users"  },
    ],
  },
  {
    kind: "group",
    icon: FileText,
    label: "Nội Dung",
    children: [
      { kind: "item", icon: FileText,  label: "Trang & Bài Viết",  path: "/admin/pages"   },
      { kind: "item", icon: Layers,    label: "Trình Tạo Trang",   path: "/admin/builder" },
      { kind: "item", icon: Layers,    label: "Trang Theo Chi Nhánh", path: "/admin/branch-pages" },
    ],
  },
  {
    kind: "group",
    icon: Palette,
    label: "Quản Lý Giao Diện",
    children: [
      { kind: "item", icon: ListTree,        label: "Menu & Footer",                path: "/admin/menus"   },
      { kind: "item", icon: Ruler,           label: "Kích Thước Main Menu Nav",     path: "/admin/theme"   },
      { kind: "item", icon: UtensilsCrossed, label: "Thực Đơn Nhà Hàng",           path: "/admin/menu"    },
      { kind: "item", icon: Search,          label: "SEO",                          path: "/admin/seo"     },
      { kind: "item", icon: Palette,         label: "Giao Diện & Màu Sắc",         path: "/admin/theme"   },
    ],
  },
  {
    kind: "group",
    icon: MessageSquare,
    label: "Live Chat",
    children: [
      { kind: "item", icon: MessageSquare, label: "Phiên Hoạt Động",   path: "/admin/chat" },
      { kind: "item", icon: FileText,      label: "Quản Lý Tickets",   path: "/admin/chat/tickets" },
      { kind: "item", icon: Layers,        label: "Mẫu Trả Lời Nhanh", path: "/admin/chat/templates" },
    ],
  },
  {
    kind: "group",
    icon: Puzzle,
    label: "Tích Hợp",
    children: [
      { kind: "item", icon: Receipt,  label: "Hóa Đơn & Mẫu",       path: "/admin/integrations" },
      { kind: "item", icon: FileText, label: "Hóa Đơn Điện Tử",     path: "/admin/integrations?tab=einvoice" },
      { kind: "item", icon: Share2,   label: "Mạng Xã Hội",         path: "/admin/integrations?tab=social" },
      { kind: "item", icon: Shield,   label: "Bảo Mật Hệ Thống",    path: "/admin/integrations?tab=security" },
    ],
  },
  {
    kind: "item",
    icon: Settings,
    label: "admin.nav.settings",
    path: "/admin/settings",
  },
];

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

function NavItem({
  icon: Icon,
  label,
  path,
  active,
  indent = false,
  onClose,
}: {
  icon: React.ElementType;
  label: string;
  path: string;
  active: boolean;
  indent?: boolean;
  onClose: () => void;
}) {
  const { t } = useT();
  return (
    <Link href={path} onClick={onClose}>
      <div
        className={[
          "group relative flex items-center gap-3 transition-all cursor-pointer select-none",
          indent ? "px-5 py-2 pl-10" : "px-5 py-3",
          active
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground hover:bg-primary/10 hover:text-foreground",
        ].join(" ")}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r" />
        )}
        <Icon size={indent ? 14 : 16} strokeWidth={active ? 2 : 1.5} className="shrink-0" />
        <span className={`text-sm tracking-wide ${active ? "font-medium" : ""} ${indent ? "text-[13px]" : ""}`}>
          {t(label as any)}
        </span>
        {active && !indent && (
          <ChevronRight size={12} className="ml-auto text-primary/60" />
        )}
      </div>
    </Link>
  );
}

function NavGroupItem({
  group,
  isActive,
  onClose,
}: {
  group: NavGroup;
  isActive: (path: string) => boolean;
  onClose: () => void;
}) {
  const { t } = useT();
  const anyChildActive = group.children.some((c) => isActive(c.path));
  const [open, setOpen] = useState(anyChildActive);
  const Icon = group.icon;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className={[
          "w-full flex items-center gap-3 px-5 py-3 transition-all cursor-pointer select-none",
          anyChildActive
            ? "text-primary"
            : "text-muted-foreground hover:bg-primary/10 hover:text-foreground",
        ].join(" ")}
      >
        <Icon size={16} strokeWidth={anyChildActive ? 2 : 1.5} className="shrink-0" />
        <span className={`text-sm tracking-wide flex-1 text-left ${anyChildActive ? "font-medium" : ""}`}>
          {t(group.label as any)}
        </span>
        {open
          ? <ChevronDown size={13} className="text-primary/60" />
          : <ChevronRight size={13} className="opacity-40" />}
      </button>

      {open && (
        <div className="border-l border-primary/15 ml-8 my-0.5">
          {group.children.map((child) => (
            <NavItem
              key={child.path + child.label}
              icon={child.icon}
              label={child.label}
              path={child.path}
              active={isActive(child.path)}
              indent
              onClose={onClose}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const { t } = useT();
  const { branding } = useBranding();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isActive = (path: string) =>
    path === "/admin" ? location === "/admin" : location.startsWith(path);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      <div className="fixed inset-0 flex">

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="absolute inset-0 z-30 bg-black/50 lg:hidden"
            onClick={closeSidebar}
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

          {/* Nav */}
          <nav className="flex-1 py-3 overflow-y-auto">
            {NAV.map((entry, i) =>
              entry.kind === "item" ? (
                <NavItem
                  key={entry.path}
                  icon={entry.icon}
                  label={entry.label}
                  path={entry.path}
                  active={isActive(entry.path)}
                  onClose={closeSidebar}
                />
              ) : (
                <NavGroupItem
                  key={entry.label + i}
                  group={entry}
                  isActive={isActive}
                  onClose={closeSidebar}
                />
              )
            )}
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
          <div className="sticky top-0 z-20 flex items-center gap-4 px-6 py-5 border-b-2 border-primary bg-[#1a1410] dark:bg-[#0f0c08] shadow-md">
            <button
              className="lg:hidden p-1.5 text-primary/70 hover:text-primary transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={18} />
            </button>
            <div aria-hidden className="hidden sm:block w-1 h-10 bg-gradient-to-b from-primary via-primary/80 to-primary/40 rounded-sm shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-3 flex-wrap">
                <h1 className="font-serif text-2xl md:text-[26px] font-bold text-primary tracking-wide truncate drop-shadow-[0_1px_0_rgba(0,0,0,0.4)]">
                  {title}
                </h1>
                <span className="hidden md:inline-block w-8 h-px bg-primary/60" />
                <span className="text-[10px] tracking-[0.35em] uppercase text-primary/80 font-medium hidden md:inline">
                  {t("admin.label")}
                </span>
              </div>
              {subtitle && (
                <p className="text-[13px] text-white/70 mt-1 leading-snug">{subtitle}</p>
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
