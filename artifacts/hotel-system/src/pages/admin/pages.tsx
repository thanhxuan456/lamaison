import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Plus, Edit, Trash2, X, Globe, EyeOff, Eye, Save, Newspaper,
  Tag, Calendar, Search, Image as ImageIcon, ExternalLink,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "";
const PAGES_KEY = "grand-palace-cms-pages";

/* ────────────────────────────────────────────────────────────────
 * TYPES
 * ──────────────────────────────────────────────────────────────── */
interface Page {
  id: string; title: string; slug: string; content: string;
  status: "published" | "draft"; updatedAt: string;
  metaTitle: string; metaDesc: string; ogImage: string;
}
interface Post {
  id: number; slug: string; title: string; excerpt: string; content: string;
  coverImage: string; category: string; author: string; tags: string;
  published: boolean; views: number; publishedAt: string | null; createdAt: string;
}

/* ────────────────────────────────────────────────────────────────
 * DEFAULT DATA (Pages — localStorage)
 * ──────────────────────────────────────────────────────────────── */
const DEFAULT_PAGES: Page[] = [
  { id: "home",   title: "Trang Chủ",       slug: "/",       content: "Nội dung trang chủ MAISON DELUXE Hotels & Resorts.", status: "published", updatedAt: new Date().toISOString(), metaTitle: "MAISON DELUXE Hotels & Resorts", metaDesc: "Chuỗi khách sạn 5 sao sang trọng bậc nhất Việt Nam.", ogImage: "" },
  { id: "about",  title: "Về Chúng Tôi",    slug: "/about",  content: "MAISON DELUXE — chuỗi khách sạn 5 sao sang trọng bậc nhất Việt Nam.", status: "published", updatedAt: new Date().toISOString(), metaTitle: "Về Chúng Tôi — MAISON DELUXE", metaDesc: "Tìm hiểu về lịch sử và sứ mệnh của MAISON DELUXE Hotels & Resorts.", ogImage: "" },
  { id: "dining", title: "Ẩm Thực",         slug: "/dining", content: "Trải nghiệm ẩm thực đỉnh cao tại các nhà hàng đạt sao Michelin.", status: "published", updatedAt: new Date().toISOString(), metaTitle: "Ẩm Thực — MAISON DELUXE", metaDesc: "Ẩm thực Việt Nam và quốc tế tại MAISON DELUXE.", ogImage: "" },
  { id: "spa",    title: "Spa & Wellness",  slug: "/spa",    content: "Không gian thư giãn hoàng gia với các liệu trình spa cao cấp.", status: "draft",     updatedAt: new Date().toISOString(), metaTitle: "Spa & Wellness — MAISON DELUXE", metaDesc: "Thư giãn tâm hồn tại Spa MAISON DELUXE.", ogImage: "" },
  { id: "offers", title: "Ưu Đãi Đặc Biệt", slug: "/offers", content: "Khám phá những ưu đãi độc quyền dành riêng cho thành viên.", status: "draft",     updatedAt: new Date().toISOString(), metaTitle: "Ưu Đãi — MAISON DELUXE", metaDesc: "Ưu đãi đặc biệt cho thành viên MAISON DELUXE.", ogImage: "" },
];

const POST_CATS = [
  { value: "news",       label: "Tin tức" },
  { value: "promotion",  label: "Khuyến mãi" },
  { value: "experience", label: "Trải nghiệm" },
  { value: "culinary",   label: "Ẩm thực" },
  { value: "travel",     label: "Du lịch" },
];
const catLabel = (c: string) => POST_CATS.find(x => x.value === c)?.label ?? c;

const emptyPost: Partial<Post> = {
  title: "", slug: "", excerpt: "", content: "", coverImage: "",
  category: "news", author: "MAISON DELUXE", tags: "", published: false,
};

function loadLS<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}
function saveLS<T>(key: string, val: T) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

/* ────────────────────────────────────────────────────────────────
 * STATUS BADGE (page)
 * ──────────────────────────────────────────────────────────────── */
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

/* ────────────────────────────────────────────────────────────────
 * PAGE MODAL (CMS pages — localStorage)
 * ──────────────────────────────────────────────────────────────── */
