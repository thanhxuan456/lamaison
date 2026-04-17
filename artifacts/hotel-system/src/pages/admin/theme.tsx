import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Palette, Type, Layout, Check, Sun, Moon, Monitor } from "lucide-react";

const STORAGE_KEY = "grand-palace-theme-settings";

const COLOR_PRESETS = [
  { name: "Royal Gold", primary: "hsl(46,65%,52%)", label: "Default" },
  { name: "Imperial Blue", primary: "hsl(220,70%,50%)", label: "Blue" },
  { name: "Emerald Palace", primary: "hsl(155,60%,40%)", label: "Green" },
  { name: "Ruby Rouge", primary: "hsl(0,70%,50%)", label: "Red" },
  { name: "Amethyst", primary: "hsl(270,60%,55%)", label: "Purple" },
  { name: "Copper Rose", primary: "hsl(20,65%,50%)", label: "Copper" },
];

const FONT_OPTIONS = [
  { name: "Playfair Display", value: "'Playfair Display', serif", label: "Classic Serif" },
  { name: "Cormorant Garamond", value: "'Cormorant Garamond', serif", label: "Elegant Serif" },
  { name: "Libre Baskerville", value: "'Libre Baskerville', serif", label: "Book Serif" },
  { name: "Lora", value: "'Lora', serif", label: "Modern Serif" },
];

const LAYOUT_OPTIONS = [
  { label: "Centered (max-w-7xl)", value: "centered" },
  { label: "Wide (full-width)", value: "wide" },
  { label: "Compact (max-w-5xl)", value: "compact" },
];

const defaultSettings = {
  primaryColor: "hsl(46,65%,52%)",
  fontFamily: "'Playfair Display', serif",
  layout: "centered",
  showBackToTop: true,
  showLiveChat: true,
  footerNewsletter: true,
  navTransparent: true,
};

export default function AdminTheme() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState(defaultSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSettings({ ...defaultSettings, ...JSON.parse(stored) });
    } catch {}
  }, []);

  const apply = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    // Apply CSS custom property
    document.documentElement.style.setProperty("--color-primary-override", settings.primaryColor);
    setSaved(true);
    toast({ title: "Theme settings saved", description: "Changes will apply on next page load for full effect." });
    setTimeout(() => setSaved(false), 2000);
  };

  const set = (k: keyof typeof defaultSettings, v: any) => setSettings((s) => ({ ...s, [k]: v }));

  return (
    <AdminGuard>
      <AdminLayout title="Theme & Appearance" subtitle="Customize colors, fonts, and layout">
        <div className="max-w-3xl space-y-8">

          {/* Mode */}
          <Section icon={<Sun size={15} />} title="Color Mode">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Light", value: "light", icon: <Sun size={16} /> },
                { label: "Dark", value: "dark", icon: <Moon size={16} /> },
                { label: "System", value: "system", icon: <Monitor size={16} /> },
              ].map(({ label, value, icon }) => (
                <button key={value} onClick={() => setTheme(value)}
                  className={`flex flex-col items-center gap-2 py-4 border transition-all ${
                    theme === value ? "border-primary bg-primary/10 text-primary" : "border-primary/20 text-muted-foreground hover:border-primary/50"
                  }`}>
                  {icon}
                  <span className="text-xs tracking-wide">{label}</span>
                  {theme === value && <Check size={12} className="text-primary" />}
                </button>
              ))}
            </div>
          </Section>

          {/* Primary Color */}
          <Section icon={<Palette size={15} />} title="Primary Color (Accent)">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {COLOR_PRESETS.map(({ name, primary, label }) => (
                <button key={name} onClick={() => set("primaryColor", primary)}
                  className={`relative flex flex-col items-center gap-2 py-3 border transition-all ${
                    settings.primaryColor === primary ? "border-current" : "border-primary/20 hover:border-primary/50"
                  }`} style={{ color: primary }}>
                  <div className="w-8 h-8 rounded-full border-2 border-current" style={{ backgroundColor: primary }} />
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                  {settings.primaryColor === primary && (
                    <span className="absolute top-1 right-1"><Check size={10} /></span>
                  )}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <label className="text-xs text-muted-foreground">Custom:</label>
              <input type="color" className="h-8 w-16 border border-primary/25 cursor-pointer bg-background"
                value={settings.primaryColor.startsWith("#") ? settings.primaryColor : "#b8973e"}
                onChange={(e) => set("primaryColor", e.target.value)} />
              <span className="text-xs text-muted-foreground">{settings.primaryColor}</span>
            </div>
          </Section>

          {/* Font */}
          <Section icon={<Type size={15} />} title="Heading Font">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FONT_OPTIONS.map(({ name, value, label }) => (
                <button key={name} onClick={() => set("fontFamily", value)}
                  className={`text-left px-4 py-3 border transition-all ${
                    settings.fontFamily === value ? "border-primary bg-primary/10" : "border-primary/20 hover:border-primary/50"
                  }`}>
                  <div className="text-lg mb-0.5" style={{ fontFamily: value }}>{name}</div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
                </button>
              ))}
            </div>
          </Section>

          {/* Layout */}
          <Section icon={<Layout size={15} />} title="Layout Width">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {LAYOUT_OPTIONS.map(({ label, value }) => (
                <button key={value} onClick={() => set("layout", value)}
                  className={`px-4 py-3 border text-sm text-left transition-all ${
                    settings.layout === value ? "border-primary bg-primary/10 text-primary" : "border-primary/20 text-muted-foreground hover:border-primary/50"
                  }`}>
                  {label}
                  {settings.layout === value && <Check size={12} className="float-right mt-0.5" />}
                </button>
              ))}
            </div>
          </Section>

          {/* Toggles */}
          <Section icon={<Check size={15} />} title="Feature Toggles">
            <div className="space-y-3">
              {[
                { key: "showBackToTop", label: "Show Back-to-Top Button" },
                { key: "showLiveChat", label: "Show Live Chat Widget" },
                { key: "footerNewsletter", label: "Footer Newsletter Signup" },
                { key: "navTransparent", label: "Transparent Navbar on Homepage" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center justify-between py-2 border-b border-primary/10 cursor-pointer">
                  <span className="text-sm text-foreground">{label}</span>
                  <input type="checkbox" className="accent-primary w-4 h-4"
                    checked={Boolean(settings[key as keyof typeof defaultSettings])}
                    onChange={(e) => set(key as any, e.target.checked)} />
                </label>
              ))}
            </div>
          </Section>

          <Button onClick={apply} className="rounded-none bg-primary text-primary-foreground uppercase tracking-widest text-xs px-8 h-11">
            {saved ? <><Check size={14} className="mr-2" /> Saved!</> : "Apply Theme Settings"}
          </Button>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-primary/20">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-primary/15 bg-primary/5">
        <span className="text-primary">{icon}</span>
        <span className="text-[11px] tracking-[0.3em] uppercase text-primary font-serif">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
