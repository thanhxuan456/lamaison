import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Plus, Edit, Trash2, X, Globe, EyeOff, Eye,
  Share2, Navigation, Save, Loader2, GripVertical,
} from "lucide-react";

const PAGES_KEY = "grand-palace-cms-pages";
const MENUS_KEY = "grand-palace-cms-menus";
const SOCIAL_KEY = "grand-palace-social-links";

/* ─── Types ─── */
interface Page {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: "published" | "draft";
  updatedAt: string;
}

interface MenuItem {
  id: string;
  label: string;
  href: string;
  order: number;
}

interface SocialLink {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
  color: string;
  iconSvg: string;
}

/* ─── Default data ─── */
const DEFAULT_PAGES: Page[] = [
  { id: "home", title: "Trang Chủ", slug: "/", content: "Nội dung trang chủ Grand Palace Hotels & Resorts.", status: "published", updatedAt: new Date().toISOString() },
  { id: "about", title: "Về Chúng Tôi", slug: "/about", content: "Grand Palace Hotels & Resorts — chuỗi khách sạn 5 sao sang trọng bậc nhất Việt Nam.", status: "published", updatedAt: new Date().toISOString() },
  { id: "dining", title: "Ẩm Thực", slug: "/dining", content: "Trải nghiệm ẩm thực đỉnh cao tại các nhà hàng đạt sao Michelin.", status: "published", updatedAt: new Date().toISOString() },
  { id: "spa", title: "Spa & Wellness", slug: "/spa", content: "Không gian thư giãn hoàng gia với các liệu trình spa cao cấp.", status: "draft", updatedAt: new Date().toISOString() },
  { id: "offers", title: "Ưu Đãi Đặc Biệt", slug: "/offers", content: "Khám phá những ưu đãi độc quyền dành riêng cho thành viên Grand Palace.", status: "draft", updatedAt: new Date().toISOString() },
];

const DEFAULT_MENUS: MenuItem[] = [
  { id: "m1", label: "Trang chủ", href: "/", order: 1 },
  { id: "m2", label: "Đặt phòng", href: "/bookings", order: 2 },
  { id: "m3", label: "Khách sạn Hà Nội", href: "/hotels/1", order: 3 },
  { id: "m4", label: "Khách sạn Đà Nẵng", href: "/hotels/2", order: 4 },
  { id: "m5", label: "Khách sạn Sài Gòn", href: "/hotels/3", order: 5 },
];

const DEFAULT_SOCIALS: SocialLink[] = [
  { id: "facebook", label: "Facebook", href: "https://m.me/grandpalacehotels", enabled: true, color: "#1877F2", iconSvg: "" },
  { id: "zalo", label: "Zalo", href: "https://zalo.me/0900000000", enabled: true, color: "#0068FF", iconSvg: "" },
  { id: "whatsapp", label: "WhatsApp", href: "https://wa.me/84900000000", enabled: true, color: "#25D366", iconSvg: "" },
  { id: "telegram", label: "Telegram", href: "https://t.me/grandpalace", enabled: false, color: "#229ED9", iconSvg: "" },
  { id: "phone", label: "Hotline", href: "tel:+84900000000", enabled: true, color: "#b8973e", iconSvg: "" },
];

function load<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}
function save<T>(key: string, val: T) { localStorage.setItem(key, JSON.stringify(val)); }