function PageModal({ page, onClose, onSaved }: { page?: Page; onClose: () => void; onSaved: (p: Page) => void }) {
  const [form, setForm] = useState<Page>(page ?? {
    id: Date.now().toString(), title: "", slug: "/", content: "",
    status: "draft", updatedAt: new Date().toISOString(),
    metaTitle: "", metaDesc: "", ogImage: "",
  });
  const set = (k: keyof Page, v: any) => setForm(f => ({ ...f, [k]: v }));
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
                  <Label>Tiêu đề trang *</Label>
                  <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="VD: Giới Thiệu" />
                </div>
                <div>
                  <Label>Đường dẫn (slug) *</Label>
                  <Input className="font-mono" value={form.slug} onChange={e => set("slug", e.target.value)} placeholder="/about" />
                </div>
              </div>
              <div>
                <Label>Nội dung trang</Label>
                <Textarea rows={10} value={form.content} onChange={e => set("content", e.target.value)} placeholder="Nội dung trang... (hỗ trợ Markdown)" />
              </div>
              <div>
                <Label>Trạng thái</Label>
                <div className="flex gap-3 mt-1">
                  {(["published", "draft"] as const).map(s => (
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
                <Label>Meta Title</Label>
                <Input value={form.metaTitle} onChange={e => set("metaTitle", e.target.value)} placeholder="MAISON DELUXE — Tiêu đề cho Google" />
                <p className="text-[10px] text-muted-foreground mt-1">{form.metaTitle.length}/60 ký tự {form.metaTitle.length > 60 && "— Nên rút ngắn"}</p>
              </div>
              <div>
                <Label>Meta Description</Label>
                <Textarea rows={3} value={form.metaDesc} onChange={e => set("metaDesc", e.target.value)} placeholder="Mô tả ngắn cho Google và mạng xã hội (150-160 ký tự)" />
                <p className="text-[10px] text-muted-foreground mt-1">{form.metaDesc.length}/160 ký tự {form.metaDesc.length > 160 && "— Nên rút ngắn"}</p>
              </div>
              <div>
                <Label>OG Image URL (ảnh chia sẻ mạng xã hội)</Label>
                <div className="flex gap-2">
                  <Input className="flex-1 font-mono" value={form.ogImage} onChange={e => set("ogImage", e.target.value)} placeholder="https://maisondeluxe.vn/images/og-home.jpg" />
                  <div className="w-10 h-10 border border-primary/20 flex items-center justify-center bg-muted/20 shrink-0">
                    {form.ogImage ? <img src={form.ogImage} className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = "none")} /> : <ImageIcon size={14} className="text-muted-foreground" />}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Kích thước khuyến nghị: 1200 × 630px</p>
              </div>
              {(form.metaTitle || form.metaDesc) && (
                <div className="border border-primary/15 p-4 bg-muted/30">
                  <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2 flex items-center gap-1"><Search size={10} /> Xem trước Google</p>
                  <div className="text-[13px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">{form.metaTitle || form.title}</div>
                  <div className="text-[11px] text-green-700 dark:text-green-500 mt-0.5">maisondeluxe.vn{form.slug}</div>
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

/* ────────────────────────────────────────────────────────────────
 * PAGES TAB (CMS pages — localStorage)
 * ──────────────────────────────────────────────────────────────── */
function PagesTab() {
  const { toast } = useToast();
  const [pages, setPages] = useState<Page[]>(() => loadLS(PAGES_KEY, DEFAULT_PAGES));
  const [editPage, setEditPage] = useState<Page | undefined>();
  const [addOpen, setAddOpen] = useState(false);

  const persist = (p: Page[]) => { setPages(p); saveLS(PAGES_KEY, p); };

  const onSaved = (p: Page) => {
    const existing = pages.find(x => x.id === p.id);
    persist(existing ? pages.map(x => x.id === p.id ? p : x) : [...pages, p]);
    toast({ title: existing ? "Trang đã cập nhật" : "Trang mới đã tạo", description: p.title });
    setEditPage(undefined); setAddOpen(false);
  };

  const del = (id: string) => {
    if (!confirm("Xóa trang này?")) return;
    persist(pages.filter(p => p.id !== id));
    toast({ title: "Đã xóa trang" });
  };

  const toggle = (id: string) =>
    persist(pages.map(p => p.id === id ? { ...p, status: p.status === "published" ? "draft" : "published", updatedAt: new Date().toISOString() } : p));

  return (
    <>
      {addOpen && <PageModal onClose={() => setAddOpen(false)} onSaved={onSaved} />}
      {editPage && <PageModal page={editPage} onClose={() => setEditPage(undefined)} onSaved={onSaved} />}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{pages.length} trang · {pages.filter(p => p.status === "published").length} đã xuất bản</p>
        <Button onClick={() => setAddOpen(true)} className="rounded-none bg-primary text-primary-foreground uppercase tracking-widest text-xs px-5 h-9 gap-1.5">
          <Plus size={13} /> Tạo trang mới
        </Button>
      </div>

      <div className="bg-card border border-primary/20 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-primary/15 bg-primary/5">
              {["Tiêu đề", "Slug", "Trạng thái", "Cập nhật", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-primary/10">
            {pages.map(p => (
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

/* ────────────────────────────────────────────────────────────────
 * POSTS TAB (Bài viết / Tin tức — REAL API)
 * ──────────────────────────────────────────────────────────────── */
function PostsTab() {
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filterCat, setFilterCat] = useState<string>("all");
  const [editing, setEditing] = useState<Partial<Post> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const r = await fetch(`${API}/api/blog-posts?all=true`);
      if (r.ok) setPosts(await r.json());
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const filtered = filterCat === "all" ? posts : posts.filter(p => p.category === filterCat);

  const onSave = async () => {
    if (!editing) return;
    if (!editing.title?.trim()) { toast({ title: "Vui lòng nhập tiêu đề", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const url = editing.id ? `${API}/api/blog-posts/${editing.id}` : `${API}/api/blog-posts`;
      const method = editing.id ? "PATCH" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? r.statusText); }
      toast({ title: editing.id ? "Đã cập nhật bài viết" : "Đã tạo bài viết" });
      setEditing(null); load();
    } catch (e: any) {
      toast({ title: "Lỗi", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const onDelete = async (id: number) => {
    if (!confirm("Xoá bài viết này?")) return;
    await fetch(`${API}/api/blog-posts/${id}`, { method: "DELETE" });
    toast({ title: "Đã xoá" }); load();
  };

  const togglePublish = async (p: Post) => {
    await fetch(`${API}/api/blog-posts/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !p.published }),
    });
    load();
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterCat("all")}
            className={`px-3 h-9 text-[10px] uppercase tracking-widest border ${filterCat === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>
            Tất cả ({posts.length})
          </button>
          {POST_CATS.map(c => {
            const n = posts.filter(p => p.category === c.value).length;
            return (
              <button key={c.value} onClick={() => setFilterCat(c.value)}
                className={`px-3 h-9 text-[10px] uppercase tracking-widest border ${filterCat === c.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>
                {c.label} ({n})
              </button>
            );
          })}
        </div>
        <Button onClick={() => setEditing({ ...emptyPost })} className="rounded-none bg-primary text-primary-foreground uppercase tracking-widest text-xs px-5 h-9 gap-1.5">
          <Plus size={13} /> Bài viết mới
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Newspaper size={32} className="mx-auto text-primary/40 mb-3" />
          <p className="text-muted-foreground text-sm">Chưa có bài viết. Hãy tạo bài viết đầu tiên.</p>
        </CardContent></Card>
      ) : (
        <div className="border border-border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-primary/10 border-b border-primary/25 text-[10px] uppercase tracking-widest text-primary font-semibold">
              <tr>
                <th className="text-left p-3">Tiêu đề</th>
                <th className="text-left p-3">Chuyên mục</th>
                <th className="text-left p-3">Trạng thái</th>
                <th className="text-left p-3">Lượt xem</th>
                <th className="text-right p-3">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-t border-border hover:bg-secondary/40">
                  <td className="p-3">
                    <div className="font-medium text-foreground">{p.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">/{p.slug}</div>
                  </td>
                  <td className="p-3"><span className="inline-flex items-center gap-1.5 text-xs"><Tag size={11} /> {catLabel(p.category)}</span></td>
                  <td className="p-3">
                    <button onClick={() => togglePublish(p)}
                      className={`inline-flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-widest border ${p.published ? "border-green-500/40 text-green-500" : "border-muted-foreground/30 text-muted-foreground"}`}>
                      {p.published ? <><Eye size={11} /> Đã xuất bản</> : <><EyeOff size={11} /> Bản nháp</>}
                    </button>
                    {p.publishedAt && <div className="text-[10px] text-muted-foreground mt-1 inline-flex items-center gap-1"><Calendar size={10} /> {new Date(p.publishedAt).toLocaleDateString("vi-VN")}</div>}
                  </td>
                  <td className="p-3 text-muted-foreground">{p.views}</td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-1">
                      {p.published && (
                        <Link href={`/news/${p.slug}`}>
                          <Button size="sm" variant="ghost" title="Xem"><ExternalLink size={14} /></Button>
                        </Link>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setEditing(p)}><Edit size={14} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => onDelete(p.id)} className="text-destructive hover:text-destructive"><Trash2 size={14} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-stretch justify-end" onClick={() => !saving && setEditing(null)}>
          <div className="w-full max-w-2xl bg-card border-l border-primary/30 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <h2 className="font-serif text-xl text-foreground">{editing.id ? "Sửa bài viết" : "Bài viết mới"}</h2>
              <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><Label>Tiêu đề *</Label><Input value={editing.title ?? ""} onChange={e => setEditing({ ...editing, title: e.target.value })} /></div>
              <div><Label>Slug (URL — để trống sẽ tự sinh)</Label>
                <Input value={editing.slug ?? ""} placeholder="vd: khuyen-mai-mua-he-2026"
                  onChange={e => setEditing({ ...editing, slug: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Chuyên mục</Label>
                  <select className="w-full h-10 px-3 border border-input rounded bg-background text-sm"
                    value={editing.category ?? "news"} onChange={e => setEditing({ ...editing, category: e.target.value })}>
                    {POST_CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select></div>
                <div><Label>Tác giả</Label><Input value={editing.author ?? ""} onChange={e => setEditing({ ...editing, author: e.target.value })} /></div>
              </div>
              <div><Label>Ảnh bìa (URL)</Label>
                <Input value={editing.coverImage ?? ""} placeholder="https://..."
                  onChange={e => setEditing({ ...editing, coverImage: e.target.value })} />
                {editing.coverImage && <img src={editing.coverImage} alt="" className="mt-2 w-full max-h-48 object-cover border border-border" />}
              </div>
              <div><Label>Tóm tắt</Label>
                <Textarea rows={3} value={editing.excerpt ?? ""} onChange={e => setEditing({ ...editing, excerpt: e.target.value })} /></div>
              <div><Label>Nội dung (HTML hoặc văn bản)</Label>
                <Textarea rows={14} value={editing.content ?? ""} className="font-mono text-xs"
                  onChange={e => setEditing({ ...editing, content: e.target.value })} /></div>
              <div><Label>Thẻ (cách nhau bằng dấu phẩy)</Label>
                <Input value={editing.tags ?? ""} placeholder="luxury, hanoi, spa"
                  onChange={e => setEditing({ ...editing, tags: e.target.value })} /></div>
              <div className="flex items-center justify-between border border-border rounded p-3">
                <div>
                  <Label className="!m-0">Xuất bản</Label>
                  <p className="text-xs text-muted-foreground">Khi bật, bài viết hiển thị công khai trên /news.</p>
                </div>
                <Switch checked={!!editing.published} onCheckedChange={c => setEditing({ ...editing, published: c })} />
              </div>
            </div>
            <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Huỷ</Button>
              <Button onClick={onSave} disabled={saving}><Save size={14} className="mr-1" /> {saving ? "Đang lưu…" : "Lưu"}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
 * MAIN — Unified Content Management
 * ──────────────────────────────────────────────────────────────── */
type Tab = "pages" | "posts";

function ContentAdmin() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const tabParam = new URLSearchParams(search).get("tab");
  const tab: Tab = tabParam === "posts" ? "posts" : "pages";
  const setTab = (next: Tab) => {
    const sp = new URLSearchParams(search);
    sp.set("tab", next);
    navigate(`/admin/pages?${sp.toString()}`, { replace: true });
  };

  const TABS: { key: Tab; icon: any; label: string }[] = [
    { key: "pages", icon: FileText,   label: "Trang" },
    { key: "posts", icon: Newspaper,  label: "Bài viết / Tin tức" },
  ];

  return (
    <AdminLayout
      title="Quản lý Nội Dung"
      subtitle="Tạo và quản lý các trang giới thiệu cũng như bài viết / tin tức cho website."
    >
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
      {tab === "pages" && <PagesTab />}
      {tab === "posts" && <PostsTab />}
    </AdminLayout>
  );
}

export default function AdminPages() {
  return <AdminGuard><ContentAdmin /></AdminGuard>;
}
