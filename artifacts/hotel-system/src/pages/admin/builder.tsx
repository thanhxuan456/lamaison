import { useState, useCallback, useRef, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Eye, EyeOff, Trash2, ChevronUp, ChevronDown, Plus, Save,
  ExternalLink, Settings2, RotateCcw, GripVertical, X, Check,
  Layers, FileText, Pencil, Globe, Home, Image as ImageIcon, Upload,
  Palette as PaletteIcon, Sparkles, Type, Copy,
} from "lucide-react";
import {
  useSitePages,
  BLOCK_DEFINITIONS,
  SitePage,
  PageBlock,
  BlockType,
  BlockField,
  genBlockId,
  PAGE_CATEGORIES,
  PageCategory,
} from "@/lib/page-blocks";
import { useBranding, DEFAULT_BRANDING, Branding, NavbarStyle } from "@/lib/branding";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

/* ──────────────────────────────────────────────
   Field Editor
────────────────────────────────────────────── */
function FieldEditor({ field, value, onChange }: { field: BlockField; value: any; onChange: (v: any) => void }) {
  const base = "w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none";
  // textarea fields get a "rich" toggle; richtext fields are always rich.
  const [richMode, setRichMode] = useState(field.type === "richtext" || /<[a-z][\s\S]*>/i.test(value ?? ""));

  if (field.type === "text") return <input className={base} value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} />;
  if (field.type === "richtext") return <RichTextEditor value={value ?? ""} onChange={onChange} placeholder={field.placeholder} />;
  if (field.type === "textarea") {
    return (
      <div className="space-y-1.5">
        <div className="flex justify-end">
          <button type="button" onClick={() => setRichMode(m => !m)}
            className={`text-[9px] uppercase tracking-widest px-2 py-0.5 border transition-colors ${richMode ? "bg-primary/10 border-primary/40 text-primary" : "border-primary/20 text-muted-foreground hover:text-foreground"}`}>
            {richMode ? "✦ Đang dùng Rich Text" : "✦ Bật Rich Text"}
          </button>
        </div>
        {richMode
          ? <RichTextEditor value={value ?? ""} onChange={onChange} placeholder={field.placeholder} />
          : <textarea className={`${base} resize-y min-h-[80px]`} value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} />
        }
      </div>
    );
  }
  if (field.type === "url") return <input className={base + " font-mono text-xs"} value={value ?? ""} onChange={e => onChange(e.target.value)} placeholder={field.placeholder ?? "/images/... hoặc https://"} />;
  if (field.type === "select" && field.options) {
    return (
      <select className={base} value={value ?? ""} onChange={e => onChange(e.target.value)}>
        {field.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    );
  }
  if (field.type === "repeater" && field.itemFields) {
    const items: any[] = value ?? [];
    const updateItem = (idx: number, key: string, v: any) => { const n = [...items]; n[idx] = { ...n[idx], [key]: v }; onChange(n); };
    const addItem = () => { const blank: Record<string, string> = {}; field.itemFields!.forEach(f => { blank[f.key] = ""; }); onChange([...items, blank]); };
    const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));
    return (
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="border border-primary/15 bg-primary/3 p-3 space-y-2 relative">
            <button onClick={() => removeItem(idx)} className="absolute top-2 right-2 text-muted-foreground hover:text-red-500 transition-colors"><X size={11} /></button>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">#{idx + 1}</div>
            {field.itemFields!.map(sub => (
              <div key={sub.key}>
                <label className="block text-[9px] uppercase tracking-widest text-muted-foreground/70 mb-0.5">{sub.label}</label>
                {sub.type === "textarea"
                  ? <textarea className="w-full border border-primary/10 bg-background px-2 py-1.5 text-xs text-foreground outline-none resize-y min-h-[50px]" value={item[sub.key] ?? ""} onChange={e => updateItem(idx, sub.key, e.target.value)} placeholder={sub.placeholder} />
                  : <input className="w-full border border-primary/10 bg-background px-2 py-1.5 text-xs text-foreground outline-none" value={item[sub.key] ?? ""} onChange={e => updateItem(idx, sub.key, e.target.value)} placeholder={sub.placeholder} />
                }
              </div>
            ))}
          </div>
        ))}
        <button onClick={addItem} className="w-full border border-dashed border-primary/30 text-primary/70 hover:text-primary text-xs py-2 hover:border-primary/60 hover:bg-primary/5 transition-all flex items-center justify-center gap-1">
          <Plus size={11} /> Thêm item
        </button>
      </div>
    );
  }
  return null;
}

