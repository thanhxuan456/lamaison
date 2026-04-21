import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Plus, Save, Trash2, Layers, Tag, Hash, X, Power,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "";

interface Template {
  id: number;
  label: string;
  body: string;
  category: string;
  shortcut?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const EMPTY: Omit<Template, "id"> = {
  label: "",
  body: "",
  category: "general",
  shortcut: "",
  sortOrder: 0,
  isActive: true,
};

const CATEGORIES = [
  { value: "general", label: "Chung" },
  { value: "greeting", label: "Chào hỏi" },
  { value: "booking", label: "Đặt phòng" },
  { value: "pricing", label: "Giá & Khuyến mại" },
  { value: "support", label: "Hỗ trợ" },
  { value: "closing", label: "Kết thúc" },
];

export default function AdminChatTemplates() {
  const { toast } = useToast();
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [draft, setDraft] = useState<Omit<Template, "id">>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/chat/templates`);
      const data = await r.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { toast({ title: "Không tải được mẫu trả lời", variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => { setEditing(null); setDraft(EMPTY); };
  const startEdit = (t: Template) => {
    setEditing(t);
    setDraft({
      label: t.label, body: t.body, category: t.category,
      shortcut: t.shortcut ?? "", sortOrder: t.sortOrder, isActive: t.isActive,
    });
  };

  const save = async () => {
    if (!draft.label.trim() || !draft.body.trim()) {
      toast({ title: "Vui lòng nhập tiêu đề và nội dung", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `${API}/api/chat/templates/${editing.id}` : `${API}/api/chat/templates`;
      const method = editing ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!r.ok) throw new Error("save failed");
      toast({ title: editing ? "Đã cập nhật mẫu" : "Đã tạo mẫu mới" });
      await load();
      startCreate();
    } catch { toast({ title: "Lưu thất bại", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const remove = async (id: number) => {
    if (!confirm("Xoá mẫu trả lời này?")) return;
    try {
      const r = await fetch(`${API}/api/chat/templates/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      toast({ title: "Đã xoá" });
      if (editing?.id === id) startCreate();
      await load();
    } catch { toast({ title: "Xoá thất bại", variant: "destructive" }); }
  };

  const toggleActive = async (t: Template) => {
    try {
      await fetch(`${API}/api/chat/templates/${t.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !t.isActive }),
      });
      await load();
    } catch {}
  };

  return (
    <AdminGuard>
      <AdminLayout title="Mẫu Trả Lời Nhanh" subtitle="Quản lý các câu trả lời mẫu để tư vấn viên gửi nhanh trong Live Chat">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4">
          {/* List */}
          <div className="bg-card border border-primary/20">
            <div className="flex items-center justify-between px-4 py-3 border-b border-primary/15 bg-primary/5">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-primary" />
                <span className="text-[10px] tracking-[0.3em] uppercase text-primary font-serif">
                  Danh sách mẫu ({items.length})
                </span>
              </div>
              <Button onClick={startCreate} variant="outline" size="sm" className="h-8 text-xs gap-1">
                <Plus size={12} /> Thêm mẫu mới
              </Button>
            </div>
            <div className="divide-y divide-primary/10 max-h-[calc(100vh-260px)] overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" size={20} /></div>
              ) : items.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm px-6">
                  Chưa có mẫu nào. Bấm <strong>Thêm mẫu mới</strong> để tạo câu trả lời nhanh đầu tiên.
                </div>
              ) : items.map((t) => (
                <div key={t.id}
                  onClick={() => startEdit(t)}
                  className={`p-4 cursor-pointer transition-colors group ${
                    editing?.id === t.id ? "bg-primary/10" : "hover:bg-primary/5"
                  } ${!t.isActive ? "opacity-60" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground truncate">{t.label}</span>
                        {t.shortcut && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 rounded font-mono">
                            /{t.shortcut}
                          </span>
                        )}
                        {!t.isActive && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded">Tắt</span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground mb-1.5 flex items-center gap-2">
                        <Tag size={9} /> {CATEGORIES.find(c => c.value === t.category)?.label ?? t.category}
                        <Hash size={9} className="ml-1" /> #{t.sortOrder}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-line">{t.body}</p>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); toggleActive(t); }}
                        title={t.isActive ? "Tắt" : "Bật"}
                        className="p-1.5 text-muted-foreground hover:text-primary transition-colors">
                        <Power size={12} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); remove(t.id); }}
                        title="Xoá"
                        className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Editor */}
          <div className="bg-card border border-primary/20 p-4 space-y-3 self-start sticky top-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-sm">
                {editing ? `Sửa mẫu #${editing.id}` : "Tạo mẫu mới"}
              </h3>
              {editing && (
                <button onClick={startCreate} className="text-muted-foreground hover:text-primary">
                  <X size={14} />
                </button>
              )}
            </div>

            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Tiêu đề (hiển thị)</span>
              <input
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                placeholder="Vd: Cảm ơn khách & gợi ý đặt phòng"
                className="mt-1 w-full bg-background border border-primary/25 focus:border-primary rounded px-3 py-2 text-sm outline-none"
              />
            </label>

            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Nội dung trả lời</span>
              <textarea
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                rows={7}
                placeholder="Nội dung sẽ được gửi cho khách. Hỗ trợ xuống dòng và **in đậm** kiểu markdown."
                className="mt-1 w-full bg-background border border-primary/25 focus:border-primary rounded px-3 py-2 text-sm outline-none resize-y font-mono leading-relaxed"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Phân loại</span>
                <select
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  className="mt-1 w-full bg-background border border-primary/25 rounded px-2 py-2 text-sm outline-none"
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Phím tắt (/)</span>
                <input
                  value={draft.shortcut ?? ""}
                  onChange={(e) => setDraft({ ...draft, shortcut: e.target.value.replace(/\s+/g, "") })}
                  placeholder="vd: gia, dat, hello"
                  className="mt-1 w-full bg-background border border-primary/25 rounded px-3 py-2 text-sm outline-none font-mono"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 items-end">
              <label className="block">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Thứ tự hiển thị</span>
                <input
                  type="number"
                  value={draft.sortOrder}
                  onChange={(e) => setDraft({ ...draft, sortOrder: parseInt(e.target.value) || 0 })}
                  className="mt-1 w-full bg-background border border-primary/25 rounded px-3 py-2 text-sm outline-none"
                />
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={draft.isActive}
                  onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
                  className="accent-primary"
                />
                Đang bật (hiển thị cho tư vấn viên)
              </label>
            </div>

            <Button onClick={save} disabled={saving} className="w-full bg-primary text-primary-foreground rounded-none">
              {saving ? <Loader2 size={14} className="animate-spin mr-2" /> : <Save size={14} className="mr-2" />}
              {editing ? "Cập nhật mẫu" : "Lưu mẫu mới"}
            </Button>
          </div>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