/* ─── Page editor modal ─── */
function PageModal({ page, onClose, onSaved }: { page?: Page; onClose: () => void; onSaved: (p: Page) => void }) {
  const [form, setForm] = useState<Page>(page ?? {
    id: Date.now().toString(), title: "", slug: "/", content: "", status: "draft", updatedAt: new Date().toISOString(),
  });
  const set = (k: keyof Page, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.title || !form.slug) return;
    onSaved({ ...form, updatedAt: new Date().toISOString() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-card border border-primary/40 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-primary/5 shrink-0">
          <h2 className="font-serif text-xl text-foreground">{page ? "Chỉnh sửa trang" : "Tạo trang mới"}</h2>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Tiêu đề trang *</label>
              <input className="w-full border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
                value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Giới Thiệu" />
            </div>
            <div>
              <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Đường dẫn (slug) *</label>
              <input className="w-full border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
                value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="/about" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Nội dung</label>
            <textarea className="w-full border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none resize-none h-48"
              value={form.content} onChange={(e) => set("content", e.target.value)} placeholder="Nội dung trang..." />
          </div>

          <div>
            <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Trạng thái</label>
            <div className="flex gap-3">
              {(["published", "draft"] as const).map((s) => (
                <button key={s} onClick={() => set("status", s)}
                  className={`flex items-center gap-2 px-4 py-2 border text-sm transition-all ${form.status === s ? "border-primary bg-primary/10 text-primary" : "border-primary/20 text-muted-foreground hover:border-primary/40"}`}>
                  {s === "published" ? <Globe size={13} /> : <EyeOff size={13} />}
                  {s === "published" ? "Đã xuất bản" : "Bản nháp"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-primary/15 bg-primary/5 shrink-0">
          <Button variant="outline" onClick={onClose} className="rounded-none border-primary/40">Hủy</Button>
          <Button onClick={handleSave} className="rounded-none bg-primary text-primary-foreground uppercase tracking-widest text-xs px-6">
            <Save size={13} className="mr-2" />{page ? "Lưu thay đổi" : "Tạo trang"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Tabs ─── */
type Tab = "pages" | "menus" | "social";

function PagesTab() {
  const { toast } = useToast();
  const [pages, setPages] = useState<Page[]>(() => load(PAGES_KEY, DEFAULT_PAGES));
  const [editPage, setEditPage] = useState<Page | undefined>();
  const [addOpen, setAddOpen] = useState(false);

  const persist = (p: Page[]) => { setPages(p); save(PAGES_KEY, p); };

  const onSaved = (p: Page) => {
    const existing = pages.find((x) => x.id === p.id);
    if (existing) persist(pages.map((x) => x.id === p.id ? p : x));
    else persist([...pages, p]);
    toast({ title: existing ? "Trang đã được cập nhật" : "Trang mới đã tạo", description: p.title });
    setEditPage(undefined); setAddOpen(false);
  };

  const del = (id: string) => {
    if (!confirm("Xóa trang này?")) return;
    persist(pages.filter((p) => p.id !== id));
    toast({ title: "Đã xóa trang" });
  };

  const toggle = (id: string) => {
    persist(pages.map((p) => p.id === id ? { ...p, status: p.status === "published" ? "draft" : "published", updatedAt: new Date().toISOString() } : p));
  };

  return (
    <>
      {addOpen && <PageModal onClose={() => setAddOpen(false)} onSaved={onSaved} />}
      {editPage && <PageModal page={editPage} onClose={() => setEditPage(undefined)} onSaved={onSaved} />}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{pages.length} trang • {pages.filter((p) => p.status === "published").length} đã xuất bản</p>
        <Button onClick={() => setAddOpen(true)} className="rounded-none bg-primary text-primary-foreground uppercase tracking-widest text-xs px-5 h-9 gap-1.5">
          <Plus size={13} /> Tạo trang mới
        </Button>
      </div>

      <div className="bg-card border border-primary/20 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-primary/15 bg-primary/5">
              {["Tiêu đề", "Đường dẫn", "Trạng thái", "Cập nhật", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/10">
            {pages.map((p) => (
              <tr key={p.id} className="hover:bg-primary/5 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">{p.title}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{p.slug}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggle(p.id)}
                    className={`flex items-center gap-1.5 text-[10px] tracking-widest uppercase px-2 py-1 border transition-all ${p.status === "published" ? "border-green-400/40 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30" : "border-muted text-muted-foreground hover:bg-muted/50"}`}>
                    {p.status === "published" ? <Globe size={10} /> : <EyeOff size={10} />}
                    {p.status === "published" ? "Xuất bản" : "Nháp"}
                  </button>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(p.updatedAt).toLocaleDateString("vi-VN")}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setEditPage(p)} className="p-1.5 border border-primary/20 text-primary hover:bg-primary/10 transition-colors"><Edit size={12} /></button>
                    <button onClick={() => del(p.id)} className="p-1.5 border border-red-300/40 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function MenusTab() {
  const { toast } = useToast();
  const [items, setItems] = useState<MenuItem[]>(() => load(MENUS_KEY, DEFAULT_MENUS));
  const [newItem, setNewItem] = useState({ label: "", href: "/" });

  const persist = (m: MenuItem[]) => { setItems(m); save(MENUS_KEY, m); };

  const add = () => {
    if (!newItem.label) return;
    persist([...items, { id: Date.now().toString(), label: newItem.label, href: newItem.href, order: items.length + 1 }]);
    setNewItem({ label: "", href: "/" });
    toast({ title: "Mục menu đã thêm" });
  };

  const del = (id: string) => persist(items.filter((i) => i.id !== id));

  const update = (id: string, k: keyof MenuItem, v: any) => persist(items.map((i) => i.id === id ? { ...i, [k]: v } : i));

  const saveAll = () => { save(MENUS_KEY, items); toast({ title: "Menu đã lưu", description: `${items.length} mục` }); };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-card border border-primary/20">
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary/15 bg-primary/5">
          <div className="flex items-center gap-2">
            <Navigation size={14} className="text-primary" />
            <span className="text-[11px] tracking-[0.3em] uppercase text-primary font-serif">Mục điều hướng</span>
          </div>
          <Button onClick={saveAll} size="sm" className="rounded-none bg-primary text-primary-foreground text-xs uppercase tracking-widest h-8 px-4 gap-1.5">
            <Save size={11} /> Lưu menu
          </Button>
        </div>
        <div className="divide-y divide-primary/10">
          {items.sort((a, b) => a.order - b.order).map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-primary/5 group">
              <GripVertical size={14} className="text-muted-foreground/40 cursor-grab" />
              <input className="flex-1 border border-primary/20 focus:border-primary bg-background px-2 py-1 text-sm text-foreground outline-none"
                value={item.label} onChange={(e) => update(item.id, "label", e.target.value)} />
              <input className="w-44 border border-primary/20 focus:border-primary bg-background px-2 py-1 text-xs text-muted-foreground outline-none font-mono"
                value={item.href} onChange={(e) => update(item.id, "href", e.target.value)} />
              <button onClick={() => del(item.id)} className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600 transition-all">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 px-4 py-3 border-t border-primary/15 bg-primary/5">
          <Plus size={14} className="text-primary shrink-0" />
          <input className="flex-1 border border-primary/20 focus:border-primary bg-background px-2 py-1 text-sm text-foreground outline-none"
            value={newItem.label} onChange={(e) => setNewItem((n) => ({ ...n, label: e.target.value }))} placeholder="Tên mục..." />
          <input className="w-44 border border-primary/20 focus:border-primary bg-background px-2 py-1 text-xs text-muted-foreground outline-none font-mono"
            value={newItem.href} onChange={(e) => setNewItem((n) => ({ ...n, href: e.target.value }))} placeholder="/duong-dan" />
          <Button onClick={add} size="sm" variant="outline" className="rounded-none border-primary/40 text-primary text-xs">Thêm</Button>
        </div>
      </div>
    </div>
  );
}

function SocialTab() {
  const { toast } = useToast();
  const [socials, setSocials] = useState<SocialLink[]>(() => load(SOCIAL_KEY, DEFAULT_SOCIALS));

  const update = (id: string, k: keyof SocialLink, v: any) =>
    setSocials((s) => s.map((x) => x.id === id ? { ...x, [k]: v } : x));

  const saveAll = () => {
    save(SOCIAL_KEY, socials);
    toast({ title: "Liên kết mạng xã hội đã lưu", description: `${socials.filter((s) => s.enabled).length} kênh đang hoạt động` });
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-card border border-primary/20">
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary/15 bg-primary/5">
          <div className="flex items-center gap-2">
            <Share2 size={14} className="text-primary" />
            <span className="text-[11px] tracking-[0.3em] uppercase text-primary font-serif">Mạng xã hội & Liên hệ</span>
          </div>
          <Button onClick={saveAll} size="sm" className="rounded-none bg-primary text-primary-foreground text-xs uppercase tracking-widest h-8 px-4 gap-1.5">
            <Save size={11} /> Lưu cài đặt
          </Button>
        </div>

        <div className="divide-y divide-primary/10">
          {socials.map((s) => (
            <div key={s.id} className={`px-5 py-4 transition-colors ${!s.enabled ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-4">
                {/* Color dot + toggle */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-8 h-8 flex items-center justify-center border border-primary/20" style={{ backgroundColor: s.color + "22" }}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={s.enabled}
                      onChange={(e) => update(s.id, "enabled", e.target.checked)} />
                    <div className="w-9 h-5 bg-muted peer-checked:bg-primary rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:w-4 after:h-4 after:rounded-full after:transition-all peer-checked:after:translate-x-4" />
                  </label>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">Tên hiển thị</label>
                    <input className="w-full border border-primary/20 focus:border-primary bg-background px-2 py-1.5 text-sm text-foreground outline-none"
                      value={s.label} onChange={(e) => update(s.id, "label", e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1">Đường dẫn / Số điện thoại</label>
                    <input className="w-full border border-primary/20 focus:border-primary bg-background px-2 py-1.5 text-sm text-foreground outline-none font-mono text-xs"
                      value={s.href} onChange={(e) => update(s.id, "href", e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/20 px-5 py-4 text-sm text-muted-foreground">
        💡 Các kênh được bật sẽ hiển thị trong nút chat nổi ở góc dưới bên phải website.
      </div>
    </div>
  );
}

export default function AdminPages() {
  const [tab, setTab] = useState<Tab>("pages");

  const TABS: { key: Tab; icon: any; label: string }[] = [
    { key: "pages", icon: FileText, label: "Trang nội dung" },
    { key: "menus", icon: Navigation, label: "Menu điều hướng" },
    { key: "social", icon: Share2, label: "Mạng xã hội" },
  ];

  return (
    <AdminGuard>
      <AdminLayout title="Quản lý Nội dung" subtitle="Trang, menu điều hướng và mạng xã hội">
        {/* Tab bar */}
        <div className="flex gap-0 mb-6 border-b border-primary/20">
          {TABS.map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm border-b-2 transition-all -mb-px ${
                tab === key
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-primary/30"
              }`}>
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {tab === "pages" && <PagesTab />}
        {tab === "menus" && <MenusTab />}
        {tab === "social" && <SocialTab />}
      </AdminLayout>
    </AdminGuard>
  );
}
