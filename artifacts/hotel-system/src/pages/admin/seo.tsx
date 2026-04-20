import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Search, Save, RotateCcw, Globe, Share2, FileCode2,
  BarChart2, ChevronDown, ChevronUp, CheckCircle2, ExternalLink,
  Tag, Rss,
} from "lucide-react";

const SEO_KEY = "grand-palace-seo-settings";

interface SeoSettings {
  titleTemplate: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultKeywords: string;
  faviconUrl: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogType: string;
  twitterCard: string;
  twitterSite: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  sitemapEnabled: boolean;
  googleVerification: string;
  bingVerification: string;
  gaId: string;
  gtmId: string;
  fbPixelId: string;
  canonicalBase: string;
  schemaOrgName: string;
  schemaOrgUrl: string;
  schemaOrgLogo: string;
  schemaOrgPhone: string;
  schemaOrgEmail: string;
  schemaOrgAddress: string;
}

const DEFAULT_SEO: SeoSettings = {
  titleTemplate: "%s | MAISON DELUXE Hotels & Resorts",
  defaultTitle: "MAISON DELUXE Hotels & Resorts — Chuỗi khách sạn 5 sao sang trọng",
  defaultDescription: "Tận hưởng không gian thanh lịch, dịch vụ tinh tế và sự riêng tư tuyệt đối tại chuỗi khách sạn 5 sao MAISON DELUXE — Hà Nội, Đà Nẵng, Hồ Chí Minh.",
  defaultKeywords: "maison deluxe, khách sạn 5 sao, luxury hotel, hà nội, đà nẵng, hồ chí minh, đặt phòng khách sạn",
  faviconUrl: "/favicon.ico",
  ogTitle: "MAISON DELUXE Hotels & Resorts",
  ogDescription: "Trải nghiệm hoàng gia tại 3 điểm đến sang trọng bậc nhất Việt Nam.",
  ogImage: "https://maisondeluxe.vn/images/og-image.jpg",
  ogType: "website",
  twitterCard: "summary_large_image",
  twitterSite: "@maisondeluxe_vn",
  robotsIndex: true,
  robotsFollow: true,
  sitemapEnabled: true,
  googleVerification: "",
  bingVerification: "",
  gaId: "",
  gtmId: "",
  fbPixelId: "",
  canonicalBase: "https://maisondeluxe.vn",
  schemaOrgName: "MAISON DELUXE Hotels & Resorts",
  schemaOrgUrl: "https://maisondeluxe.vn",
  schemaOrgLogo: "https://maisondeluxe.vn/logo.svg",
  schemaOrgPhone: "+84 900 000 000",
  schemaOrgEmail: "info@maisondeluxe.vn",
  schemaOrgAddress: "15 Phố Tràng Tiền, Hoàn Kiếm, Hà Nội",
};

function load(): SeoSettings {
  try { const s = localStorage.getItem(SEO_KEY); return s ? { ...DEFAULT_SEO, ...JSON.parse(s) } : DEFAULT_SEO; } catch { return DEFAULT_SEO; }
}

function Section({ icon: Icon, title, open, onToggle, children }: { icon: any; title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-primary/20 overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4 border-b border-primary/15 bg-primary/5 hover:bg-primary/10 transition-colors">
        <div className="flex items-center gap-2">
          <Icon size={13} className="text-primary" />
          <span className="text-[11px] tracking-[0.3em] uppercase text-primary font-serif">{title}</span>
        </div>
        {open ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>
      {open && <div className="p-5 space-y-4">{children}</div>}
    </div>
  );
}

function Field({ label, hint, span2, children }: { label: string; hint?: string; span2?: boolean; children: React.ReactNode }) {
  return (
    <div className={span2 ? "col-span-2" : ""}>
      <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground/60 mt-1">{hint}</p>}
    </div>
  );
}

function Inp({ value, onChange, placeholder, mono, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean; type?: string }) {
  return (
    <input type={type}
      className={`w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none ${mono ? "font-mono text-xs" : ""}`}
      value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <textarea rows={rows}
      className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none resize-none"
      value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  );
}

function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="text-sm text-foreground">{label}</div>
        {desc && <div className="text-[10px] text-muted-foreground mt-0.5">{desc}</div>}
      </div>
      <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
        <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div className="w-10 h-5 bg-muted peer-checked:bg-primary rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:w-4 after:h-4 after:rounded-full after:transition-all peer-checked:after:translate-x-5" />
      </label>
    </div>
  );
}

