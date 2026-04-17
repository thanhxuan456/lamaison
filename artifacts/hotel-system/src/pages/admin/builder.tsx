import { useState, useCallback, useRef, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Eye, EyeOff, Trash2, ChevronUp, ChevronDown, Plus, Save,
  ExternalLink, Settings2, RotateCcw, GripVertical, X, Check,
  Layers, FileText, Pencil, Globe, Home, Image as ImageIcon, Upload,
  Palette as PaletteIcon, Sparkles, Type,
} from "lucide-react";
import {
  useSitePages,
  BLOCK_DEFINITIONS,
  SitePage,
  PageBlock,
  BlockType,
  BlockField,
  genBlockId,
} from "@/lib/page-blocks";
import { useBranding, DEFAULT_BRANDING, Branding } from "@/lib/branding";
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
function BlockSettings({ block, onUpdate, onClose }: { block: PageBlock | null; onUpdate: (id: string, s: Record<string, any>) => void; onClose: () => void }) {
  if (!block) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3 py-12">
        <Settings2 size={32} className="opacity-15" />
        <p className="text-xs">Chọn block để chỉnh sửa</p>
      </div>
    );
  }
  const def = BLOCK_DEFINITIONS.find(d => d.type === block.type);
  if (!def) return null;
  const update = (key: string, v: any) => onUpdate(block.id, { ...block.settings, [key]: v });

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-primary/15 bg-primary/5 sticky top-0">
        <div className="flex items-center gap-2">
          <span className="text-base">{def.icon}</span>
          <div>
            <div className="text-xs font-medium">{def.label}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wide">Block Settings</div>
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 transition-colors"><X size={13} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-luxury">
        {def.fields.map(field => (
          <div key={field.key}>
            <label className="block text-[10px] tracking-[0.18em] uppercase text-muted-foreground mb-1.5">{field.label}</label>
            <FieldEditor field={field} value={block.settings[field.key]} onChange={v => update(field.key, v)} />
          </div>
        ))}
        {block.settings.imageUrl && (
          <div>
            <label className="block text-[10px] tracking-[0.18em] uppercase text-muted-foreground mb-1.5">Xem trước ảnh</label>
            <img src={block.settings.imageUrl} alt="preview" className="w-full h-20 object-cover border border-primary/20" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          </div>
        )}
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
function NewPageModal({ onConfirm, onClose }: { onConfirm: (title: string, slug: string) => void; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
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
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="rounded-none flex-1 border-primary/30 text-xs uppercase tracking-widest" onClick={onClose}>Hủy</Button>
            <Button size="sm" className="rounded-none flex-1 bg-primary text-primary-foreground text-xs uppercase tracking-widest" disabled={!title.trim() || !slug.trim()} onClick={() => { onConfirm(title.trim(), slug.trim()); onClose(); }}>Tạo</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Rename Page Modal
────────────────────────────────────────────── */
function RenamePageModal({ page, onConfirm, onClose }: { page: SitePage; onConfirm: (title: string, slug: string) => void; onClose: () => void }) {
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
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
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="rounded-none flex-1 border-primary/30 text-xs uppercase tracking-widest" onClick={onClose}>Hủy</Button>
            <Button size="sm" className="rounded-none flex-1 bg-primary text-primary-foreground text-xs uppercase tracking-widest" disabled={!title.trim()} onClick={() => { onConfirm(title.trim(), slug.trim()); onClose(); }}>Lưu</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Image Picker (URL + file upload + preview)
────────────────────────────────────────────── */
function ImagePicker({ label, hint, value, onChange, previewClass = "h-20", accept = "image/*", maxKB = 1024 }: {
  label: string; hint?: string; value: string; onChange: (v: string) => void;
  previewClass?: string; accept?: string; maxKB?: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [errored, setErrored] = useState(false);
  // Reset error state whenever the URL changes — fixes "broken image stays hidden after fixing URL"
  useEffect(() => { setErrored(false); }, [value]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxKB * 1024) { toast({ title: `File quá lớn (>${maxKB}KB)`, variant: "destructive" }); return; }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
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
        <div className={`shrink-0 ${previewClass} aspect-square border border-primary/20 bg-muted/20 flex items-center justify-center overflow-hidden`}>
          {value && !errored ? (
            <img src={value} alt={label} className="max-w-full max-h-full object-contain" onError={() => setErrored(true)} />
          ) : (
            <div className="flex flex-col items-center gap-0.5 text-muted-foreground/40">
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
          <div className="flex gap-1.5">
            <input ref={fileRef} type="file" accept={accept} onChange={handleFile} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-1.5 border border-primary/30 text-primary hover:bg-primary/5 px-2 py-1.5 text-[11px] uppercase tracking-wider transition-colors">
              <Upload size={10} /> Tải lên
            </button>
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
function BrandingPanel() {
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
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Tagline / Phụ đề</label>
              <input value={local.tagline} onChange={e => set("tagline", e.target.value)}
                className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm outline-none" placeholder="5 Sao Đẳng Cấp" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Tiêu đề trang (Browser tab)</label>
              <input value={local.pageTitle} onChange={e => set("pageTitle", e.target.value)}
                className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm outline-none" placeholder="Grand Palace Hotels & Resorts" />
              <p className="text-[10px] text-muted-foreground/70 mt-1">Hiển thị trên tab trình duyệt và kết quả tìm kiếm Google</p>
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

            <ImagePicker
              label="Logo trang web (Navbar/Footer)"
              hint="SVG/PNG · Khuyên dùng nền trong suốt"
              value={local.logoUrl}
              onChange={v => set("logoUrl", v)}
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
                    <span className="text-[9px] text-primary/70 tracking-[0.3em] uppercase mt-0.5">{local.tagline || "—"}</span>
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
        <BlockSettings block={selectedBlock} onUpdate={updateBlock} onClose={() => setSelectedId(null)} />
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

  const [selectedPageId, setSelectedPageId] = useState<string>(pages[0]?.id ?? "home");
  const [localPages, setLocalPages] = useState<SitePage[]>(pages);
  const [showNewModal, setShowNewModal] = useState(false);
  const [renamingPage, setRenamingPage] = useState<SitePage | null>(null);
  const [saved, setSaved] = useState(false);

  const selectedPage = localPages.find(p => p.id === selectedPageId) ?? localPages[0];

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

  const handleAddPage = (title: string, slug: string) => {
    const newPage = addPage(title, slug);
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
    if (selectedPageId === id) setSelectedPageId("home");
    toast({ title: `Đã xóa trang "${page?.title}"` });
  };

  const handleRename = (id: string, title: string, slug: string) => {
    renamePage(id, title, slug);
    setLocalPages(prev => prev.map(p => p.id === id ? { ...p, title, slug } : p));
    setRenamingPage(null);
    toast({ title: "Đã cập nhật trang" });
  };

  const handleResetPage = () => {
    if (!confirm("Xóa tất cả blocks của trang này? Không thể hoàn tác.")) return;
    handleBlocksChange([]);
    toast({ title: "Đã xóa tất cả blocks" });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Action bar */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-primary/15 bg-card shrink-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText size={12} className="text-primary" />
          <span>{localPages.length} trang</span>
          {selectedPage && (<><span className="text-muted-foreground/40">·</span><span>Đang chỉnh: <span className="text-foreground font-medium">{selectedPage.title}</span></span></>)}
        </div>
        <div className="flex items-center gap-2">
          {selectedPage && (
            <a href={selectedPage.slug} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary border border-primary/20 px-3 py-1.5 transition-colors">
              <ExternalLink size={10} /> Xem trang
            </a>
          )}
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

      <div className="flex flex-1 min-h-0">
        {/* Pages list */}
        <div className="w-56 shrink-0 border-r border-primary/15 bg-muted/20 flex flex-col">
          <div className="px-3 py-2.5 border-b border-primary/10 flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Danh sách trang</div>
            <button onClick={() => setShowNewModal(true)} title="Tạo trang mới" className="p-1 text-primary/60 hover:text-primary hover:bg-primary/10 transition-colors">
              <Plus size={13} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-luxury py-1.5">
            {localPages.map(page => (
              <div key={page.id}
                className={["mx-1.5 mb-0.5 flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-all group border",
                  selectedPageId === page.id ? "bg-primary/10 border-primary/30 text-primary" : "border-transparent hover:bg-primary/5 hover:border-primary/15 text-foreground"
                ].join(" ")} onClick={() => setSelectedPageId(page.id)}>
                {page.id === "home"
                  ? <Home size={12} className={selectedPageId === page.id ? "text-primary" : "text-muted-foreground"} />
                  : <FileText size={12} className={selectedPageId === page.id ? "text-primary" : "text-muted-foreground"} />
                }
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{page.title}</div>
                  <div className={`text-[9px] font-mono truncate ${selectedPageId === page.id ? "text-primary/70" : "text-muted-foreground"}`}>{page.slug}</div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setRenamingPage(page)} className="p-0.5 text-muted-foreground hover:text-primary transition-colors" title="Đổi tên"><Pencil size={10} /></button>
                  {page.id !== "home" && (
                    <button onClick={() => handleDeletePage(page.id)} className="p-0.5 text-muted-foreground hover:text-red-500 transition-colors" title="Xóa trang"><Trash2 size={10} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-primary/10">
            <button onClick={() => setShowNewModal(true)}
              className="w-full border border-dashed border-primary/25 text-primary/60 hover:text-primary hover:border-primary/50 text-xs py-2 flex items-center justify-center gap-1.5 transition-all hover:bg-primary/5">
              <Plus size={11} /> Tạo trang mới
            </button>
          </div>
        </div>

        {selectedPage ? (
          <PageCanvas key={selectedPage.id} page={selectedPage} onBlocksChange={handleBlocksChange} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Chọn một trang để bắt đầu chỉnh sửa</p>
          </div>
        )}
      </div>

      {showNewModal && <NewPageModal onConfirm={handleAddPage} onClose={() => setShowNewModal(false)} />}
      {renamingPage && <RenamePageModal page={renamingPage} onConfirm={(t, s) => handleRename(renamingPage.id, t, s)} onClose={() => setRenamingPage(null)} />}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Main Builder w/ top tabs
────────────────────────────────────────────── */
type BuilderTab = "pages" | "branding";

function BuilderContent() {
  const [tab, setTab] = useState<BuilderTab>("pages");

  const TABS: { key: BuilderTab; icon: any; label: string; sub: string }[] = [
    { key: "pages",    icon: Layers,    label: "Pages",    sub: "Thiết kế trang" },
    { key: "branding", icon: Sparkles,  label: "Branding", sub: "Logo · Favicon · Tên" },
  ];

  return (
    <div className="flex flex-col h-full min-h-screen">
      {/* Top header w/ tabs */}
      <div className="border-b border-primary/20 bg-card sticky top-0 z-20 shrink-0">
        <div className="flex items-stretch">
          {TABS.map(({ key, icon: Icon, label, sub }) => {
            const active = tab === key;
            return (
              <button key={key} onClick={() => setTab(key)}
                className={["flex items-center gap-3 px-6 py-3 border-b-2 transition-all -mb-px relative",
                  active ? "border-primary bg-primary/5" : "border-transparent hover:bg-primary/5"
                ].join(" ")}>
                <div className={`w-8 h-8 flex items-center justify-center transition-colors ${active ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground"}`}>
                  <Icon size={14} />
                </div>
                <div className="text-left">
                  <div className={`text-xs uppercase tracking-[0.2em] font-medium ${active ? "text-primary" : "text-foreground"}`}>{label}</div>
                  <div className="text-[10px] text-muted-foreground">{sub}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {tab === "pages" ? <PagesPanel /> : <BrandingPanel />}
    </div>
  );
}

export default function AdminBuilder() {
  return (
    <AdminGuard>
      <AdminLayout title="Page Builder" subtitle="Thiết kế trang chủ, các trang con và quản lý nhận diện thương hiệu">
        <BuilderContent />
      </AdminLayout>
    </AdminGuard>
  );
}
