import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw, Copy, Eye, EyeOff, MessageSquare, Mail, Webhook, Hotel, CheckCircle2, XCircle,
  AlertTriangle, Clock, Building2, Smartphone, ExternalLink,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "";

interface SecretsResponse {
  sms:   { enabled: boolean; secret: string };
  casso: { enabled: boolean; secret: string };
  email: { enabled: boolean; secret: string };
}

interface PaySettingsPublic {
  payAtHotel: { enabled: boolean };
}

interface AttemptRow {
  id: number;
  bookingId: number | null;
  source: string;
  status: string;
  externalRef: string | null;
  amount: number | null;
  rawPayload: any;
  note: string | null;
  createdAt: string;
}

const STATUS_META: Record<string, { color: string; icon: any; label: string }> = {
  success:          { color: "text-emerald-400 border-emerald-400/40 bg-emerald-400/10", icon: CheckCircle2, label: "Thành công" },
  duplicate:        { color: "text-blue-400 border-blue-400/40 bg-blue-400/10",          icon: CheckCircle2, label: "Trùng (đã confirm)" },
  no_match:         { color: "text-amber-400 border-amber-400/40 bg-amber-400/10",       icon: AlertTriangle, label: "Không khớp đơn" },
  amount_mismatch:  { color: "text-orange-400 border-orange-400/40 bg-orange-400/10",    icon: AlertTriangle, label: "Sai số tiền" },
  expired:          { color: "text-red-400 border-red-400/40 bg-red-400/10",             icon: Clock,        label: "Hết hạn" },
  wrong_status:     { color: "text-red-400 border-red-400/40 bg-red-400/10",             icon: XCircle,      label: "Sai trạng thái" },
  error:            { color: "text-red-400 border-red-400/40 bg-red-400/10",             icon: XCircle,      label: "Lỗi" },
};

const SOURCE_META: Record<string, { icon: any; label: string }> = {
  sms:          { icon: MessageSquare, label: "SMS" },
  casso:        { icon: Webhook,       label: "Casso" },
  sepay:        { icon: Webhook,       label: "SePay" },
  email:        { icon: Mail,          label: "Email" },
  pay_at_hotel: { icon: Hotel,         label: "Trả tại KS" },
  admin_manual: { icon: Building2,     label: "Admin" },
  momo:         { icon: Smartphone,    label: "MoMo" },
  internal:     { icon: Hotel,         label: "Nội bộ" },
};

export default function AdminPaymentConfirm() {
  return (
    <AdminGuard>
      <AdminLayout title="Xác nhận thanh toán tự động" subtitle="Tích hợp các phương thức nhận và xác nhận thanh toán không qua cổng bên thứ 3">
        <Tabs defaultValue="config">
          <TabsList className="rounded-none">
            <TabsTrigger value="config" className="rounded-none">Cấu hình kênh</TabsTrigger>
            <TabsTrigger value="log"    className="rounded-none">Lịch sử xác nhận</TabsTrigger>
            <TabsTrigger value="howto"  className="rounded-none">Hướng dẫn</TabsTrigger>
          </TabsList>
          <TabsContent value="config" className="mt-6 space-y-6">
            <PayAtHotelToggle />
            <ChannelCard channel="sms"   title="Quét SMS ngân hàng"   icon={MessageSquare}
              description="App Android forward SMS biến động số dư về URL này. Server tự parse 'MDH<id>' + số tiền và confirm." />
            <ChannelCard channel="casso" title="Casso / SePay webhook" icon={Webhook}
              description="Dịch vụ trung gian VN cho phép nhận webhook khi có tiền vào tài khoản. Hỗ trợ cả 2 format Casso và SePay." />
            <ChannelCard channel="email" title="Email parser"           icon={Mail}
              description="Forward email biến động số dư từ ngân hàng. Hỗ trợ Cloudflare Email Workers, Postmark inbound, n8n..." />
          </TabsContent>
          <TabsContent value="log" className="mt-6">
            <AttemptLog />
          </TabsContent>
          <TabsContent value="howto" className="mt-6">
            <HowToPanel />
          </TabsContent>
        </Tabs>
      </AdminLayout>
    </AdminGuard>
  );
}

