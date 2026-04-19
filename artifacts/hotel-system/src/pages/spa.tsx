import { Link } from "wouter";
import { PageLayout } from "@/components/layout/PageLayout";
import { Sparkles, Crown, Clock, Star, Leaf, Wind, Droplets, ChevronRight, Phone, ArrowRight } from "lucide-react";
import { useBranding } from "@/lib/branding";

const TREATMENTS = [
  {
    category: "Liệu pháp thư giãn",
    icon: Leaf,
    items: [
      { name: "Vietnamese Royal Ritual", duration: "120 phút", price: "2.800.000 ₫", desc: "Nghi lễ spa hoàng gia Việt Nam kết hợp massage toàn thân với thảo dược quý hiếm và tinh dầu hoa lài." },
      { name: "Herbal Compress Massage", duration: "90 phút", price: "1.900.000 ₫", desc: "Massage truyền thống với túi thảo dược nóng, giải tỏa căng thẳng và cải thiện tuần hoàn máu." },
      { name: "Aromatherapy Journey", duration: "75 phút", price: "1.600.000 ₫", desc: "Hành trình thư giãn với tinh dầu thiên nhiên cao cấp, khơi dậy các giác quan và cân bằng năng lượng." },
    ],
  },
  {
    category: "Chăm sóc da mặt",
    icon: Droplets,
    items: [
      { name: "Royal Gold Facial", duration: "90 phút", price: "3.200.000 ₫", desc: "Liệu trình phục hồi da cao cấp với collagen vàng 24K và serum nhau thai tế bào gốc." },
      { name: "Lotus Brightening Facial", duration: "60 phút", price: "1.800.000 ₫", desc: "Làm sáng da tự nhiên với chiết xuất hoa sen Việt Nam, vitamin C thuần và enzyme papaya." },
      { name: "Hydra Deep Cleanse", duration: "75 phút", price: "1.500.000 ₫", desc: "Làm sạch sâu và dưỡng ẩm chuyên sâu, phục hồi làn da căng mịn và tươi sáng." },
    ],
  },
  {
    category: "Gói nghỉ dưỡng trọn vẹn",
    icon: Star,
    items: [
      { name: "Grand Palace Day Spa", duration: "4 giờ", price: "5.500.000 ₫", desc: "Trải nghiệm toàn diện bao gồm tắm ngâm thảo dược, facial, massage và bữa trà chiều sang trọng." },
      { name: "Couple's Retreat", duration: "3 giờ", price: "8.800.000 ₫", desc: "Gói spa đôi trong phòng suite riêng biệt, bao gồm champagne, hoa tươi và hai liệu trình massage." },
      { name: "Detox & Renewal", duration: "5 giờ", price: "6.800.000 ₫", desc: "Chương trình thanh lọc toàn diện với body wrap, massage detox, facial và tắm muối khoáng." },
    ],
  },
];

const AMENITIES = [
  { icon: Wind,     title: "Hồ bơi vô cực",      desc: "Hồ bơi 25m, view thành phố hoặc biển" },
  { icon: Droplets, title: "Phòng xông hơi",      desc: "Xông khô & xông ướt đạt chuẩn 5 sao" },
  { icon: Leaf,     title: "Vườn thảo dược",      desc: "Nguồn nguyên liệu tươi mỗi ngày" },
  { icon: Star,     title: "Phòng spa riêng tư",  desc: "8 phòng trị liệu đơn và đôi" },
  { icon: Crown,    title: "Royal Lounge",         desc: "Không gian thư giãn trước và sau liệu trình" },
  { icon: Clock,    title: "Mở cửa 24/7",         desc: "Phục vụ theo yêu cầu bất kỳ lúc nào" },
];

