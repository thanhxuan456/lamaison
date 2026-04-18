import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminGuard } from "./guard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Eye, FileText, Download, RefreshCw, Filter, Receipt, Check, Clock, X as XIcon } from "lucide-react";
import { useFormatPrice } from "@/lib/branding";

const API = import.meta.env.VITE_API_URL ?? "";

interface Invoice {
  id: number;
  invoiceNumber: string;
  bookingId: number;
  customerName: string;
  customerEmail: string;
  total: string;
  currency: string;
  status: string;
  issuedAt: string;
  paymentMethod: string;
}

const STATUS_META: Record<string, { label: string; cls: string; Icon: any }> = {
  draft:     { label: "Nháp",      cls: "bg-muted text-muted-foreground border-muted-foreground/30", Icon: FileText },
  issued:    { label: "Đã phát hành", cls: "bg-blue-500/10 text-blue-600 border-blue-500/40 dark:text-blue-400", Icon: Receipt },
  paid:      { label: "Đã thanh toán", cls: "bg-green-500/10 text-green-600 border-green-500/40 dark:text-green-400", Icon: Check },
  cancelled: { label: "Đã hủy", cls: "bg-destructive/10 text-destructive border-destructive/40", Icon: XIcon },
};

function AdminInvoicesContent() {
  const { toast } = useToast();
  const fmtPrice = useFormatPrice();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/invoices`);
      setInvoices(await r.json());
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = invoices.filter(i => statusFilter === "all" || i.status === statusFilter);
  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + Number(i.total), 0);
  const pendingCount = invoices.filter(i => i.status === "issued").length;

  const updateStatus = async (id: number, status: string) => {
    await fetch(`${API}/api/invoices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    toast({ title: "Đã cập nhật trạng thái" });
    load();
  };

  return (
    <AdminLayout title="Hóa Đơn" subtitle="Tất cả hóa đơn được sinh tự động khi có booking mới">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Receipt} label="Tổng hóa đơn" value={String(invoices.length)} />
        <StatCard icon={Clock} label="Chờ thanh toán" value={String(pendingCount)} accent />
        <StatCard icon={Check} label="Doanh thu" value={fmtPrice(totalRevenue)} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center mb-4 pb-4 border-b border-primary/15">
        <Filter size={14} className="text-primary" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-background border border-primary/30 px-3 h-9 text-sm rounded-none">
          <option value="all">Tất cả trạng thái</option>
          {Object.entries(STATUS_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
        </select>
        <Button variant="outline" onClick={load} className="rounded-none ml-auto h-9">
          <RefreshCw size={13} className="mr-2" /> Tải lại
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card border border-primary/20 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-primary/5 border-b border-primary/15">
            <tr className="text-left text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="px-4 py-3">Số hóa đơn</th>
              <th className="px-4 py-3">Khách hàng</th>
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">Ngày phát hành</th>
              <th className="px-4 py-3 text-right">Tổng</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Đang tải...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Chưa có hóa đơn nào.</td></tr>
            ) : filtered.map(inv => {
              const meta = STATUS_META[inv.status] ?? STATUS_META.issued;
              const Icon = meta.Icon;
              return (
                <tr key={inv.id} className="border-b border-primary/10 hover:bg-primary/5">
                  <td className="px-4 py-3 font-mono text-primary text-xs">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3">
                    <div className="text-foreground">{inv.customerName}</div>
                    <div className="text-[11px] text-muted-foreground">{inv.customerEmail}</div>
                  </td>
                  <td className="px-4 py-3">#{inv.bookingId}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(inv.issuedAt).toLocaleString("vi-VN")}</td>
                  <td className="px-4 py-3 text-right font-serif text-primary">
                    {fmtPrice(inv.total)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-1 border text-[10px] uppercase tracking-widest ${meta.cls}`}>
                      <Icon size={10} /> {meta.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <Link href={`/invoices/${inv.id}`}>
                        <button className="p-2 border border-primary/30 hover:bg-primary/10 transition-colors" title="Xem">
                          <Eye size={12} className="text-primary" />
                        </button>
                      </Link>
                      {inv.status === "issued" && (
                        <button onClick={() => updateStatus(inv.id, "paid")}
                          className="p-2 border border-green-500/30 hover:bg-green-500/10 transition-colors" title="Đánh dấu đã trả">
                          <Check size={12} className="text-green-600" />
                        </button>
                      )}
                      {inv.status !== "cancelled" && (
                        <button onClick={() => updateStatus(inv.id, "cancelled")}
                          className="p-2 border border-destructive/30 hover:bg-destructive/10 transition-colors" title="Hủy">
                          <XIcon size={12} className="text-destructive" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`bg-card border p-5 ${accent ? "border-primary" : "border-primary/20"}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-2">{label}</div>
          <div className="font-serif text-2xl text-foreground">{value}</div>
        </div>
        <div className="p-3 bg-primary/10 text-primary"><Icon size={18} /></div>
      </div>
    </div>
  );
}

export default function AdminInvoices() {
  return <AdminGuard><AdminInvoicesContent /></AdminGuard>;
}
