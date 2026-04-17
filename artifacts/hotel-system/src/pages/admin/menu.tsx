import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useListHotels } from "@workspace/api-client-react";
import { Plus, Edit, Trash2, X, UtensilsCrossed, Coffee, Cookie, Sparkles, Filter, Image as ImageIcon } from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "";

interface MenuItem {
  id: number;
  hotelId: number | null;
  category: string;
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  available: boolean;
  sortOrder: number;
}

const CATEGORIES = [
  { value: "food",      label: "Món chính",   icon: UtensilsCrossed },
  { value: "drink",     label: "Đồ uống",     icon: Coffee },
  { value: "dessert",   label: "Tráng miệng", icon: Cookie },
  { value: "breakfast", label: "Bữa sáng",    icon: Coffee },
  { value: "spa",       label: "Spa",         icon: Sparkles },
  { value: "other",     label: "Khác",        icon: UtensilsCrossed },
];

function CategoryIcon({ category, size = 14 }: { category: string; size?: number }) {
  const def = CATEGORIES.find(c => c.value === category) ?? CATEGORIES[0];
  const Icon = def.icon;
  return <Icon size={size} />;
}

function AdminMenuContent() {
  const { toast } = useToast();
  const { data: hotels } = useListHotels();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [hotelFilter, setHotelFilter] = useState<number | "all">("all");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/menu-items`);
      const d = await r.json();
      setItems(d);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter(it =>
    (hotelFilter === "all" || it.hotelId === hotelFilter) &&
    (catFilter === "all" || it.category === catFilter)
  );

  const handleDelete = async (item: MenuItem) => {
    if (!confirm(`Xóa "${item.name}"?`)) return;
    await fetch(`${API}/api/menu-items/${item.id}`, { method: "DELETE" });
    toast({ title: "Đã xóa", description: item.name });
    load();
  };

  return (
    <AdminLayout title="Menu Khách Sạn" subtitle="Quản lý món ăn, đồ uống và dịch vụ Room Service">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center mb-6 pb-4 border-b border-primary/15">
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-primary" />
          <select
            value={hotelFilter === "all" ? "all" : String(hotelFilter)}
            onChange={(e) => setHotelFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
            className="bg-background border border-primary/30 px-3 h-9 text-sm rounded-none"
          >
            <option value="all">Tất cả khách sạn</option>
            {hotels?.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="bg-background border border-primary/30 px-3 h-9 text-sm rounded-none"
          >
            <option value="all">Tất cả danh mục</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="ml-auto" />
        <Button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none uppercase tracking-widest text-xs h-9"
        >
          <Plus size={14} className="mr-2" /> Thêm món
        </Button>
      </div>

      {/* Stats by category */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        {CATEGORIES.map(c => {
          const count = items.filter(it => it.category === c.value).length;
          const Icon = c.icon;
          return (
            <button key={c.value} onClick={() => setCatFilter(c.value)}
              className={`flex flex-col items-start p-3 border transition-all ${catFilter === c.value ? "border-primary bg-primary/10" : "border-primary/20 hover:border-primary/50"}`}>
              <Icon size={16} className="text-primary mb-2" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</span>
              <span className="font-serif text-xl text-foreground mt-1">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Items grid */}
      {loading ? (
        <div className="text-center py-20 text-muted-foreground">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-primary/30 bg-card">
          <UtensilsCrossed size={32} className="text-primary/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Chưa có món nào. Bấm "Thêm món" để bắt đầu.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => {
            const hotel = hotels?.find(h => h.id === item.hotelId);
            return (
              <div key={item.id} className="bg-card border border-primary/20 hover:border-primary/50 transition-all group">
                <div className="aspect-[16/10] bg-muted overflow-hidden border-b border-primary/15 relative">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" onError={(e) => (e.target as HTMLImageElement).style.display = "none"} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon size={28} className="text-primary/20" />
                    </div>
                  )}
                  {!item.available && (
                    <div className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[9px] uppercase tracking-widest px-2 py-1">
                      Hết hàng
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-primary/90 text-primary-foreground px-2 py-1 text-[10px] uppercase tracking-widest flex items-center gap-1">
                    <CategoryIcon category={item.category} size={11} />
                    {CATEGORIES.find(c => c.value === item.category)?.label}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-serif text-lg text-foreground mb-1">{item.name}</h3>
                  {hotel && <p className="text-[10px] text-primary/70 uppercase tracking-widest mb-2">{hotel.city}</p>}
                  {item.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{item.description}</p>}
                  <div className="flex items-end justify-between gap-2">
                    <span className="font-serif text-xl text-primary font-semibold">
                      {Number(item.price).toLocaleString("vi-VN")}<span className="text-xs">₫</span>
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(item); setShowModal(true); }} className="p-2 border border-primary/30 hover:bg-primary/10 transition-colors">
                        <Edit size={12} className="text-primary" />
                      </button>
                      <button onClick={() => handleDelete(item)} className="p-2 border border-destructive/30 hover:bg-destructive/10 transition-colors">
                        <Trash2 size={12} className="text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <MenuItemModal
          item={editing}
          hotels={hotels ?? []}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </AdminLayout>
  );
}

function MenuItemModal({ item, hotels, onClose, onSaved }: {
  item: MenuItem | null;
  hotels: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    hotelId: item?.hotelId ?? hotels[0]?.id ?? null,
    category: item?.category ?? "food",
    name: item?.name ?? "",
    description: item?.description ?? "",
    price: item?.price ?? "0",
    imageUrl: item?.imageUrl ?? "",
    available: item?.available ?? true,
    sortOrder: item?.sortOrder ?? 0,
  });
  const [saving, setSaving] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) { toast({ title: "Ảnh quá lớn (>1MB)", variant: "destructive" }); return; }
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, imageUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!form.name || !form.price) { toast({ title: "Thiếu tên hoặc giá", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const url = item ? `${API}/api/menu-items/${item.id}` : `${API}/api/menu-items`;
      const r = await fetch(url, {
        method: item ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, price: String(form.price) }),
      });
      if (!r.ok) throw new Error(await r.text());
      toast({ title: item ? "Đã cập nhật" : "Đã thêm món" });
      onSaved();
    } catch (e: any) {
      toast({ title: "Lỗi", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-primary/40 max-w-xl w-full my-8 max-h-[90vh] overflow-y-auto scrollbar-luxury">
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary/20 sticky top-0 bg-card z-10">
          <h2 className="font-serif text-xl text-primary">{item ? "Sửa món" : "Thêm món mới"}</h2>
          <button onClick={onClose} className="p-1 hover:bg-primary/10"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Khách sạn">
              <select value={form.hotelId ?? ""} onChange={(e) => setForm(f => ({ ...f, hotelId: e.target.value ? Number(e.target.value) : null }))}
                className="w-full bg-background border border-primary/30 px-3 h-10 text-sm">
                <option value="">— Tất cả chi nhánh —</option>
                {hotels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </Field>
            <Field label="Danh mục">
              <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-background border border-primary/30 px-3 h-10 text-sm">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Tên món">
            <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-background border border-primary/30 px-3 h-10 text-sm" />
          </Field>
          <Field label="Mô tả">
            <textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} className="w-full bg-background border border-primary/30 px-3 py-2 text-sm" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Giá (VND)">
              <input type="number" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
                className="w-full bg-background border border-primary/30 px-3 h-10 text-sm" />
            </Field>
            <Field label="Thứ tự hiển thị">
              <input type="number" value={form.sortOrder} onChange={(e) => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))}
                className="w-full bg-background border border-primary/30 px-3 h-10 text-sm" />
            </Field>
          </div>
          <Field label="Ảnh món">
            <div className="space-y-2">
              <input value={form.imageUrl} onChange={(e) => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                placeholder="URL ảnh hoặc upload bên dưới"
                className="w-full bg-background border border-primary/30 px-3 h-10 text-sm" />
              <input type="file" accept="image/*" onChange={handleFile}
                className="text-xs file:mr-3 file:px-3 file:py-1.5 file:border file:border-primary/30 file:bg-primary/10 file:text-primary file:cursor-pointer file:uppercase file:tracking-widest file:text-[10px] file:rounded-none" />
              {form.imageUrl && (
                <div className="border border-primary/20 p-2 inline-block">
                  <img src={form.imageUrl} alt="preview" className="max-h-32" />
                </div>
              )}
            </div>
          </Field>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.available} onChange={(e) => setForm(f => ({ ...f, available: e.target.checked }))}
              className="accent-primary w-4 h-4" />
            <span className="text-sm">Còn phục vụ</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-primary/20 sticky bottom-0 bg-card">
          <Button variant="outline" onClick={onClose} className="rounded-none">Hủy</Button>
          <Button onClick={submit} disabled={saving} className="bg-primary text-primary-foreground rounded-none uppercase tracking-widest text-xs">
            {saving ? "Đang lưu..." : (item ? "Lưu" : "Tạo")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export default function AdminMenu() {
  return <AdminGuard><AdminMenuContent /></AdminGuard>;
}
