import { useEffect, useState } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { DEFAULT_PAGES } from "./pages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Save, Globe, EyeOff, Search, Image as ImageIcon,
  Eye, Trash2, ExternalLink,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "";
const PAGES_KEY = "grand-palace-cms-pages";

/* ────────────────────────────────────────────────────────────────
 * Types
 * ──────────────────────────────────────────────────────────────── */
interface CmsPage {
  id: string; title: string; slug: string; content: string;
  status: "published" | "draft"; updatedAt: string;
  metaTitle: string; metaDesc: string; ogImage: string;
}
interface Post {
  id: number; slug: string; title: string; excerpt: string; content: string;
  coverImage: string; category: string; author: string; tags: string;
  published: boolean; views: number; publishedAt: string | null; createdAt: string;
}

const POST_CATS = [
  { value: "news",       label: "Tin tức" },
  { value: "promotion",  label: "Khuyến mãi" },
  { value: "experience", label: "Trải nghiệm" },
  { value: "culinary",   label: "Ẩm thực" },
  { value: "travel",     label: "Du lịch" },
];

const emptyPost: Partial<Post> = {
  title: "", slug: "", excerpt: "", content: "", coverImage: "",
  category: "news", author: "MAISON DELUXE", tags: "", published: false,
};

function loadLS<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}
function saveLS<T>(key: string, val: T) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

/* ────────────────────────────────────────────────────────────────
 * EditorChrome — common page header
 * ──────────────────────────────────────────────────────────────── */
function EditorChrome({
  backHref, title, subtitle, statusBadge, actions, children,
}: {
  backHref: string;
  title: string;
  subtitle?: string;
  statusBadge?: React.ReactNode;
  actions: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <AdminLayout title={title} subtitle={subtitle}>
      <div className="sticky top-0 z-20 -mx-6 -mt-6 mb-6 px-6 py-3 bg-background/95 backdrop-blur border-b border-border flex flex-wrap items-center gap-3">
        <Link href={backHref}>
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            <ArrowLeft size={14} /> Quay lại danh sách
          </Button>
        </Link>
        {statusBadge}
        <div className="flex-1" />
        <div className="flex items-center gap-2">{actions}</div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">{children}</div>
    </AdminLayout>
  );
}

/* ────────────────────────────────────────────────────────────────
 * POST EDITOR  (real backend)
 * Routes: /admin/content/posts/new   |   /admin/content/posts/:id
 * ──────────────────────────────────────────────────────────────── */
