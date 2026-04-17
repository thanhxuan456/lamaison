import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard, Save, Settings, Globe, ToggleLeft, ToggleRight,
  Eye, EyeOff, Link2, Percent, Bell, Building,
} from "lucide-react";

const PAYMENT_KEY = "grand-palace-payment-settings";
const GENERAL_KEY = "grand-palace-general-settings";
const AFFILIATE_KEY = "grand-palace-affiliate-settings";

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  apiKey: string;
  secretKey: string;
  webhookUrl: string;
  testMode: boolean;
  logo: string;
  color: string;
}

interface GeneralSettings {
  siteName: string;
  siteUrl: string;
  supportEmail: string;
  supportPhone: string;
  currency: string;
  timezone: string;
  bookingCancellation: string;
  checkInTime: string;
  checkOutTime: string;
  taxRate: string;
  serviceCharge: string;
  maintenanceMode: boolean;
  bookingEnabled: boolean;
  requirePhoneVerification: boolean;
}

interface AffiliateSettings {
  enabled: boolean;
  defaultCommission: number;
  cookieDuration: number;
  minPayout: number;
  payoutMethod: string;
  termsUrl: string;
  autoApprove: boolean;
  showBanner: boolean;
}

const DEFAULT_PAYMENTS: PaymentMethod[] = [
  { id: "vnpay", name: "VNPay", description: "Cổng thanh toán trực tuyến phổ biến nhất Việt Nam", enabled: false, apiKey: "", secretKey: "", webhookUrl: "", testMode: true, logo: "🏦", color: "#005BAA" },
  { id: "momo", name: "MoMo", description: "Ví điện tử MoMo — thanh toán nhanh qua QR", enabled: false, apiKey: "", secretKey: "", webhookUrl: "", testMode: true, logo: "💜", color: "#AE2070" },
  { id: "zalopay", name: "ZaloPay", description: "Ví điện tử ZaloPay tích hợp với Zalo", enabled: false, apiKey: "", secretKey: "", webhookUrl: "", testMode: true, logo: "🔵", color: "#0068FF" },
  { id: "stripe", name: "Stripe", description: "Thanh toán quốc tế — Visa, Mastercard, AmEx", enabled: false, apiKey: "", secretKey: "", webhookUrl: "", testMode: true, logo: "💳", color: "#635BFF" },
  { id: "paypal", name: "PayPal", description: "Thanh toán quốc tế an toàn qua PayPal", enabled: false, apiKey: "", secretKey: "", webhookUrl: "", testMode: true, logo: "🅿️", color: "#003087" },
  { id: "bank", name: "Chuyển khoản ngân hàng", description: "Thanh toán thủ công qua tài khoản ngân hàng", enabled: true, apiKey: "", secretKey: "", webhookUrl: "", testMode: false, logo: "🏧", color: "#2E7D32" },
];

const DEFAULT_GENERAL: GeneralSettings = {
  siteName: "Grand Palace Hotels & Resorts", siteUrl: "https://grandpalace.vn", supportEmail: "support@grandpalace.vn",
  supportPhone: "+84 900 000 000", currency: "VND", timezone: "Asia/Ho_Chi_Minh",
  bookingCancellation: "24", checkInTime: "14:00", checkOutTime: "12:00",
  taxRate: "10", serviceCharge: "5", maintenanceMode: false, bookingEnabled: true, requirePhoneVerification: false,
};

const DEFAULT_AFFILIATE: AffiliateSettings = {
  enabled: false, defaultCommission: 5, cookieDuration: 30, minPayout: 500000,
  payoutMethod: "bank_transfer", termsUrl: "/affiliate-terms", autoApprove: false, showBanner: true,
};

function load<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}

type Tab = "payment" | "general" | "affiliate";

