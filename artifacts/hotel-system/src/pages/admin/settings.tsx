import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard, Save, Settings, Globe, Link2,
  Eye, EyeOff, Building, RefreshCw, CheckCircle2,
  XCircle, Loader2, Wifi, WifiOff, Shield, QrCode, Copy, Download,
  Sparkles,
} from "lucide-react";
import { BrandingPanel } from "./branding-panel";

const PAYMENT_KEY = "grand-palace-payment-settings";
const GENERAL_KEY  = "grand-palace-general-settings";
const AFFILIATE_KEY = "grand-palace-affiliate-settings";
const OAUTH_KEY    = "grand-palace-oauth-settings";
const BANK_QR_KEY  = "grand-palace-bank-qr";

const VIET_BANKS = [
  { code: "VCB",   name: "Vietcombank",       fullName: "Ngân hàng TMCP Ngoại thương Việt Nam" },
  { code: "ICB",   name: "VietinBank",         fullName: "Ngân hàng TMCP Công thương Việt Nam" },
  { code: "BIDV",  name: "BIDV",               fullName: "Ngân hàng TMCP Đầu tư và Phát triển VN" },
  { code: "VBA",   name: "Agribank",           fullName: "Ngân hàng Nông nghiệp & PTNT Việt Nam" },
  { code: "MB",    name: "MBBank",             fullName: "Ngân hàng TMCP Quân đội" },
  { code: "TCB",   name: "Techcombank",        fullName: "Ngân hàng TMCP Kỹ Thương Việt Nam" },
  { code: "ACB",   name: "ACB",                fullName: "Ngân hàng TMCP Á Châu" },
  { code: "VPB",   name: "VPBank",             fullName: "Ngân hàng TMCP Việt Nam Thịnh Vượng" },
  { code: "STB",   name: "Sacombank",          fullName: "Ngân hàng TMCP Sài Gòn Thương Tín" },
  { code: "HDB",   name: "HDBank",             fullName: "Ngân hàng TMCP Phát triển TP.HCM" },
  { code: "TPB",   name: "TPBank",             fullName: "Ngân hàng TMCP Tiên Phong" },
  { code: "OCB",   name: "OCB",                fullName: "Ngân hàng TMCP Phương Đông" },
  { code: "VIB",   name: "VIB",                fullName: "Ngân hàng TMCP Quốc tế Việt Nam" },
  { code: "MSB",   name: "MSB",                fullName: "Ngân hàng TMCP Hàng Hải Việt Nam" },
  { code: "LPB",   name: "LienVietPostBank",   fullName: "Ngân hàng TMCP Bưu điện Liên Việt" },
  { code: "SHB",   name: "SHB",                fullName: "Ngân hàng TMCP Sài Gòn - Hà Nội" },
  { code: "SEAB",  name: "SeABank",            fullName: "Ngân hàng TMCP Đông Nam Á" },
  { code: "ABBANK",name: "ABBank",             fullName: "Ngân hàng TMCP An Bình" },
  { code: "NCB",   name: "NCB",                fullName: "Ngân hàng TMCP Quốc Dân" },
  { code: "NVB",   name: "NamABank",           fullName: "Ngân hàng TMCP Nam Á" },
  { code: "KLB",   name: "KienLongBank",       fullName: "Ngân hàng TMCP Kiên Long" },
  { code: "PVCB",  name: "PVcomBank",          fullName: "Ngân hàng TMCP Đại Chúng Việt Nam" },
  { code: "WOO",   name: "Woori",              fullName: "Ngân hàng Woori Việt Nam" },
  { code: "SHBVN", name: "Shinhan",            fullName: "Ngân hàng TNHH MTV Shinhan Việt Nam" },
  { code: "UOB",   name: "UOB",                fullName: "Ngân hàng United Overseas Bank" },
  { code: "HSBC",  name: "HSBC",               fullName: "Ngân hàng TNHH MTV HSBC Việt Nam" },
];

interface BankQRSettings {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  defaultAmount: string;
  defaultDescription: string;
}

const DEFAULT_BANK_QR: BankQRSettings = {
  bankCode: "VCB", accountNumber: "", accountName: "MAISON DELUXE HOTELS",
  defaultAmount: "", defaultDescription: "Dat phong MAISON DELUXE",
};

function loadBankQR(): BankQRSettings {
  try { const s = localStorage.getItem(BANK_QR_KEY); return s ? { ...DEFAULT_BANK_QR, ...JSON.parse(s) } : DEFAULT_BANK_QR; } catch { return DEFAULT_BANK_QR; }
}

const API = import.meta.env.VITE_API_URL ?? "";

interface PaymentMethod {
  id: string; name: string; description: string; enabled: boolean;
  apiKey: string; secretKey: string; webhookUrl: string; testMode: boolean; logo: string; color: string;
}
interface GeneralSettings {
  siteName: string; siteUrl: string; supportEmail: string; supportPhone: string;
  currency: string; timezone: string; bookingCancellation: string;
  checkInTime: string; checkOutTime: string; taxRate: string; serviceCharge: string;
  maintenanceMode: boolean; bookingEnabled: boolean; requirePhoneVerification: boolean;
}
interface AffiliateSettings {
  enabled: boolean; defaultCommission: number; cookieDuration: number;
  minPayout: number; payoutMethod: string; termsUrl: string; autoApprove: boolean; showBanner: boolean;
}
interface OAuthSettings {
  googleClientId: string; googleClientSecret: string; googleEnabled: boolean;
  facebookAppId: string; facebookAppSecret: string; facebookEnabled: boolean;
  appleTeamId: string; appleKeyId: string; applePrivateKey: string; appleEnabled: boolean;
}
interface OtaChannel {
  id: string; name: string; logo: string; enabled: boolean; propertyId: string;
  apiKey: string; apiSecret: string; rateplanId: string;
  syncInventory: boolean; syncRates: boolean; syncReservations: boolean;
  lastSync: string | null; testMode: boolean; webhookUrl: string;
}

