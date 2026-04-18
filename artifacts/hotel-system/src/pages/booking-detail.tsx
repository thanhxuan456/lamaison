import { useRoute, useLocation } from "wouter";
import { useGetBooking, useCancelBooking } from "@workspace/api-client-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MapPin, User, Phone, Mail, FileText, UtensilsCrossed, Receipt, Plus, Minus, ShoppingBag, Eye, FileSignature } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { Link } from "wouter";

const API = import.meta.env.VITE_API_URL ?? "";

export default function BookingDetail() {
  const [, params] = useRoute("/bookings/:id");
  const bookingId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { t } = useT();

  const { data: booking, isLoading, refetch } = useGetBooking(bookingId);
  const cancelBooking = useCancelBooking();

  const handleCancel = () => {
    cancelBooking.mutate({ id: bookingId }, {
      onSuccess: () => {
        toast({ title: t("toast.success"), description: t("toast.cancelSuccess") });
        refetch();
      },
      onError: () => {
        toast({ title: t("toast.error"), description: t("toast.cancelError"), variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="h-screen flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </PageLayout>
    );
  }

  if (!booking) {
    return (
      <PageLayout>
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-4xl font-serif text-foreground mb-4">{t("booking.notFound.title")}</h1>
          <p className="text-muted-foreground mb-8">{t("booking.notFound.body")}</p>
          <Button onClick={() => setLocation("/bookings")} className="bg-primary text-primary-foreground rounded-none px-8 py-6 uppercase tracking-widest">
            {t("booking.backList")}
          </Button>
        </div>
      </PageLayout>
    );
  }

  const isCancelled = booking.status === 'cancelled';
  const isPendingPayment = booking.status === 'pending_payment';

  return (
    <PageLayout>
      <div className="bg-background pt-24 pb-20">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <div className="mb-8 flex justify-between items-center">
            <Button variant="ghost" onClick={() => setLocation("/bookings")} className="text-muted-foreground hover:text-primary pl-0 uppercase tracking-widest text-xs">
              {t("booking.back")}
            </Button>
            <div className="text-sm font-serif text-muted-foreground">
              {t("booking.code")}: #{booking.id.toString().padStart(6, '0')}
            </div>
          </div>

          <div className="bg-card text-card-foreground border border-primary/20 shadow-xl overflow-hidden">
            <div className={`p-8 md:p-12 text-white relative overflow-hidden ${isCancelled ? 'bg-secondary/80' : 'bg-secondary'}`}>
              <div className="absolute top-0 right-0 w-64 h-64 border-[40px] border-primary/10 rounded-full -translate-y-1/2 translate-x-1/4"></div>

              <div className="relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-primary/20 pb-8 mb-8">
                  <div>
                    <h1 className="text-3xl md:text-5xl font-serif mb-4">{booking.hotel?.name}</h1>
                    <div className="flex items-center gap-2 text-white/80">
                      <MapPin size={18} className="text-primary" />
                      <span>{booking.hotel?.address}, {booking.hotel?.city}</span>
                    </div>
                  </div>
                  <div className="text-left md:text-right">
                    <span className={`inline-block px-4 py-1 border text-sm uppercase tracking-widest mb-4 ${
                      isCancelled
                        ? 'border-destructive text-destructive bg-destructive/10'
                        : isPendingPayment
                          ? 'border-yellow-400 text-yellow-400 bg-yellow-400/10'
                          : 'border-primary text-primary bg-primary/10'
                    }`}>
                      {isCancelled ? t("booking.cancelled") : isPendingPayment ? "Chờ thanh toán" : t("booking.confirmed")}
                    </span>
                    <div className="text-3xl font-serif text-primary">{Number(booking.totalPrice).toLocaleString("vi-VN")} ₫</div>
                    <div className="text-sm text-white/60">{isPendingPayment ? "Chưa thanh toán" : t("booking.paid")}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div>
                    <div className="text-primary/70 text-xs uppercase tracking-widest mb-2">{t("booking.checkIn")}</div>
                    <div className="text-xl font-serif">{format(new Date(booking.checkInDate), 'dd/MM/yyyy')}</div>
                    <div className="text-sm text-white/60">{t("booking.checkInNote")}</div>
                  </div>
                  <div>
                    <div className="text-primary/70 text-xs uppercase tracking-widest mb-2">{t("booking.checkOut")}</div>
                    <div className="text-xl font-serif">{format(new Date(booking.checkOutDate), 'dd/MM/yyyy')}</div>
                    <div className="text-sm text-white/60">{t("booking.checkOutNote")}</div>
                  </div>
                  <div>
                    <div className="text-primary/70 text-xs uppercase tracking-widest mb-2">{t("booking.roomInfo")}</div>
                    <div className="text-xl font-serif">{booking.room?.type}</div>
                    <div className="text-sm text-white/60">{booking.numberOfGuests} {t("common.guests")}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 md:p-12">
              <h3 className="font-serif text-2xl text-foreground mb-8 flex items-center gap-3">
                <User className="text-primary" /> {t("booking.guestTitle")}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                <div className="space-y-6">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{t("booking.fullName")}</div>
                    <div className="text-lg font-medium text-foreground">{booking.guestName}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{t("booking.phone")}</div>
                    <div className="flex items-center gap-2 text-lg font-medium text-foreground">
                      <Phone size={16} className="text-primary" /> {booking.guestPhone}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{t("booking.email")}</div>
                    <div className="flex items-center gap-2 text-lg font-medium text-foreground">
                      <Mail size={16} className="text-primary" /> {booking.guestEmail}
                    </div>
                  </div>
                </div>

                <div className="bg-secondary/5 p-6 border border-primary/10">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                    <FileText size={16} className="text-primary" /> {t("booking.requests")}
                  </div>
                  <p className="text-foreground font-light italic">
                    {booking.specialRequests ? `"${booking.specialRequests}"` : t("booking.noRequests")}
                  </p>
                </div>
              </div>

              {/* Pending payment notice */}
              {isPendingPayment && (
                <div className="mb-8 border border-yellow-400/40 bg-yellow-400/5 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="text-yellow-400 font-serif text-lg mb-1">Đặt phòng đang chờ thanh toán</div>
                    <p className="text-sm text-muted-foreground">
                      Vui lòng hoàn tất thanh toán qua MoMo để xác nhận đặt phòng của bạn.
                      Phòng sẽ được giữ trong thời gian ngắn.
                    </p>
                  </div>
                </div>
              )}

              {/* Room Service + Invoice */}
              {!isCancelled && !isPendingPayment && (
                <RoomServiceSection bookingId={booking.id} hotelId={booking.hotelId} />
              )}

              {!isCancelled && (
                <div className="border-t border-primary/20 pt-8 flex justify-end">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-none uppercase tracking-widest">
                        {t("booking.cancelBtn")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-none border-primary bg-background">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-serif text-2xl text-foreground">{t("booking.cancelTitle")}</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                          {t("booking.cancelDesc")}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="rounded-none uppercase tracking-widest text-xs">{t("booking.keep")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-none uppercase tracking-widest text-xs">
                          {t("booking.confirmCancel")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

interface MenuItem { id: number; name: string; description: string; price: string; imageUrl: string; category: string; available: boolean; hotelId: number | null; }
interface RoomOrder { id: number; items: { name: string; quantity: number; subtotal: number }[]; total: string; status: string; createdAt: string; }

function RoomServiceSection({ bookingId, hotelId }: { bookingId: number; hotelId: number }) {
  const { toast } = useToast();
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<RoomOrder[]>([]);
  const [invoiceId, setInvoiceId] = useState<number | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [activeCat, setActiveCat] = useState("food");
  const [submitting, setSubmitting] = useState(false);

  const loadAll = async () => {
    const [m, o, inv] = await Promise.all([
      fetch(`${API}/api/menu-items?hotelId=${hotelId}`).then(r => r.json()),
      fetch(`${API}/api/room-orders?bookingId=${bookingId}`).then(r => r.json()),
      fetch(`${API}/api/invoices?bookingId=${bookingId}`).then(r => r.json()),
    ]);
    // Fall back to all menu items if no items for this hotel
    setMenu(m.length > 0 ? m : await fetch(`${API}/api/menu-items`).then(r => r.json()));
    setOrders(o);
    setInvoiceId(inv?.[0]?.id ?? null);
  };

  useEffect(() => { loadAll(); }, [bookingId, hotelId]);

  const cats = Array.from(new Set(menu.filter(m => m.available).map(m => m.category)));
  const filtered = menu.filter(m => m.available && m.category === activeCat);
  const cartLines = Object.entries(cart).map(([id, qty]) => {
    const item = menu.find(m => m.id === Number(id))!;
    return { item, qty: qty as number };
  }).filter(l => l.item && l.qty > 0);
  const cartTotal = cartLines.reduce((s, l) => s + Number(l.item.price) * l.qty, 0);

  const setQty = (id: number, delta: number) => {
    setCart(c => ({ ...c, [id]: Math.max(0, (c[id] ?? 0) + delta) }));
  };

  const placeOrder = async () => {
    if (cartLines.length === 0) return;
    setSubmitting(true);
    try {
      const items = cartLines.map(l => ({
        menuItemId: l.item.id, name: l.item.name, unitPrice: Number(l.item.price), quantity: l.qty,
      }));
      const r = await fetch(`${API}/api/room-orders`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, items }),
      });
      if (!r.ok) throw new Error(await r.text());
      // regenerate invoice to include new orders
      await fetch(`${API}/api/invoices/generate/${bookingId}`, { method: "POST" });
      toast({ title: "Đã đặt món thành công", description: "Phòng sẽ phục vụ trong giây lát." });
      setCart({});
      loadAll();
    } catch (e: any) {
      toast({ title: "Lỗi", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (n: number | string) => Number(n).toLocaleString("vi-VN");
  const catLabels: Record<string, string> = {
    food: "Món chính", drink: "Đồ uống", dessert: "Tráng miệng", breakfast: "Bữa sáng", spa: "Spa", other: "Khác",
  };

  return (
    <div className="border-t border-primary/20 pt-10 mb-12">
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <h3 className="font-serif text-2xl text-foreground flex items-center gap-3">
          <UtensilsCrossed className="text-primary" /> Room Service
        </h3>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link href={`/bookings/${bookingId}/contract`}>
            <Button variant="outline" className="rounded-none border-primary text-primary hover:bg-primary hover:text-primary-foreground uppercase tracking-widest text-xs">
              <FileSignature size={14} className="mr-2" /> Tải hợp đồng
            </Button>
          </Link>
          {invoiceId && (
            <Link href={`/invoices/${invoiceId}`}>
              <Button variant="outline" className="rounded-none border-primary text-primary hover:bg-primary hover:text-primary-foreground uppercase tracking-widest text-xs">
                <Receipt size={14} className="mr-2" /> Xem hóa đơn
              </Button>
            </Link>
          )}
        </div>
      </div>

      {menu.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-primary/30 bg-card/50">
          <UtensilsCrossed size={28} className="text-primary/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Hiện chưa có món trong menu. Vui lòng quay lại sau.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu */}
          <div className="lg:col-span-2">
            <div className="flex flex-wrap gap-2 mb-4">
              {cats.map(c => (
                <button key={c} onClick={() => setActiveCat(c)}
                  className={`px-4 h-9 text-xs uppercase tracking-widest border transition-colors ${activeCat === c ? "bg-primary text-primary-foreground border-primary" : "border-primary/30 text-foreground hover:bg-primary/10"}`}>
                  {catLabels[c] ?? c}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map(item => (
                <div key={item.id} className="flex gap-3 p-3 bg-card border border-primary/15 hover:border-primary/40 transition-colors">
                  <div className="w-20 h-20 bg-muted shrink-0 overflow-hidden">
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" /> :
                      <div className="w-full h-full flex items-center justify-center"><UtensilsCrossed size={20} className="text-primary/30" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-serif text-base text-foreground truncate">{item.name}</div>
                    {item.description && <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{item.description}</div>}
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-serif text-primary">{fmt(item.price)} ₫</span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setQty(item.id, -1)} className="w-7 h-7 border border-primary/30 hover:bg-primary/10 flex items-center justify-center"><Minus size={11} /></button>
                        <span className="w-6 text-center text-sm">{cart[item.id] ?? 0}</span>
                        <button onClick={() => setQty(item.id, 1)} className="w-7 h-7 border border-primary/30 hover:bg-primary/10 flex items-center justify-center"><Plus size={11} /></button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cart + history */}
          <div>
            <div className="bg-card border border-primary/30 p-5 sticky top-4">
              <div className="text-[10px] uppercase tracking-[0.3em] text-primary/70 mb-3 flex items-center gap-2">
                <ShoppingBag size={12} /> Giỏ hàng
              </div>
              {cartLines.length === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center">Chưa có món nào.</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {cartLines.map(l => (
                    <div key={l.item.id} className="flex justify-between text-sm">
                      <span className="text-foreground truncate pr-2">{l.item.name} × {l.qty}</span>
                      <span className="text-primary shrink-0">{fmt(Number(l.item.price) * l.qty)} ₫</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t border-primary/15 pt-3 flex justify-between items-baseline mb-4">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Tổng</span>
                <span className="font-serif text-xl text-primary">{fmt(cartTotal)} ₫</span>
              </div>
              <Button onClick={placeOrder} disabled={cartLines.length === 0 || submitting}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-none uppercase tracking-widest text-xs h-10">
                {submitting ? "Đang gửi..." : "Đặt món"}
              </Button>
            </div>

            {orders.length > 0 && (
              <div className="mt-5 bg-card border border-primary/15 p-4">
                <div className="text-[10px] uppercase tracking-[0.3em] text-primary/70 mb-3">Lịch sử đặt</div>
                <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-luxury">
                  {orders.map(o => (
                    <div key={o.id} className="text-xs border-b border-primary/10 pb-2 last:border-0">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{new Date(o.createdAt).toLocaleString("vi-VN")}</span>
                        <span className="text-primary font-medium">{fmt(o.total)} ₫</span>
                      </div>
                      <div className="text-foreground/80 mt-1">
                        {o.items.map(i => `${i.name} ×${i.quantity}`).join(", ")}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-primary/60 mt-1">{o.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
