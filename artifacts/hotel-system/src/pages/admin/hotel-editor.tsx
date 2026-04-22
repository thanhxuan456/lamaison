import { useEffect, useMemo, useState } from "react";
import { useRoute, useLocation, Link } from "wouter";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { useGetHotel, getListHotelsQueryKey, getGetHotelQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Save, Loader2, Eye, X, Info, Layout as LayoutIcon, FileCode, Check,
} from "lucide-react";
import { HOTEL_TEMPLATES } from "@/lib/hotel-templates";
import { RichTextEditor } from "@/components/admin/rich-text-editor";

const API = import.meta.env.VITE_API_URL ?? "";

type Tab = "info" | "layout" | "content";

interface HotelForm {
  slug: string;
  name: string;
  location: string;
  city: string;
  address: string;
  description: string;
  rating: string;
  imageUrl: string;
  amenities: string[];
  priceFrom: string;
  totalRooms: number;
  phone: string;
  email: string;
  layoutTemplate: string;
  pageHtml: string;
}

function fromHotel(h: any): HotelForm {
  return {
    slug: h.slug ?? "",
    name: h.name ?? "",
    location: h.location ?? "",
    city: h.city ?? "",
    address: h.address ?? "",
    description: h.description ?? "",
    rating: String(h.rating ?? "5.0"),
    imageUrl: h.imageUrl ?? "",
    amenities: Array.isArray(h.amenities) ? h.amenities : [],
    priceFrom: String(h.priceFrom ?? "0"),
    totalRooms: Number(h.totalRooms ?? 0),
    phone: h.phone ?? "",
    email: h.email ?? "",
    layoutTemplate: h.layoutTemplate ?? "classic",
    pageHtml: h.pageHtml ?? "",
  };
}

