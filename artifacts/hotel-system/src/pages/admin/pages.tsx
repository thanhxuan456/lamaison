import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Plus, Edit, Trash2, X, Globe, EyeOff,
  Share2, Navigation, Save, GripVertical, Newspaper,
  Tag, Calendar, Search, Image,
} from "lucide-react";

const PAGES_KEY   = "grand-palace-cms-pages";
const POSTS_KEY   = "grand-palace-cms-posts";
const MENUS_KEY   = "grand-palace-cms-menus";
const SOCIAL_KEY  = "grand-palace-social-links";

/* ──────────── Types ──────────── */
interface Page {
  id: string; title: string; slug: string; content: string;
  status: "published" | "draft"; updatedAt: string;
  metaTitle: string; metaDesc: string; ogImage: string;
}
interface Post {
  id: string; title: string; slug: string; excerpt: string; content: string;
  category: string; tags: string; coverImage: string;
  status: "published" | "draft"; publishedAt: string; updatedAt: string;
  author: string;
}
interface MenuItem { id: string; label: string; href: string; order: number; }
interface SocialLink { id: string; label: string; href: string; enabled: boolean; color: string; }

/* ──────────── Default data ──────────── */
const DEFAULT_PAGES: Page[] = [
  { id: "home",   title: "Trang Chủ",       slug: "/",       content: "Nội dung trang chủ Grand Palace Hotels & Resorts.", status: "published", updatedAt: new Date().toISOString(), metaTitle: "Grand Palace Hotels & Resorts", metaDesc: "Chuỗi khách sạn 5 sao sang trọng bậc nhất Việt Nam.", ogImage: "" },
  { id: "about",  title: "Về Chúng Tôi",    slug: "/about",  content: "Grand Palace — chuỗi khách sạn 5 sao sang trọng bậc nhất Việt Nam.", status: "published", updatedAt: new Date().toISOString(), metaTitle: "Về Chúng Tôi — Grand Palace", metaDesc: "Tìm hiểu về lịch sử và sứ mệnh của Grand Palace Hotels & Resorts.", ogImage: "" },
  { id: "dining", title: "Ẩm Thực",         slug: "/dining", content: "Trải nghiệm ẩm thực đỉnh cao tại các nhà hàng đạt sao Michelin.", status: "published", updatedAt: new Date().toISOString(), metaTitle: "Ẩm Thực — Grand Palace", metaDesc: "Ẩm thực Việt Nam và quốc tế tại Grand Palace.", ogImage: "" },
  { id: "spa",    title: "Spa & Wellness",   slug: "/spa",    content: "Không gian thư giãn hoàng gia với các liệu trình spa cao cấp.", status: "draft",     updatedAt: new Date().toISOString(), metaTitle: "Spa & Wellness — Grand Palace", metaDesc: "Thư giãn tâm hồn tại Spa Grand Palace.", ogImage: "" },
  { id: "offers", title: "Ưu Đãi Đặc Biệt", slug: "/offers", content: "Khám phá những ưu đãi độc quyền dành riêng cho thành viên.", status: "draft",     updatedAt: new Date().toISOString(), metaTitle: "Ưu Đãi — Grand Palace", metaDesc: "Ưu đãi đặc biệt cho thành viên Grand Palace.", ogImage: "" },
];

