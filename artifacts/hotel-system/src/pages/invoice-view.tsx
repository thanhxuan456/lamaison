import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Printer, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBranding } from "@/lib/branding";
import type { InvoiceIntegration } from "./admin/integrations";

const API = import.meta.env.VITE_API_URL ?? "";
const INVOICE_CFG_KEY = "gp-invoice-integration";

function useInvoiceConfig(): InvoiceIntegration {
  const defaults: InvoiceIntegration = {
    customLogoUrl: "", useCustomLogo: false, template: "luxury",
    customUrlPrefix: "/invoices", useCustomUrl: false,
    showTaxId: false, taxId: "", footerNote: "", showQrCode: false,
  };
  try {
    const s = localStorage.getItem(INVOICE_CFG_KEY);
    return s ? { ...defaults, ...JSON.parse(s) } : defaults;
  } catch { return defaults; }
}

interface InvoiceLine { description: string; quantity: number; unitPrice: number; amount: number; }

interface Invoice {
  id: number; invoiceNumber: string; bookingId: number;
  customerName: string; customerEmail: string; customerPhone: string; customerAddress: string;
  lines: InvoiceLine[]; subtotal: string; taxRate: string; taxAmount: string;
  discount: string; total: string; currency: string; status: string; issuedAt: string; notes: string;
  hotel?: { name: string; city: string; address: string; imageUrl: string };
  booking?: { checkInDate: string; checkOutDate: string };
}

const STATUS_LABELS: Record<string, string> = {
  draft: "NHÁP", issued: "ĐÃ PHÁT HÀNH", paid: "ĐÃ THANH TOÁN", cancelled: "ĐÃ HỦY",
};