const DEFAULT_PAYMENTS: PaymentMethod[] = [
  { id: "vnpay",  name: "VNPay",              description: "Cổng thanh toán trực tuyến phổ biến nhất Việt Nam", enabled: false, apiKey: "", secretKey: "", webhookUrl: "", testMode: true,  logo: "https://logo.clearbit.com/vnpay.vn", color: "#005BAA" },
  { id: "momo",   name: "MoMo",               description: "Ví điện tử MoMo — thanh toán nhanh qua QR",        enabled: false, apiKey: "", secretKey: "", webhookUrl: "", testMode: true,  logo: "https://logo.clearbit.com/momo.vn", color: "#AE2070" },
  { id: "zalopay",name: "ZaloPay",            description: "Ví điện tử ZaloPay tích hợp với Zalo",             enabled: false, apiKey: "", secretKey: "", webhookUrl: "", testMode: true,  logo: "https://logo.clearbit.com/zalopay.vn", color: "#0068FF" },
  { id: "stripe", name: "Stripe",             description: "Thanh toán quốc tế — Visa, Mastercard, AmEx",     enabled: false, apiKey: "", secretKey: "", webhookUrl: "", testMode: true,  logo: "https://cdn.simpleicons.org/stripe/635BFF", color: "#635BFF" },
  { id: "paypal", name: "PayPal",             description: "Thanh toán quốc tế an toàn qua PayPal",           enabled: false, apiKey: "", secretKey: "", webhookUrl: "", testMode: true,  logo: "https://cdn.simpleicons.org/paypal/003087", color: "#003087" },
  { id: "bank",   name: "Chuyển khoản ngân hàng", description: "Tạo mã QR VietQR để khách chuyển khoản trực tiếp", enabled: true, apiKey: "", secretKey: "", webhookUrl: "", testMode: false, logo: "https://vietqr.io/img/VIETQR.svg", color: "#2E7D32" },
];
const DEFAULT_GENERAL: GeneralSettings = {
  siteName: "MAISON DELUXE Hotels & Resorts", siteUrl: "https://maisondeluxe.vn",
  supportEmail: "support@maisondeluxe.vn", supportPhone: "+84 900 000 000",
  currency: "VND", timezone: "Asia/Ho_Chi_Minh", bookingCancellation: "24",
  checkInTime: "14:00", checkOutTime: "12:00", taxRate: "10", serviceCharge: "5",
  maintenanceMode: false, bookingEnabled: true, requirePhoneVerification: false,
};
const DEFAULT_AFFILIATE: AffiliateSettings = {
  enabled: false, defaultCommission: 5, cookieDuration: 30, minPayout: 500000,
  payoutMethod: "bank_transfer", termsUrl: "/affiliate-terms", autoApprove: false, showBanner: true,
};
const DEFAULT_OAUTH: OAuthSettings = {
  googleClientId: "", googleClientSecret: "", googleEnabled: true,
  facebookAppId: "", facebookAppSecret: "", facebookEnabled: false,
  appleTeamId: "", appleKeyId: "", applePrivateKey: "", appleEnabled: false,
};

function load<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}

