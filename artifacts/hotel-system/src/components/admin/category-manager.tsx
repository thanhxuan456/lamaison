import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, X, Tag, RotateCcw } from "lucide-react";
import {
  type PostCategory, DEFAULT_POST_CATS, slugifyCat, savePostCategories,
} from "@/lib/post-categories";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: PostCategory[];
  /** Total counts per slug — used to warn when deleting non-empty categories. */
  counts?: Record<string, number>;
}

export function CategoryManager({ open, onOpenChange, initial, counts = {} }: Props) {
  const { toast } = useToast();
  const [list, setList] = useState<PostCategory[]>(initial);
  const [newLabel, setNewLabel] = useState("");

  // Re-seed local state every time the modal opens so we always start
  // from the latest persisted categories (avoid stale state).
  useEffect(() => {
    if (open) { setList(initial); setNewLabel(""); }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const addNew = () => {
    const label = newLabel.trim();
    if (!label) return;
    const baseSlug = slugifyCat(label) || `cat-${Date.now()}`;
    let value = baseSlug, n = 2;
    while (list.some(c => c.value === value)) value = `${baseSlug}-${n++}`;
    setList(prev => [...prev, { value, label }]);
    setNewLabel("");
  };

  const update = (idx: number, patch: Partial<PostCategory>) =>
    setList(prev => prev.map((c, i) => i === idx ? { ...c, ...patch } : c));

  const remove = (idx: number) => {
    const cat = list[idx];
    const used = counts[cat.value] ?? 0;
    if (used > 0 && !confirm(`Chuyên mục "${cat.label}" đang có ${used} bài viết. Khi xoá, các bài đó vẫn giữ tên chuyên mục cũ trong dữ liệu nhưng không xuất hiện trong bộ lọc. Tiếp tục?`)) return;
    setList(prev => prev.filter((_, i) => i !== idx));
  };

  const resetDefaults = () => {
    if (!confirm("Khôi phục danh sách chuyên mục mặc định?")) return;
    setList([...DEFAULT_POST_CATS]);
  };

  const [saving, setSaving] = useState(false);
  const save = async () => {
    // Validate
    const cleaned = list
      .map(c => ({ value: c.value.trim(), label: c.label.trim() }))
      .filter(c => c.value && c.label);
    if (cleaned.length === 0) { toast({ title: "Cần ít nhất 1 chuyên mục", variant: "destructive" }); return; }
    const slugs = new Set<string>();
    for (const c of cleaned) {
      if (slugs.has(c.value)) { toast({ title: `Mã chuyên mục trùng: "${c.value}"`, variant: "destructive" }); return; }
      slugs.add(c.value);
    }
    setSaving(true);
    try {
      await savePostCategories(cleaned);
      toast({ title: "Đã lưu danh sách chuyên mục" });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Lỗi khi lưu", description: err?.message ?? "Vui lòng thử lại", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Tag size={16} /> Quản lý chuyên mục bài viết</DialogTitle>
          <DialogDescription>
            Thêm, sửa, xoá các chuyên mục dùng để phân loại bài viết. Mã (slug) dùng nội bộ và trong URL — chỉ chứa chữ thường, số, dấu gạch ngang.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
          {list.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">Chưa có chuyên mục nào.</p>
          ) : list.map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center">
              <div>
                <Input value={c.label} onChange={e => update(i, { label: e.target.value })} placeholder="Tên hiển thị" />
              </div>
              <div>
                <Input
                  className="font-mono text-xs"
                  value={c.value}
                  onChange={e => update(i, { value: slugifyCat(e.target.value) })}
                  placeholder="ma-slug" />
              </div>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 whitespace-nowrap">
                {counts[c.value] ?? 0} bài
              </span>
              <button type="button" onClick={() => remove(i)}
                className="p-2 border border-red-300/40 text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="Xoá">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-3 flex gap-2">
          <Input
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addNew(); } }}
            placeholder="Tên chuyên mục mới (vd: Sự kiện)" />
          <Button type="button" onClick={addNew} className="gap-1.5"><Plus size={13} /> Thêm</Button>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={resetDefaults} className="gap-1.5 mr-auto text-xs">
            <RotateCcw size={13} /> Khôi phục mặc định
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="gap-1.5">
            <X size={13} /> Huỷ
          </Button>
          <Button type="button" onClick={save} disabled={saving} className="gap-1.5">
            <Save size={13} /> {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
