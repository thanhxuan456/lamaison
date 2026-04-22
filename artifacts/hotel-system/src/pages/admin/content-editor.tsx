import { useEffect, useRef, useState } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { DEFAULT_PAGES } from "./pages";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { CategoryManager } from "@/components/admin/category-manager";
import { fetchPostCategories, DEFAULT_POST_CATS, type PostCategory } from "@/lib/post-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Save, Globe, EyeOff, Search, Image as ImageIcon,
  Eye, Trash2, ExternalLink, Upload, X, Link2,
  Send, Facebook, Instagram, MessageCircle, Music2, MapPin, CheckCircle2, AlertCircle, Loader2, RefreshCw,
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

const emptyPost: Partial<Post> = {
  title: "", slug: "", excerpt: "", content: "", coverImage: "",
  category: "news", author: "MAISON DELUXE", tags: "", published: false,
};

function loadLS<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}
function saveLS<T>(key: string, val: T) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

/* ────────────────────────────────────────────────────────────────
 * MediaPicker — WordPress-style featured image picker
 * - Pick from local file (or paste URL)
 * - Preview with native dimensions + file size
 * - Resize presets: Thumbnail 150, Medium 600, Large 1200, Full
 * - Outputs a data URL (or original URL) into `value`
 * ──────────────────────────────────────────────────────────────── */
const SIZE_PRESETS = [
  { key: "thumbnail", label: "Thumbnail", w: 150,  h: 150,  crop: true  },
  { key: "medium",    label: "Medium",    w: 600,  h: 600,  crop: false },
  { key: "large",     label: "Large",     w: 1200, h: 1200, crop: false },
  { key: "full",      label: "Full size", w: 0,    h: 0,    crop: false },
] as const;
type SizeKey = typeof SIZE_PRESETS[number]["key"];

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(r.error ?? new Error("read error"));
    r.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = () => rej(new Error("image load error"));
    img.src = src;
  });
}

async function resizeDataURL(src: string, target: typeof SIZE_PRESETS[number]): Promise<{ url: string; w: number; h: number }> {
  const img = await loadImage(src);
  if (target.key === "full") return { url: src, w: img.naturalWidth, h: img.naturalHeight };

  const { w: tw, h: th, crop } = target;
  let dw: number, dh: number, sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;

  if (crop) {
    // square crop centered
    dw = tw; dh = th;
    const side = Math.min(sw, sh);
    sx = (sw - side) / 2; sy = (sh - side) / 2; sw = sh = side;
  } else {
    const ratio = Math.min(tw / sw, th / sh, 1);
    dw = Math.round(sw * ratio); dh = Math.round(sh * ratio);
  }
  const canvas = document.createElement("canvas");
  canvas.width = dw; canvas.height = dh;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh);
  const url = canvas.toDataURL("image/jpeg", 0.85);
  return { url, w: dw, h: dh };
}