/* ── Brand Logo Image with colored-initial fallback ── */
function LogoImg({ src, name, color, size = 40 }: { src: string; name: string; color: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = name.slice(0, 2).toUpperCase();
  if (failed || !src) {
    return (
      <div style={{ width: size, height: size, backgroundColor: color + "22", border: `1px solid ${color}44` }}
        className="flex items-center justify-center rounded-sm shrink-0">
        <span style={{ color, fontSize: size * 0.3, fontWeight: 700, lineHeight: 1 }}>{initials}</span>
      </div>
    );
  }
  return (
    <img src={src} alt={name} width={size} height={size}
      className="rounded-sm object-contain shrink-0 bg-white p-0.5"
      style={{ width: size, height: size, border: "1px solid #e5e7eb" }}
      onError={() => setFailed(true)} />
  );
}

/* ── Bank QR Section (inside bank payment expanded area) ── */
function BankQRSection({ toast }: { toast: ReturnType<typeof import("@/hooks/use-toast").useToast>["toast"] }) {
  const [qr, setQr] = useState<BankQRSettings>(() => loadBankQR());
  const [preview, setPreview] = useState({ amount: "", description: "" });
  const [saved, setSaved] = useState(false);
  const set = (k: keyof BankQRSettings, v: string) => setQr((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    fetch(`${API}/api/settings/payment-settings`)
      .then((r) => r.json())
      .then((d) => { if (d?.bank) setQr((prev) => ({ ...prev, ...d.bank })); })
      .catch(() => {});
  }, []);

  const bank = VIET_BANKS.find((b) => b.code === qr.bankCode) ?? VIET_BANKS[0];

  const buildQrUrl = (amount: string, desc: string) => {
    if (!qr.accountNumber) return null;
    const base = `https://img.vietqr.io/image/${qr.bankCode}-${qr.accountNumber}-compact2.png`;
    const params = new URLSearchParams();
    if (qr.accountName) params.set("accountName", qr.accountName);
    if (amount) params.set("amount", amount);
    if (desc) params.set("addInfo", desc);
    return `${base}?${params.toString()}`;
  };

  const qrUrl = buildQrUrl(preview.amount || qr.defaultAmount, preview.description || qr.defaultDescription);

  const handleSave = async () => {
    localStorage.setItem(BANK_QR_KEY, JSON.stringify(qr));
    try {
      const current = await fetch(`${API}/api/settings/payment-settings`).then((r) => r.json());
      await fetch(`${API}/api/settings/payment-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...current, bank: { ...qr, enabled: true } }),
      });
    } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast({ title: "Thông tin ngân hàng đã lưu", description: `${bank.name} · ${qr.accountNumber}` });
  };

  const copyText = (text: string) => { navigator.clipboard.writeText(text); toast({ title: "Đã sao chép" }); };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Ngân hàng *</label>
          <select className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
            value={qr.bankCode} onChange={(e) => set("bankCode", e.target.value)}>
            {VIET_BANKS.map((b) => (
              <option key={b.code} value={b.code}>{b.name} — {b.fullName}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Số tài khoản *</label>
          <input className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none font-mono tracking-widest"
            value={qr.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} placeholder="1234567890" />
        </div>
        <div>
          <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Tên chủ tài khoản (IN HOA)</label>
          <input className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none uppercase"
            value={qr.accountName} onChange={(e) => set("accountName", e.target.value.toUpperCase())} placeholder="MAISON DELUXE HOTELS" />
        </div>
        <div>
          <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Số tiền mặc định (VND, tuỳ chọn)</label>
          <input type="number" className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
            value={qr.defaultAmount} onChange={(e) => set("defaultAmount", e.target.value)} placeholder="500000" />
        </div>
        <div>
          <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Nội dung chuyển khoản mặc định</label>
          <input className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
            value={qr.defaultDescription} onChange={(e) => set("defaultDescription", e.target.value)} placeholder="Dat phong MAISON DELUXE" />
        </div>
      </div>

      {/* QR Preview */}
      <div className="border border-primary/20 bg-background">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-primary/15 bg-primary/5">
          <div className="flex items-center gap-2">
            <QrCode size={13} className="text-primary" />
            <span className="text-[11px] tracking-[0.2em] uppercase text-primary font-serif">Xem trước mã QR VietQR</span>
          </div>
          <div className="flex gap-2">
            <input type="number" className="border border-primary/20 bg-background px-2 py-1 text-xs w-28 outline-none"
              value={preview.amount} onChange={(e) => setPreview((p) => ({ ...p, amount: e.target.value }))} placeholder="Số tiền test..." />
            <input className="border border-primary/20 bg-background px-2 py-1 text-xs w-40 outline-none"
              value={preview.description} onChange={(e) => setPreview((p) => ({ ...p, description: e.target.value }))} placeholder="Nội dung test..." />
          </div>
        </div>
        <div className="p-5 flex gap-6 items-start">
          {qrUrl ? (
            <>
              <div className="shrink-0">
                <img src={qrUrl} alt="VietQR" className="w-48 h-48 object-contain border border-primary/20 bg-white p-1"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = ""; (e.currentTarget as HTMLImageElement).alt = "QR Error"; }} />
                <div className="flex gap-1.5 mt-2">
                  <a href={qrUrl} download="vietqr.png"
                    className="flex-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-primary border border-primary/20 py-1 transition-colors">
                    <Download size={10} /> Tải QR
                  </a>
                  <button onClick={() => copyText(qrUrl)}
                    className="flex-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-primary border border-primary/20 py-1 transition-colors">
                    <Copy size={10} /> Copy URL
                  </button>
                </div>
              </div>
              <div className="flex-1 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <LogoImg src={`https://logo.clearbit.com/${bank.name.toLowerCase().replace(/\s/g, "")}.com`}
                    name={bank.name} color="#2E7D32" size={32} />
                  <div>
                    <div className="font-medium text-foreground">{bank.name}</div>
                    <div className="text-[10px] text-muted-foreground">{bank.fullName}</div>
                  </div>
                </div>
                <div className="bg-muted/30 border border-primary/10 p-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">STK:</span>
                    <span className="font-mono font-semibold text-foreground tracking-wider flex items-center gap-1">
                      {qr.accountNumber}
                      <button onClick={() => copyText(qr.accountNumber)} className="hover:text-primary transition-colors"><Copy size={10} /></button>
                    </span>
                  </div>
                  {qr.accountName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tên TK:</span>
                      <span className="font-medium text-foreground uppercase">{qr.accountName}</span>
                    </div>
                  )}
                  {(preview.amount || qr.defaultAmount) && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Số tiền:</span>
                      <span className="font-semibold text-primary">
                        {Number(preview.amount || qr.defaultAmount).toLocaleString("vi-VN")} ₫
                      </span>
                    </div>
                  )}
                  {(preview.description || qr.defaultDescription) && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Nội dung:</span>
                      <span className="text-foreground">{preview.description || qr.defaultDescription}</span>
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Powered by <a href="https://vietqr.io" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">VietQR.io</a> — hỗ trợ tất cả app ngân hàng Việt Nam
                </p>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center w-full py-8 text-muted-foreground">
              <QrCode size={40} className="opacity-20 mb-3" />
              <p className="text-sm">Nhập số tài khoản để xem mã QR</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} size="sm"
          className={`rounded-none text-xs uppercase tracking-widest h-8 px-4 gap-1.5 ${saved ? "bg-green-600" : "bg-primary"} text-primary-foreground`}>
          {saved ? <CheckCircle2 size={11} /> : <Save size={11} />}
          {saved ? "Đã lưu!" : "Lưu thông tin ngân hàng"}
        </Button>
      </div>
    </div>
  );
}

/* ── Toggle helper ── */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className="w-10 h-5 bg-muted peer-checked:bg-primary rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:w-4 after:h-4 after:rounded-full after:transition-all peer-checked:after:translate-x-5" />
    </label>
  );
}

/* ── Secret input ── */
function SecretInput({ value, onChange, placeholder = "••••••••••••" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input type={show ? "text" : "password"}
        className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none font-mono pr-9"
        value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      <button type="button" onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="px-5 py-3 border-b border-primary/15 bg-primary/5 flex items-center gap-2">
      <Icon size={13} className="text-primary" />
      <span className="text-[11px] tracking-[0.3em] uppercase text-primary font-serif">{title}</span>
    </div>
  );
}

