import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  FileText, Plus, Edit, Trash2, Globe, EyeOff, Eye, Newspaper,
  Tag, Calendar, ExternalLink, Settings2,
} from "lucide-react";
import { loadPostCategories, type PostCategory, catLabel as catLabelOf } from "@/lib/post-categories";
import { CategoryManager } from "@/components/admin/category-manager";

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

export const DEFAULT_PAGES: Page[] = [
  { id: "home",   title: "Trang Chủ",       slug: "/",       content: "Nội dung trang chủ MAISON DELUXE Hotels & Resorts.", status: "published", updatedAt: new Date().toISOString(), metaTitle: "MAISON DELUXE Hotels & Resorts", metaDesc: "Chuỗi khách sạn 5 sao sang trọng bậc nhất Việt Nam.", ogImage: "" },
  { id: "about",  title: "Về Chúng Tôi",    slug: "/about",  content: "MAISON DELUXE — chuỗi khách sạn 5 sao sang trọng bậc nhất Việt Nam.", status: "published", updatedAt: new Date().toISOString(), metaTitle: "Về Chúng Tôi — MAISON DELUXE", metaDesc: "Tìm hiểu về lịch sử và sứ mệnh của MAISON DELUXE Hotels & Resorts.", ogImage: "" },
  { id: "dining", title: "Ẩm Thực",         slug: "/dining", content: "Trải nghiệm ẩm thực đỉnh cao tại các nhà hàng đạt sao Michelin.", status: "published", updatedAt: new Date().toISOString(), metaTitle: "Ẩm Thực — MAISON DELUXE", metaDesc: "Ẩm thực Việt Nam và quốc tế tại MAISON DELUXE.", ogImage: "" },
  { id: "spa",    title: "Spa & Wellness",  slug: "/spa",    content: "Không gian thư giãn hoàng gia với các liệu trình spa cao cấp.", status: "draft",     updatedAt: new Date().toISOString(), metaTitle: "Spa & Wellness — MAISON DELUXE", metaDesc: "Thư giãn tâm hồn tại Spa MAISON DELUXE.", ogImage: "" },
  { id: "offers", title: "Ưu Đãi Đặc Biệt", slug: "/offers", content: "Khám phá những ưu đãi độc quyền dành riêng cho thành viên.", status: "draft",     updatedAt: new Date().toISOString(), metaTitle: "Ưu Đãi — MAISON DELUXE", metaDesc: "Ưu đãi đặc biệt cho thành viên MAISON DELUXE.", ogImage: "" },
];


function loadLS<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}
function saveLS<T>(key: string, val: T) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

/* ────────────────────────────────────────────────────────────────
 * STATUS BADGE
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
 * PAGES TAB (list only — editor lives at /admin/content/pages/:id)
 * ──────────────────────────────────────────────────────────────── */
function PagesTab() {
  const { toast } = useToast();
  const [pages, setPages] = useState<Page[]>(() => loadLS(PAGES_KEY, DEFAULT_PAGES));

  const persist = (p: Page[]) => { setPages(p); saveLS(PAGES_KEY, p); };

  const del = (id: string) => {
    if (!confirm("Xóa trang này?")) return;
    persist(pages.filter(p => p.id !== id));
    toast({ title: "Đã xóa trang" });
  };

  const toggle = (id: string) =>
    persist(pages.map(p => p.id === id ? { ...p, status: p.status === "published" ? "draft" : "published", updatedAt: new Date().toISOString() } : p));

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{pages.length} trang · {pages.filter(p => p.status === "published").length} đã xuất bản</p>
        <Link href="/admin/content/pages/new">
          <Button className="rounded-none bg-primary text-primary-foreground uppercase tracking-widest text-xs px-5 h-9 gap-1.5">
            <Plus size={13} /> Tạo trang mới
          </Button>
        </Link>
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
                  <Link href={`/admin/content/pages/${p.id}`} className="hover:text-primary transition-colors">
                    {p.title}
                  </Link>
                  {p.metaTitle && <div className="text-[10px] text-muted-foreground/60 mt-0.5">SEO: {p.metaTitle.slice(0, 40)}{p.metaTitle.length > 40 ? "…" : ""}</div>}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{p.slug}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} onClick={() => toggle(p.id)} /></td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(p.updatedAt).toLocaleDateString("vi-VN")}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Link href={`/admin/content/pages/${p.id}`}>
                      <button className="p-1.5 border border-primary/20 text-primary hover:bg-primary/10 transition-colors" title="Sửa"><Edit size={12} /></button>
                    </Link>
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
 * POSTS TAB (list only — editor lives at /admin/content/posts/:id)
 * ──────────────────────────────────────────────────────────────── */