const DEFAULT_POSTS: Post[] = [
  { id: "p1", title: "Khai trương Grand Palace Đà Nẵng — Chương mới của sự xa hoa", slug: "/news/khai-truong-grand-palace-da-nang", excerpt: "Grand Palace Hotels & Resorts tự hào công bố khai trương chi nhánh Đà Nẵng tại vị trí đắc địa bên bờ sông Hàn.", content: "Chi tiết bài viết...", category: "Tin tức", tags: "khai-truong,da-nang,grand-palace", coverImage: "", status: "published", publishedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), author: "Grand Palace PR" },
  { id: "p2", title: "Top 5 trải nghiệm không thể bỏ lỡ khi ở tại Grand Palace Hà Nội", slug: "/blog/trai-nghiem-grand-palace-ha-noi", excerpt: "Từ bữa sáng buffet xa hoa đến spa hoàng gia — khám phá những khoảnh khắc đáng nhớ nhất.", content: "Chi tiết bài viết...", category: "Blog", tags: "ha-noi,trai-nghiem,top-5", coverImage: "", status: "published", publishedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), author: "Grand Palace Team" },
  { id: "p3", title: "Ưu đãi Mùa Hè 2025 — Giảm đến 40% cho đặt phòng sớm", slug: "/offers/summer-2025", excerpt: "Đặt phòng trước để nhận ưu đãi tốt nhất mùa hè năm nay.", content: "Chi tiết bài viết...", category: "Ưu đãi", tags: "summer,offer,discount", coverImage: "", status: "draft", publishedAt: "", updatedAt: new Date().toISOString(), author: "Marketing" },
];

const DEFAULT_MENUS: MenuItem[] = [
  { id: "m1", label: "Trang chủ", href: "/", order: 1 },
  { id: "m2", label: "Đặt phòng", href: "/bookings", order: 2 },
  { id: "m3", label: "Hà Nội", href: "/hotels/1", order: 3 },
  { id: "m4", label: "Đà Nẵng", href: "/hotels/2", order: 4 },
  { id: "m5", label: "Sài Gòn", href: "/hotels/3", order: 5 },
];

const DEFAULT_SOCIALS: SocialLink[] = [
  { id: "facebook", label: "Facebook", href: "https://m.me/grandpalacehotels", enabled: true, color: "#1877F2" },
  { id: "zalo",     label: "Zalo",     href: "https://zalo.me/0900000000",      enabled: true, color: "#0068FF" },
  { id: "whatsapp", label: "WhatsApp", href: "https://wa.me/84900000000",       enabled: true, color: "#25D366" },
  { id: "telegram", label: "Telegram", href: "https://t.me/grandpalace",        enabled: false, color: "#229ED9" },
  { id: "phone",    label: "Hotline",  href: "tel:+84900000000",                enabled: true, color: "#b8973e" },
];

const POST_CATEGORIES = ["Tin tức", "Blog", "Ưu đãi", "Sự kiện", "Hướng dẫn", "Đánh giá"];

function load<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}
function save<T>(key: string, val: T) { localStorage.setItem(key, JSON.stringify(val)); }

