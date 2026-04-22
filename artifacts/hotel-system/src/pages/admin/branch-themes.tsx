import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useListHotels } from "@workspace/api-client-react";
import { useAdminBranchSettings, useSaveBranchSettingsSection, type SectionKey } from "@/lib/use-branch-settings";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Palette, Phone, CreditCard, LayoutTemplate, Search, Sparkles, Share2,
  Save, Eye, Loader2, CheckCircle2, AlertCircle, Building2,
} from "lucide-react";

// Section nav config (giong sidebar bai dang WordPress)
const SECTIONS: { key: SectionKey; label: string; desc: string; icon: any; color: string }[] = [
  { key: "branding", label: "Thương hiệu",   desc: "Logo, màu sắc, font",       icon: Palette,        color: "text-amber-600" },
  { key: "contact",  label: "Liên hệ",        desc: "Hotline, email, địa chỉ",   icon: Phone,          color: "text-emerald-600" },
  { key: "payment",  label: "Thanh toán",     desc: "Momo, ngân hàng, QR",       icon: CreditCard,     color: "text-violet-600" },
  { key: "layout",   label: "Bố cục",         desc: "Template, hero style",      icon: LayoutTemplate, color: "text-sky-600" },
  { key: "seo",      label: "SEO",            desc: "Meta title, OG image",      icon: Search,         color: "text-rose-600" },
  { key: "features", label: "Tiện ích",       desc: "Bật/tắt module dịch vụ",    icon: Sparkles,       color: "text-cyan-600" },
  { key: "social",   label: "Mạng xã hội",    desc: "Facebook, Instagram...",    icon: Share2,         color: "text-pink-600" },
];

