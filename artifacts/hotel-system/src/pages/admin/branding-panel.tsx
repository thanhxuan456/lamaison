import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Save, RotateCcw, Sparkles, Type, Settings2, Check, X, Upload, Palette as PaletteIcon, Image as ImageIcon, Globe, Eye } from "lucide-react";
import { useBranding, DEFAULT_BRANDING, Branding, NavbarStyle } from "@/lib/branding";

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
                className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm outline-none" placeholder="MAISON DELUXE" />
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
                className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm outline-none" placeholder="MAISON DELUXE Hotels & Resorts" />
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
                  <span className="font-serif text-sm text-primary tracking-widest uppercase">MAISON DELUXE</span>
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