// ─────────────────────────────────────────────────────────────────────
function PayAtHotelToggle() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/payments/settings`).then((r) => r.json()).then((d: PaySettingsPublic) => {
      setEnabled(!!d?.payAtHotel?.enabled);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function toggle(v: boolean) {
    setEnabled(v);
    try {
      const r = await fetch(`${API}/api/admin/payment-confirm/toggle`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "payAtHotel", enabled: v }),
      });
      if (!r.ok) throw new Error(await r.text());
      toast({ title: "Đã cập nhật", description: `Đặt giữ chỗ — trả tại KS: ${v ? "Bật" : "Tắt"}` });
    } catch (e: any) {
      setEnabled(!v);
      toast({ title: "Lỗi", description: e.message, variant: "destructive" });
    }
  }

  return (
    <Card className="p-5 rounded-none border-primary/20">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-primary/10 text-primary"><Hotel size={20} /></div>
          <div>
            <h3 className="font-serif text-lg text-foreground mb-1">Đặt giữ chỗ — Thanh toán tại khách sạn</h3>
            <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
              Khách bấm giữ chỗ, hệ thống tự confirm <strong>không cần thanh toán online</strong>.
              Khách sẽ trả tiền trực tiếp khi đến khách sạn. Phù hợp cho khách quen / đặt qua điện thoại / khách VIP.
              <span className="block mt-1 text-amber-400/80">⚠ Khi bật, bất kỳ ai cũng có thể đặt phòng mà không cần trả tiền — chỉ bật khi bạn chấp nhận rủi ro no-show.</span>
            </p>
          </div>
        </div>
        {!loading && <Switch checked={enabled} onCheckedChange={toggle} />}
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
function ChannelCard({ channel, title, icon: Icon, description }: { channel: "sms" | "casso" | "email"; title: string; icon: any; description: string }) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const webhookPath = channel === "sms"   ? "/api/payments/sms-webhook"
                    : channel === "casso" ? "/api/payments/casso-webhook"
                                          : "/api/payments/email-webhook";
  const webhookUrl = `${window.location.origin}${webhookPath}`;

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const r = await fetch(`${API}/api/admin/payment-confirm/secrets`, { credentials: "include" });
      const data: SecretsResponse = await r.json();
      setEnabled(data[channel].enabled);
      setSecret(data[channel].secret);
    } finally { setLoading(false); }
  }

  async function toggle(v: boolean) {
    if (v && !secret) {
      const ok = await regenerate(true);
      if (!ok) return;
    }
    setEnabled(v);
    try {
      await fetch(`${API}/api/admin/payment-confirm/toggle`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, enabled: v }),
      });
      toast({ title: "Đã cập nhật", description: `${title}: ${v ? "Bật" : "Tắt"}` });
    } catch (e: any) {
      setEnabled(!v);
      toast({ title: "Lỗi", description: e.message, variant: "destructive" });
    }
  }

  async function regenerate(silent = false): Promise<boolean> {
    if (!silent && !confirm("Sinh secret mới? Các integration cũ sẽ ngừng hoạt động và phải cập nhật.")) return false;
    setRegenerating(true);
    try {
      const r = await fetch(`${API}/api/admin/payment-confirm/regenerate`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json();
      setSecret(d.secret);
      if (!silent) toast({ title: "Đã sinh secret mới", description: "Hãy cập nhật vào app forwarder." });
      return true;
    } catch (e: any) {
      toast({ title: "Lỗi", description: e.message, variant: "destructive" });
      return false;
    } finally { setRegenerating(false); }
  }

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast({ title: `Đã sao chép ${label}` });
  }

  if (loading) return <Card className="p-8 rounded-none border-primary/20 text-center text-muted-foreground">Đang tải...</Card>;

  return (
    <Card className="p-5 rounded-none border-primary/20">
      <div className="flex items-start justify-between gap-6 mb-5">
        <div className="flex items-start gap-4">
          <div className={`p-3 ${enabled ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}><Icon size={20} /></div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-serif text-lg text-foreground">{title}</h3>
              {enabled && <Badge className="rounded-none text-[10px] tracking-widest uppercase bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Đang bật</Badge>}
            </div>
            <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">{description}</p>
          </div>
        </div>
        <Switch checked={enabled} onCheckedChange={toggle} />
      </div>

      <div className="space-y-3 pl-14">
        <div>
          <Label className="text-[10px] tracking-widest uppercase mb-1 block">Webhook URL</Label>
          <div className="flex gap-2">
            <Input value={webhookUrl} readOnly className="rounded-none font-mono text-xs" />
            <Button type="button" variant="outline" size="sm" className="rounded-none shrink-0" onClick={() => copy(webhookUrl, "URL")}>
              <Copy size={12} />
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-[10px] tracking-widest uppercase mb-1 block">Secret token</Label>
          <div className="flex gap-2">
            <Input
              value={showSecret ? secret : (secret ? "•".repeat(Math.min(secret.length, 32)) : "(chưa sinh)")}
              readOnly className="rounded-none font-mono text-xs"
            />
            <Button type="button" variant="outline" size="sm" className="rounded-none shrink-0" onClick={() => setShowSecret((s) => !s)}>
              {showSecret ? <EyeOff size={12} /> : <Eye size={12} />}
            </Button>
            <Button type="button" variant="outline" size="sm" className="rounded-none shrink-0" disabled={!secret} onClick={() => copy(secret, "secret")}>
              <Copy size={12} />
            </Button>
            <Button type="button" variant="outline" size="sm" className="rounded-none shrink-0" disabled={regenerating} onClick={() => regenerate()}>
              <RefreshCw size={12} className={regenerating ? "animate-spin" : ""} />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">
            Gửi qua header <code className="bg-secondary/30 px-1">Authorization: Bearer {"<secret>"}</code>
            {channel === "casso" && <> hoặc <code className="bg-secondary/30 px-1">Apikey {"<secret>"}</code></>}
            {" "}hoặc <code className="bg-secondary/30 px-1">X-Webhook-Secret: {"<secret>"}</code>
          </p>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
function AttemptLog() {
  const [rows, setRows] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/admin/payment-attempts?limit=100`, { credentials: "include" });
      setRows(await r.json());
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  return (
    <Card className="rounded-none border-primary/20">
      <div className="flex items-center justify-between p-4 border-b border-primary/15">
        <h3 className="font-serif text-lg text-foreground">Lịch sử xác nhận thanh toán</h3>
        <Button variant="outline" size="sm" className="rounded-none" onClick={load}>
          <RefreshCw size={12} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} /> Tải lại
        </Button>
      </div>

      {loading && <div className="p-10 text-center text-muted-foreground">Đang tải...</div>}
      {!loading && rows.length === 0 && (
        <div className="p-10 text-center text-muted-foreground text-sm">
          Chưa có attempt nào. Khi webhook nhận được request, sẽ hiển thị tại đây.
        </div>
      )}
      {!loading && rows.length > 0 && (
        <div className="divide-y divide-primary/10">
          {rows.map((r) => {
            const sm = STATUS_META[r.status] ?? STATUS_META.error;
            const SIcon = sm.icon;
            const src = SOURCE_META[r.source] ?? SOURCE_META.internal;
            const SrcIcon = src.icon;
            const isOpen = expanded === r.id;
            return (
              <div key={r.id} className="px-4 py-3 hover:bg-secondary/5 transition-colors">
                <button onClick={() => setExpanded(isOpen ? null : r.id)} className="w-full flex items-center gap-4 text-left">
                  <SrcIcon size={16} className="text-primary/60 shrink-0" />
                  <div className="text-xs tracking-widest uppercase text-muted-foreground w-16 shrink-0">{src.label}</div>
                  <Badge className={`rounded-none text-[10px] tracking-widest uppercase border ${sm.color} shrink-0`}>
                    <SIcon size={10} className="mr-1" /> {sm.label}
                  </Badge>
                  <div className="flex-1 text-sm">
                    {r.bookingId ? <>Đơn <span className="font-serif text-primary">#{r.bookingId}</span></> : <span className="text-muted-foreground">— Không match —</span>}
                    {r.amount != null && <span className="ml-3 text-foreground/80">{new Intl.NumberFormat("vi-VN").format(r.amount)} ₫</span>}
                  </div>
                  <div className="text-[10px] text-muted-foreground tracking-widest uppercase shrink-0">
                    {new Date(r.createdAt).toLocaleString("vi-VN")}
                  </div>
                </button>
                {isOpen && (
                  <div className="mt-3 ml-9 p-3 bg-secondary/10 border border-primary/10 text-xs space-y-2">
                    {r.note && <div><span className="text-muted-foreground">Ghi chú:</span> {r.note}</div>}
                    {r.externalRef && <div><span className="text-muted-foreground">External ref:</span> <code>{r.externalRef}</code></div>}
                    <div>
                      <span className="text-muted-foreground">Raw payload:</span>
                      <pre className="mt-1 p-2 bg-black/40 text-[10px] overflow-auto max-h-48 font-mono">{JSON.stringify(r.rawPayload, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────
function HowToPanel() {
  return (
    <div className="space-y-6 max-w-4xl">
      <Card className="p-5 rounded-none border-primary/20">
        <div className="flex items-start gap-3 mb-3">
          <MessageSquare className="text-primary mt-1" size={18} />
          <h3 className="font-serif text-lg text-foreground">Cách 1 — Quét SMS biến động số dư (rẻ nhất)</h3>
        </div>
        <ol className="text-sm text-foreground/80 space-y-2 list-decimal pl-6 leading-relaxed">
          <li>Đăng ký SMS biến động số dư với ngân hàng cho 1 SIM (miễn phí hoặc ~10k/tháng).</li>
          <li>Cắm SIM vào 1 điện thoại Android cũ (luôn cắm sạc, để chế độ máy bay tắt SMS).</li>
          <li>Cài app <strong>SMS Forwarder</strong> (Play Store, free) hoặc <strong>SMS Gateway</strong>.</li>
          <li>Trong app, thêm rule forward HTTP với:
            <ul className="list-disc pl-6 mt-1">
              <li>URL: webhook URL ở tab cấu hình</li>
              <li>Method: POST, Body: <code>{`{"message":"%text%","from":"%from%"}`}</code></li>
              <li>Header: <code>Authorization: Bearer YOUR_SECRET</code></li>
              <li>Filter: chỉ forward SMS từ ngân hàng (vd: BIDV, VCB, ACB)</li>
            </ul>
          </li>
          <li>Khi đặt phòng, khách phải ghi nội dung chuyển khoản chứa <code>MDH&lt;mã đơn&gt;</code> (vd: <code>MDH123</code>).</li>
        </ol>
      </Card>

      <Card className="p-5 rounded-none border-primary/20">
        <div className="flex items-start gap-3 mb-3">
          <Webhook className="text-primary mt-1" size={18} />
          <h3 className="font-serif text-lg text-foreground">Cách 2 — Casso / SePay (chuyên nghiệp, miễn phí gói cơ bản)</h3>
        </div>
        <ol className="text-sm text-foreground/80 space-y-2 list-decimal pl-6 leading-relaxed">
          <li>Đăng ký tài khoản tại <a href="https://casso.vn" target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-1">casso.vn <ExternalLink size={11}/></a> hoặc <a href="https://sepay.vn" target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-1">sepay.vn <ExternalLink size={11}/></a>.</li>
          <li>Liên kết tài khoản ngân hàng nhận tiền (qua Internet Banking).</li>
          <li>Tạo webhook endpoint trỏ về URL ở tab cấu hình.</li>
          <li>Nhập secret token vào ô "Apikey" (Casso) hoặc "Authorization Header" (SePay).</li>
          <li>Khách chuyển khoản với nội dung <code>MDH&lt;mã đơn&gt;</code>, hệ thống nhận webhook và confirm tự động trong vài giây.</li>
        </ol>
      </Card>

      <Card className="p-5 rounded-none border-primary/20">
        <div className="flex items-start gap-3 mb-3">
          <Mail className="text-primary mt-1" size={18} />
          <h3 className="font-serif text-lg text-foreground">Cách 3 — Email parser (backup)</h3>
        </div>
        <ol className="text-sm text-foreground/80 space-y-2 list-decimal pl-6 leading-relaxed">
          <li>Đăng ký email biến động số dư với ngân hàng.</li>
          <li>Tạo Cloudflare Email Worker / Postmark inbound / n8n webhook để forward về URL ở tab cấu hình.</li>
          <li>Body POST nên là <code>{`{"subject":"...","body":"...","from":"..."}`}</code>.</li>
          <li>Header: <code>Authorization: Bearer YOUR_SECRET</code>.</li>
        </ol>
        <p className="text-xs text-amber-400/80 mt-3">⚠ Email thường delay 1-5 phút, dùng làm backup cho cách 1 hoặc 2.</p>
      </Card>

      <Card className="p-5 rounded-none border-primary/20 bg-amber-500/5">
        <h3 className="font-serif text-lg text-foreground mb-2">Quy ước nội dung chuyển khoản</h3>
        <p className="text-sm text-foreground/80 mb-3">Để tự động khớp đơn, khách cần ghi nội dung chuyển khoản theo định dạng:</p>
        <div className="bg-black/40 p-3 font-mono text-sm text-primary border border-primary/20 mb-2">MDH&lt;mã_đơn&gt;</div>
        <p className="text-xs text-muted-foreground">Hệ thống cũng nhận các tiền tố: <code>MD</code>, <code>BOOKING</code>, <code>BOOK</code>, <code>DAT</code>. Khi tạo đơn, nội dung mặc định trong VietQR đã có sẵn — khách chỉ cần quét QR và chuyển.</p>
      </Card>
    </div>
  );
}