export default function AdminSeo() {
  const { toast } = useToast();
  const [s, setS] = useState<SeoSettings>(() => load());
  const set = (k: keyof SeoSettings, v: any) => setS((x) => ({ ...x, [k]: v }));
  const [open, setOpen] = useState({ meta: true, og: false, robots: false, schema: false, analytics: false });
  const toggle = (k: keyof typeof open) => setOpen((x) => ({ ...x, [k]: !x[k] }));

  const handleSave = () => {
    localStorage.setItem(SEO_KEY, JSON.stringify(s));
    document.title = s.defaultTitle;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", s.defaultDescription);
    toast({ title: "Cài đặt SEO đã lưu", description: "Meta tags được cập nhật ngay lập tức." });
  };

  const handleReset = () => {
    if (!confirm("Khôi phục tất cả cài đặt SEO về mặc định?")) return;
    setS(DEFAULT_SEO);
    localStorage.removeItem(SEO_KEY);
    toast({ title: "Đã khôi phục mặc định" });
  };

  const orgSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "name": s.schemaOrgName,
    "url": s.schemaOrgUrl,
    "logo": s.schemaOrgLogo,
    "telephone": s.schemaOrgPhone,
    "email": s.schemaOrgEmail,
    "address": { "@type": "PostalAddress", "streetAddress": s.schemaOrgAddress, "addressCountry": "VN" },
    "starRating": { "@type": "Rating", "ratingValue": "5" },
    "priceRange": "$$$$$",
  }, null, 2);

  const googlePreviewTitle = s.defaultTitle.length > 60 ? s.defaultTitle.slice(0, 57) + "..." : s.defaultTitle;
  const googlePreviewDesc = s.defaultDescription.length > 160 ? s.defaultDescription.slice(0, 157) + "..." : s.defaultDescription;

  return (
    <AdminGuard>
      <AdminLayout title="Quản lý SEO" subtitle="Meta tags, Open Graph, Structured Data, robots.txt và Analytics">
        <div className="max-w-3xl space-y-4">
          {/* Action bar */}
          <div className="flex items-center justify-between mb-2">
            <div className="border border-green-400/30 bg-green-50 dark:bg-green-950/30 px-4 py-2 flex items-center gap-2 text-xs text-green-700 dark:text-green-400">
              <CheckCircle2 size={13} />
              <span>Thay đổi được áp dụng ngay khi lưu</span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}
                className="rounded-none border-primary/30 text-muted-foreground text-xs uppercase tracking-widest h-8 px-3 gap-1.5">
                <RotateCcw size={11} /> Mặc định
              </Button>
              <Button size="sm" onClick={handleSave}
                className="rounded-none bg-primary text-primary-foreground text-xs uppercase tracking-widest h-8 px-4 gap-1.5">
                <Save size={11} /> Lưu SEO
              </Button>
            </div>
          </div>

          {/* META TAGS */}
          <Section icon={Tag} title="Meta Tags — Tiêu đề & Mô tả" open={open.meta} onToggle={() => toggle("meta")}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Template tiêu đề trang" span2 hint='Dùng %s để chèn tiêu đề trang. VD: "%s | MAISON DELUXE"'>
                <Inp value={s.titleTemplate} onChange={(v) => set("titleTemplate", v)} placeholder="%s | MAISON DELUXE Hotels & Resorts" />
              </Field>
              <Field label="Tiêu đề mặc định (trang chủ)" span2 hint={`${s.defaultTitle.length}/60 ký tự ${s.defaultTitle.length > 60 ? "— nên rút ngắn" : "— tốt"}`}>
                <Inp value={s.defaultTitle} onChange={(v) => set("defaultTitle", v)} />
              </Field>
              <Field label="Mô tả mặc định" span2 hint={`${s.defaultDescription.length}/160 ký tự ${s.defaultDescription.length > 160 ? "— nên rút ngắn" : "— tốt"}`}>
                <Textarea value={s.defaultDescription} onChange={(v) => set("defaultDescription", v)} rows={3} />
              </Field>
              <Field label="Keywords" span2 hint="Phân cách bằng dấu phẩy">
                <Textarea value={s.defaultKeywords} onChange={(v) => set("defaultKeywords", v)} rows={2} placeholder="maison deluxe, khách sạn 5 sao, luxury hotel..." />
              </Field>
              <Field label="URL Canonical gốc">
                <Inp value={s.canonicalBase} onChange={(v) => set("canonicalBase", v)} placeholder="https://maisondeluxe.vn" mono />
              </Field>
              <Field label="Favicon URL">
                <Inp value={s.faviconUrl} onChange={(v) => set("faviconUrl", v)} placeholder="/favicon.ico" mono />
              </Field>
            </div>

            {/* Google Preview */}
            <div className="border border-primary/15 p-4 bg-muted/20 mt-2">
              <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-3 flex items-center gap-1.5">
                <Search size={10} /> Xem trước Google Search
              </p>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-full bg-primary/20 shrink-0 overflow-hidden flex items-center justify-center">
                  <span className="text-[8px] font-bold text-primary">G</span>
                </div>
                <span className="text-[11px] text-muted-foreground">{s.canonicalBase || "https://maisondeluxe.vn"}</span>
              </div>
              <div className="text-[18px] text-blue-600 dark:text-blue-400 hover:underline cursor-pointer leading-snug">{googlePreviewTitle || "MAISON DELUXE Hotels & Resorts"}</div>
              <div className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{googlePreviewDesc}</div>
            </div>
          </Section>

          {/* OPEN GRAPH */}
          <Section icon={Share2} title="Open Graph & Social Media" open={open.og} onToggle={() => toggle("og")}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="OG Title" span2>
                <Inp value={s.ogTitle} onChange={(v) => set("ogTitle", v)} placeholder="MAISON DELUXE Hotels & Resorts" />
              </Field>
              <Field label="OG Description" span2>
                <Textarea value={s.ogDescription} onChange={(v) => set("ogDescription", v)} rows={2} />
              </Field>
              <Field label="OG Image URL" span2 hint="Kích thước khuyến nghị: 1200 × 630px">
                <div className="flex gap-2">
                  <Inp value={s.ogImage} onChange={(v) => set("ogImage", v)} placeholder="https://maisondeluxe.vn/images/og.jpg" mono />
                  {s.ogImage && (
                    <div className="w-16 h-10 border border-primary/20 shrink-0 overflow-hidden bg-muted/20">
                      <img src={s.ogImage} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} alt="" />
                    </div>
                  )}
                </div>
              </Field>
              <Field label="OG Type">
                <select className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
                  value={s.ogType} onChange={(e) => set("ogType", e.target.value)}>
                  {["website", "article", "business.business"].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Twitter Card">
                <select className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
                  value={s.twitterCard} onChange={(e) => set("twitterCard", e.target.value)}>
                  {["summary_large_image", "summary", "app", "player"].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Twitter @username">
                <Inp value={s.twitterSite} onChange={(v) => set("twitterSite", v)} placeholder="@maisondeluxe_vn" />
              </Field>
            </div>

            {/* OG Card preview */}
            <div className="border border-primary/15 overflow-hidden">
              <p className="text-[10px] tracking-widest uppercase text-muted-foreground px-4 py-2 bg-muted/20 flex items-center gap-1.5">
                <Share2 size={10} /> Xem trước khi chia sẻ Facebook / Zalo
              </p>
              {s.ogImage && (
                <div className="h-36 bg-muted overflow-hidden">
                  <img src={s.ogImage} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} alt="" />
                </div>
              )}
              <div className="px-4 py-3 border-t border-primary/15">
                <div className="text-[10px] uppercase text-muted-foreground">{(s.canonicalBase || "maisondeluxe.vn").replace("https://", "")}</div>
                <div className="font-medium text-sm text-foreground mt-0.5">{s.ogTitle}</div>
                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.ogDescription}</div>
              </div>
            </div>
          </Section>

          {/* ROBOTS & SITEMAP */}
          <Section icon={Rss} title="Robots.txt & Sitemap" open={open.robots} onToggle={() => toggle("robots")}>
            <div className="space-y-3">
              <Toggle checked={s.robotsIndex} onChange={(v) => set("robotsIndex", v)}
                label="Cho phép Search Engine index (index: follow)" desc="Tắt nếu muốn ẩn site khỏi Google" />
              <Toggle checked={s.robotsFollow} onChange={(v) => set("robotsFollow", v)}
                label="Cho phép crawler theo links (follow)" />
              <Toggle checked={s.sitemapEnabled} onChange={(v) => set("sitemapEnabled", v)}
                label="Kích hoạt Sitemap XML" desc="Tự động tạo sitemap.xml" />
            </div>
            <div className="border border-primary/15 bg-muted/20 p-4">
              <p className="text-[10px] tracking-widest uppercase text-muted-foreground mb-2 flex items-center gap-1">
                <FileCode2 size={10} /> Nội dung robots.txt
              </p>
              <pre className="text-xs font-mono text-foreground/70 whitespace-pre leading-relaxed">{`User-agent: *
${s.robotsIndex ? "Allow" : "Disallow"}: /
${s.sitemapEnabled ? `Sitemap: ${s.canonicalBase || "https://maisondeluxe.vn"}/sitemap.xml` : ""}`}
              </pre>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Google Search Console Verification">
                <Inp value={s.googleVerification} onChange={(v) => set("googleVerification", v)}
                  placeholder="google-site-verification=abc..." mono />
              </Field>
              <Field label="Bing Webmaster Verification">
                <Inp value={s.bingVerification} onChange={(v) => set("bingVerification", v)}
                  placeholder="MSVALIDATE.01=abc..." mono />
              </Field>
            </div>
            <div className="flex gap-2">
              <a href={`${s.canonicalBase}/sitemap.xml`} target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary flex items-center gap-1 hover:underline">
                <ExternalLink size={11} /> Xem sitemap.xml
              </a>
              <span className="text-muted-foreground">·</span>
              <a href={`${s.canonicalBase}/robots.txt`} target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary flex items-center gap-1 hover:underline">
                <ExternalLink size={11} /> Xem robots.txt
              </a>
            </div>
          </Section>

          {/* STRUCTURED DATA */}
          <Section icon={FileCode2} title="Structured Data — Schema.org" open={open.schema} onToggle={() => toggle("schema")}>
            <p className="text-xs text-muted-foreground">Dữ liệu có cấu trúc giúp Google hiển thị rich snippets (đánh giá sao, giá phòng, địa chỉ) trực tiếp trên trang tìm kiếm.</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Tên tổ chức">
                <Inp value={s.schemaOrgName} onChange={(v) => set("schemaOrgName", v)} placeholder="MAISON DELUXE Hotels & Resorts" />
              </Field>
              <Field label="URL website">
                <Inp value={s.schemaOrgUrl} onChange={(v) => set("schemaOrgUrl", v)} placeholder="https://maisondeluxe.vn" mono />
              </Field>
              <Field label="Logo URL">
                <Inp value={s.schemaOrgLogo} onChange={(v) => set("schemaOrgLogo", v)} placeholder="https://maisondeluxe.vn/logo.svg" mono />
              </Field>
              <Field label="Số điện thoại">
                <Inp value={s.schemaOrgPhone} onChange={(v) => set("schemaOrgPhone", v)} placeholder="+84 900 000 000" />
              </Field>
              <Field label="Email">
                <Inp value={s.schemaOrgEmail} onChange={(v) => set("schemaOrgEmail", v)} type="email" />
              </Field>
              <Field label="Địa chỉ chính">
                <Inp value={s.schemaOrgAddress} onChange={(v) => set("schemaOrgAddress", v)} placeholder="15 Phố Tràng Tiền, Hà Nội" />
              </Field>
            </div>
            <div className="border border-primary/15 bg-muted/10">
              <p className="text-[10px] tracking-widest uppercase text-muted-foreground px-4 py-2 border-b border-primary/10 flex items-center gap-1">
                <FileCode2 size={10} /> JSON-LD Preview (LodgingBusiness)
              </p>
              <pre className="text-xs font-mono text-foreground/60 p-4 overflow-x-auto max-h-52 whitespace-pre leading-relaxed">{orgSchema}</pre>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Kiểm tra tại{" "}
              <a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Google Rich Results Test
              </a>
            </p>
          </Section>

          {/* ANALYTICS */}
          <Section icon={BarChart2} title="Analytics & Tracking" open={open.analytics} onToggle={() => toggle("analytics")}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Google Analytics 4 (Measurement ID)" hint="Dạng G-XXXXXXXXXX">
                <Inp value={s.gaId} onChange={(v) => set("gaId", v)} placeholder="G-XXXXXXXXXX" mono />
              </Field>
              <Field label="Google Tag Manager (Container ID)" hint="Dạng GTM-XXXXXXX">
                <Inp value={s.gtmId} onChange={(v) => set("gtmId", v)} placeholder="GTM-XXXXXXX" mono />
              </Field>
              <Field label="Facebook Pixel ID" hint="Tìm trong Meta Business Suite">
                <Inp value={s.fbPixelId} onChange={(v) => set("fbPixelId", v)} placeholder="123456789012345" mono />
              </Field>
            </div>
            {(s.gaId || s.gtmId || s.fbPixelId) && (
              <div className="border border-green-400/30 bg-green-50 dark:bg-green-950/30 px-4 py-3 text-xs text-green-700 dark:text-green-400">
                <strong>Scripts được cấu hình:</strong>
                <ul className="mt-1 space-y-0.5 list-disc list-inside">
                  {s.gaId && <li>Google Analytics 4 — {s.gaId}</li>}
                  {s.gtmId && <li>Google Tag Manager — {s.gtmId}</li>}
                  {s.fbPixelId && <li>Facebook Pixel — {s.fbPixelId}</li>}
                </ul>
              </div>
            )}
          </Section>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSave}
              className="rounded-none bg-primary text-primary-foreground uppercase tracking-widest text-xs px-8 py-5 gap-2">
              <Save size={13} /> Lưu tất cả cài đặt SEO
            </Button>
          </div>
        </div>
      </AdminLayout>
    </AdminGuard>
  );
}