function PostEditorContent() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [, paramsEdit] = useRoute("/admin/content/posts/:id");
  const isNew = !paramsEdit?.id || paramsEdit.id === "new";
  const id = isNew ? null : Number(paramsEdit!.id);

  const [form, setForm] = useState<Partial<Post>>({ ...emptyPost });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isNew) return;
    let aborted = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`${API}/api/blog-posts/${id}?all=true`);
        if (!r.ok) throw new Error("Không tải được bài viết");
        const data = await r.json();
        if (!aborted) setForm(data);
      } catch (e: any) {
        toast({ title: "Lỗi", description: e.message, variant: "destructive" });
        navigate("/admin/pages?tab=posts", { replace: true });
      } finally { if (!aborted) setLoading(false); }
    })();
    return () => { aborted = true; };
  }, [id, isNew]);

  const set = <K extends keyof Post>(k: K, v: Post[K]) => setForm(f => ({ ...f, [k]: v }));

  const onSave = async (closeAfter = false) => {
    if (!form.title?.trim()) { toast({ title: "Vui lòng nhập tiêu đề", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const url = id ? `${API}/api/blog-posts/${id}` : `${API}/api/blog-posts`;
      const method = id ? "PATCH" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error ?? r.statusText); }
      const saved = await r.json();
      toast({ title: id ? "Đã cập nhật" : "Đã tạo bài viết" });
      if (closeAfter) navigate("/admin/pages?tab=posts");
      else if (!id && saved?.id) navigate(`/admin/content/posts/${saved.id}`, { replace: true });
    } catch (e: any) {
      toast({ title: "Lỗi", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const onDelete = async () => {
    if (!id) return;
    if (!confirm("Xoá bài viết này?")) return;
    await fetch(`${API}/api/blog-posts/${id}`, { method: "DELETE" });
    toast({ title: "Đã xoá" });
    navigate("/admin/pages?tab=posts");
  };

  if (loading) {
    return <AdminLayout title="Đang tải…"><div className="py-20 text-center text-muted-foreground text-sm">Đang tải bài viết…</div></AdminLayout>;
  }

  return (
    <EditorChrome
      backHref="/admin/pages?tab=posts"
      title={id ? "Sửa bài viết" : "Bài viết mới"}
      subtitle={id ? `ID #${id} · /${form.slug ?? ""}` : "Soạn thảo bài viết / tin tức mới"}
      statusBadge={
        <span className={`hidden sm:inline-flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-widest border ${form.published ? "border-green-500/40 text-green-600 dark:text-green-400" : "border-muted-foreground/30 text-muted-foreground"}`}>
          {form.published ? <><Eye size={11} /> Đã xuất bản</> : <><EyeOff size={11} /> Bản nháp</>}
        </span>
      }
      actions={
        <>
          {id && form.published && (
            <Link href={`/news/${form.slug}`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs"><ExternalLink size={13} /> Xem</Button>
            </Link>
          )}
          {id && (
            <Button variant="outline" size="sm" onClick={onDelete} className="gap-1.5 text-xs text-destructive hover:text-destructive">
              <Trash2 size={13} /> Xoá
            </Button>
          )}
          <Button onClick={() => onSave(false)} disabled={saving} size="sm" className="gap-1.5 text-xs">
            <Save size={13} /> {saving ? "Đang lưu…" : "Lưu"}
          </Button>
          <Button onClick={() => onSave(true)} disabled={saving} size="sm" variant="secondary" className="gap-1.5 text-xs">
            Lưu &amp; đóng
          </Button>
        </>
      }
    >
      {/* Main column */}
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div>
              <Label>Tiêu đề *</Label>
              <Input value={form.title ?? ""} onChange={e => set("title", e.target.value)} className="text-lg" placeholder="Tiêu đề bài viết..." />
            </div>
            <div>
              <Label>Tóm tắt</Label>
              <Textarea rows={3} value={form.excerpt ?? ""} onChange={e => set("excerpt", e.target.value)} placeholder="Mô tả ngắn hiển thị trên thẻ bài viết và Google" />
            </div>
            <div>
              <Label>Nội dung</Label>
              <Textarea rows={22} value={form.content ?? ""} className="font-mono text-xs"
                onChange={e => set("content", e.target.value)}
                placeholder="Nội dung HTML hoặc văn bản. Hỗ trợ # Tiêu đề, ## Phụ đề, dòng trống tách đoạn..." />
              <p className="text-[10px] text-muted-foreground mt-1">{(form.content ?? "").length.toLocaleString("vi-VN")} ký tự</p>
            </div>
          </CardContent>
        </Card>

        {form.coverImage && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Ảnh bìa</CardTitle></CardHeader>
            <CardContent><img src={form.coverImage} alt="" className="w-full max-h-80 object-cover border border-border" /></CardContent>
          </Card>
        )}
      </div>

      {/* Sidebar */}
      <aside className="space-y-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Xuất bản</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between border border-border rounded p-3">
              <div>
                <Label className="!m-0 text-xs">Trạng thái</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">{form.published ? "Hiển thị công khai trên /news" : "Chỉ admin nhìn thấy"}</p>
              </div>
              <Switch checked={!!form.published} onCheckedChange={c => set("published", c)} />
            </div>
            {form.publishedAt && (
              <p className="text-[11px] text-muted-foreground">Đăng ngày: {new Date(form.publishedAt).toLocaleString("vi-VN")}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Phân loại</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Chuyên mục</Label>
              <select className="w-full h-10 px-3 border border-input rounded bg-background text-sm"
                value={form.category ?? "news"} onChange={e => set("category", e.target.value)}>
                {POST_CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-xs">Tác giả</Label>
              <Input value={form.author ?? ""} onChange={e => set("author", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Thẻ (cách nhau bằng dấu phẩy)</Label>
              <Input value={form.tags ?? ""} placeholder="luxury, hanoi, spa" onChange={e => set("tags", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">URL & Ảnh bìa</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Slug (để trống tự sinh)</Label>
              <Input value={form.slug ?? ""} placeholder="vd: khuyen-mai-mua-he-2026"
                className="font-mono text-xs"
                onChange={e => set("slug", e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Ảnh bìa (URL)</Label>
              <Input value={form.coverImage ?? ""} placeholder="https://..." className="font-mono text-xs"
                onChange={e => set("coverImage", e.target.value)} />
            </div>
          </CardContent>
        </Card>
      </aside>
    </EditorChrome>
  );
}

export function AdminPostEditor() {
  return <AdminGuard><PostEditorContent /></AdminGuard>;
}

/* ────────────────────────────────────────────────────────────────
 * PAGE EDITOR (CMS Pages — localStorage)
 * Routes: /admin/content/pages/new  |  /admin/content/pages/:id
 * ──────────────────────────────────────────────────────────────── */
function PageEditorContent() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/admin/content/pages/:id");
  const isNew = !params?.id || params.id === "new";
  const id = isNew ? null : params!.id;

  const [form, setForm] = useState<CmsPage>(() => ({
    id: id ?? Date.now().toString(),
    title: "", slug: "/", content: "",
    status: "draft", updatedAt: new Date().toISOString(),
    metaTitle: "", metaDesc: "", ogImage: "",
  }));
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (isNew) return;
    const all = loadLS<CmsPage[]>(PAGES_KEY, DEFAULT_PAGES as CmsPage[]);
    const found = all.find(p => p.id === id);
    if (!found) {
      toast({ title: "Không tìm thấy trang", variant: "destructive" });
      navigate("/admin/pages?tab=pages", { replace: true });
      return;
    }
    setForm(found);
    setLoading(false);
  }, [id, isNew]);

  const set = <K extends keyof CmsPage>(k: K, v: CmsPage[K]) => setForm(f => ({ ...f, [k]: v }));

  const persist = (closeAfter = false) => {
    if (!form.title || !form.slug) {
      toast({ title: "Vui lòng nhập tiêu đề và slug", variant: "destructive" });
      return;
    }
    const all = loadLS<CmsPage[]>(PAGES_KEY, DEFAULT_PAGES as CmsPage[]);
    const updated = { ...form, updatedAt: new Date().toISOString() };
    const exists = all.some(p => p.id === updated.id);
    const next = exists ? all.map(p => p.id === updated.id ? updated : p) : [...all, updated];
    saveLS(PAGES_KEY, next);
    setForm(updated);
    toast({ title: exists ? "Trang đã cập nhật" : "Trang mới đã tạo", description: updated.title });
    if (closeAfter) navigate("/admin/pages?tab=pages");
    else if (isNew) navigate(`/admin/content/pages/${updated.id}`, { replace: true });
  };

  const onDelete = () => {
    if (!id) return;
    if (!confirm("Xoá trang này?")) return;
    const all = loadLS<CmsPage[]>(PAGES_KEY, DEFAULT_PAGES as CmsPage[]);
    saveLS(PAGES_KEY, all.filter(p => p.id !== id));
    toast({ title: "Đã xoá trang" });
    navigate("/admin/pages?tab=pages");
  };

  if (loading) return <AdminLayout title="Đang tải…"><div className="py-20 text-center text-muted-foreground text-sm">Đang tải…</div></AdminLayout>;

  return (
    <EditorChrome
      backHref="/admin/pages?tab=pages"
      title={id && !isNew ? "Sửa trang" : "Tạo trang mới"}
      subtitle={form.slug}
      statusBadge={
        <span className={`hidden sm:inline-flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-widest border ${form.status === "published" ? "border-green-500/40 text-green-600 dark:text-green-400" : "border-muted-foreground/30 text-muted-foreground"}`}>
          {form.status === "published" ? <><Globe size={11} /> Xuất bản</> : <><EyeOff size={11} /> Nháp</>}
        </span>
      }
      actions={
        <>
          {!isNew && (
            <Button variant="outline" size="sm" onClick={onDelete} className="gap-1.5 text-xs text-destructive hover:text-destructive">
              <Trash2 size={13} /> Xoá
            </Button>
          )}
          <Button onClick={() => persist(false)} size="sm" className="gap-1.5 text-xs"><Save size={13} /> Lưu</Button>
          <Button onClick={() => persist(true)} size="sm" variant="secondary" className="gap-1.5 text-xs">Lưu &amp; đóng</Button>
        </>
      }
    >
      {/* Main */}
      <div className="space-y-6">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Tiêu đề trang *</Label>
                <Input value={form.title} onChange={e => set("title", e.target.value)} className="text-lg" placeholder="VD: Giới thiệu" />
              </div>
              <div>
                <Label>Đường dẫn (slug) *</Label>
                <Input className="font-mono" value={form.slug} onChange={e => set("slug", e.target.value)} placeholder="/about" />
              </div>
            </div>
            <div>
              <Label>Nội dung trang</Label>
              <Textarea rows={22} value={form.content} onChange={e => set("content", e.target.value)} placeholder="Nội dung trang... (hỗ trợ Markdown)" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <aside className="space-y-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Trạng thái</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {(["published", "draft"] as const).map(s => (
                <button key={s} onClick={() => set("status", s)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border text-xs transition-all ${form.status === s ? "border-primary bg-primary/10 text-primary" : "border-primary/20 text-muted-foreground hover:border-primary/40 hover:bg-primary/5"}`}>
                  {s === "published" ? <Globe size={12} /> : <EyeOff size={12} />}
                  {s === "published" ? "Xuất bản" : "Nháp"}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">Cập nhật: {new Date(form.updatedAt).toLocaleString("vi-VN")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><Search size={14} /> SEO &amp; Meta</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Meta Title</Label>
              <Input value={form.metaTitle} onChange={e => set("metaTitle", e.target.value)} placeholder="Tiêu đề cho Google" />
              <p className="text-[10px] text-muted-foreground mt-1">{form.metaTitle.length}/60 ký tự</p>
            </div>
            <div>
              <Label className="text-xs">Meta Description</Label>
              <Textarea rows={3} value={form.metaDesc} onChange={e => set("metaDesc", e.target.value)} placeholder="Mô tả ngắn (150-160 ký tự)" />
              <p className="text-[10px] text-muted-foreground mt-1">{form.metaDesc.length}/160 ký tự</p>
            </div>
            <div>
              <Label className="text-xs">OG Image URL</Label>
              <div className="flex gap-2">
                <Input className="flex-1 font-mono text-xs" value={form.ogImage} onChange={e => set("ogImage", e.target.value)} placeholder="https://..." />
                <div className="w-10 h-10 border border-primary/20 flex items-center justify-center bg-muted/20 shrink-0">
                  {form.ogImage
                    ? <img src={form.ogImage} className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = "none")} />
                    : <ImageIcon size={14} className="text-muted-foreground" />}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Khuyến nghị: 1200 × 630px</p>
            </div>
            {(form.metaTitle || form.metaDesc) && (
              <div className="border border-primary/15 p-3 bg-muted/30 mt-2">
                <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-1.5">Xem trước Google</p>
                <div className="text-[13px] text-blue-600 dark:text-blue-400">{form.metaTitle || form.title}</div>
                <div className="text-[11px] text-green-700 dark:text-green-500 mt-0.5">maisondeluxe.vn{form.slug}</div>
                <div className="text-[12px] text-muted-foreground mt-1 leading-relaxed line-clamp-3">{form.metaDesc || form.content.slice(0, 160)}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </aside>
    </EditorChrome>
  );
}

export function AdminPageEditor() {
  return <AdminGuard><PageEditorContent /></AdminGuard>;
}
