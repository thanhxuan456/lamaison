import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard, Save, Settings, Globe, Link2,
  Eye, EyeOff, Building, RefreshCw, CheckCircle2,
  XCircle, Loader2, Wifi, WifiOff, Shield,
} from "lucide-react";

const PAYMENT_KEY = "grand-palace-payment-settings";
const GENERAL_KEY  = "grand-palace-general-settings";
const AFFILIATE_KEY = "grand-palace-affiliate-settings";
const OAUTH_KEY    = "grand-palace-oauth-settings";

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
  { id: "vnpay",  name: "VNPay",              description: "Cổng thanh toán trực tuyến phổ biến nhất Việt Nam", enabled: false, apiKey: "", secretKey: "", webhookUrl: "", testMode: true,  logo: "🏦", color: "#005BAA" },
  { id: "momo",   name: "MoMo",               description: "Ví điện tử MoMo — thanh toán nhanh qua QR",        enabled: false, apiKey: "", secretKey: "", webhookUrl: "", testMode: true,  logo: "💜", color: "#AE2070" },
  { id: "zalopay",name: "ZaloPay",            description: "Ví điện tử ZaloPay tích hợp với Zalo",             enabled: false, apiKey: "", secretKey: "", webhookUrl: "", testMode: true,  logo: "🔵", color: "#0068FF" },
  { id: "stripe", name: "Stripe",             description: "Thanh toán quốc tế — Visa, Mastercard, AmEx",     enabled: false, apiKey: "", secretKey: "", webhookUrl: "", testMode: true,  logo: "💳", color: "#635BFF" },
  { id: "paypal", name: "PayPal",             description: "Thanh toán quốc tế an toàn qua PayPal",           enabled: false, apiKey: "", secretKey: "", webhookUrl: "", testMode: true,  logo: "🅿️", color: "#003087" },
  { id: "bank",   name: "Chuyển khoản ngân hàng", description: "Thanh toán thủ công qua tài khoản ngân hàng", enabled: true,  apiKey: "", secretKey: "", webhookUrl: "", testMode: false, logo: "🏧", color: "#2E7D32" },
];
const DEFAULT_GENERAL: GeneralSettings = {
  siteName: "Grand Palace Hotels & Resorts", siteUrl: "https://grandpalace.vn",
  supportEmail: "support@grandpalace.vn", supportPhone: "+84 900 000 000",
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
   PAYMENT TAB
────────────────────────────────────────── */
function PaymentTab() {
  const { toast } = useToast();
  const [methods, setMethods] = useState<PaymentMethod[]>(() => load(PAYMENT_KEY, DEFAULT_PAYMENTS));
  const [expanded, setExpanded] = useState<string | null>(null);

  const update = (id: string, k: keyof PaymentMethod, v: any) =>
    setMethods((m) => m.map((x) => x.id === id ? { ...x, [k]: v } : x));

  const save = () => {
    localStorage.setItem(PAYMENT_KEY, JSON.stringify(methods));
    toast({ title: "Cài đặt thanh toán đã lưu", description: `${methods.filter((m) => m.enabled).length} phương thức đang hoạt động` });
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-muted-foreground">{methods.filter((m) => m.enabled).length} phương thức đang kích hoạt</p>
        <Button onClick={save} className="rounded-none bg-primary text-primary-foreground text-xs uppercase tracking-widest h-9 px-5 gap-1.5">
          <Save size={13} /> Lưu cài đặt
        </Button>
      </div>

      {methods.map((method) => (
        <div key={method.id} className={`border ${method.enabled ? "border-primary/30 bg-primary/3" : "border-primary/15 bg-card"} transition-all`}>
          <div className="flex items-center gap-4 px-5 py-4">
            <span className="text-2xl">{method.logo}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{method.name}</span>
                {method.testMode && method.enabled && (
                  <span className="text-[9px] tracking-widest uppercase text-orange-500 bg-orange-50 dark:bg-orange-950/40 border border-orange-300/40 px-1.5 py-0.5">Sandbox</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{method.description}</p>
            </div>
            <Toggle checked={method.enabled} onChange={(v) => update(method.id, "enabled", v)} />
            <button onClick={() => setExpanded((e) => e === method.id ? null : method.id)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors px-2">
              {expanded === method.id ? "Thu gọn ▲" : "Cài đặt ▼"}
            </button>
          </div>

          {expanded === method.id && (
            <div className="border-t border-primary/15 px-5 py-4 space-y-4 bg-background/50">
              {method.id !== "bank" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">API Key / Client ID</label>
                      <SecretInput value={method.apiKey} onChange={(v) => update(method.id, "apiKey", v)} />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Secret Key</label>
                      <SecretInput value={method.secretKey} onChange={(v) => update(method.id, "secretKey", v)} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Webhook / IPN URL</label>
                    <input className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none font-mono"
                      value={method.webhookUrl} onChange={(e) => update(method.id, "webhookUrl", e.target.value)} placeholder="https://yourdomain.com/api/webhooks/..." />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="accent-primary" checked={method.testMode}
                      onChange={(e) => update(method.id, "testMode", e.target.checked)} />
                    <span className="text-sm text-foreground">Chế độ kiểm thử (Sandbox)</span>
                  </label>
                </>
              ) : (
                <div className="text-sm text-muted-foreground bg-primary/5 border border-primary/15 p-4">
                  Chuyển khoản ngân hàng không cần cấu hình API. Thông tin tài khoản ngân hàng được quản lý tại <strong>Admin → Nội dung</strong>.
                </div>
              )}
            </div>
          )}
        </div>
      ))}
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
    { label: "URL website", key: "siteUrl", placeholder: "https://grandpalace.vn" },
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
              { label: "Cookie theo dõi (ngày)", key: "cookieDuration", min: 1 },
              { label: "Số dư tối thiểu để rút (VND)", key: "minPayout" },
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
    booking_com: "🔵", agoda: "🔴", expedia: "🟡", airbnb: "🏠",
    traveloka: "🟢", tripadvisor: "🦉", trip_com: "✈️", klook: "🎟️",
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
            <div className="w-10 h-10 flex items-center justify-center text-xl border border-primary/10 bg-background">
              {OTA_LOGOS[ch.id] ?? "🌐"}
            </div>
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
type Tab = "payment" | "general" | "affiliate" | "oauth" | "ota";

export default function AdminSettings() {
  const [tab, setTab] = useState<Tab>("payment");

  const TABS: { key: Tab; icon: any; label: string }[] = [
    { key: "payment",   icon: CreditCard, label: "Thanh toán" },
    { key: "general",   icon: Settings,   label: "Cài đặt chung" },
    { key: "affiliate", icon: Link2,      label: "Affiliate" },
    { key: "oauth",     icon: Shield,     label: "OAuth / Đăng nhập" },
    { key: "ota",       icon: Globe,      label: "OTA & Kênh phân phối" },
  ];

  return (
    <AdminGuard>
      <AdminLayout title="Cài đặt Hệ thống" subtitle="Thanh toán, OAuth, OTA, affiliate và cấu hình chung">
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
        {tab === "payment"   && <PaymentTab />}
        {tab === "general"   && <GeneralTab />}
        {tab === "affiliate" && <AffiliateTab />}
        {tab === "oauth"     && <OAuthTab />}
        {tab === "ota"       && <OtaTab />}
      </AdminLayout>
    </AdminGuard>
  );
}