/* ──────────────────────────────────────────────
   Block Settings Panel
────────────────────────────────────────────── */
function BlockSettings({ block, onUpdate, onClose, onDuplicate, onResetDefaults, onToggleVisible, onDelete, index, total }: {
  block: PageBlock | null;
  onUpdate: (id: string, s: Record<string, any>) => void;
  onClose: () => void;
  onDuplicate?: (id: string) => void;
  onResetDefaults?: (id: string) => void;
  onToggleVisible?: (id: string) => void;
  onDelete?: (id: string) => void;
  index?: number;
  total?: number;
}) {
  if (!block) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 py-12">
        <Settings2 size={32} className="opacity-15" />
        <p className="text-xs">Chọn block để chỉnh sửa</p>
        <p className="text-[10px] text-muted-foreground/70 max-w-[200px] text-center leading-relaxed">
          Click vào một block trong danh sách bên trái để mở panel cài đặt, hoặc nhấn "Thêm block" để tạo mới.
        </p>
      </div>
    );
  }
  const def = BLOCK_DEFINITIONS.find(d => d.type === block.type);
  if (!def) return null;
  const update = (key: string, v: any) => onUpdate(block.id, { ...block.settings, [key]: v });

  // Group fields by repeater vs simple to give visual separation
  const simpleFields = def.fields.filter(f => f.type !== "repeater");
  const repeaterFields = def.fields.filter(f => f.type === "repeater");
  const fieldCount = def.fields.length;

  return (
    <div className="h-full flex flex-col">
      {/* Header — block info */}
      <div className="px-4 py-3 border-b border-primary/15 bg-primary/5 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 flex items-center justify-center text-base shrink-0"
              style={{ backgroundColor: def.color + "18", border: `1px solid ${def.color}44` }}>
              {def.icon}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium truncate">{def.label}</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wide">
                {typeof index === "number" && typeof total === "number" ? `Block #${index + 1} / ${total} · ` : ""}
                {fieldCount} {fieldCount === 1 ? "trường" : "trường"}
              </div>
            </div>
          </div>
          <button onClick={onClose} title="Đóng panel"
            className="text-muted-foreground hover:text-foreground p-1 transition-colors shrink-0">
            <X size={13} />
          </button>
        </div>

        {/* Action toolbar */}
        <div className="grid grid-cols-4 gap-1 mt-2">
          <button onClick={() => onToggleVisible?.(block.id)}
            title={block.visible ? "Ẩn block" : "Hiện block"}
            className={`flex flex-col items-center gap-0.5 py-1.5 border text-[9px] uppercase tracking-wide transition-colors ${
              block.visible
                ? "border-primary/20 text-muted-foreground hover:text-primary hover:border-primary/40"
                : "border-amber-400/40 bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400"
            }`}>
            {block.visible ? <Eye size={11} /> : <EyeOff size={11} />}
            <span>{block.visible ? "Hiện" : "Ẩn"}</span>
          </button>
          <button onClick={() => onDuplicate?.(block.id)}
            title="Nhân bản block"
            className="flex flex-col items-center gap-0.5 py-1.5 border border-primary/20 text-muted-foreground hover:text-primary hover:border-primary/40 text-[9px] uppercase tracking-wide transition-colors">
            <Copy size={11} />
            <span>Nhân bản</span>
          </button>
          <button onClick={() => {
              if (confirm("Đặt lại block về cài đặt mặc định? Mọi chỉnh sửa của block này sẽ mất.")) onResetDefaults?.(block.id);
            }}
            title="Đặt lại mặc định"
            className="flex flex-col items-center gap-0.5 py-1.5 border border-primary/20 text-muted-foreground hover:text-primary hover:border-primary/40 text-[9px] uppercase tracking-wide transition-colors">
            <RotateCcw size={11} />
            <span>Mặc định</span>
          </button>
          <button onClick={() => {
              if (confirm("Xoá block này khỏi trang?")) onDelete?.(block.id);
            }}
            title="Xoá block"
            className="flex flex-col items-center gap-0.5 py-1.5 border border-red-300/30 text-muted-foreground hover:text-red-500 hover:border-red-500/40 text-[9px] uppercase tracking-wide transition-colors">
            <Trash2 size={11} />
            <span>Xoá</span>
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto scrollbar-luxury">
        {simpleFields.length > 0 && (
          <div className="p-4 space-y-4 border-b border-primary/10">
            <div className="text-[9px] uppercase tracking-[0.2em] text-primary/70 font-medium flex items-center gap-1.5">
              <Type size={9} /> Nội dung
            </div>
            {simpleFields.map(field => (
              <div key={field.key}>
                <label className="block text-[10px] tracking-[0.18em] uppercase text-muted-foreground mb-1.5">{field.label}</label>
                <FieldEditor field={field} value={block.settings[field.key]} onChange={v => update(field.key, v)} />
              </div>
            ))}
            {block.settings.imageUrl && !simpleFields.some(f => f.key === "imageUrl" && f.type === "image") && (
              <div>
                <label className="block text-[10px] tracking-[0.18em] uppercase text-muted-foreground mb-1.5">Xem trước ảnh</label>
                <img src={block.settings.imageUrl} alt="preview" className="w-full h-20 object-cover border border-primary/20"
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              </div>
            )}
          </div>
        )}

        {repeaterFields.length > 0 && (
          <div className="p-4 space-y-4">
            <div className="text-[9px] uppercase tracking-[0.2em] text-primary/70 font-medium flex items-center gap-1.5">
              <Layers size={9} /> Danh sách items
            </div>
            {repeaterFields.map(field => (
              <div key={field.key}>
                <label className="block text-[10px] tracking-[0.18em] uppercase text-muted-foreground mb-1.5">
                  {field.label}
                  {Array.isArray(block.settings[field.key]) && (
                    <span className="ml-2 text-[9px] text-primary/60 normal-case tracking-normal">
                      ({(block.settings[field.key] as any[]).length})
                    </span>
                  )}
                </label>
                <FieldEditor field={field} value={block.settings[field.key]} onChange={v => update(field.key, v)} />
              </div>
            ))}
          </div>
        )}

        {/* Footer — block ID for debugging */}
        <div className="px-4 py-3 border-t border-primary/10 bg-muted/20">
          <div className="text-[9px] text-muted-foreground/60 font-mono break-all">ID: {block.id}</div>
          <div className="text-[9px] text-muted-foreground/60 mt-0.5">Type: <span className="font-mono">{block.type}</span></div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Block Canvas Card
────────────────────────────────────────────── */
function BlockCard({ block, index, total, isSelected, onSelect, onToggleVisible, onMoveUp, onMoveDown, onDelete }: {
  block: PageBlock; index: number; total: number; isSelected: boolean;
  onSelect: () => void; onToggleVisible: () => void; onMoveUp: () => void; onMoveDown: () => void; onDelete: () => void;
}) {
  const def = BLOCK_DEFINITIONS.find(d => d.type === block.type);
  if (!def) return null;
  return (
    <div className={["border transition-all group", isSelected ? "border-primary shadow-[0_0_0_2px_hsl(var(--primary)/0.15)]" : "border-primary/20 hover:border-primary/40", !block.visible ? "opacity-45" : ""].join(" ")}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={onSelect}>
        <GripVertical size={13} className="text-muted-foreground/30 shrink-0" />
        <div className="w-8 h-8 flex items-center justify-center text-sm shrink-0" style={{ backgroundColor: def.color + "18", border: `1px solid ${def.color}44` }}>{def.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{def.label}</span>
            {!block.visible && <span className="text-[9px] text-muted-foreground border border-muted-foreground/30 px-1 py-0.5 uppercase tracking-wide">Ẩn</span>}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">{block.settings.title || block.settings.title1 || block.settings.kicker || def.description}</div>
        </div>
        <span className="text-[10px] text-muted-foreground/40 shrink-0">#{index + 1}</span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          <button onClick={onMoveUp} disabled={index === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"><ChevronUp size={13} /></button>
          <button onClick={onMoveDown} disabled={index === total - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"><ChevronDown size={13} /></button>
          <button onClick={onToggleVisible} className="p-1 text-muted-foreground hover:text-primary transition-colors">{block.visible ? <Eye size={13} /> : <EyeOff size={13} />}</button>
          <button onClick={onDelete} className="p-1 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 size={11} /></button>
        </div>
        {isSelected && <Settings2 size={12} className="text-primary shrink-0" />}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Add Block Modal
────────────────────────────────────────────── */
function AddBlockModal({ onAdd, onClose }: { onAdd: (type: BlockType) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-primary/40 w-full max-w-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary/20 bg-primary/5">
          <div>
            <h3 className="font-serif text-base">Thêm Block Mới</h3>
            <p className="text-[11px] text-muted-foreground">Chọn loại block để thêm vào trang</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors"><X size={18} /></button>
        </div>
        <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3 max-h-[70vh] overflow-y-auto scrollbar-luxury">
          {BLOCK_DEFINITIONS.map(def => (
            <button key={def.type} onClick={() => { onAdd(def.type); onClose(); }}
              className="flex flex-col items-center gap-2 p-4 border border-primary/15 hover:border-primary/50 bg-background hover:bg-primary/5 transition-all group text-center">
              <div className="w-11 h-11 flex items-center justify-center text-2xl" style={{ backgroundColor: def.color + "15", border: `1px solid ${def.color}30` }}>{def.icon}</div>
              <div className="text-xs font-medium group-hover:text-primary transition-colors">{def.label}</div>
              <div className="text-[9px] text-muted-foreground leading-tight">{def.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   New Page Modal
────────────────────────────────────────────── */
function CategoryPicker({ value, onChange }: { value: PageCategory; onChange: (v: PageCategory) => void }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Phân loại</label>
      <div className="grid grid-cols-3 gap-1.5">
        {PAGE_CATEGORIES.map(cat => {
          const active = value === cat.value;
          return (
            <button key={cat.value} type="button" onClick={() => onChange(cat.value)}
              className={`px-2 py-1.5 text-[10px] uppercase tracking-wider border transition-all ${active ? "border-primary bg-primary/10 text-primary" : "border-primary/15 text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
              style={active ? { borderColor: cat.color, color: cat.color, backgroundColor: `${cat.color}15` } : undefined}>
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NewPageModal({ onConfirm, onClose }: { onConfirm: (title: string, slug: string, category: PageCategory) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState<PageCategory>("custom");
  const autoSlug = (t: string) => "/" + t.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const handleTitleChange = (v: string) => { setTitle(v); if (!slug || slug === autoSlug(title)) setSlug(autoSlug(v)); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-primary/40 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary/20 bg-primary/5">
          <h3 className="font-serif text-sm">Tạo trang mới</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Tên trang</label>
            <input autoFocus className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm outline-none"
              value={title} onChange={e => handleTitleChange(e.target.value)} placeholder="Ví dụ: Giới Thiệu" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Đường dẫn (slug)</label>
            <input className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm outline-none font-mono"
              value={slug} onChange={e => setSlug(e.target.value)} placeholder="/about" />
          </div>
          <CategoryPicker value={category} onChange={setCategory} />
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="rounded-none flex-1 border-primary/30 text-xs uppercase tracking-widest" onClick={onClose}>Hủy</Button>
            <Button size="sm" className="rounded-none flex-1 bg-primary text-primary-foreground text-xs uppercase tracking-widest" disabled={!title.trim() || !slug.trim()} onClick={() => { onConfirm(title.trim(), slug.trim(), category); onClose(); }}>Tạo</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Rename Page Modal
────────────────────────────────────────────── */
function RenamePageModal({ page, onConfirm, onClose }: { page: SitePage; onConfirm: (title: string, slug: string, category: PageCategory) => void; onClose: () => void }) {
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [category, setCategory] = useState<PageCategory>(page.category ?? "custom");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-primary/40 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary/20 bg-primary/5">
          <h3 className="font-serif text-sm">Chỉnh sửa trang</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Tên trang</label>
            <input className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm outline-none" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Đường dẫn</label>
            <input className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm outline-none font-mono" value={slug} onChange={e => setSlug(e.target.value)} disabled={page.id === "home"} />
            {page.id === "home" && <p className="text-[9px] text-muted-foreground mt-1">Đường dẫn trang chủ không thể thay đổi</p>}
          </div>
          <CategoryPicker value={category} onChange={setCategory} />
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="rounded-none flex-1 border-primary/30 text-xs uppercase tracking-widest" onClick={onClose}>Hủy</Button>
            <Button size="sm" className="rounded-none flex-1 bg-primary text-primary-foreground text-xs uppercase tracking-widest" disabled={!title.trim()} onClick={() => { onConfirm(title.trim(), slug.trim(), category); onClose(); }}>Lưu</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Quick Edit — Fullscreen WordPress Gutenberg-style editor
────────────────────────────────────────────── */
function blockPreviewText(block: PageBlock): string {
  const s = block.settings || {};
  const cand = s.title || s.title1 || s.heading || s.kicker || s.body || s.subtitle || s.text || "";
  const stripped = String(cand).replace(/<[^>]+>/g, "").trim();
  return stripped.length > 90 ? stripped.slice(0, 90) + "…" : stripped;
}

function QuickEditModal({
  page,
  onSave,
  onClose,
  onOpenBuilder,
}: {
  page: SitePage;
  onSave: (next: SitePage) => void;
  onClose: () => void;
  onOpenBuilder: () => void;
}) {
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [category, setCategory] = useState<PageCategory>(page.category ?? "custom");
  const [blocks, setBlocks] = useState<PageBlock[]>(page.blocks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"page" | "block">("page");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAdd, setShowAdd] = useState<{ at: number } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  const selectedBlock = blocks.find(b => b.id === selectedId) ?? null;
  const selectedIdx = selectedBlock ? blocks.findIndex(b => b.id === selectedBlock.id) : -1;

  const markDirty = () => setDirty(true);

  const updateBlock = (id: string, settings: Record<string, any>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, settings } : b)); markDirty();
  };
  const toggleVisible = (id: string) => { setBlocks(prev => prev.map(b => b.id === id ? { ...b, visible: !b.visible } : b)); markDirty(); };
  const move = (id: string, dir: "up" | "down") => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id);
      const swap = dir === "up" ? idx - 1 : idx + 1;
      if (idx < 0 || swap < 0 || swap >= prev.length) return prev;
      const next = [...prev]; [next[idx], next[swap]] = [next[swap], next[idx]]; return next;
    });
    markDirty();
  };
  const duplicateBlock = (id: string) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id); if (idx < 0) return prev;
      const src = prev[idx];
      const copy: PageBlock = { id: genBlockId(), type: src.type, visible: src.visible, settings: JSON.parse(JSON.stringify(src.settings)) };
      const next = [...prev]; next.splice(idx + 1, 0, copy); return next;
    });
    markDirty();
  };
  const removeBlock = (id: string) => {
    if (!confirm("Xóa block này?")) return;
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
    markDirty();
  };
  const addAt = (idx: number, type: BlockType) => {
    const def = BLOCK_DEFINITIONS.find(d => d.type === type)!;
    const nb: PageBlock = { id: genBlockId(), type, visible: true, settings: { ...def.defaultSettings } };
    setBlocks(prev => { const next = [...prev]; next.splice(idx, 0, nb); return next; });
    setSelectedId(nb.id); setSidebarTab("block"); setSidebarOpen(true);
    markDirty();
  };

  // Auto-switch to "block" tab when selecting
  useEffect(() => { if (selectedId) setSidebarTab("block"); }, [selectedId]);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ ...page, title: title.trim(), slug: slug.trim() || page.slug, category, blocks });
    setDirty(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { if (showAdd) setShowAdd(null); else onClose(); } };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [onClose, showAdd]);

  const visibleCount = blocks.filter(b => b.visible).length;
  const selectedDef = selectedBlock ? BLOCK_DEFINITIONS.find(d => d.type === selectedBlock.type) : null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* ── Top App Bar ────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-primary/20 bg-card px-4 h-14 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} title="Đóng (Esc)"
            className="w-9 h-9 flex items-center justify-center border border-primary/20 hover:bg-primary/10 text-foreground transition-colors">
            <X size={16} />
          </button>
          <button onClick={() => { setShowAdd({ at: blocks.length }); }} title="Thêm block"
            className="w-9 h-9 flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus size={16} />
          </button>
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground border-l border-primary/15 pl-3 ml-1 min-w-0">
            <FileText size={12} className="text-primary shrink-0" />
            <span className="truncate font-medium text-foreground">{title || "Trang không tên"}</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="font-mono truncate">{slug}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] uppercase tracking-widest transition-opacity ${dirty ? "text-amber-500 opacity-100" : savedFlash ? "text-green-600 opacity-100" : "opacity-0"}`}>
            {savedFlash ? "✓ Đã lưu" : "● Chưa lưu"}
          </span>
          <a href={slug} target="_blank" rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary border border-primary/20 px-3 h-9 transition-colors">
            <ExternalLink size={11} /> Xem
          </a>
          <Button onClick={handleSave} disabled={!title.trim() || (!dirty && !savedFlash)} size="sm"
            className={`rounded-none h-9 px-5 text-xs uppercase tracking-widest gap-1.5 ${savedFlash ? "bg-green-600" : "bg-primary"} text-primary-foreground disabled:opacity-50`}>
            {savedFlash ? <Check size={12} /> : <Save size={12} />}
            {savedFlash ? "Đã cập nhật" : "Cập nhật"}
          </Button>
          <button onClick={() => setSidebarOpen(o => !o)} title={sidebarOpen ? "Ẩn cài đặt" : "Hiện cài đặt"}
            className={`w-9 h-9 flex items-center justify-center border transition-colors ${sidebarOpen ? "border-primary bg-primary/10 text-primary" : "border-primary/20 hover:bg-primary/5 text-muted-foreground"}`}>
            <Settings2 size={14} />
          </button>
        </div>
      </header>

      {/* ── Main 2-col layout ──────────────────────── */}
      <div className="flex-1 flex min-h-0">
        {/* Center canvas */}
        <main className="flex-1 overflow-y-auto scrollbar-luxury bg-muted/10" onClick={() => setSelectedId(null)}>
          <div className="max-w-3xl mx-auto py-10 px-6">
            {/* Title input */}
            <input
              value={title}
              onChange={e => { setTitle(e.target.value); markDirty(); }}
              placeholder="Thêm tiêu đề"
              className="w-full bg-transparent border-0 outline-none font-serif text-4xl text-foreground placeholder:text-muted-foreground/40 mb-8 px-2"
              onClick={e => e.stopPropagation()}
            />

            {/* Insert button at top */}
            <InsertSeparator onClick={(e) => { e.stopPropagation(); setShowAdd({ at: 0 }); }} />

            {/* Blocks */}
            {blocks.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-primary/20 text-muted-foreground">
                <Layers size={36} className="mx-auto opacity-20 mb-3" />
                <p className="text-sm mb-3">Trang trống — bắt đầu bằng cách thêm block</p>
                <button onClick={(e) => { e.stopPropagation(); setShowAdd({ at: 0 }); }}
                  className="inline-flex items-center gap-1.5 text-xs text-primary border border-primary/30 px-4 py-2 hover:bg-primary/5">
                  <Plus size={11} /> Thêm block đầu tiên
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {blocks.map((block, idx) => {
                  const def = BLOCK_DEFINITIONS.find(d => d.type === block.type);
                  const isSelected = selectedId === block.id;
                  const preview = blockPreviewText(block);
                  return (
                    <div key={block.id}>
                      <div className="relative group" onClick={(e) => { e.stopPropagation(); setSelectedId(block.id); }}>
                        {/* Block toolbar (above selected block) */}
                        {isSelected && (
                          <div className="absolute -top-9 left-0 z-10 flex items-center bg-card border border-primary/40 shadow-lg" onClick={e => e.stopPropagation()}>
                            <button onClick={() => move(block.id, "up")} disabled={idx === 0}
                              className="w-8 h-8 flex items-center justify-center text-foreground hover:bg-primary/10 disabled:opacity-20 disabled:cursor-not-allowed" title="Di chuyển lên">
                              <ChevronUp size={13} />
                            </button>
                            <button onClick={() => move(block.id, "down")} disabled={idx === blocks.length - 1}
                              className="w-8 h-8 flex items-center justify-center text-foreground hover:bg-primary/10 disabled:opacity-20 disabled:cursor-not-allowed" title="Di chuyển xuống">
                              <ChevronDown size={13} />
                            </button>
                            <div className="w-px h-5 bg-primary/15" />
                            <button onClick={() => toggleVisible(block.id)}
                              className={`w-8 h-8 flex items-center justify-center hover:bg-primary/10 ${block.visible ? "text-primary" : "text-muted-foreground"}`}
                              title={block.visible ? "Ẩn block" : "Hiện block"}>
                              {block.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                            </button>
                            <button onClick={() => duplicateBlock(block.id)}
                              className="w-8 h-8 flex items-center justify-center text-foreground hover:bg-primary/10" title="Nhân đôi">
                              <Copy size={12} />
                            </button>
                            <div className="w-px h-5 bg-primary/15" />
                            <button onClick={() => removeBlock(block.id)}
                              className="w-8 h-8 flex items-center justify-center text-foreground hover:bg-red-500/10 hover:text-red-500" title="Xóa">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}

                        {/* Block card preview */}
                        <div className={[
                          "border bg-background transition-all cursor-pointer",
                          isSelected ? "border-primary shadow-md" : "border-transparent hover:border-primary/30",
                          !block.visible && "opacity-50",
                        ].filter(Boolean).join(" ")}>
                          <div className="flex items-start gap-3 px-5 py-4">
                            <div className="w-8 h-8 bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-primary">
                              <Layers size={12} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[10px] uppercase tracking-widest text-primary font-medium">{def?.label ?? block.type}</span>
                                {!block.visible && <span className="text-[9px] uppercase tracking-wider text-muted-foreground border border-muted-foreground/30 px-1.5 py-px">Ẩn</span>}
                              </div>
                              {preview ? (
                                <div className="text-sm text-foreground line-clamp-2">{preview}</div>
                              ) : (
                                <div className="text-xs text-muted-foreground italic">{def?.description ?? "Block trống — bấm để chỉnh sửa"}</div>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0">#{idx + 1}</span>
                          </div>

                          {/* Inline settings — shown right below the selected block */}
                          {isSelected && def && (
                            <div className="border-t border-primary/20 bg-primary/5" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-between px-5 py-2.5 border-b border-primary/15 bg-card/50">
                                <div className="flex items-center gap-2">
                                  <Settings2 size={11} className="text-primary" />
                                  <span className="text-[10px] uppercase tracking-[0.2em] text-primary font-medium">Chỉnh sửa nội dung</span>
                                </div>
                                <button onClick={() => setSelectedId(null)}
                                  className="text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-1">
                                  Thu gọn <ChevronUp size={10} />
                                </button>
                              </div>
                              <div className="p-5 space-y-3">
                                {def.fields.map(field => (
                                  <div key={field.key}>
                                    <label className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">{field.label}</label>
                                    <FieldEditor field={field} value={block.settings[field.key]}
                                      onChange={(v) => updateBlock(block.id, { ...block.settings, [field.key]: v })} />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Insert separator */}
                      <InsertSeparator onClick={(e) => { e.stopPropagation(); setShowAdd({ at: idx + 1 }); }} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        {/* ── Right Sidebar ─────────────────────── */}
        {sidebarOpen && (
          <aside className="w-80 shrink-0 border-l border-primary/20 bg-card flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-primary/20 shrink-0">
              <button onClick={() => setSidebarTab("page")}
                className={`flex-1 h-11 text-xs uppercase tracking-widest border-b-2 -mb-px transition-colors ${sidebarTab === "page" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                Trang
              </button>
              <button onClick={() => setSidebarTab("block")} disabled={!selectedBlock}
                className={`flex-1 h-11 text-xs uppercase tracking-widest border-b-2 -mb-px transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${sidebarTab === "block" && selectedBlock ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                Block {selectedBlock && `(${(selectedIdx + 1)})`}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-luxury">
              {sidebarTab === "page" ? (
                <div className="p-4 space-y-5">
                  <section className="space-y-3">
                    <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Trạng thái & hiển thị</h4>
                    <div className="bg-primary/5 border border-primary/15 px-3 py-2.5 text-xs text-foreground space-y-1">
                      <div className="flex justify-between"><span className="text-muted-foreground">Block:</span><span>{blocks.length}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Hiển thị:</span><span className="text-primary">{visibleCount}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Đã ẩn:</span><span>{blocks.length - visibleCount}</span></div>
                    </div>
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Đường dẫn (URL)</h4>
                    <input value={slug} onChange={e => { setSlug(e.target.value); markDirty(); }} disabled={page.id === "home"}
                      className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-xs font-mono outline-none disabled:opacity-50" />
                    {page.id === "home" && <p className="text-[10px] text-muted-foreground">Đường dẫn trang chủ không thay đổi được</p>}
                  </section>

                  <section className="space-y-2">
                    <h4 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Phân loại</h4>
                    <CategoryPicker value={category} onChange={(v) => { setCategory(v); markDirty(); }} />
                  </section>

                  <section className="pt-2 border-t border-primary/10">
                    <button onClick={onOpenBuilder}
                      className="w-full text-xs text-primary border border-primary/30 hover:bg-primary/5 px-3 py-2.5 flex items-center justify-center gap-2 transition-colors">
                      <PaletteIcon size={12} /> Mở Page Builder cổ điển
                    </button>
                  </section>
                </div>
              ) : selectedBlock && selectedDef ? (
                <div className="p-4 space-y-4">
                  <div className="bg-primary/5 border border-primary/15 px-3 py-2.5">
                    <div className="text-[10px] uppercase tracking-widest text-primary font-medium">{selectedDef.label}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{selectedDef.description}</div>
                  </div>
                  <div className="space-y-3">
                    {selectedDef.fields.map(field => (
                      <div key={field.key}>
                        <label className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">{field.label}</label>
                        <FieldEditor field={field} value={selectedBlock.settings[field.key]}
                          onChange={(v) => updateBlock(selectedBlock.id, { ...selectedBlock.settings, [field.key]: v })} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-6 text-muted-foreground gap-3">
                  <Settings2 size={32} className="opacity-15" />
                  <p className="text-xs text-center">Chọn một block ở giữa để chỉnh sửa nội dung</p>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {showAdd && <AddBlockModal onAdd={(t) => { addAt(showAdd.at, t); setShowAdd(null); }} onClose={() => setShowAdd(null)} />}
    </div>
  );
}

function InsertSeparator({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <div className="relative h-6 group flex items-center justify-center">
      <div className="absolute inset-x-0 top-1/2 h-px bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      <button onClick={onClick} title="Thêm block ở đây"
        className="relative w-6 h-6 rounded-full bg-primary text-primary-foreground opacity-0 group-hover:opacity-100 hover:scale-110 transition-all flex items-center justify-center shadow-md">
        <Plus size={12} />
      </button>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Remove White Background (Canvas API)
────────────────────────────────────────────── */
async function removeWhiteBackground(src: string, tolerance = 35): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No canvas context")); return; }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      const w = canvas.width;
      const h = canvas.height;

      // Flood-fill from all 4 corners to find connected background pixels
      const visited = new Uint8Array(w * h);
      const queue: number[] = [];
      const seedCorners = [0, w - 1, w * (h - 1), w * h - 1];
      for (const idx of seedCorners) {
        const r = d[idx * 4], g = d[idx * 4 + 1], b = d[idx * 4 + 2];
        if (r >= 255 - tolerance && g >= 255 - tolerance && b >= 255 - tolerance && !visited[idx]) {
          queue.push(idx);
          visited[idx] = 1;
        }
      }
      while (queue.length > 0) {
        const idx = queue.pop()!;
        d[idx * 4 + 3] = 0;
        const x = idx % w;
        const y = Math.floor(idx / w);
        for (const [nx, ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) {
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const ni = ny * w + nx;
          if (visited[ni]) continue;
          const nr = d[ni*4], ng = d[ni*4+1], nb = d[ni*4+2];
          if (nr >= 255 - tolerance && ng >= 255 - tolerance && nb >= 255 - tolerance) {
            visited[ni] = 1;
            queue.push(ni);
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

/* ──────────────────────────────────────────────
   Image Picker (URL + file upload + preview)
────────────────────────────────────────────── */
function ImagePicker({ label, hint, value, onChange, previewClass = "h-20", accept = "image/*", maxKB = 1024, removeBg = false }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void;
  previewClass?: string; accept?: string; maxKB?: number; removeBg?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [errored, setErrored] = useState(false);
  const [removing, setRemoving] = useState(false);
  useEffect(() => { setErrored(false); }, [value]);

  const handleRemoveBg = async () => {
    if (!value) return;
    setRemoving(true);
    try {
      const result = await removeWhiteBackground(value);
      onChange(result);
      toast({ title: "Đã xóa nền trắng", description: "Logo đã được chuyển sang nền trong suốt" });
    } catch {
      toast({ title: "Không thể xóa nền", description: "Vui lòng thử với ảnh khác", variant: "destructive" });
    } finally {
      setRemoving(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxKB * 1024) { toast({ title: `File quá lớn (>${maxKB}KB)`, variant: "destructive" }); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      if (removeBg && (file.type === "image/jpeg" || file.type === "image/jpg" || file.type === "image/png")) {
        try {
          const cleaned = await removeWhiteBackground(dataUrl);
          onChange(cleaned);
          toast({ title: "Logo đã tải lên", description: "Nền trắng đã được tự động xóa" });
        } catch {
          onChange(dataUrl);
        }
      } else {
        onChange(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{label}</label>
        {hint && <span className="text-[9px] text-muted-foreground/60">{hint}</span>}
      </div>
      <div className="flex gap-2 items-stretch">
        <div className={`shrink-0 ${previewClass} aspect-square border border-primary/20 bg-[repeating-conic-gradient(#aaa_0%_25%,transparent_0%_50%)] bg-[length:12px_12px] bg-muted/20 flex items-center justify-center overflow-hidden`}>
          {value && !errored ? (
            <img src={value} alt={label} className="max-w-full max-h-full object-contain" onError={() => setErrored(true)} />
          ) : (
            <div className="flex flex-col items-center gap-0.5 text-muted-foreground/40 bg-muted/20 w-full h-full justify-center">
              <ImageIcon size={18} />
              {errored && <span className="text-[8px] uppercase tracking-wider">Lỗi</span>}
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="/images/... hoặc https://..."
            className="w-full border border-primary/20 focus:border-primary bg-background px-2.5 py-1.5 text-xs font-mono outline-none"
          />
          <div className="flex gap-1.5 flex-wrap">
            <input ref={fileRef} type="file" accept={accept} onChange={handleFile} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 border border-primary/30 text-primary hover:bg-primary/5 px-2 py-1.5 text-[11px] uppercase tracking-wider transition-colors">
              <Upload size={10} /> Tải lên
            </button>
            {removeBg && value && (
              <button type="button" onClick={handleRemoveBg} disabled={removing}
                className="flex items-center gap-1 border border-amber-500/40 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 px-2 py-1.5 text-[11px] uppercase tracking-wider transition-colors disabled:opacity-50">
                {removing ? <span className="animate-spin">◌</span> : "✦"} Xóa nền
              </button>
            )}
            {value && (
              <button type="button" onClick={() => onChange("")}
                className="border border-muted-foreground/20 text-muted-foreground hover:text-red-500 hover:border-red-500/30 px-2 py-1.5 text-[11px] transition-colors">
                <X size={10} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Branding Tab
────────────────────────────────────────────── */
export function BrandingPanel() {
  const { branding, updateBranding, resetBranding } = useBranding();
  const { toast } = useToast();
  const [local, setLocal] = useState<Branding>(branding);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync local form with provider when branding changes externally (cross-tab) — but never clobber unsaved edits.
  useEffect(() => {
    if (!dirty) setLocal(branding);
  }, [branding, dirty]);

  const set = <K extends keyof Branding>(k: K, v: Branding[K]) => {
    setLocal(prev => ({ ...prev, [k]: v }));
    setDirty(true);
  };

  const handleSave = () => {
    updateBranding(local);
    setDirty(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast({ title: "Đã lưu nhận diện thương hiệu", description: "Logo, favicon và tên đã được cập nhật" });
  };

  const handleReset = () => {
    if (!confirm("Khôi phục mặc định? Tất cả tùy chỉnh logo/favicon sẽ bị xóa.")) return;
    resetBranding();
    setLocal(DEFAULT_BRANDING);
    setDirty(false);
    toast({ title: "Đã khôi phục mặc định" });
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-luxury bg-background">
      <div className="max-w-3xl mx-auto p-6 space-y-6">

        {/* Header card */}
        <div className="border border-primary/20 bg-card p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Sparkles size={16} className="text-primary" />
              </div>
              <div>
                <h2 className="font-serif text-base text-foreground">Nhận diện thương hiệu</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Logo, favicon, tên & tagline — áp dụng cho toàn bộ website và admin panel</p>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={handleReset} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-primary/20 px-3 py-1.5 transition-colors">
                <RotateCcw size={10} /> Mặc định
              </button>
              <Button onClick={handleSave} size="sm" disabled={!dirty && !saved}
                className={`rounded-none text-xs uppercase tracking-widest h-8 px-4 gap-1.5 ${saved ? "bg-green-600" : "bg-primary"} text-primary-foreground disabled:opacity-50`}>
                {saved ? <Check size={10} /> : <Save size={10} />}
                {saved ? "Đã lưu!" : (dirty ? "Lưu thay đổi *" : "Đã lưu")}
              </Button>
            </div>
          </div>
        </div>

        {/* Brand identity */}
        <section className="border border-primary/15 bg-card">
          <header className="px-5 py-3 border-b border-primary/15 flex items-center gap-2">
            <Type size={12} className="text-primary" />
            <h3 className="text-xs uppercase tracking-[0.2em] font-medium text-foreground">Tên & Tagline</h3>
          </header>
          <div className="p-5 grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Tên thương hiệu</label>
              <input value={local.brandName} onChange={e => set("brandName", e.target.value)}
                className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm outline-none" placeholder="Grand Palace" />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Số sao hiển thị</label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const val = i + 1;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => set("starRating", val)}
                        className={`text-xl leading-none transition-colors ${val <= (local.starRating ?? 5) ? "text-primary" : "text-primary/20 hover:text-primary/50"}`}
                        title={`${val} sao`}
                      >
                        ★
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs text-muted-foreground ml-1">{local.starRating ?? 5} sao</span>
              </div>
              <p className="text-[10px] text-muted-foreground/70 mt-1.5">Hiển thị trên logo ở navbar và footer (1–10 sao)</p>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Tiêu đề trang (Browser tab)</label>
              <input value={local.pageTitle} onChange={e => set("pageTitle", e.target.value)}
                className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm outline-none" placeholder="Grand Palace Hotels & Resorts" />
              <p className="text-[10px] text-muted-foreground/70 mt-1">Hiển thị trên tab trình duyệt và kết quả tìm kiếm Google</p>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Đơn vị tiền tệ hiển thị</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => set("currency", "VND")}
                  className={`p-3 border text-left transition-all ${local.currency === "VND" ? "border-primary bg-primary/5" : "border-primary/20 hover:border-primary/40"}`}>
                  <div className="text-xs font-medium mb-0.5">VND — Việt Nam Đồng</div>
                  <div className="text-[10px] text-muted-foreground">Vd: 2.500.000 ₫</div>
                </button>
                <button type="button" onClick={() => set("currency", "USD")}
                  className={`p-3 border text-left transition-all ${local.currency === "USD" ? "border-primary bg-primary/5" : "border-primary/20 hover:border-primary/40"}`}>
                  <div className="text-xs font-medium mb-0.5">USD — US Dollar</div>
                  <div className="text-[10px] text-muted-foreground">Vd: $250</div>
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/70 mt-1.5">Áp dụng cho giá phòng trên toàn bộ website (trang khách sạn, danh sách phòng, admin)</p>
            </div>
          </div>
        </section>

        {/* Navbar */}
        <section className="border border-primary/15 bg-card">
          <header className="px-5 py-3 border-b border-primary/15 flex items-center gap-2">
            <Settings2 size={12} className="text-primary" />
            <h3 className="text-xs uppercase tracking-[0.2em] font-medium text-foreground">Thanh điều hướng (Navbar)</h3>
          </header>
          <div className="p-5 space-y-5">
            {/* Style selector */}
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">Kiểu nền Navbar</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "auto", label: "Tự động", desc: "Trong suốt → Solid khi cuộn" },
                  { value: "solid", label: "Luôn solid", desc: "Nền đặc suốt trang" },
                  { value: "glass", label: "Kính mờ", desc: "Blur + bán trong suốt" },
                ] as const).map(({ value: v, label, desc }) => (
                  <button key={v} type="button" onClick={() => set("navbarStyle", v)}
                    className={`p-3 border text-left transition-all ${(local.navbarStyle ?? "auto") === v ? "border-primary bg-primary/5" : "border-primary/20 hover:border-primary/40"}`}>
                    <div className="text-xs font-medium mb-0.5">{label}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Color & Opacity — shown when solid or glass */}
            {(local.navbarStyle === "solid" || local.navbarStyle === "glass") && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">Màu nền</label>
                  <div className="flex items-center gap-2">
                    <div className="relative w-9 h-9 border border-primary/30 overflow-hidden shrink-0">
                      <input
                        type="color"
                        value={local.navbarBgColor ?? "#1a1f2e"}
                        onChange={e => set("navbarBgColor", e.target.value)}
                        className="absolute -inset-1 w-[calc(100%+8px)] h-[calc(100%+8px)] cursor-pointer border-0 p-0"
                      />
                    </div>
                    <input
                      type="text"
                      value={local.navbarBgColor ?? "#1a1f2e"}
                      onChange={e => set("navbarBgColor", e.target.value)}
                      className="flex-1 border border-primary/20 focus:border-primary bg-background px-2 py-1.5 text-xs font-mono outline-none"
                      maxLength={7}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">
                    Độ đục — {local.navbarBgOpacity ?? 95}%
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={local.navbarBgOpacity ?? 95}
                    onChange={e => set("navbarBgOpacity", Number(e.target.value))}
                    className="w-full accent-primary h-1.5 cursor-pointer mt-2"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-1">
                    <span>10%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Live preview bar */}
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">Xem trước</label>
              <div className="relative h-12 bg-gradient-to-r from-gray-800 to-gray-600 overflow-hidden border border-primary/15">
                <div
                  className="absolute inset-0 flex items-center px-4 gap-4 transition-all"
                  style={{
                    backgroundColor: (local.navbarStyle === "solid" || local.navbarStyle === "glass")
                      ? (() => {
                          const hex = local.navbarBgColor ?? "#1a1f2e";
                          const r = parseInt(hex.slice(1, 3), 16);
                          const g = parseInt(hex.slice(3, 5), 16);
                          const b = parseInt(hex.slice(5, 7), 16);
                          const a = ((local.navbarBgOpacity ?? 95) / 100) * (local.navbarStyle === "glass" ? 0.7 : 1);
                          return `rgba(${r},${g},${b},${a})`;
                        })()
                      : "transparent",
                    backdropFilter: local.navbarStyle === "glass" ? "blur(8px)" : undefined,
                  }}
                >
                  <span className="font-serif text-sm text-primary tracking-widest uppercase">Grand Palace</span>
                  <div className="flex gap-3 ml-4">
                    {["Trang chủ","Phòng","Liên hệ"].map(m => (
                      <span key={m} className="text-[10px] tracking-wider text-white/70">{m}</span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-1">Xem trước trên nền tối (giống ảnh hero trang chủ)</p>
            </div>
          </div>
        </section>

        {/* Logo */}
        <section className="border border-primary/15 bg-card">
          <header className="px-5 py-3 border-b border-primary/15 flex items-center gap-2">
            <ImageIcon size={12} className="text-primary" />
            <h3 className="text-xs uppercase tracking-[0.2em] font-medium text-foreground">Logo Website</h3>
          </header>
          <div className="p-5 space-y-5">
            {/* Logo type toggle */}
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">Kiểu hiển thị logo trên Navbar</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => set("useImageLogo", false)}
                  className={`p-3 border text-left transition-all ${!local.useImageLogo ? "border-primary bg-primary/5" : "border-primary/20 hover:border-primary/40"}`}>
                  <div className="text-xs font-medium mb-0.5">Văn bản</div>
                  <div className="text-[10px] text-muted-foreground">Hiển thị tên + tagline</div>
                </button>
                <button onClick={() => set("useImageLogo", true)}
                  className={`p-3 border text-left transition-all ${local.useImageLogo ? "border-primary bg-primary/5" : "border-primary/20 hover:border-primary/40"}`}>
                  <div className="text-xs font-medium mb-0.5">Hình ảnh</div>
                  <div className="text-[10px] text-muted-foreground">Hiển thị logo image</div>
                </button>
              </div>
            </div>

            {/* Logo size */}
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-2">
                Kích thước logo — {local.logoHeight ?? 48}px
              </label>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { label: "Nhỏ", value: 32 },
                  { label: "Vừa", value: 48 },
                  { label: "Lớn", value: 64 },
                  { label: "XL", value: 80 },
                ].map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => set("logoHeight", value)}
                    className={`py-2 border text-xs transition-all ${
                      (local.logoHeight ?? 48) === value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-primary/20 hover:border-primary/50 text-muted-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                type="range"
                min={24}
                max={120}
                step={4}
                value={local.logoHeight ?? 48}
                onChange={e => set("logoHeight", Number(e.target.value))}
                className="w-full accent-primary h-1.5 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-1">
                <span>24px</span>
                <span>120px</span>
              </div>
              {local.useImageLogo && local.logoUrl && (
                <div className="mt-3 p-3 bg-secondary/30 border border-primary/10 flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground tracking-widest uppercase shrink-0">Xem trước:</span>
                  <img
                    src={local.logoUrl}
                    alt="Logo preview"
                    style={{ height: `${local.logoHeight ?? 48}px` }}
                    className="w-auto object-contain max-w-[200px]"
                    onError={e => (e.currentTarget.style.display = "none")}
                  />
                </div>
              )}
            </div>

            <ImagePicker
              label="Logo trang web (Navbar/Footer)"
              hint="SVG/PNG/JPG · Tự động xóa nền khi tải lên"
              value={local.logoUrl}
              onChange={v => set("logoUrl", v)}
              removeBg
            />
          </div>
        </section>

        {/* Sidebar logo */}
        <section className="border border-primary/15 bg-card">
          <header className="px-5 py-3 border-b border-primary/15 flex items-center gap-2">
            <PaletteIcon size={12} className="text-primary" />
            <h3 className="text-xs uppercase tracking-[0.2em] font-medium text-foreground">Logo Admin Sidebar</h3>
          </header>
          <div className="p-5 space-y-3">
            <p className="text-[11px] text-muted-foreground">Logo riêng cho khu vực quản trị — có thể giống hoặc khác logo chính.</p>
            <ImagePicker
              label="Logo sidebar admin"
              hint="Vuông hoặc hình chữ nhật ngang"
              value={local.adminLogoUrl}
              onChange={v => set("adminLogoUrl", v)}
              removeBg
            />
            <button onClick={() => set("adminLogoUrl", local.logoUrl)} disabled={!local.logoUrl}
              className="text-[11px] text-primary hover:underline disabled:text-muted-foreground/40 disabled:no-underline">
              ↻ Đồng bộ với logo chính
            </button>
          </div>
        </section>

        {/* Favicon */}
        <section className="border border-primary/15 bg-card">
          <header className="px-5 py-3 border-b border-primary/15 flex items-center gap-2">
            <Globe size={12} className="text-primary" />
            <h3 className="text-xs uppercase tracking-[0.2em] font-medium text-foreground">Favicon</h3>
          </header>
          <div className="p-5 space-y-3">
            <p className="text-[11px] text-muted-foreground">Icon hiển thị trên tab trình duyệt và bookmark. SVG hoặc PNG vuông (32x32 hoặc 64x64 khuyên dùng).</p>
            <ImagePicker
              label="Favicon"
              hint="SVG/PNG · ≤ 200KB"
              value={local.faviconUrl}
              onChange={v => set("faviconUrl", v)}
              maxKB={200}
              accept="image/svg+xml,image/png,image/x-icon,image/vnd.microsoft.icon"
            />
          </div>
        </section>

        {/* Live preview */}
        <section className="border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
          <header className="px-5 py-3 border-b border-primary/15 flex items-center gap-2">
            <Eye size={12} className="text-primary" />
            <h3 className="text-xs uppercase tracking-[0.2em] font-medium text-foreground">Xem trước</h3>
          </header>
          <div className="p-5 grid sm:grid-cols-2 gap-4">
            {/* Navbar preview */}
            <div className="border border-primary/15 bg-background p-4">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2">Navbar website</div>
              <div className="flex items-center gap-3">
                {local.useImageLogo && local.logoUrl ? (
                  <img src={local.logoUrl} alt="" className="h-10 w-auto" onError={e => (e.currentTarget.style.display = "none")} />
                ) : (
                  <div className="flex flex-col">
                    <span className="font-serif text-lg text-primary uppercase tracking-[0.1em]">{local.brandName || "—"}</span>
                    <span className="flex items-center gap-0.5 mt-0.5">
                      {Array.from({ length: Math.min(Math.max(local.starRating ?? 5, 1), 10) }).map((_, i) => (
                        <span key={i} className="text-primary text-[9px] leading-none">★</span>
                      ))}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {/* Admin sidebar preview */}
            <div className="border border-primary/15 bg-card p-4">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2">Admin sidebar</div>
              <div className="flex flex-col items-center gap-1.5 py-2 bg-gradient-to-b from-primary/10 to-transparent">
                {local.adminLogoUrl && (
                  <img src={local.adminLogoUrl} alt="" className="h-10 w-auto" onError={e => (e.currentTarget.style.display = "none")} />
                )}
                <div className="font-serif text-[12px] tracking-[0.2em]">{local.brandName || "—"}</div>
                <div className="text-[9px] tracking-[0.35em] uppercase text-primary">ADMIN</div>
              </div>
            </div>
            {/* Favicon preview */}
            <div className="border border-primary/15 bg-background p-4 sm:col-span-2">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground mb-2">Tab trình duyệt</div>
              <div className="flex items-center gap-2 bg-muted/30 px-3 py-2 max-w-md border border-primary/10 rounded-t-lg">
                {local.faviconUrl && (
                  <img src={local.faviconUrl} alt="" className="w-4 h-4" onError={e => (e.currentTarget.style.display = "none")} />
                )}
                <span className="text-xs text-foreground truncate">{local.pageTitle || "—"}</span>
                <X size={10} className="text-muted-foreground ml-auto" />
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Page Canvas
────────────────────────────────────────────── */
function PageCanvas({ page, onBlocksChange }: { page: SitePage; onBlocksChange: (blocks: PageBlock[]) => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const blocks = page.blocks;
  const selectedBlock = blocks.find(b => b.id === selectedId) ?? null;

  const updateBlock = useCallback((id: string, settings: Record<string, any>) => {
    onBlocksChange(blocks.map(b => b.id === id ? { ...b, settings } : b));
  }, [blocks, onBlocksChange]);

  const toggleVisible = (id: string) => onBlocksChange(blocks.map(b => b.id === id ? { ...b, visible: !b.visible } : b));

  const moveBlock = (id: string, dir: "up" | "down") => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx < 0) return;
    const next = [...blocks];
    const swap = dir === "up" ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onBlocksChange(next);
  };

  const deleteBlock = (id: string) => {
    onBlocksChange(blocks.filter(b => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const addBlock = (type: BlockType) => {
    const def = BLOCK_DEFINITIONS.find(d => d.type === type)!;
    const newBlock: PageBlock = { id: genBlockId(), type, visible: true, settings: { ...def.defaultSettings } };
    onBlocksChange([...blocks, newBlock]);
    setSelectedId(newBlock.id);
  };

  const duplicateBlock = (id: string) => {
    const idx = blocks.findIndex(b => b.id === id);
    if (idx < 0) return;
    const src = blocks[idx];
    const copy: PageBlock = {
      id: genBlockId(),
      type: src.type,
      visible: src.visible,
      settings: JSON.parse(JSON.stringify(src.settings)),
    };
    const next = [...blocks];
    next.splice(idx + 1, 0, copy);
    onBlocksChange(next);
    setSelectedId(copy.id);
  };

  const resetBlockDefaults = (id: string) => {
    const block = blocks.find(b => b.id === id);
    if (!block) return;
    const def = BLOCK_DEFINITIONS.find(d => d.type === block.type);
    if (!def) return;
    onBlocksChange(blocks.map(b => b.id === id ? { ...b, settings: JSON.parse(JSON.stringify(def.defaultSettings)) } : b));
  };

  const selectedIdx = selectedBlock ? blocks.findIndex(b => b.id === selectedBlock.id) : -1;

  const visibleCount = blocks.filter(b => b.visible).length;

  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto scrollbar-luxury bg-background">
        <div className="max-w-3xl mx-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Globe size={12} className="text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground font-mono">{page.slug}</span>
              <span className="text-[10px] text-muted-foreground/50">·</span>
              <span className="text-[10px] text-muted-foreground">{blocks.length} blocks · {visibleCount} hiển thị</span>
            </div>
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 text-xs text-primary border border-primary/30 px-3 py-1.5 hover:bg-primary/5 transition-colors">
              <Plus size={11} /> Thêm block
            </button>
          </div>

          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-primary/20 text-muted-foreground">
              <Layers size={40} className="opacity-20 mb-4" />
              <p className="text-sm mb-3">Trang này chưa có block nào</p>
              <button onClick={() => setShowAddModal(true)} className="text-xs text-primary hover:underline flex items-center gap-1">
                <Plus size={11} /> Thêm block đầu tiên
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {blocks.map((block, idx) => (
                <BlockCard key={block.id} block={block} index={idx} total={blocks.length}
                  isSelected={selectedId === block.id}
                  onSelect={() => setSelectedId(selectedId === block.id ? null : block.id)}
                  onToggleVisible={() => toggleVisible(block.id)}
                  onMoveUp={() => moveBlock(block.id, "up")}
                  onMoveDown={() => moveBlock(block.id, "down")}
                  onDelete={() => deleteBlock(block.id)} />
              ))}
              <button onClick={() => setShowAddModal(true)} className="w-full border-2 border-dashed border-primary/20 py-4 text-muted-foreground hover:text-primary hover:border-primary/40 transition-all flex items-center justify-center gap-2 text-sm mt-3">
                <Plus size={13} /> Thêm block mới
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="w-72 shrink-0 border-l border-primary/15 overflow-y-auto scrollbar-luxury bg-card">
        <BlockSettings
          block={selectedBlock}
          onUpdate={updateBlock}
          onClose={() => setSelectedId(null)}
          onDuplicate={duplicateBlock}
          onResetDefaults={resetBlockDefaults}
          onToggleVisible={toggleVisible}
          onDelete={deleteBlock}
          index={selectedIdx >= 0 ? selectedIdx : undefined}
          total={blocks.length}
        />
      </div>

      {showAddModal && <AddBlockModal onAdd={addBlock} onClose={() => setShowAddModal(false)} />}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Pages Tab (sidebar + canvas)
────────────────────────────────────────────── */
function PagesPanel() {
  const { pages, savePage, addPage, deletePage, renamePage } = useSitePages();
  const { toast } = useToast();

  // null = list view (default). When set, we're editing that page.
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [localPages, setLocalPages] = useState<SitePage[]>(pages);
  const [showNewModal, setShowNewModal] = useState(false);
  const [renamingPage, setRenamingPage] = useState<SitePage | null>(null);
  const [quickEditPage, setQuickEditPage] = useState<SitePage | null>(null);
  const [saved, setSaved] = useState(false);

  const handleQuickSave = (next: SitePage) => {
    savePage(next);
    setLocalPages(prev => prev.map(p => p.id === next.id ? next : p));
    if (next.title !== quickEditPage?.title || next.slug !== quickEditPage?.slug || next.category !== quickEditPage?.category) {
      renamePage(next.id, next.title, next.slug, next.category ?? "custom");
    }
    toast({ title: `Đã lưu "${next.title}"`, description: `${next.blocks.filter(b => b.visible).length} blocks đang hiển thị` });
  };

  const selectedPage = selectedPageId ? localPages.find(p => p.id === selectedPageId) : null;

  const handleBlocksChange = useCallback((blocks: PageBlock[]) => {
    setLocalPages(prev => prev.map(p => p.id === selectedPageId ? { ...p, blocks } : p));
  }, [selectedPageId]);

  const handleSave = () => {
    const page = localPages.find(p => p.id === selectedPageId);
    if (page) {
      savePage(page);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast({ title: `Đã lưu "${page.title}"`, description: `${page.blocks.filter(b => b.visible).length} blocks đang hiển thị` });
    }
  };

  const [filterCat, setFilterCat] = useState<PageCategory | "all">("all");

  const handleAddPage = (title: string, slug: string, category: PageCategory) => {
    const newPage = addPage(title, slug, category);
    setLocalPages(prev => [...prev, newPage]);
    setSelectedPageId(newPage.id);
    toast({ title: `Tạo trang "${title}" thành công` });
  };

  const handleDeletePage = (id: string) => {
    if (id === "home") { toast({ title: "Không thể xóa trang chủ", variant: "destructive" }); return; }
    const page = localPages.find(p => p.id === id);
    if (!confirm(`Xóa trang "${page?.title}"? Hành động này không thể hoàn tác.`)) return;
    deletePage(id);
    setLocalPages(prev => prev.filter(p => p.id !== id));
    if (selectedPageId === id) setSelectedPageId(null);
    toast({ title: `Đã xóa trang "${page?.title}"` });
  };

  const handleRename = (id: string, title: string, slug: string, category: PageCategory) => {
    renamePage(id, title, slug, category);
    setLocalPages(prev => prev.map(p => p.id === id ? { ...p, title, slug, category } : p));
    setRenamingPage(null);
    toast({ title: "Đã cập nhật trang" });
  };

  const handleResetPage = () => {
    if (!confirm("Xóa tất cả blocks của trang này? Không thể hoàn tác.")) return;
    handleBlocksChange([]);
    toast({ title: "Đã xóa tất cả blocks" });
  };

  // ── EDITOR VIEW (a page is selected) ─────────────────────────────────
  if (selectedPage) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between px-5 py-2.5 border-b border-primary/15 bg-card shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSelectedPageId(null)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary border border-primary/20 px-3 py-1.5 transition-colors shrink-0">
              ← Quay lại
            </button>
            <div className="flex items-center gap-2 text-xs min-w-0">
              <FileText size={12} className="text-primary shrink-0" />
              <span className="text-foreground font-medium truncate">{selectedPage.title}</span>
              <span className="text-muted-foreground/40 shrink-0">·</span>
              <span className="text-muted-foreground font-mono text-[11px] truncate">{selectedPage.slug}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href={selectedPage.slug} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary border border-primary/20 px-3 py-1.5 transition-colors">
              <ExternalLink size={10} /> Xem trang
            </a>
            <button onClick={() => setRenamingPage(selectedPage)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-primary/20 px-3 py-1.5 transition-colors">
              <Pencil size={10} /> Sửa
            </button>
            <button onClick={handleResetPage} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-primary/20 px-3 py-1.5 transition-colors">
              <RotateCcw size={10} /> Xóa blocks
            </button>
            <Button onClick={handleSave} size="sm"
              className={`rounded-none text-xs uppercase tracking-widest h-8 px-4 gap-1.5 ${saved ? "bg-green-600" : "bg-primary"} text-primary-foreground`}>
              {saved ? <Check size={10} /> : <Save size={10} />}
              {saved ? "Đã lưu!" : "Lưu trang"}
            </Button>
          </div>
        </div>

        <PageCanvas key={selectedPage.id} page={selectedPage} onBlocksChange={handleBlocksChange} />

        {renamingPage && <RenamePageModal page={renamingPage} onConfirm={(t, s, c) => handleRename(renamingPage.id, t, s, c)} onClose={() => setRenamingPage(null)} />}
      </div>
    );
  }

  // ── LIST VIEW (default) ──────────────────────────────────────────────
  const filteredPages = localPages.filter(p => filterCat === "all" || (p.category ?? "custom") === filterCat);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b border-primary/15 bg-card shrink-0">
        <div className="flex items-center gap-3">
          <Layers size={16} className="text-primary" />
          <div>
            <h2 className="font-serif text-base text-foreground">Quản lý trang</h2>
            <p className="text-[11px] text-muted-foreground">{localPages.length} trang · chọn một trang để mở Page Builder</p>
          </div>
        </div>
        <Button onClick={() => setShowNewModal(true)} size="sm"
          className="rounded-none text-xs uppercase tracking-widest h-9 px-4 gap-1.5 bg-primary text-primary-foreground">
          <Plus size={12} /> Tạo trang mới
        </Button>
      </div>

      <div className="px-6 py-3 border-b border-primary/10 bg-card/40 flex flex-wrap gap-1.5">
        <button onClick={() => setFilterCat("all")}
          className={`px-3 py-1 text-[10px] uppercase tracking-wider border transition-all ${filterCat === "all" ? "border-primary bg-primary/10 text-primary" : "border-primary/15 text-muted-foreground hover:text-foreground"}`}>
          Tất cả ({localPages.length})
        </button>
        {PAGE_CATEGORIES.map(cat => {
          const count = localPages.filter(p => (p.category ?? "custom") === cat.value).length;
          if (count === 0) return null;
          const active = filterCat === cat.value;
          return (
            <button key={cat.value} onClick={() => setFilterCat(cat.value)}
              className="px-3 py-1 text-[10px] uppercase tracking-wider border transition-all"
              style={{
                borderColor: active ? cat.color : "rgba(212,175,55,0.15)",
                color: active ? cat.color : "#9CA3AF",
                backgroundColor: active ? `${cat.color}15` : "transparent",
              }}>
              {cat.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-luxury p-6">
        {filteredPages.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground">
            <FileText size={40} className="mx-auto opacity-20 mb-4" />
            <p className="text-sm">Chưa có trang nào trong phân loại này</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
            {filteredPages.map(page => {
              const cat = PAGE_CATEGORIES.find(c => c.value === (page.category ?? "custom"));
              const visibleBlocks = page.blocks.filter(b => b.visible).length;
              return (
                <div key={page.id}
                  className="group border border-primary/15 bg-card hover:border-primary/40 hover:shadow-lg transition-all flex flex-col">
                  <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-2 border-b border-primary/10">
                    <div className="flex items-center gap-2 min-w-0">
                      {page.id === "home"
                        ? <Home size={14} className="text-primary shrink-0" />
                        : <FileText size={14} className="text-primary shrink-0" />}
                      <h3 className="font-serif text-sm text-foreground truncate">{page.title}</h3>
                    </div>
                    {cat && (
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 shrink-0 border-l-2"
                        style={{ color: cat.color, borderColor: cat.color }}>
                        {cat.label}
                      </span>
                    )}
                  </div>
                  <div className="px-4 py-3 space-y-2 flex-1">
                    <div className="text-[10px] font-mono text-muted-foreground truncate">{page.slug}</div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Layers size={9} /> {page.blocks.length} block{page.blocks.length !== 1 ? "s" : ""}</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span className="flex items-center gap-1"><Eye size={9} /> {visibleBlocks} hiển thị</span>
                    </div>
                  </div>
                  <div className="px-4 py-3 border-t border-primary/10 flex flex-col gap-1.5 bg-muted/10">
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button onClick={() => setQuickEditPage(page)} size="sm"
                        className="rounded-none text-[10px] uppercase tracking-widest h-8 bg-background hover:bg-primary/10 text-foreground border border-primary/30">
                        <Pencil size={10} className="mr-1" /> Sửa nhanh
                      </Button>
                      <Button onClick={() => setSelectedPageId(page.id)} size="sm"
                        className="rounded-none text-[10px] uppercase tracking-widest h-8 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30">
                        <PaletteIcon size={10} className="mr-1" /> Page Builder
                      </Button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <a href={page.slug} target="_blank" rel="noopener noreferrer"
                        className="flex-1 p-2 text-center text-muted-foreground hover:text-primary border border-primary/20 transition-colors" title="Xem trang">
                        <ExternalLink size={11} className="inline" />
                      </a>
                      {page.id !== "home" && (
                        <button onClick={() => handleDeletePage(page.id)}
                          className="flex-1 p-2 text-muted-foreground hover:text-red-500 border border-primary/20 hover:border-red-500/40 transition-colors" title="Xóa trang">
                          <Trash2 size={11} className="inline" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showNewModal && <NewPageModal onConfirm={handleAddPage} onClose={() => setShowNewModal(false)} />}
      {renamingPage && <RenamePageModal page={renamingPage} onConfirm={(t, s, c) => handleRename(renamingPage.id, t, s, c)} onClose={() => setRenamingPage(null)} />}
      {quickEditPage && (
        <QuickEditModal
          page={quickEditPage}
          onSave={handleQuickSave}
          onClose={() => setQuickEditPage(null)}
          onOpenBuilder={() => { const id = quickEditPage.id; setQuickEditPage(null); setSelectedPageId(id); }}
        />
      )}
    </div>
  );
}

export default function AdminBuilder() {
  return (
    <AdminGuard>
      <AdminLayout title="Page Builder" subtitle="Thiết kế và chỉnh sửa các trang của website">
        <div className="flex flex-col h-full min-h-screen">
          <PagesPanel />
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