function humanBytes(n: number): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function MediaPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [mode, setMode] = useState<"file" | "url">(value?.startsWith("data:") ? "file" : "url");
  const [origUrl, setOrigUrl] = useState<string>(value);
  const [origMeta, setOrigMeta] = useState<{ w: number; h: number; bytes: number; name?: string } | null>(null);
  const [size, setSize] = useState<SizeKey>("full");
  const [busy, setBusy] = useState(false);

  // When the user picks a file
  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast({ title: "Vui lòng chọn file ảnh", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const dataUrl = await readFileAsDataURL(file);
      const img = await loadImage(dataUrl);
      setOrigUrl(dataUrl);
      setOrigMeta({ w: img.naturalWidth, h: img.naturalHeight, bytes: file.size, name: file.name });
      setSize("full");
      onChange(dataUrl);
      setMode("file");
    } catch (e: any) {
      toast({ title: "Không đọc được file", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  // When the user types/pastes a URL
  const onUrlBlur = async (u: string) => {
    setOrigUrl(u);
    onChange(u);
    if (!u) { setOrigMeta(null); return; }
    try { const img = await loadImage(u); setOrigMeta({ w: img.naturalWidth, h: img.naturalHeight, bytes: 0 }); }
    catch { setOrigMeta(null); }
  };

  // Apply a resize preset to the current image
  const applySize = async (key: SizeKey) => {
    if (!origUrl) return;
    setSize(key);
    const preset = SIZE_PRESETS.find(p => p.key === key)!;
    setBusy(true);
    try {
      const out = await resizeDataURL(origUrl, preset);
      onChange(out.url);
    } catch (e: any) {
      toast({ title: "Không thể resize ảnh", description: "Ảnh từ URL ngoài có thể bị chặn CORS — hãy tải file lên thay thế.", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const remove = () => {
    setOrigUrl(""); setOrigMeta(null); setSize("full");
    onChange("");
    if (inputRef.current) inputRef.current.value = "";
  };

  // Derived dimensions of the currently-selected size preview
  const preset = SIZE_PRESETS.find(p => p.key === size)!;
  const displayW = preset.key === "full" ? origMeta?.w : Math.min(preset.w, origMeta?.w ?? preset.w);
  const displayH = preset.key === "full" ? origMeta?.h : (preset.crop ? preset.h : (origMeta ? Math.round((origMeta.h * (displayW ?? preset.w)) / origMeta.w) : preset.h));

  return (
    <div className="space-y-3">
      {/* Mode tabs */}
      <div className="flex border border-border">
        {(["file", "url"] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} type="button"
            className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-widest transition-colors ${mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-foreground/10 hover:text-white"}`}>
            {m === "file" ? <><Upload size={12} /> Tải lên</> : <><Link2 size={12} /> URL</>}
          </button>
        ))}
      </div>

      {mode === "url" ? (
        <Input value={value ?? ""} placeholder="https://..." className="font-mono text-xs"
          onChange={e => onChange(e.target.value)}
          onBlur={e => onUrlBlur(e.target.value)} />
      ) : (
        <>
          <input ref={inputRef} type="file" accept="image/*" hidden
            onChange={e => onFile(e.target.files?.[0])} />
          <Button type="button" variant="outline" size="sm" disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="w-full gap-1.5 text-xs">
            <Upload size={13} /> {busy ? "Đang xử lý…" : "Chọn ảnh từ máy"}
          </Button>
        </>
      )}

      {/* Preview */}
      {value ? (
        <div className="border border-border bg-muted/20">
          <div className="relative bg-[repeating-conic-gradient(#0001_0_25%,transparent_0_50%)] bg-[length:16px_16px]">
            <img src={value} alt="cover preview" className="w-full max-h-64 object-contain" />
            <button type="button" onClick={remove}
              className="absolute top-1.5 right-1.5 p-1 bg-background/80 hover:bg-destructive hover:text-destructive-foreground border border-border rounded transition-colors"
              title="Xoá ảnh"><X size={13} /></button>
          </div>
          <div className="px-3 py-2 text-[10px] text-muted-foreground border-t border-border flex flex-wrap items-center justify-between gap-2">
            <span>
              {origMeta?.name && <strong className="text-foreground/80">{origMeta.name}</strong>}
              {origMeta?.w ? <> · {displayW}×{displayH}px</> : null}
              {origMeta?.bytes ? <> · {humanBytes(origMeta.bytes)}</> : null}
            </span>
            <span className="uppercase tracking-widest">{preset.label}</span>
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-border h-32 flex flex-col items-center justify-center text-muted-foreground gap-1.5">
          <ImageIcon size={20} className="opacity-40" />
          <span className="text-[11px]">Chưa có ảnh bìa</span>
        </div>
      )}

      {/* Size presets */}
      {value && origMeta && (
        <div>
          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Kích thước</Label>
          <div className="grid grid-cols-2 gap-1.5 mt-1.5">
            {SIZE_PRESETS.map(p => (
              <button key={p.key} type="button" disabled={busy}
                onClick={() => applySize(p.key)}
                className={`px-2 py-1.5 text-[10px] uppercase tracking-widest border transition-colors ${size === p.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-foreground/10 hover:text-white hover:border-primary"}`}>
                {p.label}
                <div className="text-[9px] opacity-70 mt-0.5 normal-case tracking-normal">
                  {p.key === "full" ? `${origMeta.w}×${origMeta.h}` : (p.crop ? `${p.w}×${p.h}` : `≤ ${p.w}px`)}
                </div>
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            {size === "thumbnail" && "Crop vuông 1:1, dùng cho thumbnail card và avatar bài viết."}
            {size === "medium" && "Vừa với cột sidebar, danh sách bài viết, OG image."}
            {size === "large" && "Hero ảnh đầu trang, banner."}
            {size === "full" && "Giữ nguyên kích thước gốc."}
          </p>
        </div>
      )}
    </div>
  );
}

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
  const [cats, setCats] = useState<PostCategory[]>(DEFAULT_POST_CATS);
  const [catMgrOpen, setCatMgrOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => fetchPostCategories().then(c => { if (!cancelled) setCats(c); });
    refresh();
    window.addEventListener("post-categories:changed", refresh);
    return () => { cancelled = true; window.removeEventListener("post-categories:changed", refresh); };
  }, []);

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
              <RichTextEditor
                value={form.content ?? ""}
                onChange={html => set("content", html)}
                placeholder="Bắt đầu viết bài..." />
              <p className="text-[10px] text-muted-foreground mt-1">{(form.content ?? "").replace(/<[^>]+>/g, "").length.toLocaleString("vi-VN")} ký tự</p>
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
            <div
              className={`flex items-center justify-between rounded p-3 border transition-colors ${
                form.published
                  ? "border-green-500/60 bg-green-500/5"
                  : "border-border"
              }`}
            >
              <div>
                <Label className="!m-0 text-xs flex items-center gap-1.5">
                  Trạng thái
                  {form.published && (
                    <span className="text-[10px] font-semibold text-green-600 dark:text-green-400 uppercase tracking-widest">
                      ● Đang bật
                    </span>
                  )}
                </Label>
                <p className={`text-[11px] mt-0.5 ${
                  form.published ? "text-green-700 dark:text-green-400" : "text-muted-foreground"
                }`}>
                  {form.published ? "Hiển thị công khai trên /news" : "Chỉ admin nhìn thấy"}
                </p>
              </div>
              <Switch
                checked={!!form.published}
                onCheckedChange={c => set("published", c)}
                className="data-[state=checked]:!bg-green-500 data-[state=checked]:!border-green-500"
              />
            </div>
            {form.publishedAt && (
              <p className="text-[11px] text-muted-foreground">Đăng ngày: {new Date(form.publishedAt).toLocaleString("vi-VN")}</p>
            )}
          </CardContent>
        </Card>

        {/* Đăng tự động lên mạng xã hội — chỉ hiện khi đã có ID (đã save lần đầu) */}
        {id && <SocialPublishCard postId={id} published={!!form.published} />}

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Phân loại</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs !mb-0">Chuyên mục</Label>
                <button type="button" onClick={() => setCatMgrOpen(true)}
                  className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">
                  Quản lý ↗
                </button>
              </div>
              <select className="w-full h-10 px-3 border border-input rounded bg-background text-sm"
                value={form.category ?? cats[0]?.value ?? ""} onChange={e => set("category", e.target.value)}>
                {cats.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                {form.category && !cats.some(c => c.value === form.category) && (
                  <option value={form.category}>{form.category} (đã xoá)</option>
                )}
              </select>
              <CategoryManager open={catMgrOpen} onOpenChange={setCatMgrOpen} initial={cats} />
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
          <CardHeader className="pb-2"><CardTitle className="text-sm">URL</CardTitle></CardHeader>
          <CardContent>
            <Label className="text-xs">Slug (để trống tự sinh)</Label>
            <Input value={form.slug ?? ""} placeholder="vd: khuyen-mai-mua-he-2026"
              className="font-mono text-xs"
              onChange={e => set("slug", e.target.value)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><ImageIcon size={14} /> Ảnh bìa (Featured Image)</CardTitle></CardHeader>
          <CardContent>
            <MediaPicker value={form.coverImage ?? ""} onChange={v => set("coverImage", v)} />
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
    (async () => {
      try {
        const r = await fetch(`${API}/api/pages/admin/${encodeURIComponent(id!)}`, { credentials: "include" });
        if (r.ok) {
          setForm(await r.json());
        } else {
          // Fallback: tim trong cache localStorage (truong hop API offline).
          const all = loadLS<CmsPage[]>(PAGES_KEY, DEFAULT_PAGES as CmsPage[]);
          const found = all.find(p => p.id === id);
          if (!found) {
            toast({ title: "Không tìm thấy trang", variant: "destructive" });
            navigate("/admin/pages?tab=pages", { replace: true });
            return;
          }
          setForm(found);
        }
      } catch {
        const all = loadLS<CmsPage[]>(PAGES_KEY, DEFAULT_PAGES as CmsPage[]);
        const found = all.find(p => p.id === id);
        if (found) setForm(found);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew]);

  const set = <K extends keyof CmsPage>(k: K, v: CmsPage[K]) => setForm(f => ({ ...f, [k]: v }));

  const persist = async (closeAfter = false) => {
    if (!form.title || !form.slug) {
      toast({ title: "Vui lòng nhập tiêu đề và slug", variant: "destructive" });
      return;
    }
    try {
      let saved: CmsPage;
      if (isNew) {
        // Tao moi: POST /api/pages. Server tu sinh id tu title neu khong co.
        const r = await fetch(`${API}/api/pages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!r.ok) throw new Error(await r.text());
        saved = await r.json();
      } else {
        const r = await fetch(`${API}/api/pages/${encodeURIComponent(id!)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!r.ok) throw new Error(await r.text());
        saved = await r.json();
      }
      setForm(saved);
      toast({ title: isNew ? "Trang mới đã tạo" : "Trang đã cập nhật", description: saved.title });
      if (closeAfter) navigate("/admin/pages?tab=pages");
      else if (isNew) navigate(`/admin/content/pages/${saved.id}`, { replace: true });
    } catch (e: any) {
      toast({ title: "Lưu thất bại", description: e.message, variant: "destructive" });
    }
  };

  const onDelete = async () => {
    if (!id) return;
    if (!confirm("Xoá trang này?")) return;
    try {
      const r = await fetch(`${API}/api/pages/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!r.ok) throw new Error(await r.text());
      toast({ title: "Đã xoá trang" });
      navigate("/admin/pages?tab=pages");
    } catch (e: any) {
      toast({ title: "Xoá thất bại", description: e.message, variant: "destructive" });
    }
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
              <RichTextEditor
                value={form.content}
                onChange={html => set("content", html)}
                placeholder="Nội dung trang..." />
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

/* ────────────────────────────────────────────────────────────────
 * SocialPublishCard
 *  - Hiển thị danh sách các nền tảng đang bật (Facebook, Instagram,
 *    Threads, TikTok, Google Business, Zalo OA)
 *  - Cho phép admin nhấn "Đẩy ngay" để gọi POST /api/blog-posts/:id/publish-social
 *  - Hiển thị lịch sử 5 lần đẩy gần nhất (success/failed + link)
 *  - Tự refresh log sau mỗi lần đẩy
 * ──────────────────────────────────────────────────────────────── */

interface SocialCfgPublic {
  autoPublish: boolean;
  publicBaseUrl: string;
  facebook: { enabled: boolean };
  instagram: { enabled: boolean };
  threads: { enabled: boolean };
  tiktok: { enabled: boolean };
  google: { enabled: boolean };
  zalo: { enabled: boolean };
}
interface PublishLogRow {
  id: number; postId: number; platform: string;
  status: "success" | "failed"; externalId?: string | null;
  externalUrl?: string | null; message?: string | null; createdAt?: string | null;
}

const PLATFORM_META: Record<string, { label: string; icon: any; color: string }> = {
  facebook:  { label: "Facebook",  icon: Facebook,        color: "text-[#1877F2]" },
  instagram: { label: "Instagram", icon: Instagram,       color: "text-pink-500"  },
  threads:   { label: "Threads",   icon: MessageCircle,   color: "text-foreground" },
  tiktok:    { label: "TikTok",    icon: Music2,          color: "text-foreground" },
  google:    { label: "Google",    icon: MapPin,          color: "text-[#4285F4]" },
  zalo:      { label: "Zalo OA",   icon: MessageCircle,   color: "text-[#0068FF]" },
};

function SocialPublishCard({ postId, published }: { postId: number; published: boolean }) {
  const { toast } = useToast();
  const [cfg, setCfg] = useState<SocialCfgPublic | null>(null);
  const [logs, setLogs] = useState<PublishLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushing, setPushing] = useState(false);

  const reload = async () => {
    try {
      const [cR, lR] = await Promise.all([
        fetch(`${API}/api/integrations/social`),
        fetch(`${API}/api/blog-posts/${postId}/social-log`),
      ]);
      if (cR.ok) setCfg(await cR.json());
      if (lR.ok) setLogs(await lR.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [postId]);

  const enabledPlatforms = cfg
    ? (Object.keys(PLATFORM_META) as (keyof typeof PLATFORM_META)[]).filter(
        (k) => (cfg as any)[k]?.enabled
      )
    : [];

  const pushNow = async () => {
    if (!published) {
      toast({
        title: "Cần xuất bản trước",
        description: "Bật trạng thái 'Đã xuất bản' rồi mới có thể đẩy lên mạng xã hội.",
        variant: "destructive",
      });
      return;
    }
    setPushing(true);
    try {
      const r = await fetch(`${API}/api/blog-posts/${postId}/publish-social`, { method: "POST" });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error ?? "Không đẩy được");
      const ok  = (data?.results ?? []).filter((x: any) => x.result?.ok).length;
      const all = (data?.results ?? []).length;
      toast({
        title: all === 0 ? "Chưa bật nền tảng nào" : `Đã đẩy ${ok}/${all} nền tảng`,
        description: all === 0
          ? "Vào Tích hợp → Tự động đăng để bật Facebook / Threads / TikTok…"
          : "Xem chi tiết bên dưới.",
        variant: ok === 0 && all > 0 ? "destructive" : "default",
      });
      await reload();
    } catch (e: any) {
      toast({ title: "Lỗi", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setPushing(false);
    }
  };

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Send size={14} className="text-primary" /> Đăng lên mạng xã hội
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 size={13} className="animate-spin" /> Đang tải cấu hình…
          </div>
        ) : !cfg || enabledPlatforms.length === 0 ? (
          <div className="text-[12px] text-muted-foreground p-2 border border-dashed border-muted-foreground/30 rounded">
            Chưa bật nền tảng nào.{" "}
            <Link href="/admin/integrations?tab=auto-post" className="text-primary underline">
              Mở Tích hợp → Tự động đăng
            </Link>{" "}
            để cấu hình Facebook, Threads, TikTok…
          </div>
        ) : (
          <>
            {/* Auto-publish indicator */}
            <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded text-[11px] border ${
              cfg.autoPublish
                ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300"
                : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            }`}>
              {cfg.autoPublish ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              <span>
                {cfg.autoPublish
                  ? "Auto-publish BẬT — bài tự đẩy ngay khi xuất bản lần đầu."
                  : "Auto-publish TẮT — đẩy thủ công bằng nút bên dưới."}
              </span>
            </div>

            {/* Enabled platforms badges */}
            <div className="flex flex-wrap gap-1.5">
              {enabledPlatforms.map((k) => {
                const m = PLATFORM_META[k];
                const Icon = m.icon;
                return (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px]
                               border border-primary/30 bg-primary/5 rounded"
                  >
                    <Icon size={11} className={m.color} />
                    {m.label}
                  </span>
                );
              })}
            </div>

            {/* Push now button */}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={pushNow}
                disabled={pushing || !published}
                className="flex-1 gap-1.5 text-xs"
              >
                {pushing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                {pushing ? "Đang đẩy…" : "Đẩy ngay lên các kênh"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={reload}
                disabled={loading}
                className="px-2"
                title="Tải lại lịch sử"
              >
                <RefreshCw size={13} />
              </Button>
            </div>
            {!published && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400">
                Chỉ đẩy được khi bài đã ở trạng thái "Đã xuất bản".
              </p>
            )}

            {/* Recent log */}
            {logs.length > 0 && (
              <div className="border-t border-border pt-2">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                  Lịch sử gần nhất
                </div>
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                  {logs.slice(0, 8).map((row) => {
                    const m = PLATFORM_META[row.platform] ?? { label: row.platform, icon: Send, color: "" };
                    const Icon = m.icon;
                    const ok = row.status === "success";
                    return (
                      <li
                        key={row.id}
                        className="flex items-start gap-2 text-[11px] p-1.5 rounded
                                   bg-muted/40 border border-border"
                      >
                        <Icon size={12} className={`mt-0.5 shrink-0 ${m.color}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium">{m.label}</span>
                            <span className={ok ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                              {ok ? "✓" : "✕"}
                            </span>
                            {row.createdAt && (
                              <span className="text-muted-foreground/70 ml-auto text-[10px]">
                                {new Date(row.createdAt).toLocaleString("vi-VN", {
                                  day: "2-digit", month: "2-digit",
                                  hour: "2-digit", minute: "2-digit",
                                })}
                              </span>
                            )}
                          </div>
                          {row.message && (
                            <p className={`text-[10px] leading-snug ${ok ? "text-muted-foreground" : "text-red-600/90 dark:text-red-400/90"}`}>
                              {row.message}
                            </p>
                          )}
                          {row.externalUrl && (
                            <a
                              href={row.externalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-primary underline inline-flex items-center gap-0.5"
                            >
                              Xem bài <ExternalLink size={9} />
                            </a>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