/* ──────────────────────────────────────────
   PAYMENT TAB — live methods (MoMo + Bank) + coming-soon list
────────────────────────────────────────── */
interface MomoConfig { enabled: boolean; partnerCode: string; accessKey: string; secretKey: string; testMode: boolean; }

const DEFAULT_MOMO_CFG: MomoConfig = { enabled: false, partnerCode: "", accessKey: "", secretKey: "", testMode: true };

function PaymentTab() {
  const { toast } = useToast();
  const [momoExpanded, setMomoExpanded] = useState(false);
  const [bankExpanded, setBankExpanded] = useState(false);
  const [momo, setMomo] = useState<MomoConfig>(DEFAULT_MOMO_CFG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/settings/payment-settings`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.momo) setMomo({ ...DEFAULT_MOMO_CFG, ...d.momo });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const saveMomo = async () => {
    setSaving(true);
    try {
      const current = await fetch(`${API}/api/settings/payment-settings`).then((r) => r.json());
      await fetch(`${API}/api/settings/payment-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...current, momo }),
      });
      toast({ title: "Cài đặt MoMo đã lưu", description: momo.testMode ? "Đang dùng chế độ Sandbox" : "Đang dùng môi trường thật" });
    } catch {
      toast({ title: "Lỗi lưu cài đặt", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const COMING_SOON = [
    { id: "vnpay",   name: "VNPay",   description: "Cổng thanh toán trực tuyến phổ biến nhất Việt Nam", logo: "https://logo.clearbit.com/vnpay.vn",         color: "#005BAA" },
    { id: "zalopay", name: "ZaloPay", description: "Ví điện tử ZaloPay tích hợp với Zalo",              logo: "https://logo.clearbit.com/zalopay.vn",        color: "#0068FF" },
    { id: "stripe",  name: "Stripe",  description: "Thanh toán quốc tế — Visa, Mastercard, AmEx",      logo: "https://cdn.simpleicons.org/stripe/635BFF",    color: "#635BFF" },
    { id: "paypal",  name: "PayPal",  description: "Thanh toán quốc tế an toàn qua PayPal",            logo: "https://cdn.simpleicons.org/paypal/003087",    color: "#003087" },
  ];

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground text-sm p-6"><Loader2 size={16} className="animate-spin" /> Đang tải...</div>;

  return (
    <div className="space-y-4 max-w-3xl">
      <p className="text-sm text-muted-foreground mb-2">Quản lý phương thức thanh toán cho khách đặt phòng</p>

      {/* ── MoMo (live) ── */}
      <div className={`border ${momo.enabled ? "border-primary/30 bg-primary/[0.02]" : "border-primary/15 bg-card"} transition-all`}>
        <div className="flex items-center gap-4 px-5 py-4">
          <LogoImg src="https://logo.clearbit.com/momo.vn" name="MoMo" color="#AE2070" size={40} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">MoMo</span>
              <span className="text-[9px] tracking-widest uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300/40 px-1.5 py-0.5">Đã tích hợp</span>
              {momo.enabled && momo.testMode && <span className="text-[9px] tracking-widest uppercase text-orange-500 bg-orange-50 dark:bg-orange-950/40 border border-orange-300/40 px-1.5 py-0.5">Sandbox</span>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Ví điện tử MoMo — thanh toán nhanh qua QR</p>
          </div>
          <Toggle checked={momo.enabled} onChange={(v) => setMomo((m) => ({ ...m, enabled: v }))} />
          <button onClick={() => setMomoExpanded((e) => !e)} className="text-xs text-muted-foreground hover:text-primary transition-colors px-2">
            {momoExpanded ? "Thu gọn ▲" : "Cài đặt ▼"}
          </button>
        </div>

        {momoExpanded && (
          <div className="border-t border-primary/15 px-5 py-4 space-y-4 bg-background/50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Partner Code</label>
                <input className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none font-mono"
                  value={momo.partnerCode} onChange={(e) => setMomo((m) => ({ ...m, partnerCode: e.target.value }))} placeholder="MOMO" />
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Access Key</label>
                <SecretInput value={momo.accessKey} onChange={(v) => setMomo((m) => ({ ...m, accessKey: v }))} placeholder="F8BBA842ECF85" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Secret Key</label>
                <SecretInput value={momo.secretKey} onChange={(v) => setMomo((m) => ({ ...m, secretKey: v }))} placeholder="K951B6PE1waDMi640xX08PD3vg6EkVlz" />
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
              IPN URL (điền vào MoMo dashboard): <span className="font-mono">{API}/api/payments/momo/ipn</span>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="accent-primary" checked={momo.testMode}
                onChange={(e) => setMomo((m) => ({ ...m, testMode: e.target.checked }))} />
              <span className="text-sm text-foreground">Chế độ kiểm thử (Sandbox)</span>
            </label>
            <div className="flex justify-end">
              <Button onClick={saveMomo} disabled={saving} size="sm"
                className="rounded-none bg-primary text-primary-foreground text-xs uppercase tracking-widest h-8 px-4 gap-1.5">
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                {saving ? "Đang lưu..." : "Lưu cài đặt MoMo"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Bank Transfer / VietQR (live) ── */}
      <div className="border border-primary/30 bg-primary/[0.02] transition-all">
        <div className="flex items-center gap-4 px-5 py-4">
          <LogoImg src="https://vietqr.io/img/VIETQR.svg" name="VietQR" color="#2E7D32" size={40} />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">Chuyển khoản ngân hàng (VietQR)</span>
              <span className="text-[9px] tracking-widest uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300/40 px-1.5 py-0.5">Đã tích hợp</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Tạo mã QR VietQR để khách chuyển khoản trực tiếp — hỗ trợ tất cả ngân hàng Việt Nam</p>
          </div>
          <span className="text-xs text-emerald-600 font-medium">Đang bật</span>
          <button onClick={() => setBankExpanded((e) => !e)} className="text-xs text-muted-foreground hover:text-primary transition-colors px-2">
            {bankExpanded ? "Thu gọn ▲" : "Cài đặt ▼"}
          </button>
        </div>
        {bankExpanded && (
          <div className="border-t border-primary/15 px-5 py-4 bg-background/50">
            <BankQRSection toast={toast} />
          </div>
        )}
      </div>

      {/* ── Coming soon ── */}
      <div className="border border-primary/10 bg-card">
        <div className="px-5 py-3 border-b border-primary/10 bg-muted/30">
          <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Sắp tích hợp</span>
        </div>
        {COMING_SOON.map((m) => (
          <div key={m.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-primary/10 last:border-0 opacity-60">
            <LogoImg src={m.logo} name={m.name} color={m.color} size={36} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground text-sm">{m.name}</span>
                <span className="text-[9px] tracking-widest uppercase text-muted-foreground border border-muted-foreground/30 px-1.5 py-0.5">Sắp ra mắt</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────
   GENERAL TAB
────────────────────────────────────────── */
function GeneralTab() {
  const { toast } = useToast();
  const [s, setS] = useState<GeneralSettings>(() => load(GENERAL_KEY, DEFAULT_GENERAL));
  const set = (k: keyof GeneralSettings, v: any) => setS((g) => ({ ...g, [k]: v }));
  const save = () => { localStorage.setItem(GENERAL_KEY, JSON.stringify(s)); toast({ title: "Cài đặt chung đã lưu" }); };

  const fields: { label: string; key: keyof GeneralSettings; type?: string; placeholder?: string; span?: boolean }[] = [
    { label: "Tên website", key: "siteName", span: true },
    { label: "URL website", key: "siteUrl", placeholder: "https://maisondeluxe.vn" },
    { label: "Email hỗ trợ", key: "supportEmail", type: "email" },
    { label: "Số điện thoại hỗ trợ", key: "supportPhone" },
    { label: "Đơn vị tiền tệ", key: "currency" },
    { label: "Múi giờ", key: "timezone" },
    { label: "Check-in (giờ)", key: "checkInTime", type: "time" },
    { label: "Check-out (giờ)", key: "checkOutTime", type: "time" },
    { label: "Thuế VAT (%)", key: "taxRate", type: "number" },
    { label: "Phí dịch vụ (%)", key: "serviceCharge", type: "number" },
    { label: "Hủy phòng trước (giờ)", key: "bookingCancellation", type: "number" },
  ];

  const toggles: { label: string; desc: string; key: keyof GeneralSettings }[] = [
    { label: "Chế độ bảo trì", desc: "Tạm khóa website — khách hàng thấy trang bảo trì", key: "maintenanceMode" },
    { label: "Đặt phòng trực tuyến", desc: "Cho phép khách đặt phòng qua website", key: "bookingEnabled" },
    { label: "Xác minh số điện thoại", desc: "Yêu cầu xác minh SĐT khi đặt phòng", key: "requirePhoneVerification" },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex justify-end">
        <Button onClick={save} className="rounded-none bg-primary text-primary-foreground text-xs uppercase tracking-widest h-9 px-5 gap-1.5">
          <Save size={13} /> Lưu cài đặt
        </Button>
      </div>
      <div className="bg-card border border-primary/20">
        <SectionHeader icon={Building} title="Thông tin chung" />
        <div className="p-5 grid grid-cols-2 gap-4">
          {fields.map(({ label, key, type, placeholder, span }) => (
            <div key={key} className={span ? "col-span-2" : ""}>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">{label}</label>
              <input type={type ?? "text"} placeholder={placeholder}
                className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
                value={String(s[key])} onChange={(e) => set(key, e.target.value)} />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-card border border-primary/20">
        <SectionHeader icon={Settings} title="Chế độ hoạt động" />
        <div className="divide-y divide-primary/10">
          {toggles.map(({ label, desc, key }) => (
            <div key={key} className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="text-sm font-medium text-foreground">{label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
              </div>
              <Toggle checked={!!s[key]} onChange={(v) => set(key, v)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────
   AFFILIATE TAB
────────────────────────────────────────── */
function AffiliateTab() {
  const { toast } = useToast();
  const [s, setS] = useState<AffiliateSettings>(() => load(AFFILIATE_KEY, DEFAULT_AFFILIATE));
  const set = (k: keyof AffiliateSettings, v: any) => setS((a) => ({ ...a, [k]: v }));
  const save = () => { localStorage.setItem(AFFILIATE_KEY, JSON.stringify(s)); toast({ title: "Cài đặt affiliate đã lưu" }); };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Cấu hình chương trình giới thiệu và hoa hồng</p>
        <Button onClick={save} className="rounded-none bg-primary text-primary-foreground text-xs uppercase tracking-widest h-9 px-5 gap-1.5">
          <Save size={13} /> Lưu cài đặt
        </Button>
      </div>
      <div className="bg-card border border-primary/20">
        <div className="px-5 py-3 border-b border-primary/15 bg-primary/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 size={13} className="text-primary" />
            <span className="text-[11px] tracking-[0.3em] uppercase text-primary font-serif">Chương trình Affiliate</span>
          </div>
          <Toggle checked={s.enabled} onChange={(v) => set("enabled", v)} />
        </div>
        <div className={`p-5 space-y-5 ${!s.enabled ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="grid grid-cols-2 gap-4">
            {([
              { label: "Hoa hồng mặc định (%)", key: "defaultCommission", min: 0, max: 100 },
              { label: "Cookie theo dõi (ngày)", key: "cookieDuration", min: 1, max: undefined },
              { label: "Số dư tối thiểu để rút (VND)", key: "minPayout", min: undefined, max: undefined },
            ] as const).map(({ label, key, min, max }) => (
              <div key={key}>
                <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">{label}</label>
                <input type="number" min={min} max={max}
                  className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
                  value={s[key]} onChange={(e) => set(key, parseInt(e.target.value) || 0)} />
              </div>
            ))}
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Phương thức thanh toán</label>
              <select className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
                value={s.payoutMethod} onChange={(e) => set("payoutMethod", e.target.value)}>
                <option value="bank_transfer">Chuyển khoản ngân hàng</option>
                <option value="momo">MoMo</option>
                <option value="paypal">PayPal</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">URL điều khoản Affiliate</label>
              <input className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
                value={s.termsUrl} onChange={(e) => set("termsUrl", e.target.value)} placeholder="/affiliate-terms" />
            </div>
          </div>
          <div className="space-y-3 border-t border-primary/15 pt-4">
            {([
              { label: "Tự động phê duyệt", desc: "Tự động chấp nhận đơn đăng ký affiliate mới", key: "autoApprove" },
              { label: "Hiển thị banner", desc: "Cho phép affiliate nhúng banner quảng cáo", key: "showBanner" },
            ] as const).map(({ label, desc, key }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">{label}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
                <Toggle checked={s[key]} onChange={(v) => set(key, v)} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="bg-primary/5 border border-primary/20 px-5 py-4 text-sm text-muted-foreground">
        💡 Sau khi bật chương trình affiliate, vào <strong>Người dùng</strong> để tạo mã giới thiệu cho từng thành viên.
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────
   OAUTH TAB
────────────────────────────────────────── */
function OAuthTab() {
  const { toast } = useToast();
  const [s, setS] = useState<OAuthSettings>(() => load(OAUTH_KEY, DEFAULT_OAUTH));
  const set = (k: keyof OAuthSettings, v: any) => setS((o) => ({ ...o, [k]: v }));
  const save = () => { localStorage.setItem(OAUTH_KEY, JSON.stringify(s)); toast({ title: "Cài đặt OAuth đã lưu" }); };

  const providers = [
    {
      id: "google", name: "Google", enabled: s.googleEnabled, onToggle: (v: boolean) => set("googleEnabled", v),
      logo: (
        <svg viewBox="0 0 48 48" className="w-6 h-6">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
      ),
      fields: [
        { label: "Google Client ID", key: "googleClientId" as const, placeholder: "xxxxxxxxx.apps.googleusercontent.com" },
        { label: "Google Client Secret", key: "googleClientSecret" as const, secret: true, placeholder: "GOCSPX-..." },
      ],
      note: "Tạo OAuth credentials tại Google Cloud Console → APIs & Services → Credentials. Redirect URI: https://yourdomain.clerk.accounts.dev/v1/oauth_callback",
    },
    {
      id: "facebook", name: "Facebook", enabled: s.facebookEnabled, onToggle: (v: boolean) => set("facebookEnabled", v),
      logo: (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="#1877F2">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      fields: [
        { label: "App ID", key: "facebookAppId" as const, placeholder: "1234567890" },
        { label: "App Secret", key: "facebookAppSecret" as const, secret: true, placeholder: "••••••••••••" },
      ],
      note: "Tạo ứng dụng tại Facebook Developers → My Apps. Thêm Facebook Login product và cấu hình OAuth redirect URI.",
    },
    {
      id: "apple", name: "Sign in with Apple", enabled: s.appleEnabled, onToggle: (v: boolean) => set("appleEnabled", v),
      logo: (
        <svg viewBox="0 0 24 24" className="w-6 h-6 text-foreground" fill="currentColor">
          <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
        </svg>
      ),
      fields: [
        { label: "Team ID", key: "appleTeamId" as const, placeholder: "ABCD1234" },
        { label: "Key ID", key: "appleKeyId" as const, placeholder: "ABCD1234" },
        { label: "Private Key (.p8)", key: "applePrivateKey" as const, secret: true, placeholder: "-----BEGIN PRIVATE KEY-----" },
      ],
      note: "Đăng ký Sign in with Apple tại Apple Developer → Certificates, IDs & Profiles → Keys.",
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Cấu hình đăng nhập mạng xã hội cho khách hàng</p>
        <Button onClick={save} className="rounded-none bg-primary text-primary-foreground text-xs uppercase tracking-widest h-9 px-5 gap-1.5">
          <Save size={13} /> Lưu cài đặt
        </Button>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300/40 px-5 py-4 text-sm text-amber-700 dark:text-amber-400 flex gap-3">
        <Shield size={16} className="shrink-0 mt-0.5" />
        <div>
          <strong>Lưu ý bảo mật:</strong> Credentials được lưu trong trình duyệt của bạn. Trong môi trường production, hãy cấu hình trực tiếp trong Clerk Dashboard để đảm bảo an toàn tuyệt đối.
        </div>
      </div>

      {providers.map((provider) => (
        <div key={provider.id} className={`border ${provider.enabled ? "border-primary/30" : "border-primary/15"} bg-card transition-all`}>
          <div className="flex items-center gap-4 px-5 py-4 border-b border-primary/10">
            <div className="w-10 h-10 flex items-center justify-center border border-primary/10 bg-background">
              {provider.logo}
            </div>
            <div className="flex-1">
              <div className="font-medium text-foreground text-sm">{provider.name}</div>
              <div className={`text-[10px] tracking-widest uppercase mt-0.5 ${provider.enabled ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                {provider.enabled ? "Đang bật" : "Tắt"}
              </div>
            </div>
            <Toggle checked={provider.enabled} onChange={provider.onToggle} />
          </div>

          {provider.enabled && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {provider.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">{field.label}</label>
                    {field.secret
                      ? <SecretInput value={String(s[field.key])} onChange={(v) => set(field.key, v)} placeholder={field.placeholder} />
                      : <input className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none font-mono"
                          value={String(s[field.key])} onChange={(e) => set(field.key, e.target.value)} placeholder={field.placeholder} />
                    }
                  </div>
                ))}
              </div>
              <div className="bg-primary/5 border border-primary/15 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
                💡 {provider.note}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────
   OTA CHANNELS TAB
────────────────────────────────────────── */
function OtaTab() {
  const { toast } = useToast();
  const [channels, setChannels] = useState<OtaChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  const OTA_LOGOS: Record<string, string> = {
    booking_com: "https://cdn.simpleicons.org/bookingdotcom/003580",
    agoda:        "https://icon.horse/icon/agoda.com",
    expedia:      "https://cdn.simpleicons.org/expedia/f5a623",
    airbnb:       "https://cdn.simpleicons.org/airbnb/ff5a5f",
    traveloka:    "https://icon.horse/icon/traveloka.com",
    tripadvisor:  "https://cdn.simpleicons.org/tripadvisor/00af87",
    trip_com:     "https://cdn.simpleicons.org/tripdotcom/006fd9",
    klook:        "https://icon.horse/icon/klook.com",
  };
  const OTA_COLORS: Record<string, string> = {
    booking_com: "#003580", agoda: "#e31837", expedia: "#f5a623", airbnb: "#ff5a5f",
    traveloka: "#0064d2", tripadvisor: "#00af87", trip_com: "#006fd9", klook: "#ff5533",
  };

  useEffect(() => {
    fetch(`${API}/api/ota/channels`)
      .then((r) => r.json())
      .then((data) => setChannels(data))
      .catch(() => toast({ title: "Không thể tải dữ liệu OTA", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  const update = (id: string, k: keyof OtaChannel, v: any) =>
    setChannels((ch) => ch.map((c) => c.id === id ? { ...c, [k]: v } : c));

  const save = async (ch: OtaChannel) => {
    try {
      const res = await fetch(`${API}/api/ota/channels/${ch.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ch),
      });
      if (!res.ok) throw new Error();
      toast({ title: `${ch.name} đã lưu` });
    } catch {
      toast({ title: "Không thể lưu cài đặt", variant: "destructive" });
    }
  };

  const testConnection = async (ch: OtaChannel) => {
    setTesting(ch.id);
    try {
      const res = await fetch(`${API}/api/ota/channels/${ch.id}/test`, { method: "POST" });
      const data = await res.json();
      toast({ title: data.success ? `✅ ${data.message}` : `❌ ${data.message}`, variant: data.success ? "default" : "destructive" });
    } catch {
      toast({ title: "Lỗi kết nối", variant: "destructive" });
    } finally {
      setTesting(null);
    }
  };

  const [ingesting, setIngesting] = useState<string | null>(null);
  const testIngest = async (ch: OtaChannel) => {
    setIngesting(ch.id);
    try {
      const roomsRes = await fetch(`${API}/api/rooms`);
      const rooms = await roomsRes.json();
      if (!Array.isArray(rooms) || rooms.length === 0) {
        toast({ title: "Chưa có phòng nào để demo ingest", variant: "destructive" });
        setIngesting(null);
        return;
      }
      const room = rooms[0];
      const externalRef = `DEMO-${ch.id.toUpperCase()}-${Date.now()}`;
      const today = new Date();
      const tomorrow = new Date(today.getTime() + 86400000);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      const res = await fetch(`${API}/api/ota/channels/${ch.id}/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalRef,
          roomId: room.id,
          guestName: `Demo Guest ${ch.name}`,
          guestEmail: `demo+${ch.id}@grand-palace-test.vn`,
          guestPhone: "+84900000000",
          checkInDate: fmt(today),
          checkOutDate: fmt(tomorrow),
          numberOfGuests: 2,
          totalPrice: parseFloat(room.pricePerNight ?? "200"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast({
        title: data.duplicate ? `↺ Đã có booking trước (idempotent)` : `✅ Đã nhận booking #${data.id} từ ${ch.name}`,
        description: `Ref: ${externalRef}`,
      });
    } catch (e: any) {
      toast({ title: "Ingest thất bại", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setIngesting(null);
    }
  };

  const syncNow = async (ch: OtaChannel) => {
    setSyncing(ch.id);
    try {
      const res = await fetch(`${API}/api/ota/channels/${ch.id}/sync`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setChannels((chs) => chs.map((c) => c.id === ch.id ? { ...c, lastSync: data.syncedAt } : c));
        toast({ title: `✅ ${data.message}` });
      } else {
        toast({ title: data.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Lỗi đồng bộ", variant: "destructive" });
    } finally {
      setSyncing(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  const activeCount = channels.filter((c) => c.enabled).length;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">{activeCount} kênh OTA đang kích hoạt · {channels.length} kênh tổng</p>
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Globe size={12} className="text-primary" />
          Channel Manager — sẵn sàng kết nối
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-300/40 px-5 py-4 text-sm text-blue-700 dark:text-blue-400 flex gap-3">
        <Wifi size={16} className="shrink-0 mt-0.5" />
        <div>
          <strong>Channel Manager:</strong> Sau khi cấu hình API credentials từ từng OTA (Extranet), hệ thống sẽ tự động đồng bộ phòng trống, giá phòng và nhận đặt phòng về admin. Hiện đang ở chế độ cấu hình — chưa có kết nối thực.
        </div>
      </div>

      {channels.map((ch) => (
        <div key={ch.id} className={`border transition-all ${ch.enabled ? "border-primary/30 bg-primary/3" : "border-primary/15 bg-card"}`}>
          <div className="flex items-center gap-4 px-5 py-4">
            <LogoImg src={OTA_LOGOS[ch.id] ?? ""} name={ch.name} color={OTA_COLORS[ch.id] ?? "#888"} size={40} />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-foreground text-sm">{ch.name}</span>
                {ch.enabled && ch.lastSync && (
                  <span className="text-[9px] text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/40 border border-green-300/40 px-1.5 py-0.5 tracking-wide">
                    Synced {new Date(ch.lastSync).toLocaleDateString("vi-VN")}
                  </span>
                )}
                {ch.testMode && ch.enabled && (
                  <span className="text-[9px] text-orange-500 bg-orange-50 dark:bg-orange-950/40 border border-orange-300/40 px-1.5 py-0.5 tracking-wide">Sandbox</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1">
                {ch.enabled ? <Wifi size={10} className="text-green-500" /> : <WifiOff size={10} className="text-muted-foreground/50" />}
                <span className="text-[10px] text-muted-foreground">{ch.enabled ? "Đang kết nối" : "Chưa kích hoạt"}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {ch.enabled && (
                <>
                  <button onClick={() => testConnection(ch)} disabled={!!testing}
                    className="text-[10px] tracking-wide text-muted-foreground hover:text-primary border border-primary/20 px-2.5 py-1 transition-colors flex items-center gap-1 disabled:opacity-50">
                    {testing === ch.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                    Test
                  </button>
                  <button onClick={() => syncNow(ch)} disabled={!!syncing}
                    className="text-[10px] tracking-wide text-muted-foreground hover:text-primary border border-primary/20 px-2.5 py-1 transition-colors flex items-center gap-1 disabled:opacity-50">
                    {syncing === ch.id ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                    Sync
                  </button>
                  <button onClick={() => testIngest(ch)} disabled={!!ingesting}
                    title="Tạo một booking demo từ kênh này để kiểm tra luồng ingest + dedup khách"
                    className="text-[10px] tracking-wide text-primary hover:bg-primary/10 border border-primary/40 px-2.5 py-1 transition-colors flex items-center gap-1 disabled:opacity-50">
                    {ingesting === ch.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                    Test Ingest
                  </button>
                </>
              )}
              <Toggle checked={ch.enabled} onChange={(v) => update(ch.id, "enabled", v)} />
              <button onClick={() => setExpanded((e) => e === ch.id ? null : ch.id)}
                className="text-xs text-muted-foreground hover:text-primary transition-colors px-1.5">
                {expanded === ch.id ? "▲" : "▼"}
              </button>
            </div>
          </div>

          {expanded === ch.id && (
            <div className="border-t border-primary/15 px-5 py-5 space-y-4 bg-background/50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Property ID / Hotel ID</label>
                  <input className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none font-mono"
                    value={ch.propertyId} onChange={(e) => update(ch.id, "propertyId", e.target.value)} placeholder="e.g. 12345678" />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Rate Plan ID</label>
                  <input className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none font-mono"
                    value={ch.rateplanId} onChange={(e) => update(ch.id, "rateplanId", e.target.value)} placeholder="e.g. BAR" />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">API Key / Username</label>
                  <SecretInput value={ch.apiKey} onChange={(v) => update(ch.id, "apiKey", v)} placeholder="••••••••" />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">API Secret / Password</label>
                  <SecretInput value={ch.apiSecret} onChange={(v) => update(ch.id, "apiSecret", v)} placeholder="••••••••" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Webhook URL (nhận đặt phòng về)</label>
                <input className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none font-mono"
                  value={ch.webhookUrl} onChange={(e) => update(ch.id, "webhookUrl", e.target.value)} placeholder={`https://yourdomain.com/api/ota/${ch.id}/webhook`} />
              </div>
              <div className="flex flex-wrap gap-5 border-t border-primary/15 pt-4">
                {([
                  { label: "Đồng bộ phòng trống", key: "syncInventory" },
                  { label: "Đồng bộ giá phòng", key: "syncRates" },
                  { label: "Nhận đặt phòng tự động", key: "syncReservations" },
                  { label: "Chế độ Sandbox", key: "testMode" },
                ] as const).map(({ label, key }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input type="checkbox" className="accent-primary" checked={!!ch[key]}
                      onChange={(e) => update(ch.id, key, e.target.checked)} />
                    <span className="text-foreground">{label}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end">
                <Button onClick={() => save(ch)} size="sm" className="rounded-none bg-primary text-primary-foreground text-xs uppercase tracking-widest h-8 px-4 gap-1.5">
                  <Save size={11} /> Lưu kênh này
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────
   MAIN PAGE
────────────────────────────────────────── */
type Tab = "branding" | "payment" | "general" | "affiliate" | "oauth" | "ota";

export default function AdminSettings() {
  const [tab, setTab] = useState<Tab>("branding");

  const TABS: { key: Tab; icon: any; label: string }[] = [
    { key: "branding",  icon: Sparkles,   label: "Nhận diện thương hiệu" },
    { key: "payment",   icon: CreditCard, label: "Thanh toán" },
    { key: "general",   icon: Settings,   label: "Cài đặt chung" },
    { key: "affiliate", icon: Link2,      label: "Affiliate" },
    { key: "oauth",     icon: Shield,     label: "OAuth / Đăng nhập" },
    { key: "ota",       icon: Globe,      label: "OTA & Kênh phân phối" },
  ];

  return (
    <AdminGuard>
      <AdminLayout title="Cài đặt Hệ thống" subtitle="Branding, thanh toán, OAuth, OTA, affiliate và cấu hình chung">
        <div className="flex gap-0 mb-6 border-b border-primary/20 overflow-x-auto">
          {TABS.map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm border-b-2 transition-all -mb-px whitespace-nowrap ${
                tab === key ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground hover:border-primary/30"
              }`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
        {tab === "branding"  && <BrandingPanel />}
        {tab === "payment"   && <PaymentTab />}
        {tab === "general"   && <GeneralTab />}
        {tab === "affiliate" && <AffiliateTab />}
        {tab === "oauth"     && <OAuthTab />}
        {tab === "ota"       && <OtaTab />}
      </AdminLayout>
    </AdminGuard>
  );
}