export default function AdminBranchThemes() {
  const { data: hotels = [] } = useListHotels();
  const [hotelId, setHotelId] = useState<number | null>(null);
  const [section, setSection] = useState<SectionKey>("branding");
  const { toast } = useToast();

  useEffect(() => {
    if (hotels.length > 0 && hotelId == null) setHotelId(hotels[0].id);
  }, [hotels, hotelId]);

  const { data: settings, isLoading } = useAdminBranchSettings(hotelId);
  const save = useSaveBranchSettingsSection(hotelId);

  const selectedHotel = hotels.find((h: any) => h.id === hotelId) ?? null;

  // Local draft cho section dang edit (khong save tu dong de tranh request lien tuc)
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [dirty, setDirty] = useState(false);

  // Reset draft khi doi hotel/section
  useEffect(() => {
    if (settings) setDraft({ ...(settings[section] ?? {}) });
    setDirty(false);
  }, [settings, section]);

  function update(field: string, value: any) {
    setDraft((d) => ({ ...d, [field]: value }));
    setDirty(true);
  }

  async function handleSave() {
    if (!hotelId) return;
    try {
      await save.mutateAsync({ section, data: draft });
      setDirty(false);
      toast({ title: "Đã lưu", description: `${SECTIONS.find((s) => s.key === section)?.label} đã được cập nhật.` });
    } catch (e: any) {
      toast({ title: "Lỗi lưu", description: e?.message ?? "Không lưu được", variant: "destructive" });
    }
  }

  const currentSection = SECTIONS.find((s) => s.key === section)!;

  return (
    <AdminLayout title="Thiết Lập Chi Nhánh" subtitle="Tùy biến thương hiệu, liên hệ, thanh toán và giao diện cho từng chi nhánh">
      {/* ─── Top bar: hotel selector + save bar (sticky like WP) ─── */}
      <Card className="rounded-none border-primary/20 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 border-b border-border/40">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-11 h-11 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 size={20} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Chi nhánh đang chỉnh</Label>
              <Select value={hotelId?.toString() ?? ""} onValueChange={(v) => setHotelId(Number(v))}>
                <SelectTrigger className="mt-1 h-9 text-sm border-primary/20"><SelectValue placeholder="Chọn chi nhánh" /></SelectTrigger>
                <SelectContent>
                  {hotels.map((h: any) => (
                    <SelectItem key={h.id} value={h.id.toString()}>{h.name} · {h.city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded ${
              dirty ? "bg-amber-50 text-amber-700 border border-amber-300" : "bg-emerald-50 text-emerald-700 border border-emerald-300"
            }`}>
              {dirty ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
              {dirty ? "Có thay đổi chưa lưu" : "Đã đồng bộ"}
            </span>
            {selectedHotel && (
              <a href={`/hotels/${selectedHotel.slug}`} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5"><Eye size={14} /> Xem trước</Button>
              </a>
            )}
            <Button onClick={handleSave} disabled={!dirty || save.isPending} size="sm" className="gap-1.5 min-w-[110px]">
              {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {save.isPending ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* ─── Left nav: section list ─── */}
        <Card className="rounded-none border-primary/20 h-fit lg:sticky lg:top-4">
          <div className="p-3 border-b border-border/40">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground px-2">Mục thiết lập</div>
          </div>
          <nav className="p-2 space-y-1">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = section === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => {
                    if (dirty && !confirm("Bạn có thay đổi chưa lưu. Chuyển mục khác sẽ mất. Tiếp tục?")) return;
                    setSection(s.key);
                  }}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded text-left transition-all ${
                    active ? "bg-primary/10 ring-1 ring-primary/40" : "hover:bg-muted/50"
                  }`}
                >
                  <Icon size={16} className={`mt-0.5 ${active ? "text-primary" : s.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${active ? "text-primary" : "text-foreground"}`}>{s.label}</div>
                    <div className="text-[11px] text-muted-foreground leading-snug">{s.desc}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </Card>

        {/* ─── Right: editor for current section ─── */}
        <Card className="rounded-none border-primary/20">
          <div className="p-5 border-b border-border/40 flex items-center gap-3">
            <currentSection.icon size={18} className={currentSection.color} />
            <div>
              <h2 className="font-serif text-lg text-foreground leading-tight">{currentSection.label}</h2>
              <p className="text-xs text-muted-foreground">{currentSection.desc}</p>
            </div>
          </div>

          <div className="p-5 space-y-5">
            {!hotelId ? (
              <p className="text-sm text-muted-foreground">Chọn chi nhánh để bắt đầu.</p>
            ) : isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Đang tải...</div>
            ) : (
              <SectionEditor section={section} draft={draft} update={update} />
            )}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}

// ============================================================
// Section editors — moi section co form rieng
// ============================================================
function SectionEditor({ section, draft, update }: { section: SectionKey; draft: Record<string, any>; update: (k: string, v: any) => void }) {
  if (section === "branding") return <BrandingForm draft={draft} update={update} />;
  if (section === "contact")  return <ContactForm draft={draft} update={update} />;
  if (section === "payment")  return <PaymentForm draft={draft} update={update} />;
  if (section === "layout")   return <LayoutForm draft={draft} update={update} />;
  if (section === "seo")      return <SeoForm draft={draft} update={update} />;
  if (section === "features") return <FeaturesForm draft={draft} update={update} />;
  if (section === "social")   return <SocialForm draft={draft} update={update} />;
  return null;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: any }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-widest text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground/80">{hint}</p>}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" value={value || "#d4a64e"} onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded border border-border cursor-pointer" />
        <Input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="#d4a64e" className="flex-1 font-mono text-xs" />
      </div>
    </Field>
  );
}

function ToggleField({ label, hint, value, onChange }: { label: string; hint?: string; value?: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded border border-border/50 bg-muted/20">
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </div>
      <Switch checked={!!value} onCheckedChange={onChange} />
    </div>
  );
}

function BrandingForm({ draft, update }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <Field label="Logo URL" hint="Link ảnh logo hiển thị ở header"><Input value={draft.logoUrl || ""} onChange={(e) => update("logoUrl", e.target.value)} placeholder="https://..." /></Field>
      <Field label="Favicon URL"><Input value={draft.faviconUrl || ""} onChange={(e) => update("faviconUrl", e.target.value)} placeholder="https://.../favicon.ico" /></Field>
      <ColorField label="Màu chính (Primary)"  value={draft.primaryColor} onChange={(v) => update("primaryColor", v)} />
      <ColorField label="Màu phụ (Accent)"     value={draft.accentColor}  onChange={(v) => update("accentColor", v)} />
      <Field label="Banner URL"><Input value={draft.bannerUrl || ""} onChange={(e) => update("bannerUrl", e.target.value)} placeholder="https://..." /></Field>
      <Field label="Tagline / Slogan"><Input value={draft.tagline || ""} onChange={(e) => update("tagline", e.target.value)} placeholder="Sang trọng. Đẳng cấp." /></Field>
      <Field label="Font tiêu đề" hint="CSS font-family vd 'Playfair Display', serif"><Input value={draft.fontHeading || ""} onChange={(e) => update("fontHeading", e.target.value)} /></Field>
      <Field label="Font nội dung"><Input value={draft.fontBody || ""} onChange={(e) => update("fontBody", e.target.value)} placeholder="Inter, sans-serif" /></Field>
    </div>
  );
}

