import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListHotels } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { SPA_REGISTRY, DEFAULT_SPA_CONTENT } from "@/lib/page-templates";
import { Save, RotateCcw, Trash2, ExternalLink } from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "";
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

// Cau hinh trang co the tuy bien per-branch. Hien tai chi co Spa,
// nhung kien truc se mo rong them about/contact/rooms/news.
const PAGES_CONFIG = [
  { slug: "spa", label: "Spa & Thư Giãn", registry: SPA_REGISTRY, defaultContent: DEFAULT_SPA_CONTENT },
] as const;

type PageSlug = typeof PAGES_CONFIG[number]["slug"];

interface BranchPageRow {
  id: number;
  hotelId: number;
  pageSlug: string;
  layoutTemplate: string;
  content: any;
  enabled: number;
}

export default function AdminBranchPages() {
  const { data: hotels = [] } = useListHotels();
  const [hotelId, setHotelId] = useState<number | null>(null);
  const [pageSlug, setPageSlug] = useState<PageSlug>("spa");

  useEffect(() => {
    if (hotels.length > 0 && hotelId == null) setHotelId(hotels[0].id);
  }, [hotels, hotelId]);

  const selectedHotel = hotels.find((h: any) => h.id === hotelId) ?? null;
  const pageCfg = PAGES_CONFIG.find((p) => p.slug === pageSlug)!;

  return (
    <AdminLayout title="Trang theo chi nhánh" subtitle="Tùy biến nội dung và layout của các trang menu cho từng chi nhánh">
      <div className="space-y-6">
        <Card className="p-5 rounded-none border-primary/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs uppercase tracking-widest mb-2 block">Chi nhánh</Label>
              <Select value={hotelId?.toString() ?? ""} onValueChange={(v) => setHotelId(Number(v))}>
                <SelectTrigger><SelectValue placeholder="Chọn chi nhánh" /></SelectTrigger>
                <SelectContent>
                  {hotels.map((h: any) => (
                    <SelectItem key={h.id} value={h.id.toString()}>{h.name} · {h.city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest mb-2 block">Trang menu</Label>
              <Select value={pageSlug} onValueChange={(v) => setPageSlug(v as PageSlug)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGES_CONFIG.map((p) => (
                    <SelectItem key={p.slug} value={p.slug}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              {selectedHotel && (
                <a href={`${basePath}/spa`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-primary hover:underline">
                  <ExternalLink size={12} /> Xem trước trang công khai
                </a>
              )}
            </div>
          </div>
        </Card>

        {selectedHotel && (
          <BranchPageEditor
            hotelId={selectedHotel.id}
            hotelName={selectedHotel.name}
            pageSlug={pageSlug}
            templates={pageCfg.registry.templates}
            defaultContent={pageCfg.defaultContent}
          />
        )}
      </div>
    </AdminLayout>
  );
}

interface EditorProps {
  hotelId: number;
  hotelName: string;
  pageSlug: PageSlug;
  templates: { key: string; label: string; description: string }[];
  defaultContent: any;
}

function BranchPageEditor({ hotelId, hotelName, pageSlug, templates, defaultContent }: EditorProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const [layoutTemplate, setLayoutTemplate] = useState(templates[0].key);
  const [contentJson, setContentJson] = useState<string>(JSON.stringify(defaultContent, null, 2));
  const [heroTitle, setHeroTitle] = useState("");
  const [heroEyebrow, setHeroEyebrow] = useState("");
  const [heroDescription, setHeroDescription] = useState("");
  const [heroImage, setHeroImage] = useState("");

  // Load current override (neu co)
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      try {
        // Su dung admin endpoint de tai bao gom ca khi enabled=0 (disabled override)
        const r = await fetch(`${API}/api/admin/branch-pages/${hotelId}/${pageSlug}`, { credentials: "include" });
        const data: BranchPageRow | null = r.ok ? await r.json() : null;
        if (cancel) return;
        if (data) {
          setEnabled(data.enabled === 1);
          setLayoutTemplate(data.layoutTemplate);
          setContentJson(JSON.stringify(data.content ?? {}, null, 2));
          setHeroTitle(data.content?.hero?.title ?? "");
          setHeroEyebrow(data.content?.hero?.eyebrow ?? "");
          setHeroDescription(data.content?.hero?.description ?? "");
          setHeroImage(data.content?.hero?.image ?? "");
        } else {
          setEnabled(true);
          setLayoutTemplate(templates[0].key);
          setContentJson(JSON.stringify(defaultContent, null, 2));
          setHeroTitle(defaultContent?.hero?.title ?? "");
          setHeroEyebrow(defaultContent?.hero?.eyebrow ?? "");
          setHeroDescription(defaultContent?.hero?.description ?? "");
          setHeroImage(defaultContent?.hero?.image ?? "");
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [hotelId, pageSlug, defaultContent, templates]);

  // Khi user sua hero fields o form thi tu cap nhat vao JSON content (giu cac field khac nguyen)
  const mergedContent = useMemo(() => {
    try {
      const parsed = JSON.parse(contentJson);
      return {
        ...parsed,
        hero: {
          ...(parsed.hero ?? {}),
          title: heroTitle,
          eyebrow: heroEyebrow,
          description: heroDescription,
          image: heroImage,
        },
      };
    } catch {
      return null;
    }
  }, [contentJson, heroTitle, heroEyebrow, heroDescription, heroImage]);

  async function handleSave() {
    if (!mergedContent) {
      toast({ title: "JSON không hợp lệ", description: "Hãy kiểm tra lại nội dung JSON.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`${API}/api/branch-pages/${hotelId}/${pageSlug}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ layoutTemplate, content: mergedContent, enabled: enabled ? 1 : 0 }),
      });
      if (!r.ok) throw new Error(await r.text());
      const saved: BranchPageRow = await r.json();
      setContentJson(JSON.stringify(saved.content ?? {}, null, 2));
      toast({ title: "Đã lưu", description: `Nội dung trang "${pageSlug}" cho chi nhánh ${hotelName} đã được cập nhật.` });
    } catch (e: any) {
      toast({ title: "Lỗi khi lưu", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handleResetToDefault() {
    if (!confirm("Khôi phục nội dung mặc định? Các thay đổi chưa lưu sẽ mất.")) return;
    setContentJson(JSON.stringify(defaultContent, null, 2));
    setHeroTitle(defaultContent?.hero?.title ?? "");
    setHeroEyebrow(defaultContent?.hero?.eyebrow ?? "");
    setHeroDescription(defaultContent?.hero?.description ?? "");
    setHeroImage(defaultContent?.hero?.image ?? "");
    setLayoutTemplate(templates[0].key);
  }

  async function handleDelete() {
    if (!confirm(`Xóa override của trang "${pageSlug}" cho chi nhánh ${hotelName}? Trang sẽ trở về nội dung mặc định.`)) return;
    try {
      const r = await fetch(`${API}/api/branch-pages/${hotelId}/${pageSlug}`, { method: "DELETE", credentials: "include" });
      if (!r.ok) throw new Error(await r.text());
      toast({ title: "Đã xóa override", description: "Trang sẽ dùng nội dung mặc định." });
      setContentJson(JSON.stringify(defaultContent, null, 2));
      setEnabled(true);
      setLayoutTemplate(templates[0].key);
    } catch (e: any) {
      toast({ title: "Lỗi khi xóa", description: e.message, variant: "destructive" });
    }
  }

  if (loading) return <Card className="p-10 text-center text-muted-foreground rounded-none border-primary/20">Đang tải...</Card>;

  const jsonValid = mergedContent !== null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Settings + Hero quick form */}
      <div className="lg:col-span-1 space-y-6">
        <Card className="p-5 rounded-none border-primary/20 space-y-5">
          <h3 className="font-serif text-lg text-foreground">Cài đặt</h3>

          <div className="flex items-center justify-between gap-3 p-3 border border-primary/20 bg-secondary/5">
            <div>
              <div className="text-sm text-foreground font-medium">Bật override</div>
              <div className="text-xs text-muted-foreground">Tắt để dùng nội dung mặc định toàn hệ thống</div>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div>
            <Label className="text-xs uppercase tracking-widest mb-2 block">Layout template</Label>
            <Select value={layoutTemplate} onValueChange={setLayoutTemplate}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.key} value={t.key}>
                    <div className="flex flex-col items-start py-1">
                      <span className="font-medium">{t.label}</span>
                      <span className="text-[10px] text-muted-foreground">{t.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card className="p-5 rounded-none border-primary/20 space-y-4">
          <h3 className="font-serif text-lg text-foreground">Hero (nhanh)</h3>
          <div>
            <Label className="text-xs uppercase tracking-widest mb-1 block">Eyebrow</Label>
            <Input value={heroEyebrow} onChange={(e) => setHeroEyebrow(e.target.value)} className="rounded-none" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest mb-1 block">Tiêu đề</Label>
            <Input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} className="rounded-none" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest mb-1 block">Mô tả</Label>
            <Textarea value={heroDescription} onChange={(e) => setHeroDescription(e.target.value)} rows={4} className="rounded-none" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest mb-1 block">Hero image URL</Label>
            <Input value={heroImage} onChange={(e) => setHeroImage(e.target.value)} placeholder="/images/hotel-hanoi.png" className="rounded-none" />
            {heroImage && <img src={heroImage} alt="" className="mt-2 w-full h-32 object-cover border border-primary/20" />}
          </div>
        </Card>
      </div>

      {/* Right: JSON editor + actions */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="p-5 rounded-none border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-serif text-lg text-foreground">Nội dung đầy đủ (JSON)</h3>
            <span className={`text-[10px] tracking-widest uppercase ${jsonValid ? "text-green-600" : "text-destructive"}`}>
              {jsonValid ? "Hợp lệ" : "Lỗi cú pháp"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Sửa các mảng <code>amenities</code>, <code>treatments</code>, <code>stats</code>, <code>cta</code>... ở đây.
            Hero sẽ tự động đồng bộ từ form bên trái khi lưu.
          </p>
          <Textarea
            value={contentJson}
            onChange={(e) => setContentJson(e.target.value)}
            rows={28}
            spellCheck={false}
            className="font-mono text-xs rounded-none"
          />
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleSave} disabled={saving || !jsonValid} className="rounded-none uppercase tracking-widest text-xs px-6">
            <Save size={14} className="mr-2" /> {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
          <Button variant="outline" onClick={handleResetToDefault} className="rounded-none uppercase tracking-widest text-xs px-6">
            <RotateCcw size={14} className="mr-2" /> Khôi phục mặc định
          </Button>
          <Button variant="outline" onClick={handleDelete} className="rounded-none uppercase tracking-widest text-xs px-6 text-destructive border-destructive/40 hover:bg-destructive/10">
            <Trash2 size={14} className="mr-2" /> Xóa override
          </Button>
        </div>
      </div>
    </div>
  );
}
