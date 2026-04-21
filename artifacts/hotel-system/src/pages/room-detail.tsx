import { useRoute, useLocation, Link } from "wouter";
import { useGetRoom, useGetHotel, useCreateBooking } from "@workspace/api-client-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMemo, useState, useEffect, useRef } from "react";
import { Check, User, Wind, Maximize, Crown, Star, Calendar, Users as UsersIcon, Mail, Phone, MessageSquare, ChevronLeft, ChevronRight, Sparkles, ShieldCheck, CreditCard, Award, MapPin, Loader as Loader2, ExternalLink, QrCode, Building2 } from "lucide-react";
import { useT } from "@/lib/i18n";

const API = import.meta.env.VITE_API_URL ?? "";

type Step = 1 | 2 | 3 | 4;
type PayMethod = "momo" | "bank" | null;

interface MomoPayment {
  payUrl: string;
  qrCodeUrl: string;
  orderId: string;
  amount: number;
}

interface PaySettings {
  momo: { enabled: boolean; configured: boolean };
  bank: { enabled: boolean; bankCode: string; accountNumber: string; accountName: string; defaultDescription: string };
}

const fmtVND = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(n)) + " ₫";

function diffNights(a: string, b: string): number {
  if (!a || !b) return 0;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const tomorrowISO = () => {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

export default function RoomDetail() {
  const [, params] = useRoute("/rooms/:id");
  const roomId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { t } = useT();

  const { data: room, isLoading: loadingRoom } = useGetRoom(roomId);
  const hotelId = room?.hotelId || 0;
  const { data: hotel, isLoading: loadingHotel } = useGetHotel(hotelId, {
    query: { enabled: !!hotelId, queryKey: ["hotel", hotelId] },
  });

  const createBooking = useCreateBooking();
  const [step, setStep] = useState<Step>(1);
  const [activeImage, setActiveImage] = useState(0);
  const [momoPayment, setMomoPayment] = useState<MomoPayment | null>(null);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [bookingAmount, setBookingAmount] = useState<number>(0);
  const [paymentChecking, setPaymentChecking] = useState(false);
  const [payMethod, setPayMethod] = useState<PayMethod>(null);
  const [loadingMomo, setLoadingMomo] = useState(false);
  const [paySettings, setPaySettings] = useState<PaySettings>({
    momo: { enabled: false, configured: false },
    bank: { enabled: true, bankCode: "VCB", accountNumber: "", accountName: "", defaultDescription: "Dat phong MAISON DELUXE" },
  });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch(`${API}/api/payments/settings`)
      .then((r) => r.json())
      .then((d: PaySettings) => setPaySettings(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!bookingId || step !== 4 || payMethod !== "momo") return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API}/api/bookings/${bookingId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "confirmed") {
          clearInterval(pollRef.current!);
          setLocation(`/bookings/${bookingId}`);
        }
      } catch {}
    }, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [bookingId, step, payMethod]);

  const [bookingData, setBookingData] = useState({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    checkInDate: todayISO(),
    checkOutDate: tomorrowISO(),
    numberOfGuests: 1,
    specialRequests: "",
  });

  // Build a small "gallery" — currently 1 image, but show layout cleanly
  const images = useMemo(() => {
    const main = room?.imageUrl || "/images/room-suite.png";
    return [main, main, main, main];
  }, [room?.imageUrl]);

  const nights = diffNights(bookingData.checkInDate, bookingData.checkOutDate);
  const pricePerNight = room?.pricePerNight ?? 0;
  const subtotal = pricePerNight * nights;
  const serviceFee = Math.round(subtotal * 0.05);
  const taxes = Math.round(subtotal * 0.1);
  const total = subtotal + serviceFee + taxes;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setBookingData((prev) => ({
      ...prev,
      [name]: name === "numberOfGuests" ? parseInt(value) || 1 : value,
    }));
  };

  const datesValid = nights > 0;
  const guestValid =
    bookingData.guestName.trim().length > 1 &&
    /^\S+@\S+\.\S+$/.test(bookingData.guestEmail) &&
    bookingData.guestPhone.trim().length >= 6;

  const goNext = () => {
    if (step === 1) {
      if (!datesValid) {
        toast({ title: t("toast.error"), description: "Vui lòng chọn ngày hợp lệ.", variant: "destructive" });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!guestValid) {
        toast({ title: t("toast.error"), description: "Vui lòng điền đầy đủ thông tin.", variant: "destructive" });
        return;
      }
      setStep(3);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;
    if (!datesValid || !guestValid) return;

    createBooking.mutate(
      { data: { roomId: room.id, ...bookingData } },
      {
        onSuccess: async (data) => {
          setBookingId(data.id);
          setBookingAmount(data.totalPrice ?? 0);
          const momoOk = paySettings.momo.enabled && paySettings.momo.configured;
          const bankOk = paySettings.bank.enabled && !!paySettings.bank.accountNumber;
          if (momoOk && !bankOk) {
            await initMomo(data.id);
          } else {
            setPayMethod(null);
            setStep(4);
          }
        },
        onError: () => {
          toast({ title: t("toast.error"), description: t("toast.bookingError"), variant: "destructive" });
        },
      },
    );
  };

  const initMomo = async (bId: number) => {
    setLoadingMomo(true);
    try {
      const res = await fetch(`${API}/api/payments/momo/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: bId }),
      });
      if (!res.ok) throw new Error("MoMo create failed");
      const momo = await res.json() as MomoPayment;
      setMomoPayment(momo);
      setPayMethod("momo");
      setStep(4);
    } catch {
      toast({ title: t("toast.error"), description: "Không thể khởi tạo thanh toán MoMo. Vui lòng thử lại.", variant: "destructive" });
    } finally { setLoadingMomo(false); }
  };

  const handleCheckPayment = async () => {
    if (!bookingId) return;
    setPaymentChecking(true);
    try {
      const res = await fetch(`${API}/api/bookings/${bookingId}`);
      const data = await res.json();
      if (data.status === "confirmed") {
        setLocation(`/bookings/${bookingId}`);
      } else {
        toast({ title: "Chưa nhận được thanh toán", description: "Vui lòng quét mã QR và hoàn tất thanh toán.", variant: "destructive" });
      }
    } catch {
      toast({ title: t("toast.error"), description: "Không thể kiểm tra trạng thái thanh toán.", variant: "destructive" });
    } finally {
      setPaymentChecking(false);
    }
  };

  if (loadingRoom || loadingHotel) {
    return (
      <PageLayout>
        <div className="h-screen flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </PageLayout>
    );
  }

  if (!room || !hotel) return null;

  return (
    <PageLayout>
      {/* HERO with cinematic gallery */}
      <section className="relative pt-24 pb-12 bg-secondary">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          {/* Breadcrumb */}
          <nav className="text-[11px] tracking-[0.25em] uppercase text-white/50 mb-6 flex items-center gap-2 flex-wrap">
            <Link href="/" className="hover:text-primary transition-colors">{t("room.breadcrumb.home")}</Link>
            <ChevronRight size={12} />
            <Link href={`/hotels/${hotel.id}`} className="hover:text-primary transition-colors">{hotel.name}</Link>
            <ChevronRight size={12} />
            <span className="text-primary">{room.type}</span>
          </nav>

          {/* Title + Rating */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 mb-3">
                <Crown size={14} className="text-primary" />
                <span className="text-primary text-[10px] tracking-[0.4em] uppercase">
                  {hotel.name} · Phòng {room.roomNumber}
                </span>
              </div>
              <h1 className="text-4xl md:text-6xl font-serif text-white leading-tight">{room.type}</h1>
              <div className="flex items-center gap-4 mt-4 text-white/70 text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={14} className="text-primary" /> {hotel.location ?? "Việt Nam"}
                </span>
                <span className="inline-flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={12} className="fill-primary text-primary" />
                  ))}
                  <span className="ml-1 text-xs tracking-widest">5.0</span>
                </span>
                <span className={`inline-flex items-center gap-1.5 text-xs tracking-widest uppercase ${room.isAvailable ? "text-emerald-400" : "text-destructive"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${room.isAvailable ? "bg-emerald-400 animate-pulse" : "bg-destructive"}`} />
                  {room.isAvailable ? "Còn phòng" : t("rooms.soldOut")}
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[10px] tracking-[0.3em] uppercase text-white/50">Từ</div>
              <div className="font-serif text-3xl md:text-4xl text-primary leading-none">{fmtVND(room.pricePerNight)}</div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-white/50 mt-1">{t("room.perNight")}</div>
            </div>
          </div>

          {/* Gallery */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-9 relative border border-primary/30 overflow-hidden bg-secondary/40">
              <div className="aspect-[16/9] w-full">
                <img src={images[activeImage]} alt={room.type} className="w-full h-full object-cover" />
              </div>
              {/* Floating quick-specs */}
              <div className="absolute left-4 bottom-4 right-4 flex flex-wrap gap-2">
                <Pill icon={<User size={12} />} label={`${room.capacity} khách`} />
                <Pill icon={<Wind size={12} />} label={room.view} />
                <Pill icon={<Maximize size={12} />} label={`Tầng ${room.floor}`} />
              </div>
            </div>
            <div className="md:col-span-3 grid grid-cols-3 md:grid-cols-1 gap-3">
              {images.map((src, i) => (
                <button key={i}
                  onClick={() => setActiveImage(i)}
                  className={`relative aspect-square md:aspect-auto md:h-[7.5rem] overflow-hidden border transition-all ${
                    activeImage === i ? "border-primary ring-1 ring-primary" : "border-primary/20 hover:border-primary/50"
                  }`}>
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  {activeImage === i && <div className="absolute inset-0 bg-primary/10" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT GRID */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* LEFT — details */}
            <div className="lg:col-span-2 space-y-12">
              {/* Description */}
              <div>
                <SectionHeader>Mô tả phòng</SectionHeader>
                <p className="text-foreground/80 leading-relaxed font-light whitespace-pre-line text-base">
                  {room.description}
                </p>
              </div>

              {/* Specs grid */}
              <div className="grid grid-cols-3 gap-0 border border-primary/20 bg-card divide-x divide-primary/15">
                <SpecBlock icon={<User size={20} />} label={t("room.capacity")} value={`${room.capacity} ${t("common.guests")}`} />
                <SpecBlock icon={<Wind size={20} />} label={t("room.view")} value={room.view} />
                <SpecBlock icon={<Maximize size={20} />} label={t("room.floor")} value={String(room.floor)} />
              </div>

              {/* Amenities */}
              <div>
                <SectionHeader icon={<Sparkles size={14} />}>{t("room.amenitiesTitle")}</SectionHeader>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                  {room.amenities.map((amenity, i) => (
                    <li key={i} className="flex items-center gap-3 text-foreground/85 py-2 border-b border-primary/10">
                      <span className="w-7 h-7 inline-flex items-center justify-center bg-primary/10 border border-primary/30 text-primary">
                        <Check size={13} />
                      </span>
                      <span className="font-light">{amenity}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Trust signals */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Trust icon={<ShieldCheck size={18} />} title="Hủy miễn phí" desc="Trước 48 giờ check-in" />
                <Trust icon={<Award size={18} />} title="Bảo đảm 5 sao" desc="Cam kết hoàn tiền nếu không hài lòng" />
                <Trust icon={<CreditCard size={18} />} title="Thanh toán linh hoạt" desc="VietQR · Thẻ · Tiền mặt" />
              </div>

              {/* Policy */}
              <div className="bg-card border border-primary/20 p-6">
                <SectionHeader>Chính sách</SectionHeader>
                <ul className="text-sm text-muted-foreground space-y-2 font-light">
                  <li>• Nhận phòng từ <strong className="text-foreground">14:00</strong>, trả phòng trước <strong className="text-foreground">12:00</strong>.</li>
                  <li>• Trẻ em dưới 6 tuổi miễn phí khi sử dụng giường có sẵn.</li>
                  <li>• Cấm hút thuốc trong phòng (phạt 2.500.000 ₫).</li>
                  <li>• Vật nuôi không được phép.</li>
                </ul>
              </div>
            </div>

            {/* RIGHT — booking card */}
            <aside className="lg:sticky lg:top-28 lg:self-start">
              <div className="bg-secondary text-secondary-foreground border-2 border-primary shadow-2xl overflow-hidden">
                {/* Card header */}
                <div className="relative px-6 py-5 border-b border-primary/30 bg-gradient-to-br from-primary/15 to-transparent">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="text-[10px] tracking-[0.35em] uppercase text-primary/80 mb-1">Đặt phòng</div>
                      <div className="font-serif text-xl text-white">{fmtVND(room.pricePerNight)}<span className="text-xs text-white/50 ml-1">/đêm</span></div>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => <Star key={i} size={11} className="fill-primary text-primary" />)}
                    </div>
                  </div>
                </div>

                {!room.isAvailable ? (
                  <div className="p-6">
                    <div className="bg-destructive/10 text-destructive border border-destructive/30 p-4 text-center text-sm">
                      {t("room.book.unavailable")}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Stepper */}
                    <div className="px-6 pt-5">
                      <Stepper current={step} steps={["Ngày", "Thông tin", "Xác nhận", "Thanh toán"]} />
                    </div>

                    <form onSubmit={handleBooking} className="p-6 space-y-5">
                      {/* STEP 1 — Dates */}
                      {step === 1 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                          <div className="grid grid-cols-2 gap-3">
                            <DateField
                              label="Nhận phòng"
                              icon={<Calendar size={13} />}
                              name="checkInDate"
                              value={bookingData.checkInDate}
                              min={todayISO()}
                              onChange={handleInputChange}
                            />
                            <DateField
                              label="Trả phòng"
                              icon={<Calendar size={13} />}
                              name="checkOutDate"
                              value={bookingData.checkOutDate}
                              min={bookingData.checkInDate || todayISO()}
                              onChange={handleInputChange}
                            />
                          </div>

                          <div>
                            <Label className="text-white/70 uppercase tracking-[0.2em] text-[10px] mb-2 inline-flex items-center gap-1.5">
                              <UsersIcon size={12} /> Số khách
                            </Label>
                            <div className="flex items-center justify-between bg-white/5 border border-primary/30 px-4 py-3">
                              <span className="text-white text-sm">{bookingData.numberOfGuests} khách</span>
                              <div className="flex items-center gap-2">
                                <Counter
                                  onClick={() => setBookingData((p) => ({ ...p, numberOfGuests: Math.max(1, p.numberOfGuests - 1) }))}
                                  disabled={bookingData.numberOfGuests <= 1}>−</Counter>
                                <Counter
                                  onClick={() => setBookingData((p) => ({ ...p, numberOfGuests: Math.min(room.capacity, p.numberOfGuests + 1) }))}
                                  disabled={bookingData.numberOfGuests >= room.capacity}>+</Counter>
                              </div>
                            </div>
                            <div className="text-[10px] text-white/40 mt-1 tracking-widest uppercase">Tối đa {room.capacity} khách</div>
                          </div>

                          {datesValid && (
                            <PriceSummary pricePerNight={pricePerNight} nights={nights} subtotal={subtotal} serviceFee={serviceFee} taxes={taxes} total={total} />
                          )}

                          <Button type="button" onClick={goNext} disabled={!datesValid}
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-none py-6 uppercase tracking-[0.2em] text-xs disabled:opacity-50 inline-flex items-center justify-center gap-2">
                            Tiếp tục <ChevronRight size={14} />
                          </Button>
                        </div>
                      )}

                      {/* STEP 2 — Guest info */}
                      {step === 2 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                          <FieldText
                            icon={<User size={13} />} label={t("room.book.name")} name="guestName"
                            value={bookingData.guestName} onChange={handleInputChange}
                            placeholder="Nguyễn Văn A" required />
                          <FieldText
                            icon={<Mail size={13} />} label={t("room.book.email")} name="guestEmail" type="email"
                            value={bookingData.guestEmail} onChange={handleInputChange}
                            placeholder="email@example.com" required />
                          <FieldText
                            icon={<Phone size={13} />} label={t("room.book.phone")} name="guestPhone"
                            value={bookingData.guestPhone} onChange={handleInputChange}
                            placeholder="0912 345 678" required />

                          <div>
                            <Label className="text-white/70 uppercase tracking-[0.2em] text-[10px] mb-2 inline-flex items-center gap-1.5">
                              <MessageSquare size={12} /> {t("room.book.requests")}
                            </Label>
                            <Textarea name="specialRequests" value={bookingData.specialRequests} onChange={handleInputChange}
                              className="bg-white/5 border-primary/30 text-white placeholder:text-white/30 focus-visible:ring-primary rounded-none resize-none"
                              placeholder={t("room.book.requestsPh")} rows={3} />
                          </div>

                          <div className="flex gap-2">
                            <button type="button" onClick={() => setStep(1)}
                              className="px-4 py-3 border border-primary/30 text-white/70 uppercase tracking-[0.2em] text-[10px] hover:bg-white/5 inline-flex items-center gap-1">
                              <ChevronLeft size={12} /> Quay lại
                            </button>
                            <Button type="button" onClick={goNext} disabled={!guestValid}
                              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-none py-3 uppercase tracking-[0.2em] text-xs disabled:opacity-50 inline-flex items-center justify-center gap-2">
                              Xem lại <ChevronRight size={14} />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* STEP 3 — Confirm */}
                      {step === 3 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                          <ReviewBlock title="Lịch trình">
                            <ReviewLine label="Nhận phòng" value={new Date(bookingData.checkInDate).toLocaleDateString("vi-VN")} />
                            <ReviewLine label="Trả phòng" value={new Date(bookingData.checkOutDate).toLocaleDateString("vi-VN")} />
                            <ReviewLine label="Số đêm" value={`${nights} đêm`} />
                            <ReviewLine label="Số khách" value={`${bookingData.numberOfGuests} khách`} />
                          </ReviewBlock>

                          <ReviewBlock title="Khách hàng">
                            <ReviewLine label="Họ tên" value={bookingData.guestName} />
                            <ReviewLine label="Email" value={bookingData.guestEmail} />
                            <ReviewLine label="SĐT" value={bookingData.guestPhone} />
                          </ReviewBlock>

                          <PriceSummary pricePerNight={pricePerNight} nights={nights} subtotal={subtotal} serviceFee={serviceFee} taxes={taxes} total={total} highlight />

                          <div className="flex gap-2">
                            <button type="button" onClick={() => setStep(2)}
                              className="px-4 py-3 border border-primary/30 text-white/70 uppercase tracking-[0.2em] text-[10px] hover:bg-white/5 inline-flex items-center gap-1">
                              <ChevronLeft size={12} /> Sửa
                            </button>
                            <Button type="submit" disabled={createBooking.isPending}
                              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-none py-3 uppercase tracking-[0.2em] text-xs disabled:opacity-50">
                              {createBooking.isPending ? t("room.book.submitting") : `Xác nhận đặt phòng`}
                            </Button>
                          </div>

                          <div className="text-[10px] text-center text-white/40 tracking-widest uppercase pt-2 border-t border-primary/15">
                            <ShieldCheck size={11} className="inline mr-1 text-primary/70" />
                            Thanh toán an toàn · Hủy miễn phí trước 48h
                          </div>
                        </div>
                      )}

                      {/* STEP 4 — Payment */}
                      {step === 4 && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">

                          {/* ── Payment method selection ── */}
                          {payMethod === null && (
                            <>
                              <div className="text-center mb-2">
                                <span className="text-[10px] tracking-[0.3em] uppercase text-primary/80">Chọn phương thức thanh toán</span>
                                <div className="bg-white/5 border border-primary/20 px-4 py-3 flex justify-between items-center mt-3">
                                  <span className="text-[10px] tracking-widest uppercase text-white/50">Số tiền cần thanh toán</span>
                                  <span className="font-serif text-primary text-lg">{fmtVND(bookingAmount)}</span>
                                </div>
                              </div>

                              <div className="space-y-3">
                                {paySettings.momo.enabled && paySettings.momo.configured && (
                                  <button type="button"
                                    disabled={loadingMomo}
                                    onClick={() => bookingId && initMomo(bookingId)}
                                    className="w-full flex items-center gap-4 border border-[#ae2070]/40 bg-[#ae2070]/10 hover:bg-[#ae2070]/20 px-5 py-4 transition-colors disabled:opacity-50">
                                    <span className="w-10 h-10 rounded-full bg-[#ae2070] flex items-center justify-center shrink-0">
                                      <span className="text-white text-base font-bold">M</span>
                                    </span>
                                    <div className="flex-1 text-left">
                                      <div className="font-medium text-foreground text-sm">Ví MoMo</div>
                                      <div className="text-xs text-white/50 mt-0.5">Quét QR bằng ứng dụng MoMo — xác nhận tức thì</div>
                                    </div>
                                    {loadingMomo ? <Loader2 size={16} className="animate-spin text-primary/60" /> : <ChevronRight size={16} className="text-primary/40" />}
                                  </button>
                                )}

                                {paySettings.bank.enabled && paySettings.bank.accountNumber && (
                                  <button type="button"
                                    onClick={() => setPayMethod("bank")}
                                    className="w-full flex items-center gap-4 border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 px-5 py-4 transition-colors">
                                    <span className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center shrink-0">
                                      <Building2 size={18} className="text-white" />
                                    </span>
                                    <div className="flex-1 text-left">
                                      <div className="font-medium text-foreground text-sm">Chuyển khoản ngân hàng</div>
                                      <div className="text-xs text-white/50 mt-0.5">Quét mã VietQR — hỗ trợ tất cả ngân hàng Việt Nam</div>
                                    </div>
                                    <ChevronRight size={16} className="text-primary/40" />
                                  </button>
                                )}

                                {/* Xac nhan tu dong noi bo — luon co, khong can ben thu 3 */}
                                <button type="button"
                                  onClick={() => bookingId && setLocation(`/checkout/${bookingId}`)}
                                  className="w-full flex items-center gap-4 border border-primary/40 bg-primary/10 hover:bg-primary/20 px-5 py-4 transition-colors">
                                  <span className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
                                    <ShieldCheck size={18} className="text-secondary" />
                                  </span>
                                  <div className="flex-1 text-left">
                                    <div className="font-medium text-foreground text-sm">Xác nhận tự động</div>
                                    <div className="text-xs text-white/50 mt-0.5">Hệ thống tự xử lý — không cần thanh toán bên thứ 3</div>
                                  </div>
                                  <ChevronRight size={16} className="text-primary/40" />
                                </button>

                                {!paySettings.momo.enabled && (!paySettings.bank.enabled || !paySettings.bank.accountNumber) && (
                                  <div className="text-center text-white/40 text-[10px] tracking-widest uppercase py-2">
                                    Phương thức MoMo / chuyển khoản chưa được cấu hình
                                  </div>
                                )}
                              </div>

                              <div className="text-[10px] text-center text-white/30 tracking-widest uppercase">
                                <ShieldCheck size={11} className="inline mr-1 text-primary/60" />
                                Thông tin đặt phòng đã được giữ chỗ
                              </div>
                            </>
                          )}

                          {/* ── MoMo QR ── */}
                          {payMethod === "momo" && momoPayment && (
                            <>
                              <div className="text-center">
                                <button type="button" onClick={() => setPayMethod(null)} className="text-[10px] text-white/40 hover:text-primary uppercase tracking-widest mb-3 transition-colors">← Chọn lại</button>
                                <div className="inline-flex items-center gap-2 mb-1">
                                  <span className="w-5 h-5 rounded-full bg-[#ae2070] flex items-center justify-center">
                                    <span className="text-white text-[9px] font-bold">M</span>
                                  </span>
                                  <span className="text-[10px] tracking-[0.3em] uppercase text-primary/80">Thanh toán MoMo</span>
                                </div>
                                <p className="text-white/60 text-xs mt-1">Quét mã QR bằng ứng dụng MoMo để thanh toán</p>
                              </div>
                              <div className="flex flex-col items-center gap-3">
                                <div className="bg-white p-3 border-2 border-primary/30">
                                  {momoPayment.qrCodeUrl ? (
                                    <img src={momoPayment.qrCodeUrl} alt="MoMo QR Code" className="w-44 h-44 object-contain" />
                                  ) : (
                                    <div className="w-44 h-44 flex items-center justify-center text-secondary text-xs text-center p-4">QR không khả dụng. Dùng link bên dưới.</div>
                                  )}
                                </div>
                                <a href={momoPayment.payUrl} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-[10px] text-primary/80 uppercase tracking-widest hover:text-primary transition-colors">
                                  <ExternalLink size={11} /> Mở trang thanh toán MoMo
                                </a>
                              </div>
                              <div className="bg-white/5 border border-primary/20 px-4 py-3 flex justify-between items-center">
                                <span className="text-[10px] tracking-widest uppercase text-white/50">Số tiền</span>
                                <span className="font-serif text-primary text-lg">{fmtVND(momoPayment.amount)}</span>
                              </div>
                              <div className="flex items-center justify-center gap-2 text-white/40 text-[10px] uppercase tracking-widest">
                                <Loader2 size={12} className="animate-spin text-primary/60" />
                                Đang chờ xác nhận thanh toán...
                              </div>
                              <Button type="button" onClick={handleCheckPayment} disabled={paymentChecking}
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-none py-3 uppercase tracking-[0.2em] text-xs">
                                {paymentChecking ? <><Loader2 size={13} className="mr-2 animate-spin" /> Đang kiểm tra...</> : "Tôi đã thanh toán xong"}
                              </Button>
                              <div className="text-[10px] text-center text-white/30 tracking-widest uppercase">Trang sẽ tự động cập nhật sau khi thanh toán thành công</div>
                            </>
                          )}

                          {/* ── Bank Transfer / VietQR ── */}
                          {payMethod === "bank" && (
                            <>
                              <div className="text-center">
                                <button type="button" onClick={() => setPayMethod(null)} className="text-[10px] text-white/40 hover:text-primary uppercase tracking-widest mb-3 transition-colors">← Chọn lại</button>
                                <div className="inline-flex items-center gap-2 mb-1">
                                  <QrCode size={14} className="text-primary" />
                                  <span className="text-[10px] tracking-[0.3em] uppercase text-primary/80">Chuyển khoản ngân hàng</span>
                                </div>
                                <p className="text-white/60 text-xs mt-1">Quét mã VietQR hoặc chuyển khoản theo thông tin bên dưới</p>
                              </div>

                              <div className="flex flex-col items-center gap-3">
                                {(() => {
                                  const b = paySettings.bank;
                                  const desc = encodeURIComponent(`${b.defaultDescription} ${bookingId ?? ""}`);
                                  const qrUrl = `https://img.vietqr.io/image/${b.bankCode}-${b.accountNumber}-compact2.png?accountName=${encodeURIComponent(b.accountName)}&amount=${Math.round(bookingAmount)}&addInfo=${desc}`;
                                  return (
                                    <>
                                      <div className="bg-white p-3 border-2 border-emerald-500/40">
                                        <img src={qrUrl} alt="VietQR" className="w-44 h-44 object-contain" />
                                      </div>
                                      <div className="bg-white/5 border border-primary/20 px-4 py-3 space-y-2 w-full text-xs">
                                        <div className="flex justify-between">
                                          <span className="text-white/50 uppercase tracking-widest text-[10px]">Ngân hàng</span>
                                          <span className="text-foreground font-medium">{b.bankCode}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-white/50 uppercase tracking-widest text-[10px]">Số tài khoản</span>
                                          <span className="text-foreground font-mono font-semibold tracking-widest">{b.accountNumber}</span>
                                        </div>
                                        {b.accountName && (
                                          <div className="flex justify-between">
                                            <span className="text-white/50 uppercase tracking-widest text-[10px]">Tên TK</span>
                                            <span className="text-foreground uppercase">{b.accountName}</span>
                                          </div>
                                        )}
                                        <div className="flex justify-between">
                                          <span className="text-white/50 uppercase tracking-widest text-[10px]">Số tiền</span>
                                          <span className="text-primary font-serif text-base">{fmtVND(bookingAmount)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-white/50 uppercase tracking-widest text-[10px]">Nội dung</span>
                                          <span className="text-foreground font-medium">{b.defaultDescription} {bookingId}</span>
                                        </div>
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>

                              <div className="bg-amber-900/30 border border-amber-500/30 px-4 py-3 text-xs text-amber-300 text-center">
                                Sau khi chuyển khoản, đặt phòng sẽ được xác nhận thủ công bởi nhân viên trong vòng 30 phút.
                              </div>

                              <Button type="button" onClick={handleCheckPayment} disabled={paymentChecking}
                                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-none py-3 uppercase tracking-[0.2em] text-xs">
                                {paymentChecking ? <><Loader2 size={13} className="mr-2 animate-spin" /> Đang kiểm tra...</> : "Tôi đã chuyển khoản xong"}
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </form>
                  </>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}

// ----- Sub-components -----

function SectionHeader({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="inline-flex items-center gap-2 text-primary mb-2">
        {icon ?? <span className="w-6 h-px bg-primary" />}
        <span className="text-[10px] tracking-[0.35em] uppercase font-medium">Chi tiết</span>
      </div>
      <h3 className="font-serif text-2xl text-foreground">{children}</h3>
    </div>
  );
}

function SpecBlock({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="px-5 py-6 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-primary text-primary mx-auto mb-3 bg-primary/5">
        {icon}
      </div>
      <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">{label}</div>
      <div className="font-serif text-lg text-foreground">{value}</div>
    </div>
  );
}

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-secondary/85 backdrop-blur text-white text-[10px] tracking-[0.25em] uppercase px-3 py-1.5 border border-primary/40">
      <span className="text-primary">{icon}</span>{label}
    </span>
  );
}

function Trust({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="border border-primary/20 bg-card p-4 flex items-start gap-3">
      <div className="w-9 h-9 inline-flex items-center justify-center bg-primary/10 border border-primary/30 text-primary shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-sm font-serif text-foreground">{title}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{desc}</div>
      </div>
    </div>
  );
}

function Stepper({ current, steps }: { current: Step; steps: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {steps.map((label, i) => {
        const idx = (i + 1) as Step;
        const active = idx === current;
        const done = idx < current;
        return (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-[11px] font-medium border transition-all ${
                done ? "bg-primary text-primary-foreground border-primary" :
                active ? "bg-primary/20 text-primary border-primary" :
                "bg-transparent text-white/40 border-white/20"
              }`}>
                {done ? <Check size={12} /> : idx}
              </div>
              <span className={`mt-1 text-[9px] tracking-[0.2em] uppercase ${active ? "text-primary" : "text-white/40"}`}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px flex-1 -mt-4 ${idx < current ? "bg-primary" : "bg-white/15"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function DateField({
  label, icon, name, value, min, onChange,
}: {
  label: string; icon: React.ReactNode; name: string; value: string; min: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <Label className="text-white/70 uppercase tracking-[0.2em] text-[10px] mb-2 inline-flex items-center gap-1.5">
        {icon} {label}
      </Label>
      <Input type="date" name={name} value={value} min={min} onChange={onChange} required
        className="bg-white/5 border-primary/30 text-white focus-visible:ring-primary rounded-none h-11 [color-scheme:dark]" />
    </div>
  );
}

function FieldText({
  label, icon, name, value, onChange, placeholder, type = "text", required,
}: {
  label: string; icon: React.ReactNode; name: string; value: string; placeholder?: string;
  type?: string; required?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div>
      <Label className="text-white/70 uppercase tracking-[0.2em] text-[10px] mb-2 inline-flex items-center gap-1.5">
        {icon} {label}
      </Label>
      <Input name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
        className="bg-white/5 border-primary/30 text-white placeholder:text-white/30 focus-visible:ring-primary rounded-none h-11" />
    </div>
  );
}

function Counter({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="w-8 h-8 inline-flex items-center justify-center border border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
      {children}
    </button>
  );
}

function PriceSummary({
  pricePerNight, nights, subtotal, serviceFee, taxes, total, highlight,
}: { pricePerNight: number; nights: number; subtotal: number; serviceFee: number; taxes: number; total: number; highlight?: boolean }) {
  return (
    <div className={`border ${highlight ? "border-primary bg-primary/5" : "border-primary/25 bg-white/[0.02]"} p-4 space-y-2`}>
      <Line label={`${fmtVND(pricePerNight)} × ${nights} đêm`} value={fmtVND(subtotal)} />
      <Line label="Phí dịch vụ (5%)" value={fmtVND(serviceFee)} muted />
      <Line label="Thuế VAT (10%)" value={fmtVND(taxes)} muted />
      <div className="h-px bg-primary/20 my-2" />
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] tracking-[0.3em] uppercase text-primary">Tổng cộng</span>
        <div className="text-right">
          <div className="font-serif text-2xl text-primary">{fmtVND(total)}</div>
          <div className="text-[10px] text-white/50 tracking-widest">{nights} đêm · {`${pricePerNight.toLocaleString("vi-VN")}/đêm`}</div>
        </div>
      </div>
    </div>
  );
}

function Line({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={`flex items-center justify-between text-xs ${muted ? "text-white/50" : "text-white/85"}`}>
      <span>{label}</span><span>{value}</span>
    </div>
  );
}

function ReviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-primary/20 bg-white/[0.02] p-4">
      <div className="text-[10px] tracking-[0.3em] uppercase text-primary mb-3">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-white/50">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}