/* ──────────── Status badge ──────────── */
function StatusBadge({ status, onClick }: { status: "published" | "draft"; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 text-[10px] tracking-widest uppercase px-2 py-1 border transition-all ${
        status === "published"
          ? "border-green-400/40 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/30"
          : "border-muted text-muted-foreground hover:bg-muted/50"
      }`}>
      {status === "published" ? <Globe size={10} /> : <EyeOff size={10} />}
      {status === "published" ? "Xuất bản" : "Nháp"}
    </button>
  );
}

/* ──────────── Page Modal ──────────── */
function PageModal({ page, onClose, onSaved }: { page?: Page; onClose: () => void; onSaved: (p: Page) => void }) {
  const [form, setForm] = useState<Page>(page ?? {
    id: Date.now().toString(), title: "", slug: "/", content: "",
    status: "draft", updatedAt: new Date().toISOString(),
    metaTitle: "", metaDesc: "", ogImage: "",
  });
  const set = (k: keyof Page, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const [activeTab, setActiveTab] = useState<"content" | "seo">("content");

  const handleSave = () => {
    if (!form.title || !form.slug) return;
    onSaved({ ...form, updatedAt: new Date().toISOString() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-card border border-primary/40 shadow-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-primary/5 shrink-0">
          <h2 className="font-serif text-xl text-foreground">{page ? "Chỉnh sửa trang" : "Tạo trang mới"}</h2>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        {/* Modal tabs */}
        <div className="flex border-b border-primary/15 shrink-0 bg-background">
          {[{ key: "content", label: "Nội dung" }, { key: "seo", label: "SEO & Meta" }].map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key as any)}
              className={`px-5 py-2.5 text-sm border-b-2 -mb-px transition-all ${activeTab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {activeTab === "content" ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Tiêu đề trang *</label>
                  <input className="w-full border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
                    value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Giới Thiệu" />
                </div>
                <div>
                  <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Đường dẫn (slug) *</label>
                  <input className="w-full border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none font-mono"
                    value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="/about" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Nội dung trang</label>
                <textarea className="w-full border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none resize-none h-52"
                  value={form.content} onChange={(e) => set("content", e.target.value)} placeholder="Nội dung trang... (hỗ trợ Markdown)" />
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
            </>
          ) : (
            <>
              <div>
                <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Meta Title</label>
                <input className="w-full border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
                  value={form.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} placeholder="Grand Palace — Tiêu đề cho Google" />
                <p className="text-[10px] text-muted-foreground mt-1">{form.metaTitle.length}/60 ký tự {form.metaTitle.length > 60 && "— Nên rút ngắn"}</p>
              </div>
              <div>
                <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Meta Description</label>
                <textarea className="w-full border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none resize-none h-24"
                  value={form.metaDesc} onChange={(e) => set("metaDesc", e.target.value)} placeholder="Mô tả ngắn cho Google và mạng xã hội (150-160 ký tự)" />
                <p className="text-[10px] text-muted-foreground mt-1">{form.metaDesc.length}/160 ký tự {form.metaDesc.length > 160 && "— Nên rút ngắn"}</p>
              </div>
              <div>
                <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">OG Image URL (ảnh chia sẻ mạng xã hội)</label>
                <div className="flex gap-2">
                  <input className="flex-1 border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none font-mono"
                    value={form.ogImage} onChange={(e) => set("ogImage", e.target.value)} placeholder="https://grandpalace.vn/images/og-home.jpg" />
                  <div className="w-10 h-10 border border-primary/20 flex items-center justify-center bg-muted/20 shrink-0">
                    {form.ogImage ? <img src={form.ogImage} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} /> : <Image size={14} className="text-muted-foreground" />}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Kích thước khuyến nghị: 1200 × 630px</p>
              </div>
              {/* Preview */}
              {(form.metaTitle || form.metaDesc) && (
                <div className="border border-primary/15 p-4 bg-muted/30">
                  <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2 flex items-center gap-1"><Search size={10} /> Xem trước Google</p>
                  <div className="text-[13px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">{form.metaTitle || form.title}</div>
                  <div className="text-[11px] text-green-700 dark:text-green-500 mt-0.5">grandpalace.vn{form.slug}</div>
                  <div className="text-[12px] text-muted-foreground mt-1 leading-relaxed">{form.metaDesc || form.content.slice(0, 160)}</div>
                </div>
              )}
            </>
          )}
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

/* ──────────── Post Modal ──────────── */
function PostModal({ post, onClose, onSaved }: { post?: Post; onClose: () => void; onSaved: (p: Post) => void }) {
  const [form, setForm] = useState<Post>(post ?? {
    id: Date.now().toString(), title: "", slug: "/blog/", excerpt: "", content: "",
    category: "Blog", tags: "", coverImage: "", status: "draft",
    publishedAt: "", updatedAt: new Date().toISOString(), author: "Admin",
  });
  const set = (k: keyof Post, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const [activeTab, setActiveTab] = useState<"content" | "meta">("content");

  const genSlug = (title: string) => "/blog/" + title.toLowerCase()
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a").replace(/[èéẹẻẽêềếệểễ]/g, "e")
    .replace(/[ìíịỉĩ]/g, "i").replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o")
    .replace(/[ùúụủũưừứựửữ]/g, "u").replace(/[ỳýỵỷỹ]/g, "y").replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  const handleSave = () => {
    if (!form.title) return;
    const p = { ...form, updatedAt: new Date().toISOString() };
    if (p.status === "published" && !p.publishedAt) p.publishedAt = new Date().toISOString();
    onSaved(p);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-card border border-primary/40 shadow-2xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-primary/5 shrink-0">
          <h2 className="font-serif text-xl text-foreground">{post ? "Chỉnh sửa bài viết" : "Tạo bài viết mới"}</h2>
          <button onClick={onClose} className="p-1.5 text-muted-foreground hover:text-foreground"><X size={18} /></button>
        </div>

        <div className="flex border-b border-primary/15 shrink-0 bg-background">
          {[{ key: "content", label: "Nội dung" }, { key: "meta", label: "Thông tin & SEO" }].map(({ key, label }) => (
            <button key={key} onClick={() => setActiveTab(key as any)}
              className={`px-5 py-2.5 text-sm border-b-2 -mb-px transition-all ${activeTab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {activeTab === "content" ? (
            <>
              <div>
                <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Tiêu đề bài viết *</label>
                <input className="w-full border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
                  value={form.title} onChange={(e) => { set("title", e.target.value); if (!post) set("slug", genSlug(e.target.value)); }} placeholder="Tiêu đề hấp dẫn..." />
              </div>
              <div>
                <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Tóm tắt (excerpt)</label>
                <textarea className="w-full border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none resize-none h-20"
                  value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} placeholder="Một vài câu mô tả ngắn hiển thị trong danh sách bài viết..." />
              </div>
              <div>
                <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Nội dung bài viết</label>
                <textarea className="w-full border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none resize-none h-48"
                  value={form.content} onChange={(e) => set("content", e.target.value)} placeholder="Viết nội dung đầy đủ tại đây... (hỗ trợ Markdown)" />
              </div>
              <div>
                <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Trạng thái</label>
                <div className="flex gap-3">
                  {(["published", "draft"] as const).map((s) => (
                    <button key={s} onClick={() => set("status", s)}
                      className={`flex items-center gap-2 px-4 py-2 border text-sm transition-all ${form.status === s ? "border-primary bg-primary/10 text-primary" : "border-primary/20 text-muted-foreground hover:border-primary/40"}`}>
                      {s === "published" ? <Globe size={13} /> : <EyeOff size={13} />}
                      {s === "published" ? "Xuất bản ngay" : "Lưu nháp"}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Danh mục</label>
                  <select className="w-full border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
                    value={form.category} onChange={(e) => set("category", e.target.value)}>
                    {POST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Tác giả</label>
                  <input className="w-full border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
                    value={form.author} onChange={(e) => set("author", e.target.value)} placeholder="Tên tác giả" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Tags (phân cách bằng dấu phẩy)</label>
                <input className="w-full border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
                  value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="khach-san,sang-trong,ha-noi" />
              </div>
              <div>
                <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Slug URL</label>
                <input className="w-full border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none font-mono"
                  value={form.slug} onChange={(e) => set("slug", e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Ảnh bìa (URL)</label>
                <div className="flex gap-2">
                  <input className="flex-1 border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none font-mono"
                    value={form.coverImage} onChange={(e) => set("coverImage", e.target.value)} placeholder="https://..." />
                  <div className="w-10 h-10 border border-primary/20 flex items-center justify-center bg-muted/20 shrink-0">
                    {form.coverImage ? <img src={form.coverImage} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} /> : <Image size={14} className="text-muted-foreground" />}
                  </div>
                </div>
              </div>
              {form.publishedAt && (
                <div>
                  <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Ngày xuất bản</label>
                  <input type="datetime-local" className="w-full border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
                    value={form.publishedAt ? new Date(form.publishedAt).toISOString().slice(0, 16) : ""}
                    onChange={(e) => set("publishedAt", new Date(e.target.value).toISOString())} />
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-primary/15 bg-primary/5 shrink-0">
          <Button variant="outline" onClick={onClose} className="rounded-none border-primary/40">Hủy</Button>
          <Button onClick={handleSave} className="rounded-none bg-primary text-primary-foreground uppercase tracking-widest text-xs px-6">
            <Save size={13} className="mr-2" />{post ? "Lưu thay đổi" : "Tạo bài viết"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ──────────── PAGES TAB ──────────── */
function PagesTab() {
  const { toast } = useToast();
  const [pages, setPages] = useState<Page[]>(() => load(PAGES_KEY, DEFAULT_PAGES));
  const [editPage, setEditPage] = useState<Page | undefined>();
  const [addOpen, setAddOpen] = useState(false);

  const persist = (p: Page[]) => { setPages(p); save(PAGES_KEY, p); };

  const onSaved = (p: Page) => {
    const existing = pages.find((x) => x.id === p.id);
    persist(existing ? pages.map((x) => x.id === p.id ? p : x) : [...pages, p]);
    toast({ title: existing ? "Trang đã cập nhật" : "Trang mới đã tạo", description: p.title });
    setEditPage(undefined); setAddOpen(false);
  };

  const del = (id: string) => {
    if (!confirm("Xóa trang này?")) return;
    persist(pages.filter((p) => p.id !== id));
    toast({ title: "Đã xóa trang" });
  };

  const toggle = (id: string) =>
    persist(pages.map((p) => p.id === id ? { ...p, status: p.status === "published" ? "draft" : "published", updatedAt: new Date().toISOString() } : p));

  return (
    <>
      {addOpen && <PageModal onClose={() => setAddOpen(false)} onSaved={onSaved} />}
      {editPage && <PageModal page={editPage} onClose={() => setEditPage(undefined)} onSaved={onSaved} />}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{pages.length} trang · {pages.filter((p) => p.status === "published").length} đã xuất bản</p>
        <Button onClick={() => setAddOpen(true)} className="rounded-none bg-primary text-primary-foreground uppercase tracking-widest text-xs px-5 h-9 gap-1.5">
          <Plus size={13} /> Tạo trang mới
        </Button>
      </div>

      <div className="bg-card border border-primary/20 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-primary/15 bg-primary/5">
              {["Tiêu đề", "Slug", "Trạng thái", "Cập nhật", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/10">
            {pages.map((p) => (
              <tr key={p.id} className="hover:bg-primary/5 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">
                  <div>{p.title}</div>
                  {p.metaTitle && <div className="text-[10px] text-muted-foreground/60 mt-0.5">SEO: {p.metaTitle.slice(0, 40)}{p.metaTitle.length > 40 ? "…" : ""}</div>}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{p.slug}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} onClick={() => toggle(p.id)} /></td>
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

/* ──────────── POSTS TAB ──────────── */
function PostsTab() {
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>(() => load(POSTS_KEY, DEFAULT_POSTS));
  const [editPost, setEditPost] = useState<Post | undefined>();
  const [addOpen, setAddOpen] = useState(false);
  const [filterCat, setFilterCat] = useState("all");

  const persist = (p: Post[]) => { setPosts(p); save(POSTS_KEY, p); };

  const onSaved = (p: Post) => {
    const existing = posts.find((x) => x.id === p.id);
    persist(existing ? posts.map((x) => x.id === p.id ? p : x) : [...posts, p]);
    toast({ title: existing ? "Bài viết đã cập nhật" : "Bài viết mới đã tạo", description: p.title });
    setEditPost(undefined); setAddOpen(false);
  };

  const del = (id: string) => {
    if (!confirm("Xóa bài viết này?")) return;
    persist(posts.filter((p) => p.id !== id));
    toast({ title: "Đã xóa bài viết" });
  };

  const toggle = (id: string) =>
    persist(posts.map((p) => {
      if (p.id !== id) return p;
      const next = p.status === "published" ? "draft" : "published";
      return { ...p, status: next, publishedAt: next === "published" && !p.publishedAt ? new Date().toISOString() : p.publishedAt, updatedAt: new Date().toISOString() };
    }));

  const allCats = ["all", ...Array.from(new Set(posts.map((p) => p.category)))];
  const filtered = filterCat === "all" ? posts : posts.filter((p) => p.category === filterCat);

  return (
    <>
      {addOpen && <PostModal onClose={() => setAddOpen(false)} onSaved={onSaved} />}
      {editPost && <PostModal post={editPost} onClose={() => setEditPost(undefined)} onSaved={onSaved} />}

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">{posts.length} bài viết · {posts.filter((p) => p.status === "published").length} đã xuất bản</p>
          <div className="flex gap-1">
            {allCats.map((cat) => (
              <button key={cat} onClick={() => setFilterCat(cat)}
                className={`text-[10px] tracking-wide px-2.5 py-1 border transition-all ${filterCat === cat ? "border-primary bg-primary/10 text-primary" : "border-primary/20 text-muted-foreground hover:border-primary/40"}`}>
                {cat === "all" ? "Tất cả" : cat}
              </button>
            ))}
          </div>
        </div>
        <Button onClick={() => setAddOpen(true)} className="rounded-none bg-primary text-primary-foreground uppercase tracking-widest text-xs px-5 h-9 gap-1.5">
          <Plus size={13} /> Viết bài mới
        </Button>
      </div>

      <div className="bg-card border border-primary/20 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-primary/15 bg-primary/5">
              {["Bài viết", "Danh mục", "Tags", "Trạng thái", "Ngày đăng", ""].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/10">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-primary/5 transition-colors">
                <td className="px-4 py-3 max-w-xs">
                  <div className="font-medium text-foreground leading-snug">{p.title}</div>
                  <div className="text-[10px] text-muted-foreground/70 mt-0.5 line-clamp-1">{p.excerpt}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-[10px] tracking-wide uppercase px-2 py-0.5 bg-primary/10 text-primary border border-primary/20">{p.category}</span>
                </td>
                <td className="px-4 py-3 text-[10px] text-muted-foreground font-mono max-w-[120px] truncate">{p.tags}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} onClick={() => toggle(p.id)} /></td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("vi-VN") : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setEditPost(p)} className="p-1.5 border border-primary/20 text-primary hover:bg-primary/10 transition-colors"><Edit size={12} /></button>
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

/* ──────────── MENUS TAB ──────────── */
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
          {[...items].sort((a, b) => a.order - b.order).map((item) => (
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

/* ──────────── SOCIAL TAB ──────────── */
function SocialTab() {
  const { toast } = useToast();
  const [socials, setSocials] = useState<SocialLink[]>(() => load(SOCIAL_KEY, DEFAULT_SOCIALS));

  // Auto-persist on every edit so users never lose changes if they navigate away
  // before clicking "Lưu cài đặt". The button still gives visual confirmation.
  const update = (id: string, k: keyof SocialLink, v: any) =>
    setSocials((s) => {
      const next = s.map((x) => x.id === id ? { ...x, [k]: v } : x);
      save(SOCIAL_KEY, next);
      return next;
    });

  const saveAll = () => {
    save(SOCIAL_KEY, socials);
    toast({ title: "Đã lưu", description: `${socials.filter((s) => s.enabled).length} kênh đang hoạt động` });
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
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-8 h-8 flex items-center justify-center border border-primary/20" style={{ backgroundColor: s.color + "22" }}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={s.enabled} onChange={(e) => update(s.id, "enabled", e.target.checked)} />
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

/* ──────────── MAIN ──────────── */
type Tab = "posts" | "menus" | "social";

export default function AdminPages() {
  const [tab, setTab] = useState<Tab>("posts");

  const TABS: { key: Tab; icon: any; label: string }[] = [
    { key: "posts",  icon: Newspaper,       label: "Bài viết / Blog" },
    { key: "menus",  icon: Navigation,      label: "Menu điều hướng" },
    { key: "social", icon: Share2,          label: "Mạng xã hội" },
  ];

  return (
    <AdminGuard>
      <AdminLayout title="Blog & Menu" subtitle="Bài viết, menu điều hướng và mạng xã hội (cấu trúc trang quản lý ở Page Builder)">
        <div className="flex gap-0 mb-6 border-b border-primary/20 overflow-x-auto">
          {TABS.map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm border-b-2 transition-all -mb-px whitespace-nowrap ${
                tab === key ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground hover:border-primary/30"
              }`}>
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
        {tab === "posts"  && <PostsTab />}
        {tab === "menus"  && <MenusTab />}
        {tab === "social" && <SocialTab />}
      </AdminLayout>
    </AdminGuard>
  );
}