function ContactForm({ draft, update }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <Field label="Hotline chính"><Input value={draft.hotline || ""} onChange={(e) => update("hotline", e.target.value)} placeholder="1900 xxxx" /></Field>
      <Field label="Hotline phụ"><Input value={draft.hotline2 || ""} onChange={(e) => update("hotline2", e.target.value)} placeholder="0901 xxx xxx" /></Field>
      <Field label="Email chung"><Input type="email" value={draft.email || ""} onChange={(e) => update("email", e.target.value)} placeholder="info@..." /></Field>
      <Field label="Email đặt phòng"><Input type="email" value={draft.emailBooking || ""} onChange={(e) => update("emailBooking", e.target.value)} placeholder="booking@..." /></Field>
      <div className="md:col-span-2"><Field label="Địa chỉ đầy đủ"><Textarea rows={2} value={draft.address || ""} onChange={(e) => update("address", e.target.value)} /></Field></div>
      <div className="md:col-span-2"><Field label="Google Maps Embed URL" hint="Vào maps.google.com → Chia sẻ → Nhúng bản đồ → copy src"><Input value={draft.mapUrl || ""} onChange={(e) => update("mapUrl", e.target.value)} placeholder="https://www.google.com/maps/embed?pb=..." /></Field></div>
      <Field label="Giờ hoạt động (ngắn)"><Input value={draft.hours || ""} onChange={(e) => update("hours", e.target.value)} placeholder="24/7" /></Field>
      <Field label="Giờ hoạt động chi tiết"><Input value={draft.hoursDetail || ""} onChange={(e) => update("hoursDetail", e.target.value)} placeholder="T2-CN: 06:00 - 23:00" /></Field>
    </div>
  );
}

function PaymentForm({ draft, update }: any) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ToggleField label="Tiền mặt" value={draft.acceptCash} onChange={(v) => update("acceptCash", v)} />
        <ToggleField label="Thẻ Visa/Master" value={draft.acceptCard} onChange={(v) => update("acceptCard", v)} />
        <ToggleField label="Momo" value={draft.acceptMomo} onChange={(v) => update("acceptMomo", v)} />
        <ToggleField label="Chuyển khoản ngân hàng" value={draft.acceptBank} onChange={(v) => update("acceptBank", v)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-border/40">
        <Field label="Số điện thoại Momo"><Input value={draft.momoPhone || ""} onChange={(e) => update("momoPhone", e.target.value)} placeholder="0901xxxxxx" /></Field>
        <Field label="Tên ngân hàng"><Input value={draft.bankName || ""} onChange={(e) => update("bankName", e.target.value)} placeholder="Vietcombank" /></Field>
        <Field label="Số tài khoản"><Input value={draft.bankAccount || ""} onChange={(e) => update("bankAccount", e.target.value)} placeholder="1234567890" /></Field>
        <Field label="Chủ tài khoản"><Input value={draft.bankHolder || ""} onChange={(e) => update("bankHolder", e.target.value)} placeholder="CT TNHH MAISON DELUXE" /></Field>
        <div className="md:col-span-2"><Field label="QR thanh toán URL" hint="Link ảnh QR code in sẵn"><Input value={draft.qrImageUrl || ""} onChange={(e) => update("qrImageUrl", e.target.value)} placeholder="https://..." /></Field></div>
      </div>
    </div>
  );
}

