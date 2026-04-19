import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { applyTheme } from "@/components/ThemeApplier";
import {
  Palette, Type, Layout, Check, Sun, Moon, Monitor, Crown, Sparkles, Loader2, RotateCcw,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "";
const STORAGE_CACHE = "grand-palace-theme-cache";

interface ThemeSettings {
  preset: string;
  primaryHsl: string;
  secondaryHsl: string;
  accentHsl: string;
  primaryDarkHsl: string;
  fontFamily: string;
  layout: "centered" | "wide" | "compact";
  radius: string;
  showBackToTop: boolean;
  showLiveChat: boolean;
  footerNewsletter: boolean;
  navTransparent: boolean;
  taglineSize: string;
  navTextSize: string;
}

/**
 * Curated "Deluxe" palettes — each pairs a primary accent with a complementary
 * secondary band color so admins can change brand mood with one click.
 */
const DELUXE_PRESETS: Array<{
  id: string;
  name: string;
  tagline: string;
  primaryHsl: string;
  secondaryHsl: string;
  accentHsl: string;
  primaryDarkHsl: string;
  isDefault?: boolean;
}> = [
  { id: "royal-gold", name: "Royal Gold", tagline: "Mặc định · Vàng hoàng gia × Onyx",
    primaryHsl: "46 65% 52%", secondaryHsl: "222 25% 14%", accentHsl: "46 65% 52%", primaryDarkHsl: "46 65% 52%", isDefault: true },
  { id: "champagne-bronze", name: "Champagne Bronze", tagline: "Đồng champagne × Ngà",
    primaryHsl: "32 55% 55%", secondaryHsl: "30 18% 22%", accentHsl: "38 65% 60%", primaryDarkHsl: "32 60% 60%" },
  { id: "sapphire-velvet", name: "Sapphire Velvet", tagline: "Sapphire xanh × Đêm",
    primaryHsl: "215 60% 48%", secondaryHsl: "222 40% 12%", accentHsl: "200 70% 55%", primaryDarkHsl: "215 65% 58%" },
  { id: "emerald-dynasty", name: "Emerald Dynasty", tagline: "Lục bảo × Rừng đêm",
    primaryHsl: "158 55% 38%", secondaryHsl: "160 30% 12%", accentHsl: "150 60% 45%", primaryDarkHsl: "158 60% 48%" },
  { id: "burgundy-heritage", name: "Burgundy Heritage", tagline: "Rượu vang × Than",
    primaryHsl: "350 55% 42%", secondaryHsl: "350 18% 14%", accentHsl: "10 65% 50%", primaryDarkHsl: "350 60% 52%" },
  { id: "rose-quartz", name: "Rose Quartz", tagline: "Hồng thạch × Mocha",
    primaryHsl: "345 55% 60%", secondaryHsl: "20 14% 18%", accentHsl: "350 60% 65%", primaryDarkHsl: "345 60% 65%" },
  { id: "amethyst-noir", name: "Amethyst Noir", tagline: "Tím hoàng tộc × Tím đen",
    primaryHsl: "270 50% 55%", secondaryHsl: "265 30% 14%", accentHsl: "285 60% 60%", primaryDarkHsl: "270 55% 65%" },
  { id: "platinum-ice", name: "Platinum Ice", tagline: "Bạch kim × Đá đêm",
    primaryHsl: "200 15% 60%", secondaryHsl: "210 25% 16%", accentHsl: "190 30% 55%", primaryDarkHsl: "200 20% 68%" },
];

const FONT_OPTIONS = [
  { name: "Playfair Display", value: "'Playfair Display', serif", label: "Cổ điển", sample: "Aa" },
  { name: "Cormorant Garamond", value: "'Cormorant Garamond', serif", label: "Tinh tế", sample: "Aa" },
  { name: "Libre Baskerville", value: "'Libre Baskerville', serif", label: "Sách", sample: "Aa" },
  { name: "Lora", value: "'Lora', serif", label: "Hiện đại", sample: "Aa" },
];

const LAYOUT_OPTIONS = [
  { label: "Trung tâm", desc: "Tối đa 80rem", value: "centered" as const },
  { label: "Rộng", desc: "Toàn màn hình", value: "wide" as const },
  { label: "Gọn gàng", desc: "Tối đa 64rem", value: "compact" as const },
];

const RADIUS_OPTIONS = [
  { label: "Sắc nét", value: "0rem" },
  { label: "Mềm", value: "0.25rem" },
  { label: "Bo tròn", value: "0.5rem" },
];

const DEFAULT: ThemeSettings = {
  preset: "royal-gold",
  primaryHsl: "46 65% 52%",
  secondaryHsl: "222 25% 14%",
  accentHsl: "46 65% 52%",
  primaryDarkHsl: "46 65% 52%",
  fontFamily: "'Playfair Display', serif",
  layout: "centered",
  radius: "0rem",
  showBackToTop: true,
  showLiveChat: true,
  footerNewsletter: true,
  navTransparent: true,
  taglineSize: "0.625rem",
  navTextSize: "0.75rem",
};

const TAGLINE_SIZES = [
  { label: "Rất nhỏ",  value: "0.5rem",   sample: "★★★★★ · 5 SAO" },
  { label: "Nhỏ",      value: "0.625rem",  sample: "★★★★★ · 5 SAO" },
  { label: "Vừa",      value: "0.75rem",   sample: "★★★★★ · 5 SAO" },
  { label: "Lớn",      value: "0.875rem",  sample: "★★★★★ · 5 SAO" },
  { label: "Rất lớn",  value: "1rem",      sample: "★★★★★ · 5 SAO" },
];

const NAV_TEXT_SIZES = [
  { label: "Nhỏ",      value: "0.625rem",  sample: "PHÒNG & SUITE" },
  { label: "Vừa",      value: "0.75rem",   sample: "PHÒNG & SUITE" },
  { label: "Lớn",      value: "0.8125rem", sample: "PHÒNG & SUITE" },
  { label: "Rất lớn",  value: "0.875rem",  sample: "PHÒNG & SUITE" },
];

// HSL "h s% l%" → CSS color string
const hsl = (s: string, alpha = 1) => `hsl(${s} / ${alpha})`;

function ThemeContent() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Load from server
  useEffect(() => {
    fetch(`${API}/api/settings/theme`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setSettings({ ...DEFAULT, ...data });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Live preview as you change settings — apply CSS vars immediately
  useEffect(() => {
    if (loading) return;
    applyTheme(settings);
  }, [settings, loading]);

  const set = <K extends keyof ThemeSettings>(k: K, v: ThemeSettings[K]) => {
    setSettings((s) => ({ ...s, [k]: v }));
    setDirty(true);
  };

  const usePreset = (p: typeof DELUXE_PRESETS[number]) => {
    setSettings((s) => ({
      ...s,
      preset: p.id,
      primaryHsl: p.primaryHsl,
      secondaryHsl: p.secondaryHsl,
      accentHsl: p.accentHsl,
      primaryDarkHsl: p.primaryDarkHsl,
    }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/settings/theme`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const saved = await res.json();
      setSettings({ ...DEFAULT, ...saved });
      try { localStorage.setItem(STORAGE_CACHE, JSON.stringify(saved)); } catch {}
      setSavedAt(new Date().toLocaleTimeString("vi-VN"));
      setDirty(false);
      toast({ title: "Đã lưu giao diện", description: "Áp dụng cho mọi khách truy cập website." });
    } catch (e: any) {
      toast({ title: "Lưu thất bại", description: e?.message ?? "Lỗi không xác định", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const reset = () => {
    setSettings(DEFAULT);
    setDirty(true);
    toast({ title: "Đã khôi phục mặc định", description: "Nhớ nhấn Lưu để xác nhận." });
  };

  const currentPreset = useMemo(
    () => DELUXE_PRESETS.find((p) => p.id === settings.preset) ?? DELUXE_PRESETS[0],
    [settings.preset],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_22rem] gap-6">
      {/* LEFT — controls */}
      <div className="space-y-6">

        {/* Color Mode */}
        <Section icon={<Sun size={15} />} title="Chế độ màu">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Sáng", value: "light", icon: <Sun size={18} /> },
              { label: "Tối", value: "dark", icon: <Moon size={18} /> },
              { label: "Theo hệ thống", value: "system", icon: <Monitor size={18} /> },
            ].map(({ label, value, icon }) => (
              <button key={value} onClick={() => setTheme(value)}
                className={`group relative flex flex-col items-center gap-2 py-5 border transition-all ${
                  theme === value
                    ? "border-primary bg-primary/10 text-primary shadow-[0_0_0_1px_hsl(var(--primary))]"
                    : "border-primary/20 text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}>
                {icon}
                <span className="text-xs tracking-[0.2em] uppercase">{label}</span>
                {theme === value && <Check size={12} className="absolute top-2 right-2 text-primary" />}
              </button>
            ))}
          </div>
        </Section>

        {/* Deluxe Palettes */}
        <Section
          icon={<Crown size={15} />}
          title="Bảng màu Deluxe"
          right={<span className="text-[10px] tracking-widest uppercase text-muted-foreground">Chọn 1 chạm</span>}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DELUXE_PRESETS.map((p) => {
              const active = settings.preset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => usePreset(p)}
                  className={`group relative text-left border overflow-hidden transition-all ${
                    active
                      ? "border-primary shadow-[0_0_0_1px_hsl(var(--primary))]"
                      : "border-primary/15 hover:border-primary/40"
                  }`}
                >
                  {/* Color band preview */}
                  <div className="flex h-14">
                    <div className="flex-1" style={{ background: hsl(p.secondaryHsl) }} />
                    <div className="w-1/3" style={{ background: `linear-gradient(135deg, ${hsl(p.primaryHsl)} 0%, ${hsl(p.accentHsl)} 100%)` }} />
                    <div className="w-8" style={{ background: hsl(p.primaryHsl, 0.85) }} />
                  </div>
                  <div className="px-4 py-3 bg-card flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-serif text-base text-foreground">{p.name}</span>
                        {p.isDefault && <Sparkles size={11} className="text-primary" />}
                      </div>
                      <div className="text-[11px] text-muted-foreground tracking-wide mt-0.5">{p.tagline}</div>
                    </div>
                    {active && (
                      <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground">
                        <Check size={12} />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </Section>

        {/* Custom Primary */}
        <Section icon={<Palette size={15} />} title="Tùy chỉnh màu chủ đạo">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2">Màu Primary (Accent)</label>
              <ColorPicker
                hsl={settings.primaryHsl}
                onChange={(v) => { set("primaryHsl", v); set("accentHsl", v); set("preset", "custom"); }}
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-2">Màu Secondary (Băng nền sang)</label>
              <ColorPicker hsl={settings.secondaryHsl} onChange={(v) => { set("secondaryHsl", v); set("preset", "custom"); }} />
            </div>
          </div>
        </Section>

        {/* Font */}
        <Section icon={<Type size={15} />} title="Font tiêu đề">
          <div className="grid grid-cols-2 gap-3">
            {FONT_OPTIONS.map(({ name, value, label, sample }) => {
              const active = settings.fontFamily === value;
              return (
                <button key={name} onClick={() => set("fontFamily", value)}
                  className={`relative text-left px-4 py-4 border transition-all ${
                    active ? "border-primary bg-primary/10" : "border-primary/20 hover:border-primary/50"
                  }`}>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl text-primary leading-none" style={{ fontFamily: value }}>{sample}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-base text-foreground" style={{ fontFamily: value }}>{name}</div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
                    </div>
                  </div>
                  {active && <Check size={12} className="absolute top-2 right-2 text-primary" />}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Tagline & Nav Text Sizes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Section icon={<Type size={15} />} title="Kích thước Tagline">
            <div className="space-y-2">
              {TAGLINE_SIZES.map(({ label, value, sample }) => {
                const active = settings.taglineSize === value;
                return (
                  <button key={value} onClick={() => set("taglineSize", value)}
                    className={`w-full px-4 py-3 border text-left transition-all flex items-center justify-between gap-3 ${
                      active ? "border-primary bg-primary/10" : "border-primary/20 hover:border-primary/50"
                    }`}>
                    <div>
                      <div className="text-sm text-foreground">{label}</div>
                      <div className="text-muted-foreground tracking-widest uppercase mt-0.5" style={{ fontSize: value }}>{sample}</div>
                    </div>
                    {active && <Check size={14} className="text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section icon={<Type size={15} />} title="Kích thước chữ Menu Nav">
            <div className="space-y-2">
              {NAV_TEXT_SIZES.map(({ label, value, sample }) => {
                const active = settings.navTextSize === value;
                return (
                  <button key={value} onClick={() => set("navTextSize", value)}
                    className={`w-full px-4 py-3 border text-left transition-all flex items-center justify-between gap-3 ${
                      active ? "border-primary bg-primary/10" : "border-primary/20 hover:border-primary/50"
                    }`}>
                    <div>
                      <div className="text-sm text-foreground">{label}</div>
                      <div className="text-muted-foreground tracking-[0.2em] uppercase font-medium mt-0.5" style={{ fontSize: value }}>{sample}</div>
                    </div>
                    {active && <Check size={14} className="text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </Section>
        </div>

        {/* Layout + Radius */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Section icon={<Layout size={15} />} title="Bố cục">
            <div className="space-y-2">
              {LAYOUT_OPTIONS.map(({ label, desc, value }) => {
                const active = settings.layout === value;
                return (
                  <button key={value} onClick={() => set("layout", value)}
                    className={`w-full px-4 py-3 border text-left transition-all flex items-center justify-between ${
                      active ? "border-primary bg-primary/10" : "border-primary/20 hover:border-primary/50"
                    }`}>
                    <div>
                      <div className="text-sm text-foreground">{label}</div>
                      <div className="text-[10px] text-muted-foreground">{desc}</div>
                    </div>
                    {active && <Check size={14} className="text-primary" />}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section icon={<Sparkles size={15} />} title="Bo góc">
            <div className="space-y-2">
              {RADIUS_OPTIONS.map(({ label, value }) => {
                const active = settings.radius === value;
                return (
                  <button key={value} onClick={() => set("radius", value)}
                    className={`w-full px-4 py-3 border text-left transition-all flex items-center justify-between ${
                      active ? "border-primary bg-primary/10" : "border-primary/20 hover:border-primary/50"
                    }`}>
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-primary/30 border border-primary" style={{ borderRadius: value }} />
                      <span className="text-sm text-foreground">{label}</span>
                    </div>
                    {active && <Check size={14} className="text-primary" />}
                  </button>
                );
              })}
            </div>
          </Section>
        </div>

        {/* Toggles */}
        <Section icon={<Check size={15} />} title="Tính năng giao diện">
          <div className="divide-y divide-primary/10">
            {[
              { key: "showBackToTop", label: "Nút Lên đầu trang", desc: "Hiện nút mũi tên ở góc khi cuộn" },
              { key: "showLiveChat", label: "Live Chat", desc: "Khung chat trợ giúp ở góc phải" },
              { key: "footerNewsletter", label: "Đăng ký Newsletter", desc: "Form email ở footer" },
              { key: "navTransparent", label: "Navbar trong suốt", desc: "Trên trang chủ" },
            ].map(({ key, label, desc }) => (
              <label key={key} className="flex items-center justify-between py-3 cursor-pointer">
                <div>
                  <div className="text-sm text-foreground">{label}</div>
                  <div className="text-[11px] text-muted-foreground">{desc}</div>
                </div>
                <input type="checkbox" className="accent-primary w-4 h-4 cursor-pointer"
                  checked={Boolean(settings[key as keyof ThemeSettings])}
                  onChange={(e) => set(key as any, e.target.checked)} />
              </label>
            ))}
          </div>
        </Section>

        {/* Action bar */}
        <div className="sticky bottom-4 z-10 flex items-center gap-3 p-3 bg-card border border-primary/40 shadow-lg">
          <Button onClick={save} disabled={saving || !dirty}
            className="rounded-none bg-primary text-primary-foreground uppercase tracking-widest text-xs px-6 h-10 disabled:opacity-50">
            {saving ? <><Loader2 size={14} className="mr-2 animate-spin" /> Đang lưu…</> :
              dirty ? "Lưu thay đổi" : <><Check size={14} className="mr-2" /> Đã lưu</>}
          </Button>
          <button onClick={reset}
            className="inline-flex items-center gap-1.5 px-4 h-10 text-xs uppercase tracking-widest border border-primary/30 text-foreground hover:bg-primary/5">
            <RotateCcw size={13} /> Mặc định
          </button>
          <div className="ml-auto text-[11px] text-muted-foreground">
            {dirty ? <span className="text-amber-600 dark:text-amber-400">● Có thay đổi chưa lưu</span> :
              savedAt ? <>Đã lưu lúc {savedAt}</> : <>Đồng bộ với server</>}
          </div>
        </div>
      </div>

      {/* RIGHT — live preview */}
      <div className="lg:sticky lg:top-4 lg:self-start space-y-3">
        <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Xem trước trực tiếp</div>
        <PreviewCard preset={currentPreset} settings={settings} />
        <div className="text-[11px] text-muted-foreground italic px-1">
          Mọi thay đổi áp dụng tức thời cho admin. Nhấn <strong className="text-foreground not-italic">Lưu</strong> để áp dụng cho khách truy cập website.
        </div>
      </div>
    </div>
  );
}

function Section({
  icon, title, children, right,
}: {
  icon: React.ReactNode; title: string; children: React.ReactNode; right?: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-primary/20">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-primary/15 bg-primary/5">
        <span className="text-primary">{icon}</span>
        <span className="text-[11px] tracking-[0.3em] uppercase text-primary font-serif">{title}</span>
        {right && <div className="ml-auto">{right}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/** HSL string ↔ hex picker. Stores values in CSS-var format "h s% l%". */
function ColorPicker({ hsl: value, onChange }: { hsl: string; onChange: (hsl: string) => void }) {
  const hex = useMemo(() => hslStringToHex(value), [value]);
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(hexToHslString(e.target.value))}
          className="absolute inset-0 opacity-0 cursor-pointer"
          aria-label="Chọn màu"
        />
        <div
          className="w-14 h-14 border-2 border-primary/40 shadow-inner"
          style={{ background: `hsl(${value})` }}
        />
      </div>
      <div className="flex-1">
        <div className="text-sm text-foreground font-mono">hsl({value})</div>
        <div className="text-[10px] text-muted-foreground">{hex.toUpperCase()}</div>
      </div>
    </div>
  );
}

function PreviewCard({
  preset, settings,
}: {
  preset: typeof DELUXE_PRESETS[number];
  settings: ThemeSettings;
}) {
  return (
    <div className="border border-primary/30 bg-card overflow-hidden" style={{ fontFamily: settings.fontFamily }}>
      {/* Hero band */}
      <div
        className="relative h-32 px-5 py-4 flex flex-col justify-end"
        style={{
          background: `linear-gradient(135deg, ${hsl(preset.secondaryHsl)} 0%, ${hsl(preset.secondaryHsl, 0.85)} 100%)`,
        }}
      >
        <div className="absolute top-3 right-3 flex gap-1">
          <span className="w-2 h-2" style={{ background: hsl(preset.primaryHsl) }} />
          <span className="w-2 h-2" style={{ background: hsl(preset.accentHsl) }} />
          <span className="w-2 h-2" style={{ background: hsl(preset.primaryHsl, 0.5) }} />
        </div>
        <div className="text-[9px] tracking-[0.4em] uppercase mb-1" style={{ color: hsl(preset.primaryHsl) }}>
          GRAND PALACE
        </div>
        <div className="text-xl font-serif" style={{ color: hsl(preset.primaryHsl) }}>
          {preset.name}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {/* Sample button */}
        <div className="flex items-center gap-2">
          <button
            className="px-4 py-2 text-xs uppercase tracking-widest font-medium"
            style={{ background: hsl(settings.primaryHsl), color: "#000", borderRadius: settings.radius }}
          >
            Đặt phòng
          </button>
          <button
            className="px-4 py-2 text-xs uppercase tracking-widest border"
            style={{ borderColor: hsl(settings.primaryHsl), color: hsl(settings.primaryHsl), borderRadius: settings.radius }}
          >
            Khám phá
          </button>
        </div>

        {/* Sample badge row */}
        <div className="flex flex-wrap gap-1.5">
          {["5 sao", "Spa", "View hồ", "Concierge"].map((t) => (
            <span key={t} className="text-[10px] tracking-widest uppercase px-2 py-0.5 border"
              style={{ color: hsl(settings.primaryHsl), borderColor: hsl(settings.primaryHsl, 0.4), background: hsl(settings.primaryHsl, 0.08) }}>
              {t}
            </span>
          ))}
        </div>

        {/* Sample heading + body */}
        <div>
          <div className="text-base text-foreground" style={{ fontFamily: settings.fontFamily }}>
            Phòng Suite Tổng thống
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Trải nghiệm đỉnh cao của sự xa hoa với view 360° và dịch vụ butler riêng.
          </div>
        </div>

        {/* Sample divider */}
        <div className="h-px" style={{ background: `linear-gradient(90deg, transparent, ${hsl(settings.primaryHsl)}, transparent)` }} />

        {/* Pricing line */}
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Từ</span>
          <span className="text-lg" style={{ color: hsl(settings.primaryHsl), fontFamily: settings.fontFamily }}>
            12.000.000 ₫
          </span>
        </div>
      </div>
    </div>
  );
}

// --- color helpers ---
function hslStringToHex(hslStr: string): string {
  // Parse "h s% l%" or "h, s%, l%"
  const m = hslStr.match(/(-?\d+(?:\.\d+)?)\s*,?\s*(\d+(?:\.\d+)?)%?\s*,?\s*(\d+(?:\.\d+)?)%?/);
  if (!m) return "#d4af37";
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHslString(hex: string): string {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m) return "46 65% 52%";
  const [r, g, b] = m.map((c) => parseInt(c, 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export default function AdminTheme() {
  return (
    <AdminGuard>
      <AdminLayout title="Giao diện & Bảng màu" subtitle="Tùy chỉnh thương hiệu — lưu trên server, áp dụng cho mọi khách">
        <ThemeContent />
      </AdminLayout>
    </AdminGuard>
  );
}
