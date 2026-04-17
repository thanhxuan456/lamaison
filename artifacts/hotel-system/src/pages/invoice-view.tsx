import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { ArrowLeft, Printer, Download, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";

const API = import.meta.env.VITE_API_URL ?? "";

interface InvoiceLine { description: string; quantity: number; unitPrice: number; amount: number; }

interface Invoice {
  id: number;
  invoiceNumber: string;
  bookingId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  lines: InvoiceLine[];
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  discount: string;
  total: string;
  currency: string;
  status: string;
  issuedAt: string;
  notes: string;
  hotel?: { name: string; city: string; address: string; imageUrl: string };
  booking?: { checkInDate: string; checkOutDate: string };
}

const STATUS_LABELS: Record<string, string> = {
  draft: "NHÁP", issued: "ĐÃ PHÁT HÀNH", paid: "ĐÃ THANH TOÁN", cancelled: "ĐÃ HỦY",
};

export default function InvoiceView() {
  const [, params] = useRoute("/invoices/:id");
  const id = params?.id;
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="min-h-screen bg-background py-8 px-4">
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

      {/* Invoice paper */}
      <div className="max-w-4xl mx-auto bg-card border border-primary/30 print:border-none shadow-[0_8px_32px_rgba(0,0,0,0.12)] print:shadow-none">
        {/* Header with logo */}
        <div className="relative bg-secondary text-secondary-foreground p-8 border-b-2 border-primary print:bg-white print:text-foreground">
          <div className="absolute top-4 left-4 w-16 h-16 border-t-2 border-l-2 border-primary opacity-40" />
          <div className="absolute top-4 right-4 w-16 h-16 border-t-2 border-r-2 border-primary opacity-40" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {/* Crown / brand mark logo */}
              <div className="w-16 h-16 border-2 border-primary flex items-center justify-center relative">
                <div className="absolute -top-1 -left-1 w-2 h-2 rotate-45 bg-primary" />
                <div className="absolute -top-1 -right-1 w-2 h-2 rotate-45 bg-primary" />
                <div className="absolute -bottom-1 -left-1 w-2 h-2 rotate-45 bg-primary" />
                <div className="absolute -bottom-1 -right-1 w-2 h-2 rotate-45 bg-primary" />
                <span className="font-serif text-2xl text-primary">G</span>
              </div>
              <div>
                <h1 className="font-serif text-3xl text-primary tracking-[0.1em] uppercase">Grand Palace</h1>
                <p className="text-[10px] uppercase tracking-[0.4em] text-primary/70 mt-1">Hotels & Resorts</p>
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

        {/* Bill to + meta */}
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
              {invoice.hotel && (
                <>
                  <span className="text-muted-foreground">Cơ sở:</span>
                  <span className="text-foreground">{invoice.hotel.city}</span>
                </>
              )}
              {invoice.booking && (
                <>
                  <span className="text-muted-foreground">Lưu trú:</span>
                  <span className="text-foreground text-xs">{invoice.booking.checkInDate} → {invoice.booking.checkOutDate}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="p-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-primary text-left text-[10px] uppercase tracking-widest text-primary">
                <th className="py-3">Mô tả</th>
                <th className="py-3 text-center w-20">SL</th>
                <th className="py-3 text-right w-32">Đơn giá</th>
                <th className="py-3 text-right w-32">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line, i) => (
                <tr key={i} className="border-b border-primary/10">
                  <td className="py-3 text-foreground">{line.description}</td>
                  <td className="py-3 text-center text-muted-foreground">{line.quantity}</td>
                  <td className="py-3 text-right text-muted-foreground">{fmt(line.unitPrice)} ₫</td>
                  <td className="py-3 text-right text-foreground font-medium">{fmt(line.amount)} ₫</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
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

          {/* Footer */}
          <div className="mt-10 pt-6 border-t border-primary/15 text-center">
            <p className="text-xs text-muted-foreground italic">Cảm ơn quý khách đã lựa chọn Grand Palace Hotels & Resorts.</p>
            <div className="mt-3 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.3em] text-primary/60">
              <span>contact@grandpalace.vn</span> · <span>+84 1800 9999</span> · <span>grandpalace.vn</span>
            </div>
          </div>
        </div>
      </div>
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