// ── Template: Luxury (gold/dark) ─────────────────────────────────────────────
function LuxuryTemplate({ invoice, cfg, branding, fmt }: {
  invoice: Invoice; cfg: InvoiceIntegration; branding: any; fmt: (n: string | number) => string;
}) {
  const logoUrl = cfg.useCustomLogo && cfg.customLogoUrl ? cfg.customLogoUrl : (branding.useImageLogo ? branding.logoUrl : null);
  return (
    <div className="max-w-4xl mx-auto bg-card border border-primary/30 print:border-none shadow-[0_8px_32px_rgba(0,0,0,0.12)] print:shadow-none">
      {/* Header */}
      <div className="relative bg-secondary text-secondary-foreground p-8 border-b-2 border-primary print:bg-white print:text-foreground">
        <div className="absolute top-4 left-4 w-16 h-16 border-t-2 border-l-2 border-primary opacity-40" />
        <div className="absolute top-4 right-4 w-16 h-16 border-t-2 border-r-2 border-primary opacity-40" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img src={logoUrl} alt={branding.brandName}
                className="w-16 h-16 object-contain border-2 border-primary p-1 bg-white print:bg-transparent" />
            ) : (
              <div className="w-16 h-16 border-2 border-primary flex items-center justify-center relative">
                <div className="absolute -top-1 -left-1 w-2 h-2 rotate-45 bg-primary" />
                <div className="absolute -top-1 -right-1 w-2 h-2 rotate-45 bg-primary" />
                <div className="absolute -bottom-1 -left-1 w-2 h-2 rotate-45 bg-primary" />
                <div className="absolute -bottom-1 -right-1 w-2 h-2 rotate-45 bg-primary" />
                <span className="font-serif text-2xl text-primary">{(branding.brandName || "G").charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div>
              <h1 className="font-serif text-3xl text-primary tracking-[0.1em] uppercase">{branding.brandName}</h1>
              <p className="text-[10px] uppercase tracking-[0.4em] text-primary/70 mt-1">{branding.tagline}</p>
              {cfg.showTaxId && cfg.taxId && <p className="text-xs text-muted-foreground mt-1">MST: {cfg.taxId}</p>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-[0.4em] text-primary/70 mb-1">Hóa Đơn</div>
            <div className="font-mono text-xl text-primary">{invoice.invoiceNumber}</div>
            <div className="mt-2 inline-block px-3 py-1 border border-primary text-primary text-[10px] uppercase tracking-widest">
              {STATUS_LABELS[invoice.status] ?? invoice.status}
            </div>
          </div>
        </div>
      </div>
      {/* Bill to */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 border-b border-primary/15">
        <div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary/70 mb-3">Khách hàng</div>
          <div className="font-serif text-lg text-foreground">{invoice.customerName}</div>
          <div className="text-sm text-muted-foreground mt-1">{invoice.customerEmail}</div>
          {invoice.customerPhone && <div className="text-sm text-muted-foreground">{invoice.customerPhone}</div>}
          {invoice.customerAddress && <div className="text-sm text-muted-foreground mt-1 max-w-xs">{invoice.customerAddress}</div>}
        </div>
        <div className="md:text-right">
          <div className="text-[10px] uppercase tracking-[0.3em] text-primary/70 mb-3">Thông tin hóa đơn</div>
          <div className="grid grid-cols-2 gap-y-1 text-sm">
            <span className="text-muted-foreground">Ngày phát hành:</span>
            <span className="text-foreground">{new Date(invoice.issuedAt).toLocaleDateString("vi-VN")}</span>
            <span className="text-muted-foreground">Mã booking:</span>
            <span className="text-foreground font-mono">#{invoice.bookingId}</span>
            {invoice.hotel && (<><span className="text-muted-foreground">Cơ sở:</span><span className="text-foreground">{invoice.hotel.city}</span></>)}
            {invoice.booking && (<><span className="text-muted-foreground">Lưu trú:</span><span className="text-foreground text-xs">{invoice.booking.checkInDate} → {invoice.booking.checkOutDate}</span></>)}
          </div>
        </div>
      </div>
      {/* Lines */}
      <div className="p-8">
        <table className="w-full text-sm">
          <thead><tr className="border-b-2 border-primary text-left text-[10px] uppercase tracking-widest text-primary">
            <th className="py-3">Mô tả</th><th className="py-3 text-center w-20">SL</th>
            <th className="py-3 text-right w-32">Đơn giá</th><th className="py-3 text-right w-32">Thành tiền</th>
          </tr></thead>
          <tbody>{invoice.lines.map((line, i) => (
            <tr key={i} className="border-b border-primary/10">
              <td className="py-3 text-foreground">{line.description}</td>
              <td className="py-3 text-center text-muted-foreground">{line.quantity}</td>
              <td className="py-3 text-right text-muted-foreground">{fmt(line.unitPrice)} ₫</td>
              <td className="py-3 text-right text-foreground font-medium">{fmt(line.amount)} ₫</td>
            </tr>
          ))}</tbody>
        </table>
        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-xs space-y-2">
            <Row label="Tạm tính" value={`${fmt(invoice.subtotal)} ₫`} />
            {Number(invoice.discount) > 0 && <Row label="Giảm giá" value={`- ${fmt(invoice.discount)} ₫`} />}
            <Row label={`Thuế VAT (${Number(invoice.taxRate)}%)`} value={`${fmt(invoice.taxAmount)} ₫`} />
            <div className="border-t-2 border-primary pt-3 mt-3 flex justify-between items-baseline">
              <span className="text-[10px] uppercase tracking-[0.3em] text-primary/70">Tổng cộng</span>
              <span className="font-serif text-3xl text-primary font-semibold">{fmt(invoice.total)} ₫</span>
            </div>
          </div>
        </div>
        {invoice.notes && (
          <div className="mt-8 pt-6 border-t border-primary/15">
            <div className="text-[10px] uppercase tracking-[0.3em] text-primary/70 mb-2">Ghi chú</div>
            <p className="text-sm text-muted-foreground">{invoice.notes}</p>
          </div>
        )}
        <div className="mt-10 pt-6 border-t border-primary/15 text-center">
          <p className="text-xs text-muted-foreground italic">{cfg.footerNote || `Cảm ơn quý khách đã lựa chọn ${branding.brandName}.`}</p>
          <div className="mt-3 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.3em] text-primary/60">
            <span>contact@maisondeluxe.vn</span> · <span>+84 1800 9999</span> · <span>maisondeluxe.vn</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Template: Corporate (blue/professional) ───────────────────────────────────
function CorporateTemplate({ invoice, cfg, branding, fmt }: {
  invoice: Invoice; cfg: InvoiceIntegration; branding: any; fmt: (n: string | number) => string;
}) {
  const logoUrl = cfg.useCustomLogo && cfg.customLogoUrl ? cfg.customLogoUrl : (branding.useImageLogo ? branding.logoUrl : null);
  const blue = "#1e3a5f";
  return (
    <div className="max-w-4xl mx-auto bg-white text-gray-900 shadow-xl print:shadow-none border border-gray-200 print:border-none">
      {/* Header bar */}
      <div style={{ backgroundColor: blue }} className="p-8 text-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {logoUrl ? (
              <img src={logoUrl} alt={branding.brandName} className="h-14 w-auto object-contain bg-white rounded p-1" />
            ) : (
              <div className="w-14 h-14 bg-white/20 border border-white/40 flex items-center justify-center rounded">
                <span className="font-bold text-2xl text-white">{(branding.brandName || "G").charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-wide uppercase">{branding.brandName}</h1>
              {branding.tagline && <p className="text-xs text-white/70 mt-0.5">{branding.tagline}</p>}
              {cfg.showTaxId && cfg.taxId && <p className="text-xs text-white/70 mt-0.5">MST: {cfg.taxId}</p>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/60 uppercase tracking-widest mb-1">HÓA ĐƠN DỊCH VỤ</div>
            <div className="text-2xl font-mono font-bold">{invoice.invoiceNumber}</div>
            <div className="mt-2 inline-block px-3 py-1 bg-white/20 border border-white/40 text-xs uppercase tracking-widest rounded">
              {STATUS_LABELS[invoice.status] ?? invoice.status}
            </div>
          </div>
        </div>
      </div>
      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-b border-gray-200">
        <div className="p-8 border-r border-gray-100">
          <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: blue }}>Khách hàng</div>
          <div className="text-lg font-semibold">{invoice.customerName}</div>
          <div className="text-sm text-gray-500 mt-1">{invoice.customerEmail}</div>
          {invoice.customerPhone && <div className="text-sm text-gray-500">{invoice.customerPhone}</div>}
          {invoice.customerAddress && <div className="text-sm text-gray-500 mt-1">{invoice.customerAddress}</div>}
        </div>
        <div className="p-8">
          <div className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: blue }}>Chi tiết hóa đơn</div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Ngày phát hành</span><span>{new Date(invoice.issuedAt).toLocaleDateString("vi-VN")}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Mã booking</span><span className="font-mono">#{invoice.bookingId}</span></div>
            {invoice.hotel && <div className="flex justify-between"><span className="text-gray-500">Cơ sở</span><span>{invoice.hotel.city}</span></div>}
            {invoice.booking && <div className="flex justify-between"><span className="text-gray-500">Lưu trú</span><span className="text-xs">{invoice.booking.checkInDate} → {invoice.booking.checkOutDate}</span></div>}
          </div>
        </div>
      </div>
      {/* Lines */}
      <div className="p-8">
        <table className="w-full text-sm">
          <thead><tr style={{ backgroundColor: blue + "15", color: blue }} className="text-left text-xs font-bold uppercase tracking-widest">
            <th className="py-3 px-2">Mô tả</th><th className="py-3 px-2 text-center w-16">SL</th>
            <th className="py-3 px-2 text-right w-32">Đơn giá</th><th className="py-3 px-2 text-right w-32">Thành tiền</th>
          </tr></thead>
          <tbody>{invoice.lines.map((line, i) => (
            <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
              <td className="py-3 px-2">{line.description}</td>
              <td className="py-3 px-2 text-center text-gray-500">{line.quantity}</td>
              <td className="py-3 px-2 text-right text-gray-500">{fmt(line.unitPrice)} ₫</td>
              <td className="py-3 px-2 text-right font-semibold">{fmt(line.amount)} ₫</td>
            </tr>
          ))}</tbody>
        </table>
        <div className="mt-6 flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Tạm tính</span><span>{fmt(invoice.subtotal)} ₫</span></div>
            {Number(invoice.discount) > 0 && <div className="flex justify-between text-sm"><span className="text-gray-500">Giảm giá</span><span>- {fmt(invoice.discount)} ₫</span></div>}
            <div className="flex justify-between text-sm"><span className="text-gray-500">Thuế VAT ({Number(invoice.taxRate)}%)</span><span>{fmt(invoice.taxAmount)} ₫</span></div>
            <div className="border-t-2 pt-3 flex justify-between items-center" style={{ borderColor: blue }}>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: blue }}>Tổng cộng</span>
              <span className="text-2xl font-bold" style={{ color: blue }}>{fmt(invoice.total)} ₫</span>
            </div>
          </div>
        </div>
        {invoice.notes && (
          <div className="mt-8 pt-6 border-t border-gray-100">
            <div className="text-xs font-bold uppercase tracking-widest mb-2 text-gray-500">Ghi chú</div>
            <p className="text-sm text-gray-500">{invoice.notes}</p>
          </div>
        )}
        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">{cfg.footerNote || `Cảm ơn quý khách đã lựa chọn ${branding.brandName}.`}</p>
          <div className="mt-2 text-xs text-gray-400">contact@maisondeluxe.vn · +84 1800 9999 · maisondeluxe.vn</div>
        </div>
      </div>
    </div>
  );
}

// ── Template: Minimal (white/clean) ──────────────────────────────────────────
function MinimalTemplate({ invoice, cfg, branding, fmt }: {
  invoice: Invoice; cfg: InvoiceIntegration; branding: any; fmt: (n: string | number) => string;
}) {
  const logoUrl = cfg.useCustomLogo && cfg.customLogoUrl ? cfg.customLogoUrl : (branding.useImageLogo ? branding.logoUrl : null);
  return (
    <div className="max-w-3xl mx-auto bg-white text-gray-900 shadow-sm print:shadow-none border border-gray-100 print:border-none p-10 md:p-14">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-10 pb-8 border-b border-gray-200">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt={branding.brandName} className="h-12 w-auto object-contain" />
          ) : (
            <span className="font-bold text-2xl tracking-tight">{branding.brandName}</span>
          )}
        </div>
        <div className="text-right">
          <div className="text-3xl font-light tracking-tight text-gray-400">Hóa đơn</div>
          <div className="text-lg font-mono text-gray-900 mt-1">{invoice.invoiceNumber}</div>
          <div className="mt-1 text-xs text-gray-400 uppercase tracking-widest">{STATUS_LABELS[invoice.status] ?? invoice.status}</div>
        </div>
      </div>
      {/* Meta */}
      <div className="grid grid-cols-2 gap-10 mb-10">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Kính gửi</div>
          <div className="font-semibold text-lg">{invoice.customerName}</div>
          <div className="text-sm text-gray-500">{invoice.customerEmail}</div>
          {invoice.customerPhone && <div className="text-sm text-gray-500">{invoice.customerPhone}</div>}
          {cfg.showTaxId && cfg.taxId && <div className="text-xs text-gray-400 mt-1">MST: {cfg.taxId}</div>}
        </div>
        <div className="text-right">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Thông tin</div>
          <div className="text-sm text-gray-500">Ngày: <span className="text-gray-900">{new Date(invoice.issuedAt).toLocaleDateString("vi-VN")}</span></div>
          <div className="text-sm text-gray-500">Booking: <span className="font-mono text-gray-900">#{invoice.bookingId}</span></div>
          {invoice.hotel && <div className="text-sm text-gray-500">Cơ sở: <span className="text-gray-900">{invoice.hotel.city}</span></div>}
        </div>
      </div>
      {/* Lines */}
      <table className="w-full text-sm mb-8">
        <thead><tr className="border-b border-gray-200 text-[10px] uppercase tracking-widest text-gray-400 text-left">
          <th className="py-2">Mô tả</th><th className="py-2 text-center w-16">SL</th>
          <th className="py-2 text-right w-28">Đơn giá</th><th className="py-2 text-right w-28">Thành tiền</th>
        </tr></thead>
        <tbody>{invoice.lines.map((line, i) => (
          <tr key={i} className="border-b border-gray-50">
            <td className="py-3">{line.description}</td>
            <td className="py-3 text-center text-gray-400">{line.quantity}</td>
            <td className="py-3 text-right text-gray-400">{fmt(line.unitPrice)} ₫</td>
            <td className="py-3 text-right">{fmt(line.amount)} ₫</td>
          </tr>
        ))}</tbody>
      </table>
      {/* Totals */}
      <div className="flex justify-end mb-10">
        <div className="w-56 space-y-1.5 text-sm">
          <div className="flex justify-between"><span className="text-gray-400">Tạm tính</span><span>{fmt(invoice.subtotal)} ₫</span></div>
          {Number(invoice.discount) > 0 && <div className="flex justify-between"><span className="text-gray-400">Giảm giá</span><span>- {fmt(invoice.discount)} ₫</span></div>}
          <div className="flex justify-between"><span className="text-gray-400">VAT ({Number(invoice.taxRate)}%)</span><span>{fmt(invoice.taxAmount)} ₫</span></div>
          <div className="flex justify-between pt-3 border-t border-gray-900 font-semibold text-base">
            <span>Tổng cộng</span><span>{fmt(invoice.total)} ₫</span>
          </div>
        </div>
      </div>
      {invoice.notes && (
        <div className="mb-8 text-sm text-gray-500"><span className="font-semibold text-gray-700">Ghi chú: </span>{invoice.notes}</div>
      )}
      <div className="border-t border-gray-100 pt-6 text-xs text-gray-400 text-center">
        {cfg.footerNote || `Cảm ơn quý khách đã lựa chọn ${branding.brandName}.`}<br />
        contact@maisondeluxe.vn · +84 1800 9999 · maisondeluxe.vn
      </div>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────
export default function InvoiceView() {
  const [, params] = useRoute("/invoices/:id");
  const id = params?.id;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const { branding } = useBranding();
  const cfg = useInvoiceConfig();

  useEffect(() => {
    if (!id) return;
    fetch(`${API}/api/invoices/${id}`)
      .then(r => r.json())
      .then(d => { setInvoice(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Đang tải hóa đơn...</div>;
  if (!invoice) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Không tìm thấy hóa đơn.</div>;

  const fmt = (n: string | number) => Number(n).toLocaleString("vi-VN");
  const bgClass = cfg.template === "minimal" ? "bg-gray-50" : cfg.template === "corporate" ? "bg-slate-100" : "bg-background";

  return (
    <div className={`min-h-screen py-8 px-4 ${bgClass}`}>
      {/* Top action bar — hidden when printing */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <Link href="/admin/invoices">
          <Button variant="outline" className="rounded-none"><ArrowLeft size={14} className="mr-2" /> Quay lại</Button>
        </Link>
        <div className="ml-auto flex gap-2">
          <Button onClick={() => window.print()} className="bg-primary text-primary-foreground rounded-none uppercase tracking-widest text-xs">
            <Printer size={14} className="mr-2" /> In / PDF
          </Button>
        </div>
      </div>

      {cfg.template === "corporate" ? (
        <CorporateTemplate invoice={invoice} cfg={cfg} branding={branding} fmt={fmt} />
      ) : cfg.template === "minimal" ? (
        <MinimalTemplate invoice={invoice} cfg={cfg} branding={branding} fmt={fmt} />
      ) : (
        <LuxuryTemplate invoice={invoice} cfg={cfg} branding={branding} fmt={fmt} />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