/* ─── Payment Tab ─── */
function PaymentTab() {
  const { toast } = useToast();
  const [methods, setMethods] = useState<PaymentMethod[]>(() => load(PAYMENT_KEY, DEFAULT_PAYMENTS));
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

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
          {/* Header row */}
          <div className="flex items-center gap-4 px-5 py-4">
            <span className="text-2xl">{method.logo}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{method.name}</span>
                {method.testMode && method.enabled && (
                  <span className="text-[9px] tracking-widest uppercase text-orange-500 bg-orange-50 dark:bg-orange-950/40 border border-orange-300/40 px-1.5 py-0.5">Test Mode</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{method.description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={method.enabled}
                onChange={(e) => update(method.id, "enabled", e.target.checked)} />
              <div className="w-10 h-5 bg-muted peer-checked:bg-primary rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:w-4 after:h-4 after:rounded-full after:transition-all peer-checked:after:translate-x-5" />
            </label>
            <button onClick={() => setExpanded((e) => e === method.id ? null : method.id)}
              className="text-xs text-muted-foreground hover:text-primary transition-colors px-2">
              {expanded === method.id ? "Thu gọn ▲" : "Cài đặt ▼"}
            </button>
          </div>

          {/* Expanded config */}
          {expanded === method.id && (
            <div className="border-t border-primary/15 px-5 py-4 space-y-4 bg-background/50">
              {method.id !== "bank" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">API Key / Client ID</label>
                      <div className="relative">
                        <input type={showKeys[method.id + "_api"] ? "text" : "password"}
                          className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none font-mono pr-9"
                          value={method.apiKey} onChange={(e) => update(method.id, "apiKey", e.target.value)} placeholder="••••••••••••" />
                        <button onClick={() => setShowKeys((k) => ({ ...k, [method.id + "_api"]: !k[method.id + "_api"] }))}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showKeys[method.id + "_api"] ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Secret Key / Hash Secret</label>
                      <div className="relative">
                        <input type={showKeys[method.id + "_secret"] ? "text" : "password"}
                          className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none font-mono pr-9"
                          value={method.secretKey} onChange={(e) => update(method.id, "secretKey", e.target.value)} placeholder="••••••••••••" />
                        <button onClick={() => setShowKeys((k) => ({ ...k, [method.id + "_secret"]: !k[method.id + "_secret"] }))}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showKeys[method.id + "_secret"] ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Webhook URL (IPN)</label>
                    <input className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none font-mono"
                      value={method.webhookUrl} onChange={(e) => update(method.id, "webhookUrl", e.target.value)} placeholder="https://yourdomain.com/api/webhooks/..." />
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="accent-primary" checked={method.testMode}
                      onChange={(e) => update(method.id, "testMode", e.target.checked)} />
                    <span className="text-sm text-foreground">Chế độ kiểm thử (Sandbox)</span>
                  </label>
                </>
              )}
              {method.id === "bank" && (
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

/* ─── General Settings Tab ─── */
function GeneralTab() {
  const { toast } = useToast();
  const [s, setS] = useState<GeneralSettings>(() => load(GENERAL_KEY, DEFAULT_GENERAL));
  const set = (k: keyof GeneralSettings, v: any) => setS((g) => ({ ...g, [k]: v }));

  const save = () => {
    localStorage.setItem(GENERAL_KEY, JSON.stringify(s));
    toast({ title: "Cài đặt chung đã lưu" });
  };

  const fields: { label: string; key: keyof GeneralSettings; type?: string; placeholder?: string }[] = [
    { label: "Tên website", key: "siteName" },
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
    { label: "Bảo trì", desc: "Tạm khóa website — khách hàng thấy trang bảo trì", key: "maintenanceMode" },
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
        <div className="px-5 py-3 border-b border-primary/15 bg-primary/5 flex items-center gap-2">
          <Building size={13} className="text-primary" />
          <span className="text-[11px] tracking-[0.3em] uppercase text-primary font-serif">Thông tin chung</span>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4">
          {fields.map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">{label}</label>
              <input type={type ?? "text"} placeholder={placeholder}
                className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
                value={String(s[key])} onChange={(e) => set(key, e.target.value)} />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-primary/20">
        <div className="px-5 py-3 border-b border-primary/15 bg-primary/5 flex items-center gap-2">
          <Settings size={13} className="text-primary" />
          <span className="text-[11px] tracking-[0.3em] uppercase text-primary font-serif">Chế độ hoạt động</span>
        </div>
        <div className="divide-y divide-primary/10">
          {toggles.map(({ label, desc, key }) => (
            <div key={key} className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="text-sm font-medium text-foreground">{label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={!!s[key]}
                  onChange={(e) => set(key, e.target.checked)} />
                <div className="w-10 h-5 bg-muted peer-checked:bg-primary rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:w-4 after:h-4 after:rounded-full after:transition-all peer-checked:after:translate-x-5" />
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Affiliate Settings Tab ─── */
function AffiliateTab() {
  const { toast } = useToast();
  const [s, setS] = useState<AffiliateSettings>(() => load(AFFILIATE_KEY, DEFAULT_AFFILIATE));
  const set = (k: keyof AffiliateSettings, v: any) => setS((a) => ({ ...a, [k]: v }));

  const save = () => {
    localStorage.setItem(AFFILIATE_KEY, JSON.stringify(s));
    toast({ title: "Cài đặt affiliate đã lưu" });
  };

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
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={s.enabled} onChange={(e) => set("enabled", e.target.checked)} />
            <div className="w-10 h-5 bg-muted peer-checked:bg-primary rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:w-4 after:h-4 after:rounded-full after:transition-all peer-checked:after:translate-x-5" />
          </label>
        </div>

        <div className={`p-5 space-y-5 ${!s.enabled ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Hoa hồng mặc định (%)</label>
              <input type="number" min={0} max={100}
                className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
                value={s.defaultCommission} onChange={(e) => set("defaultCommission", parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Cookie theo dõi (ngày)</label>
              <input type="number" min={1}
                className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
                value={s.cookieDuration} onChange={(e) => set("cookieDuration", parseInt(e.target.value) || 30)} />
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-muted-foreground mb-1.5">Số dư tối thiểu để rút (VND)</label>
              <input type="number"
                className="w-full border border-primary/20 focus:border-primary bg-background px-3 py-2 text-sm text-foreground outline-none"
                value={s.minPayout} onChange={(e) => set("minPayout", parseInt(e.target.value) || 0)} />
            </div>
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
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={s[key]}
                    onChange={(e) => set(key, e.target.checked)} />
                  <div className="w-10 h-5 bg-muted peer-checked:bg-primary rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:w-4 after:h-4 after:rounded-full after:transition-all peer-checked:after:translate-x-5" />
                </label>
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

export default function AdminSettings() {
  const [tab, setTab] = useState<Tab>("payment");

  const TABS: { key: Tab; icon: any; label: string }[] = [
    { key: "payment",   icon: CreditCard, label: "Thanh toán" },
    { key: "general",   icon: Settings,   label: "Cài đặt chung" },
    { key: "affiliate", icon: Link2,      label: "Affiliate" },
  ];

  return (
    <AdminGuard>
      <AdminLayout title="Cài đặt Hệ thống" subtitle="Thanh toán, cài đặt chung và chương trình affiliate">
        <div className="flex gap-0 mb-6 border-b border-primary/20">
          {TABS.map(({ key, icon: Icon, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm border-b-2 transition-all -mb-px ${
                tab === key ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground hover:border-primary/30"
              }`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {tab === "payment"   && <PaymentTab />}
        {tab === "general"   && <GeneralTab />}
        {tab === "affiliate" && <AffiliateTab />}
      </AdminLayout>
    </AdminGuard>
  );
}
