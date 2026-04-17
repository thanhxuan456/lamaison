import { useState, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Eye, EyeOff, Trash2, ChevronUp, ChevronDown, Plus, Save,
  ExternalLink, Settings2, RotateCcw, GripVertical, X, Check,
  Layers,
} from "lucide-react";
import {
  usePageBlocks,
  BLOCK_DEFINITIONS,
  DEFAULT_PAGE_BLOCKS,
  PageBlock,
  BlockType,
  BlockField,
  genBlockId,
} from "@/lib/page-blocks";

/* ── Field renderer inside settings panel ── */
function FieldEditor({
  field,
  value,
  onChange,
}: {
  field: BlockField;
  value: any;
  onChange: (v: any) => void;
}) {
  const inputCls = "w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none";

  if (field.type === "text") {
    return (
      <input
        className={inputCls}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
      />
    );
  }
  if (field.type === "textarea") {
    return (
      <textarea
        className={`${inputCls} resize-y min-h-[80px]`}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
      />
    );
  }
  if (field.type === "url") {
    return (
      <input
        className={`${inputCls} font-mono text-xs`}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder ?? "https://... hoặc /images/..."}
      />
    );
  }
  if (field.type === "select" && field.options) {
    return (
      <select
        className={inputCls}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      >
        {field.options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    );
  }
  if (field.type === "repeater" && field.itemFields) {
    const items: any[] = value ?? [];
    const updateItem = (idx: number, key: string, v: any) => {
      const next = [...items];
      next[idx] = { ...next[idx], [key]: v };
      onChange(next);
    };
    const addItem = () => {
      const blank: Record<string, string> = {};
      field.itemFields!.forEach((f) => { blank[f.key] = f.placeholder ?? ""; });
      onChange([...items, blank]);
    };
    const removeItem = (idx: number) => {
      onChange(items.filter((_, i) => i !== idx));
    };
    return (
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="border border-primary/15 bg-primary/3 p-3 space-y-2 relative">
            <button
              onClick={() => removeItem(idx)}
              className="absolute top-2 right-2 text-muted-foreground hover:text-red-500 transition-colors"
            >
              <X size={11} />
            </button>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-1.5">#{idx + 1}</div>
            {field.itemFields!.map((sub) => (
              <div key={sub.key}>
                <label className="block text-[9px] uppercase tracking-widest text-muted-foreground/70 mb-1">{sub.label}</label>
                {sub.type === "textarea" ? (
                  <textarea
                    className="w-full border border-primary/10 bg-background px-2 py-1.5 text-xs text-foreground outline-none resize-y min-h-[50px]"
                    value={item[sub.key] ?? ""}
                    onChange={(e) => updateItem(idx, sub.key, e.target.value)}
                    placeholder={sub.placeholder}
                  />
                ) : (
                  <input
                    className="w-full border border-primary/10 bg-background px-2 py-1.5 text-xs text-foreground outline-none"
                    value={item[sub.key] ?? ""}
                    onChange={(e) => updateItem(idx, sub.key, e.target.value)}
                    placeholder={sub.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
        ))}
        <button
          onClick={addItem}
          className="w-full border border-dashed border-primary/30 text-primary/70 hover:text-primary text-xs py-2 hover:border-primary/60 hover:bg-primary/5 transition-all flex items-center justify-center gap-1"
        >
          <Plus size={11} /> Thêm item
        </button>
      </div>
    );
  }
  return null;
}

/* ── Block Settings Panel (right sidebar) ── */
function BlockSettings({
  block,
  onUpdate,
  onClose,
}: {
  block: PageBlock | null;
  onUpdate: (id: string, settings: Record<string, any>) => void;
  onClose: () => void;
}) {
  if (!block) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3 py-12">
        <Settings2 size={36} className="opacity-15" />
        <p className="text-sm">Chọn một block để chỉnh sửa cài đặt</p>
      </div>
    );
  }

  const def = BLOCK_DEFINITIONS.find((d) => d.type === block.type);
  if (!def) return null;

  const update = (key: string, v: any) => {
    onUpdate(block.id, { ...block.settings, [key]: v });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-primary/15 bg-primary/5 sticky top-0">
        <div className="flex items-center gap-2">
          <span className="text-base">{def.icon}</span>
          <div>
            <div className="text-xs font-medium text-foreground">{def.label}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Block Settings</div>
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
          <X size={14} />
        </button>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-luxury">
        {def.fields.map((field) => (
          <div key={field.key}>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">
              {field.label}
            </label>
            <FieldEditor
              field={field}
              value={block.settings[field.key]}
              onChange={(v) => update(field.key, v)}
            />
          </div>
        ))}

        {/* Image preview if has imageUrl */}
        {block.settings.imageUrl && (
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Xem trước ảnh</label>
            <img
              src={block.settings.imageUrl}
              alt="preview"
              className="w-full h-24 object-cover border border-primary/20"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Block Canvas Card ── */
function BlockCard({
  block,
  index,
  total,
  isSelected,
  onSelect,
  onToggleVisible,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  block: PageBlock;
  index: number;
  total: number;
  isSelected: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const def = BLOCK_DEFINITIONS.find((d) => d.type === block.type);
  if (!def) return null;

  return (
    <div
      className={[
        "border transition-all duration-200 group",
        isSelected
          ? "border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.2)]"
          : "border-primary/20 hover:border-primary/50",
        !block.visible ? "opacity-50" : "",
      ].join(" ")}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={onSelect}
      >
        {/* Drag handle indicator */}
        <GripVertical size={14} className="text-muted-foreground/40 shrink-0" />

        {/* Color dot + icon */}
        <div
          className="flex items-center justify-center w-8 h-8 text-sm shrink-0"
          style={{ backgroundColor: def.color + "18", border: `1px solid ${def.color}44` }}
        >
          <span>{def.icon}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{def.label}</span>
            {!block.visible && (
              <span className="text-[9px] text-muted-foreground border border-muted-foreground/30 px-1.5 py-0.5 uppercase tracking-wide">Ẩn</span>
            )}
          </div>
          {/* Mini preview of key content */}
          <div className="text-[11px] text-muted-foreground truncate">
            {block.settings.title || block.settings.title1 || block.settings.kicker || def.description}
          </div>
        </div>

        {/* Index badge */}
        <div className="text-[10px] text-muted-foreground/50 shrink-0">#{index + 1}</div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
            title="Di chuyển lên"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
            title="Di chuyển xuống"
          >
            <ChevronDown size={14} />
          </button>
          <button
            onClick={onToggleVisible}
            className="p-1 text-muted-foreground hover:text-primary transition-colors"
            title={block.visible ? "Ẩn block" : "Hiện block"}
          >
            {block.visible ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
            title="Xóa block"
          >
            <Trash2 size={12} />
          </button>
        </div>

        {/* Selected indicator */}
        {isSelected && <Settings2 size={13} className="text-primary shrink-0" />}
      </div>
    </div>
  );
}

/* ── Add Block Modal ── */
function AddBlockModal({ onAdd, onClose }: { onAdd: (type: BlockType) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-primary/40 w-full max-w-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-primary/5">
          <div>
            <h3 className="font-serif text-base text-foreground">Thêm Block Mới</h3>
            <p className="text-[11px] text-muted-foreground">Chọn loại block để thêm vào trang</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Block grid */}
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          {BLOCK_DEFINITIONS.map((def) => (
            <button
              key={def.type}
              onClick={() => { onAdd(def.type); onClose(); }}
              className="flex flex-col items-center gap-2 p-4 border border-primary/15 hover:border-primary/50 bg-background hover:bg-primary/5 transition-all group text-center"
            >
              <div
                className="w-12 h-12 flex items-center justify-center text-2xl"
                style={{ backgroundColor: def.color + "15", border: `1px solid ${def.color}30` }}
              >
                {def.icon}
              </div>
              <div className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">{def.label}</div>
              <div className="text-[9px] text-muted-foreground leading-tight">{def.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main Builder Page ── */
function BuilderContent() {
  const { blocks, saveBlocks } = usePageBlocks();
  const { toast } = useToast();
  const [localBlocks, setLocalBlocks] = useState<PageBlock[]>(() => blocks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saved, setSaved] = useState(false);

  const selectedBlock = localBlocks.find((b) => b.id === selectedId) ?? null;

  const updateBlock = useCallback((id: string, settings: Record<string, any>) => {
    setLocalBlocks((prev) => prev.map((b) => b.id === id ? { ...b, settings } : b));
  }, []);

  const toggleVisible = (id: string) => {
    setLocalBlocks((prev) => prev.map((b) => b.id === id ? { ...b, visible: !b.visible } : b));
  };

  const moveBlock = (id: string, dir: "up" | "down") => {
    setLocalBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = dir === "up" ? idx - 1 : idx + 1;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  };

  const deleteBlock = (id: string) => {
    setLocalBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const addBlock = (type: BlockType) => {
    const def = BLOCK_DEFINITIONS.find((d) => d.type === type)!;
    const newBlock: PageBlock = {
      id: genBlockId(),
      type,
      visible: true,
      settings: { ...def.defaultSettings },
    };
    setLocalBlocks((prev) => [...prev, newBlock]);
    setSelectedId(newBlock.id);
  };

  const handleSave = () => {
    saveBlocks(localBlocks);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    toast({ title: "Trang đã được lưu!", description: `${localBlocks.filter((b) => b.visible).length} blocks đang hiển thị` });
  };

  const handleReset = () => {
    if (!confirm("Khôi phục về nội dung mặc định? Tất cả thay đổi sẽ bị mất.")) return;
    const fresh = DEFAULT_PAGE_BLOCKS.map((b) => ({ ...b, id: genBlockId() }));
    setLocalBlocks(fresh);
    setSelectedId(null);
    toast({ title: "Đã khôi phục về mặc định" });
  };

  const visibleCount = localBlocks.filter((b) => b.visible).length;

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-primary/20 bg-card sticky top-0 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <Layers size={16} className="text-primary" />
          <div>
            <h1 className="font-serif text-sm text-foreground tracking-widest uppercase">Page Builder</h1>
            <p className="text-[10px] text-muted-foreground">{localBlocks.length} blocks · {visibleCount} hiển thị</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary border border-primary/20 px-3 py-1.5 transition-colors"
          >
            <ExternalLink size={11} /> Xem trang chủ
          </a>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-primary/20 px-3 py-1.5 transition-colors"
          >
            <RotateCcw size={11} /> Khôi phục
          </button>
          <Button
            onClick={handleSave}
            size="sm"
            className={`rounded-none text-xs uppercase tracking-widest h-8 px-4 gap-1.5 ${saved ? "bg-green-600" : "bg-primary"} text-primary-foreground`}
          >
            {saved ? <Check size={11} /> : <Save size={11} />}
            {saved ? "Đã lưu!" : "Lưu trang"}
          </Button>
        </div>
      </div>

      {/* Main 3-column layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Block palette */}
        <div className="w-56 shrink-0 border-r border-primary/15 bg-muted/20 overflow-y-auto scrollbar-luxury">
          <div className="px-3 py-3 border-b border-primary/10">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Loại Blocks</div>
          </div>
          <div className="p-2 space-y-1">
            {BLOCK_DEFINITIONS.map((def) => (
              <button
                key={def.type}
                onClick={() => { addBlock(def.type); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-primary/8 border border-transparent hover:border-primary/20 transition-all group"
                title={def.description}
              >
                <div
                  className="w-7 h-7 flex items-center justify-center text-sm shrink-0"
                  style={{ backgroundColor: def.color + "18", border: `1px solid ${def.color}35` }}
                >
                  {def.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-medium text-foreground group-hover:text-primary transition-colors truncate">{def.label}</div>
                  <div className="text-[9px] text-muted-foreground truncate">{def.type}</div>
                </div>
                <Plus size={10} className="text-primary/40 group-hover:text-primary shrink-0 ml-auto transition-colors" />
              </button>
            ))}
          </div>

          {/* Palette tip */}
          <div className="p-3 m-2 border border-primary/10 bg-primary/5 text-[9px] text-muted-foreground leading-relaxed">
            Click để thêm block vào cuối trang. Dùng ↑↓ để sắp xếp lại vị trí.
          </div>
        </div>

        {/* CENTER: Block canvas */}
        <div className="flex-1 overflow-y-auto scrollbar-luxury bg-background">
          <div className="max-w-3xl mx-auto p-6">
            {/* Canvas header */}
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] text-muted-foreground uppercase tracking-widest">Canvas — Trang Chủ</div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 text-xs text-primary border border-primary/30 px-3 py-1.5 hover:bg-primary/5 transition-colors"
              >
                <Plus size={11} /> Thêm block
              </button>
            </div>

            {/* Block list */}
            {localBlocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-muted-foreground border-2 border-dashed border-primary/20">
                <Layers size={40} className="opacity-20 mb-4" />
                <p className="text-sm mb-2">Chưa có block nào</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                >
                  <Plus size={11} /> Thêm block đầu tiên
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {localBlocks.map((block, idx) => (
                  <BlockCard
                    key={block.id}
                    block={block}
                    index={idx}
                    total={localBlocks.length}
                    isSelected={selectedId === block.id}
                    onSelect={() => setSelectedId(selectedId === block.id ? null : block.id)}
                    onToggleVisible={() => toggleVisible(block.id)}
                    onMoveUp={() => moveBlock(block.id, "up")}
                    onMoveDown={() => moveBlock(block.id, "down")}
                    onDelete={() => deleteBlock(block.id)}
                  />
                ))}

                {/* Add block button at bottom */}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-full border-2 border-dashed border-primary/20 py-4 text-muted-foreground hover:text-primary hover:border-primary/50 transition-all flex items-center justify-center gap-2 text-sm mt-4"
                >
                  <Plus size={14} /> Thêm block mới
                </button>
              </div>
            )}

            {/* Block count summary */}
            {localBlocks.length > 0 && (
              <div className="mt-6 flex items-center justify-between text-[10px] text-muted-foreground border-t border-primary/10 pt-4">
                <span>{localBlocks.length} blocks · {visibleCount} hiển thị · {localBlocks.length - visibleCount} ẩn</span>
                <span>Nhấn "Lưu trang" để áp dụng thay đổi</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Settings panel */}
        <div className="w-72 shrink-0 border-l border-primary/15 overflow-y-auto scrollbar-luxury bg-card">
          <BlockSettings
            block={selectedBlock}
            onUpdate={updateBlock}
            onClose={() => setSelectedId(null)}
          />
        </div>
      </div>

      {/* Add block modal */}
      {showAddModal && (
        <AddBlockModal onAdd={addBlock} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

export default function AdminBuilder() {
  return (
    <AdminGuard>
      <AdminLayout>
        <BuilderContent />
      </AdminLayout>
    </AdminGuard>
  );
}
