import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, X, Eye, EyeOff, Calendar, Tag, ExternalLink, Newspaper, Save } from "lucide-react";
import { Link } from "wouter";

const API = import.meta.env.VITE_API_URL ?? "";

interface Post {
  id: number; slug: string; title: string; excerpt: string; content: string;
  coverImage: string; category: string; author: string; tags: string;
  published: boolean; views: number; publishedAt: string | null; createdAt: string;
}

const CATS = [
  { value: "news", label: "Tin tức" },
  { value: "promotion", label: "Khuyến mãi" },
  { value: "experience", label: "Trải nghiệm" },
  { value: "culinary", label: "Ẩm thực" },
  { value: "travel", label: "Du lịch" },
];
const catLabel = (c: string) => CATS.find(x => x.value === c)?.label ?? c;

const empty: Partial<Post> = {
  title: "", slug: "", excerpt: "", content: "", coverImage: "",
  category: "news", author: "MAISON DELUXE", tags: "", published: false,
};

function AdminBlogsContent() {
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filterCat, setFilterCat] = useState<string>("all");
  const [editing, setEditing] = useState<Partial<Post> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const r = await fetch(`${API}/api/blog-posts?all=true`);
    setPosts(await r.json());
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
      toast({ title: editing.id ? "Đã cập nhật" : "Đã tạo bài viết" });
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
    <AdminLayout title="Tin tức & Blog" subtitle="Tạo, chỉnh sửa và xuất bản bài viết hiển thị trên trang Tin tức.">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterCat("all")}
            className={`px-4 h-9 text-xs uppercase tracking-widest border ${filterCat === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>
            Tất cả ({posts.length})
          </button>
          {CATS.map(c => {
            const n = posts.filter(p => p.category === c.value).length;
            return (
              <button key={c.value} onClick={() => setFilterCat(c.value)}
                className={`px-4 h-9 text-xs uppercase tracking-widest border ${filterCat === c.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>
                {c.label} ({n})
              </button>
            );
          })}
        </div>
        <Button onClick={() => setEditing({ ...empty })}><Plus size={14} className="mr-1" /> Bài viết mới</Button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card><CardContent className="py-16 text-center">
          <Newspaper size={32} className="mx-auto text-primary/40 mb-3" />
          <p className="text-muted-foreground text-sm">Chưa có bài viết. Hãy tạo bài viết đầu tiên.</p>
        </CardContent></Card>
      ) : (
        <div className="border border-border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-primary/10 border-b border-primary/25 text-[10px] uppercase tracking-widest text-primary font-semibold">
              <tr><th className="text-left p-3">Tiêu đề</th><th className="text-left p-3">Chuyên mục</th><th className="text-left p-3">Trạng thái</th><th className="text-left p-3">Lượt xem</th><th className="text-right p-3">Thao tác</th></tr>
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

      {/* Editor drawer */}
      {editing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-stretch justify-end" onClick={() => !saving && setEditing(null)}>
          <div className="w-full max-w-2xl bg-card border-l border-primary/30 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <h2 className="font-serif text-xl text-white">{editing.id ? "Sửa bài viết" : "Bài viết mới"}</h2>
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
                    {CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select></div>
                <div><Label>Tác giả</Label><Input value={editing.author ?? ""} onChange={e => setEditing({ ...editing, author: e.target.value })} /></div>
              </div>
              <div><Label>Ảnh bìa (URL)</Label>
                <Input value={editing.coverImage ?? ""} placeholder="https://..."
                  onChange={e => setEditing({ ...editing, coverImage: e.target.value })} />
                {editing.coverImage && <img src={editing.coverImage} alt="" className="mt-2 w-full max-h-48 object-cover border border-border" />}
              </div>
              <div><Label>Tóm tắt (hiển thị trên thẻ bài viết)</Label>
                <Textarea rows={3} value={editing.excerpt ?? ""} onChange={e => setEditing({ ...editing, excerpt: e.target.value })} /></div>
              <div><Label>Nội dung (HTML hoặc văn bản; dùng <code># Tiêu đề</code>, <code>## Phụ đề</code>, dòng trống tách đoạn)</Label>
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
    </AdminLayout>
  );
}

export default function AdminBlogs() { return <AdminGuard><AdminBlogsContent /></AdminGuard>; }