export default function SpaPage() {
  const { branding } = useBranding();

  return (
    <PageLayout>
      {/* HERO */}
      <section className="relative h-[65vh] min-h-[500px] flex items-end overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/hotel-hanoi.png"
            alt="Grand Palace Spa"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/50 to-secondary/10" />
        </div>

        <div aria-hidden className="absolute top-10 left-10 w-24 h-24 border-l border-t border-primary/30 hidden md:block" />
        <div aria-hidden className="absolute top-10 right-10 w-24 h-24 border-r border-t border-primary/30 hidden md:block" />

        <div className="relative z-10 container mx-auto px-4 md:px-8 pb-20 mt-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-3 mb-5">
              <span className="w-10 h-px bg-primary" />
              <Sparkles size={13} className="text-primary" />
              <span className="text-primary text-[10px] tracking-[0.4em] uppercase">{branding.brandName}</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-serif text-white mb-5 leading-tight">
              Spa &<br />Thư Giãn
            </h1>
            <div className="flex items-center gap-2 mb-6">
              <span className="w-12 h-px bg-primary" />
              <span className="w-1.5 h-1.5 rotate-45 bg-primary" />
              <span className="w-20 h-px bg-primary/40" />
            </div>
            <p className="text-white/75 font-light text-lg leading-relaxed max-w-xl">
              Nơi tâm hồn được phục hồi và cơ thể được tái sinh. Trải nghiệm nghi lễ chăm sóc hoàng gia kết hợp trí tuệ y học cổ truyền Việt Nam với khoa học sắc đẹp hiện đại.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="#treatments"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground uppercase tracking-widest text-xs px-7 py-3.5 hover:bg-primary/90 transition-colors">
                Xem liệu trình <ArrowRight size={14} />
              </a>
              <Link href="/contact">
                <button className="inline-flex items-center gap-2 border border-primary/60 text-primary uppercase tracking-widest text-xs px-7 py-3.5 hover:bg-primary/10 transition-colors">
                  Đặt lịch ngay
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* INTRO BAND */}
      <section className="py-16 bg-secondary/5 border-y border-primary/10">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-primary/20 text-center">
            {[
              { n: "8", label: "Phòng trị liệu" },
              { n: "20+", label: "Liệu trình độc quyền" },
              { n: "100%", label: "Nguyên liệu thiên nhiên" },
              { n: "5★", label: "Đánh giá của khách" },
            ].map((s) => (
              <div key={s.label} className="px-6 py-4">
                <div className="font-serif text-3xl text-primary mb-1">{s.n}</div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AMENITIES */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <div className="text-center mb-14">
            <p className="text-primary tracking-[0.3em] text-xs uppercase mb-4 font-serif">Tiện nghi đẳng cấp</p>
            <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">Không gian thư giãn toàn diện</h2>
            <div className="w-12 h-[2px] bg-primary mx-auto" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {AMENITIES.map((a) => (
              <div key={a.title} className="group flex items-start gap-4 border border-primary/15 p-6 bg-card hover:border-primary/50 transition-all">
                <div className="p-3 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                  <a.icon size={20} />
                </div>
                <div>
                  <h3 className="font-serif text-base text-foreground mb-1">{a.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TREATMENTS */}
      <section id="treatments" className="py-20 bg-secondary/5 border-y border-primary/10">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <div className="text-center mb-14">
            <p className="text-primary tracking-[0.3em] text-xs uppercase mb-4 font-serif">Bộ sưu tập liệu trình</p>
            <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">Trải nghiệm trị liệu độc quyền</h2>
            <div className="w-12 h-[2px] bg-primary mx-auto mb-4" />
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              Mỗi liệu trình được thiết kế bởi các chuyên gia spa quốc tế, sử dụng nguyên liệu thuần tự nhiên được tuyển chọn kỹ lưỡng.
            </p>
          </div>

          <div className="space-y-14">
            {TREATMENTS.map((group) => (
              <div key={group.category}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary/10 text-primary">
                    <group.icon size={16} />
                  </div>
                  <h3 className="font-serif text-xl text-foreground">{group.category}</h3>
                  <span className="flex-1 h-px bg-primary/15" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {group.items.map((item) => (
                    <div key={item.name} className="group relative bg-card border border-primary/15 hover:border-primary/50 transition-all overflow-hidden">
                      <span className="absolute top-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-500" />
                      <div className="p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Clock size={12} className="text-primary/60" />
                          <span className="text-[10px] tracking-widest uppercase text-muted-foreground">{item.duration}</span>
                        </div>
                        <h4 className="font-serif text-lg text-foreground mb-3 leading-snug">{item.name}</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-5">{item.desc}</p>
                        <div className="flex items-baseline justify-between border-t border-primary/10 pt-4">
                          <span className="font-serif text-primary text-lg">{item.price}</span>
                          <Link href="/contact">
                            <button className="text-[10px] tracking-widest uppercase text-primary hover:text-foreground transition-colors flex items-center gap-1">
                              Đặt lịch <ChevronRight size={11} />
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-secondary relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(45deg, hsl(46,65%,52%) 0, hsl(46,65%,52%) 1px, transparent 0, transparent 50%)", backgroundSize: "20px 20px" }} />
        </div>
        <div className="relative container mx-auto px-4 text-center">
          <p className="text-primary tracking-[0.3em] text-xs uppercase mb-4 font-serif">Đặt lịch hẹn</p>
          <h2 className="text-3xl md:text-4xl font-serif text-white mb-4">Bắt đầu hành trình thư giãn</h2>
          <div className="w-12 h-px bg-primary mx-auto mb-6" />
          <p className="text-white/65 max-w-md mx-auto text-sm mb-10 leading-relaxed">
            Liên hệ đội ngũ spa của chúng tôi để được tư vấn và đặt lịch hẹn. Chúng tôi sẽ thiết kế trải nghiệm hoàn hảo dành riêng cho bạn.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Link href="/contact">
              <button className="bg-primary text-primary-foreground uppercase tracking-widest text-xs px-8 py-3.5 hover:bg-primary/90 transition-colors">
                Liên hệ đặt lịch
              </button>
            </Link>
            <a href="tel:+8418009999"
              className="inline-flex items-center gap-2 border border-primary text-primary uppercase tracking-widest text-xs px-8 py-3.5 hover:bg-primary/10 transition-colors">
              <Phone size={13} /> +84 1800 9999
            </a>
          </div>
          <p className="text-white/40 text-[11px] tracking-widest uppercase">Mở cửa 7:00 – 22:00 · 7 ngày trong tuần</p>
        </div>
      </section>
    </PageLayout>
  );
}