function PostsTab() {
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filterCat, setFilterCat] = useState<string>("all");
  const [cats, setCats] = useState<PostCategory[]>(() => loadPostCategories());
  const [catManagerOpen, setCatManagerOpen] = useState(false);

  useEffect(() => {
    const onChange = () => setCats(loadPostCategories());
    window.addEventListener("post-categories:changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("post-categories:changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const load = async () => {
    try {
      const r = await fetch(`${API}/api/blog-posts?all=true`);
      if (r.ok) setPosts(await r.json());
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const filtered = filterCat === "all" ? posts : posts.filter(p => p.category === filterCat);

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

  // ── Category filter chip styling ──────────────────────────────────────
  // Active: solid primary (gold) background.
  // Inactive: subtle border, but on hover the chip lifts to a soft primary
  // tint (gold/10) with primary border + primary text — much more visible
  // than the previous transparent hover.
  const chipClass = (active: boolean) =>
    `px-3 h-9 text-[10px] uppercase tracking-widest border transition-colors duration-150 ${
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "border-border text-muted-foreground hover:bg-foreground/10 hover:text-white hover:border-primary"
    }`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterCat("all")} className={chipClass(filterCat === "all")}>
            Tất cả ({posts.length})
          </button>
          {cats.map(c => {
            const n = posts.filter(p => p.category === c.value).length;
            return (
              <button key={c.value} onClick={() => setFilterCat(c.value)} className={chipClass(filterCat === c.value)}>
                {c.label} ({n})
              </button>
            );
          })}
          <button onClick={() => setCatManagerOpen(true)}
            className="px-3 h-9 text-[10px] uppercase tracking-widest border border-dashed border-border text-muted-foreground hover:bg-foreground/10 hover:text-white hover:border-primary inline-flex items-center gap-1.5 transition-colors"
            title="Quản lý chuyên mục">
            <Settings2 size={12} /> Quản lý
          </button>
        </div>
        <Link href="/admin/content/posts/new">
          <Button className="rounded-none bg-primary text-primary-foreground uppercase tracking-widest text-xs px-5 h-9 gap-1.5">
            <Plus size={13} /> Bài viết mới
          </Button>
        </Link>
      </div>

      <CategoryManager
        open={catManagerOpen}
        onOpenChange={setCatManagerOpen}
        initial={cats}
        counts={posts.reduce<Record<string, number>>((acc, p) => { acc[p.category] = (acc[p.category] ?? 0) + 1; return acc; }, {})}
      />

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
                <tr key={p.id} className="border-t border-border hover:bg-foreground/5 transition-colors">
                  <td className="p-3">
                    <Link href={`/admin/content/posts/${p.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                      {p.title}
                    </Link>
                    <div className="text-xs text-muted-foreground mt-0.5">/{p.slug}</div>
                  </td>
                  <td className="p-3"><span className="inline-flex items-center gap-1.5 text-xs"><Tag size={11} /> {catLabelOf(cats, p.category)}</span></td>
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
                      <Link href={`/admin/content/posts/${p.id}`}>
                        <Button size="sm" variant="ghost" title="Sửa"><Edit size={14} /></Button>
                      </Link>
                      <Button size="sm" variant="ghost" onClick={() => onDelete(p.id)} className="text-destructive hover:text-destructive"><Trash2 size={14} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