function LayoutForm({ draft, update }: any) {
  const templates = [
    { value: "classic",  label: "Cổ điển",   desc: "Trang trọng, đậm chất hoàng gia" },
    { value: "magazine", label: "Tạp chí",   desc: "Bố cục tạp chí, ảnh lớn nổi bật" },
    { value: "modern",   label: "Hiện đại",  desc: "Tối giản, gọn gàng, nhiều khoảng trắng" },
  ];
  return (
    <div className="space-y-5">
      <Field label="Template tổng">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {templates.map((t) => {
            const active = draft.template === t.value;
            return (
              <button key={t.value} onClick={() => update("template", t.value)}
                className={`text-left p-4 rounded border-2 transition-all ${active ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:border-primary/40"}`}>
                <div className="text-sm font-medium mb-1">{t.label}</div>
                <div className="text-[11px] text-muted-foreground">{t.desc}</div>
              </button>
            );
          })}
        </div>
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Hero style">
          <Select value={draft.heroStyle ?? "image"} onValueChange={(v) => update("heroStyle", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="image">Ảnh tĩnh</SelectItem>
              <SelectItem value="video">Video nền</SelectItem>
              <SelectItem value="carousel">Carousel nhiều ảnh</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Bo góc UI">
          <Select value={draft.cornerStyle ?? "rounded"} onValueChange={(v) => update("cornerStyle", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sharp">Sắc cạnh (luxury)</SelectItem>
              <SelectItem value="rounded">Bo nhẹ</SelectItem>
              <SelectItem value="soft">Bo mềm</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <ToggleField label="Hiện thanh đặt phòng nhanh" hint="Sticky bar dưới hero" value={draft.showBookingBar} onChange={(v) => update("showBookingBar", v)} />
    </div>
  );
}

function SeoForm({ draft, update }: any) {
  return (
    <div className="space-y-5">
      <Field label="Meta title" hint="Hiển thị trên Google. ~50-60 ký tự."><Input value={draft.title || ""} onChange={(e) => update("title", e.target.value)} maxLength={70} /></Field>
      <Field label="Meta description" hint="~150-160 ký tự."><Textarea rows={3} value={draft.description || ""} onChange={(e) => update("description", e.target.value)} maxLength={200} /></Field>
      <Field label="Keywords" hint="Cách nhau bằng dấu phẩy"><Input value={draft.keywords || ""} onChange={(e) => update("keywords", e.target.value)} placeholder="khách sạn 5 sao, hotel hà nội, ..." /></Field>
      <Field label="Open Graph image URL" hint="Ảnh hiển thị khi share lên FB/Zalo. 1200x630px."><Input value={draft.ogImage || ""} onChange={(e) => update("ogImage", e.target.value)} placeholder="https://..." /></Field>
    </div>
  );
}

function FeaturesForm({ draft, update }: any) {
  const features = [
    { key: "spa",        label: "Spa & Massage" },
    { key: "gym",        label: "Phòng Gym" },
    { key: "pool",       label: "Hồ bơi" },
    { key: "restaurant", label: "Nhà hàng" },
    { key: "bar",        label: "Bar / Lounge" },
    { key: "laundry",    label: "Giặt ủi" },
    { key: "shuttle",    label: "Đưa đón sân bay" },
    { key: "liveChat",   label: "Live chat tư vấn" },
  ];
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-4">Bật/tắt module dịch vụ. Khi tắt, FE sẽ ẩn khỏi menu và trang giới thiệu.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {features.map((f) => (
          <ToggleField key={f.key} label={f.label} value={draft[f.key]} onChange={(v) => update(f.key, v)} />
        ))}
      </div>
    </div>
  );
}

function SocialForm({ draft, update }: any) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <Field label="Facebook Page URL"><Input value={draft.facebook || ""} onChange={(e) => update("facebook", e.target.value)} placeholder="https://facebook.com/..." /></Field>
      <Field label="Instagram URL"><Input value={draft.instagram || ""} onChange={(e) => update("instagram", e.target.value)} placeholder="https://instagram.com/..." /></Field>
      <Field label="TikTok URL"><Input value={draft.tiktok || ""} onChange={(e) => update("tiktok", e.target.value)} placeholder="https://tiktok.com/@..." /></Field>
      <Field label="YouTube Channel"><Input value={draft.youtube || ""} onChange={(e) => update("youtube", e.target.value)} placeholder="https://youtube.com/..." /></Field>
      <Field label="Zalo OA / số Zalo"><Input value={draft.zalo || ""} onChange={(e) => update("zalo", e.target.value)} placeholder="https://zalo.me/..." /></Field>
    </div>
  );
}