function Field({ label, value, onChange, type = "text", placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">{label}</label>
      <input
        type={type}
        className="w-full border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function HotelEditorContent() {
  const [, params] = useRoute("/admin/hotels/:id/edit");
  const [, setLocation] = useLocation();
  const id = params?.id;
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: hotel, isLoading } = useGetHotel(id as any);

  const [tab, setTab] = useState<Tab>("info");
  const [form, setForm] = useState<HotelForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [amenityInput, setAmenityInput] = useState("");
  const [dirty, setDirty] = useState(false);

  // Reinit khi chuyen sang chi nhanh khac (tranh ghi de nham du lieu).
  useEffect(() => {
    if (!hotel) return;
    setForm(fromHotel(hotel));
    setDirty(false);
    setTab("info");
  }, [hotel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Canh bao roi trang khi chua luu (browser-level)
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const confirmLeave = (): boolean => {
    if (!dirty) return true;
    return window.confirm("Bạn có thay đổi chưa lưu. Rời trang và bỏ thay đổi?");
  };

  const set = <K extends keyof HotelForm>(k: K, v: HotelForm[K]) => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
    setDirty(true);
  };

  const addAmenity = () => {
    const a = amenityInput.trim();
    if (!a || !form) return;
    if (form.amenities.includes(a)) return;
    set("amenities", [...form.amenities, a]);
    setAmenityInput("");
  };

  const save = async () => {
    if (!form || !id) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/hotels/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          totalRooms: Number(form.totalRooms),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Lưu không thành công");
      }
      qc.invalidateQueries({ queryKey: getListHotelsQueryKey() });
      qc.invalidateQueries({ queryKey: getGetHotelQueryKey(Number(id)) });
      setDirty(false);
      toast({ title: "Đã lưu", description: form.name });
    } catch (e: any) {
      toast({ title: "Lỗi", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: any; desc: string }[] = useMemo(() => [
    { id: "info", label: "Thông tin", icon: Info, desc: "Tên, địa chỉ, liên hệ, hạng sao, giá" },
    { id: "layout", label: "Giao diện", icon: LayoutIcon, desc: "Chọn mẫu trang chi nhánh" },
    { id: "content", label: "Nội dung trang", icon: FileCode, desc: "Soạn nội dung HTML — không cần biết code" },
  ], []);

  if (isLoading || !form || !hotel) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  return (
    <div>
      {/* Top toolbar */}
      <div className="sticky top-0 z-30 -mt-4 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-background/95 backdrop-blur border-b border-primary/15 flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => { if (confirmLeave()) setLocation("/admin/hotels"); }}
            className="p-1.5 border border-primary/30 text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
            title="Quay lại danh sách"
          >
            <ArrowLeft size={14} />
          </button>
          <div className="min-w-0">
            <div className="text-[10px] tracking-[0.3em] uppercase text-primary font-serif">Chỉnh sửa chi nhánh</div>
            <div className="font-serif text-base text-foreground truncate">{hotel.name}</div>
          </div>
          {dirty && <span className="text-[10px] uppercase tracking-widest text-amber-600 dark:text-amber-400 border border-amber-500/40 px-2 py-0.5 flex-shrink-0">Chưa lưu</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            className="rounded-none border-primary/40 text-primary text-xs h-9 gap-1.5"
            title="Mở trang công khai"
            onClick={() => { if (confirmLeave()) setLocation(`/hotels/${form.slug || id}`); }}
          >
            <Eye size={13} /> Xem trang
          </Button>
          <Button onClick={save} disabled={saving || !dirty} className="rounded-none bg-primary text-primary-foreground uppercase tracking-widest text-xs h-9 px-5 gap-1.5">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Lưu
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-primary/15 mb-6 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                "flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-widest border-b-2 transition-colors flex-shrink-0",
                active
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-primary/5",
              ].join(" ")}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {tab === "info" && (
        <div className="space-y-6 max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Tên chi nhánh *" value={form.name} onChange={(v) => set("name", v)} />
            <Field label="URL Slug *" value={form.slug} onChange={(v) => set("slug", v)} hint="Đường dẫn URL: /hotels/{slug}" />
            <Field label="Thành phố *" value={form.city} onChange={(v) => set("city", v)} placeholder="vd. Hà Nội" />
            <Field label="Quận / Khu vực" value={form.location} onChange={(v) => set("location", v)} />
            <Field label="Địa chỉ *" value={form.address} onChange={(v) => set("address", v)} />
            <Field label="Điện thoại" value={form.phone} onChange={(v) => set("phone", v)} />
            <Field label="Email" value={form.email} onChange={(v) => set("email", v)} type="email" />
            <Field label="Hạng sao (0–5)" value={form.rating} onChange={(v) => set("rating", v)} type="number" />
            <Field label="Giá từ (USD/đêm)" value={form.priceFrom} onChange={(v) => set("priceFrom", v)} type="number" />
            <Field label="Tổng số phòng" value={String(form.totalRooms)} onChange={(v) => set("totalRooms", Number(v))} type="number" />
            <Field label="Ảnh đại diện (URL)" value={form.imageUrl} onChange={(v) => set("imageUrl", v)} />
          </div>

          <div>
            <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Mô tả ngắn *</label>
            <textarea
              className="w-full border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none resize-none h-28 transition-colors"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[11px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Tiện nghi</label>
            <div className="flex gap-2 mb-2">
              <input
                className="flex-1 border border-primary/25 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
                value={amenityInput}
                onChange={(e) => setAmenityInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addAmenity())}
                placeholder="vd. Pool, Spa, Gym"
              />
              <Button onClick={addAmenity} size="sm" variant="outline" className="rounded-none border-primary/40 text-primary">Thêm</Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.amenities.map((a) => (
                <span key={a} className="flex items-center gap-1 text-xs border border-primary/30 text-primary px-2 py-0.5 bg-primary/5">
                  {a}
                  <button onClick={() => set("amenities", form.amenities.filter((x) => x !== a))} className="text-primary/60 hover:text-red-500">
                    <X size={10} />
                  </button>
                </span>
              ))}
              {form.amenities.length === 0 && <span className="text-xs text-muted-foreground italic">Chưa có tiện nghi</span>}
            </div>
          </div>
        </div>
      )}

      {tab === "layout" && (
        <div className="max-w-4xl">
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            Chọn một mẫu giao diện cho trang công khai của chi nhánh này. Mẫu sẽ áp dụng ngay khi lưu.
            Header, menu, footer chung của hệ thống vẫn được giữ nguyên — chỉ phần nội dung trang đổi theo mẫu.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {HOTEL_TEMPLATES.map((tpl) => {
              const active = form.layoutTemplate === tpl.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => set("layoutTemplate", tpl.id)}
                  className={[
                    "text-left border-2 p-5 transition-all relative",
                    active
                      ? "border-primary bg-primary/10"
                      : "border-primary/20 hover:border-primary/50 bg-card",
                  ].join(" ")}
                >
                  {active && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                  <div className={[
                    "font-serif text-base mb-2",
                    active ? "text-primary" : "text-foreground",
                  ].join(" ")}>
                    {tpl.label}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{tpl.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tab === "content" && (
        <div className="max-w-5xl">
          <div className="mb-4 p-3 border border-primary/20 bg-primary/5 text-xs text-foreground leading-relaxed">
            <strong className="text-primary">Soạn nội dung như Word:</strong> dùng thanh công cụ phía trên để in đậm, gạch đầu dòng, chèn ảnh,
            thêm tiêu đề, link… Nội dung sẽ hiển thị bên trong mẫu giao diện đã chọn — không cần biết HTML.
          </div>
          <RichTextEditor
            value={form.pageHtml}
            onChange={(html) => set("pageHtml", html)}
            placeholder="Giới thiệu chi nhánh, điểm nổi bật, lịch sử, các dịch vụ đặc trưng…"
            minHeight={420}
          />
        </div>
      )}
    </div>
  );
}

export default function AdminHotelEditor() {
  return (
    <AdminGuard>
      <AdminLayout title="Chỉnh sửa chi nhánh" subtitle="Cập nhật thông tin, giao diện và nội dung trang chi nhánh">
        <HotelEditorContent />
      </AdminLayout>
    </AdminGuard>
  );
}
