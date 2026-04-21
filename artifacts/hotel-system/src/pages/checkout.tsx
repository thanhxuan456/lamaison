import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, ShieldCheck, Sparkles, AlertTriangle, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API = import.meta.env.VITE_API_URL ?? "";
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const COUNTDOWN_SECONDS = 5;

const fmtVND = (n: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n || 0);

interface Booking {
  id: number;
  status: string;
  totalPrice: number;
  guestName?: string;
  guestEmail?: string;
  checkInDate?: string;
  checkOutDate?: string;
  roomId?: number;
}

type Phase = "loading" | "processing" | "success" | "error" | "already";

/**
 * /checkout/:bookingId
 * Trang xac nhan thanh toan tu dong (khong dung API ben thu 3):
 *  - Tai thong tin booking
 *  - Hien hieu ung dem nguoc + spinner
 *  - Sau dem nguoc, goi /api/payments/internal/confirm
 *  - Hien check thanh cong va tu chuyen sang /bookings/:id sau 1.5s
 */
export default function CheckoutPage() {
  const params = useParams<{ bookingId: string }>();
  const bookingId = Number(params.bookingId);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const confirmToken = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("t") ?? "";
  }, []);

  const [booking, setBooking] = useState<Booking | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [seconds, setSeconds] = useState(COUNTDOWN_SECONDS);
  const confirmCalled = useRef(false);

  // 1. Load booking
  useEffect(() => {
    if (!Number.isFinite(bookingId)) {
      setPhase("error");
      setErrorMsg("Mã đơn không hợp lệ");
      return;
    }
    let cancel = false;
    (async () => {
      try {
        const r = await fetch(`${API}/api/bookings/${bookingId}`);
        if (!r.ok) throw new Error("Không tìm thấy đơn đặt phòng");
        const data: Booking = await r.json();
        if (cancel) return;
        setBooking(data);
        if (data.status === "confirmed" || data.status === "checked_in" || data.status === "checked_out") {
          setPhase("already");
          // Tu redirect sau 2s
          setTimeout(() => setLocation(`/bookings/${bookingId}`), 2000);
        } else {
          setPhase("processing");
        }
      } catch (e: any) {
        if (cancel) return;
        setPhase("error");
        setErrorMsg(e.message ?? "Không thể tải đơn đặt phòng");
      }
    })();
    return () => { cancel = true; };
  }, [bookingId, setLocation]);

  // 2. Countdown — chay khi phase=processing
  useEffect(() => {
    if (phase !== "processing") return;
    setSeconds(COUNTDOWN_SECONDS);
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000;
      const remaining = Math.max(0, COUNTDOWN_SECONDS - elapsed);
      setSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        callConfirm();
      }
    }, 100);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // 3. Call confirm API — bao ve race bang ref
  async function callConfirm() {
    if (confirmCalled.current) return;
    confirmCalled.current = true;
    try {
      const r = await fetch(`${API}/api/payments/pay-at-hotel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bookingId, confirmToken }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Xác nhận thất bại");
      setPhase("success");
      // Tu chuyen sau 1.5s
      setTimeout(() => setLocation(`/bookings/${bookingId}`), 1500);
    } catch (e: any) {
      setPhase("error");
      setErrorMsg(e.message ?? "Có lỗi xảy ra khi xác nhận thanh toán");
      confirmCalled.current = false;
      toast({ title: "Xác nhận thất bại", description: e.message, variant: "destructive" });
    }
  }

  function handleRetry() {
    setPhase("processing");
    setErrorMsg("");
  }

  const progressPct = useMemo(() => {
    if (phase === "success" || phase === "already") return 100;
    if (phase === "processing") return ((COUNTDOWN_SECONDS - seconds) / COUNTDOWN_SECONDS) * 100;
    return 0;
  }, [phase, seconds]);

  return (
    <PageLayout>
      <section className="min-h-[calc(100vh-200px)] bg-secondary py-20 flex items-center">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="border border-primary/30 bg-secondary/40 backdrop-blur-sm relative">
            {/* Frame corners */}
            <span className="pointer-events-none absolute -top-px -left-px w-5 h-5 border-t-2 border-l-2 border-primary" />
            <span className="pointer-events-none absolute -top-px -right-px w-5 h-5 border-t-2 border-r-2 border-primary" />
            <span className="pointer-events-none absolute -bottom-px -left-px w-5 h-5 border-b-2 border-l-2 border-primary" />
            <span className="pointer-events-none absolute -bottom-px -right-px w-5 h-5 border-b-2 border-r-2 border-primary" />

            <div className="px-6 md:px-12 py-12 text-center">
              {/* Loading state */}
              {phase === "loading" && (
                <div className="py-20">
                  <Loader2 size={36} className="animate-spin text-primary mx-auto mb-4" />
                  <p className="text-white/60 text-xs tracking-[0.3em] uppercase">Đang tải đơn đặt phòng...</p>
                </div>
              )}

              {/* Processing state — countdown + spinner */}
              {phase === "processing" && booking && (
                <>
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <span className="w-10 h-px bg-primary" />
                    <Sparkles size={14} className="text-primary" />
                    <span className="text-primary text-[10px] tracking-[0.5em] uppercase">Xác nhận thanh toán</span>
                    <span className="w-10 h-px bg-primary" />
                  </div>

                  <h1 className="font-serif text-3xl md:text-4xl text-white mb-3">Đang xử lý thanh toán</h1>
                  <p className="text-white/60 font-light mb-10">
                    Hệ thống đang xác minh giao dịch của bạn. Vui lòng không tắt trang này.
                  </p>

                  {/* Animated ring */}
                  <div className="relative w-40 h-40 mx-auto mb-8">
                    <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary/15" />
                      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2"
                        className="text-primary transition-all duration-100 ease-linear"
                        strokeDasharray={`${2 * Math.PI * 46}`}
                        strokeDashoffset={`${2 * Math.PI * 46 * (1 - progressPct / 100)}`}
                        strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Loader2 size={20} className="animate-spin text-primary/70 mb-2" />
                      <div className="font-serif text-4xl text-primary">{Math.ceil(seconds)}</div>
                      <div className="text-[10px] tracking-[0.3em] uppercase text-white/40 mt-1">giây</div>
                    </div>
                  </div>

                  {/* Booking summary */}
                  <div className="border border-primary/20 bg-black/30 px-5 py-4 mb-6 text-left max-w-sm mx-auto space-y-2 text-sm">
                    <SummaryRow label="Mã đơn" value={`#${booking.id}`} />
                    {booking.guestName && <SummaryRow label="Khách hàng" value={booking.guestName} />}
                    {booking.checkInDate && booking.checkOutDate && (
                      <SummaryRow label="Ngày" value={`${booking.checkInDate} → ${booking.checkOutDate}`} />
                    )}
                    <div className="border-t border-primary/15 pt-2 mt-2 flex justify-between items-baseline">
                      <span className="text-[10px] tracking-widest uppercase text-white/50">Số tiền</span>
                      <span className="font-serif text-primary text-xl">{fmtVND(booking.totalPrice)}</span>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 text-[10px] tracking-widest uppercase text-white/40">
                    <ShieldCheck size={11} className="text-primary/60" />
                    Giao dịch được mã hóa an toàn
                  </div>
                </>
              )}

              {/* Success */}
              {phase === "success" && (
                <div className="py-12 animate-in fade-in zoom-in-50 duration-500">
                  <div className="relative w-24 h-24 mx-auto mb-6">
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping" />
                    <div className="relative w-24 h-24 rounded-full bg-emerald-500 flex items-center justify-center">
                      <CheckCircle2 size={48} className="text-white" strokeWidth={2.5} />
                    </div>
                  </div>
                  <h1 className="font-serif text-3xl md:text-4xl text-white mb-3">Thanh toán thành công</h1>
                  <p className="text-white/60 font-light mb-6">
                    Đơn đặt phòng <span className="text-primary font-serif">#{bookingId}</span> đã được xác nhận.
                    Đang chuyển đến trang chi tiết...
                  </p>
                  <Loader2 size={18} className="animate-spin text-primary/60 mx-auto" />
                </div>
              )}

              {/* Already confirmed */}
              {phase === "already" && (
                <div className="py-12 animate-in fade-in duration-500">
                  <CheckCircle2 size={56} className="text-emerald-400 mx-auto mb-4" strokeWidth={2} />
                  <h1 className="font-serif text-2xl md:text-3xl text-white mb-3">Đơn đã được xác nhận trước đó</h1>
                  <p className="text-white/60 font-light mb-6">Đang chuyển đến trang chi tiết đơn...</p>
                  <Loader2 size={18} className="animate-spin text-primary/60 mx-auto" />
                </div>
              )}

              {/* Error */}
              {phase === "error" && (
                <div className="py-12 animate-in fade-in duration-500">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-destructive/20 flex items-center justify-center">
                    <AlertTriangle size={40} className="text-destructive" />
                  </div>
                  <h1 className="font-serif text-2xl md:text-3xl text-white mb-3">Xác nhận không thành công</h1>
                  <p className="text-white/60 font-light mb-8 max-w-md mx-auto">{errorMsg}</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {Number.isFinite(bookingId) && booking?.status === "pending_payment" && (
                      <Button onClick={handleRetry} className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 uppercase tracking-widest text-xs px-6">
                        Thử lại
                      </Button>
                    )}
                    <Link href="/">
                      <Button variant="outline" className="rounded-none border-primary/40 text-primary hover:bg-primary/10 uppercase tracking-widest text-xs px-6">
                        Về trang chủ <ChevronRight size={14} className="ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="text-center text-white/30 text-[10px] tracking-[0.3em] uppercase mt-6">
            MAISON DELUXE Hotels · Thanh toán nội bộ tự động
          </p>
        </div>
      </section>
    </PageLayout>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-xs">
      <span className="text-[10px] tracking-widest uppercase text-white/50">{label}</span>
      <span className="text-white/85 font-light text-right">{value}</span>
    </div>
  );
}
