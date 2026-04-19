import { Link } from "wouter";
import { useListHotels } from "@workspace/api-client-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { MapPin, ChevronRight, BedDouble, Crown, Sparkles } from "lucide-react";
import { useBranding } from "@/lib/branding";

const HOTEL_HIGHLIGHTS: Record<string, { highlight: string; rooms: string; feature: string }> = {
  hanoi:  { highlight: "View Hồ Hoàn Kiếm",   rooms: "86 phòng & suite", feature: "Kiến trúc Pháp cổ điển" },
  danang: { highlight: "Trực diện biển Mỹ Khê", rooms: "120 phòng & suite", feature: "Resort biển panorama" },
  hcmc:   { highlight: "Tòa tháp 45 tầng",     rooms: "200 phòng & suite", feature: "Toàn cảnh đô thị" },
};

export default function RoomsLandingPage() {
  const { branding } = useBranding();
  const { data: hotels, isLoading } = useListHotels();

  return (
    <PageLayout>
      {/* HERO */}
      <section className="relative h-[55vh] min-h-[420px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="/images/room-suite.png"
            alt="Phòng & Suite"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-secondary/65" />
          <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/40 to-transparent" />
        </div>

        {/* Ornamental corners */}
        <div aria-hidden className="absolute top-8 left-8 w-20 h-20 border-l border-t border-primary/40 hidden md:block" />
        <div aria-hidden className="absolute top-8 right-8 w-20 h-20 border-r border-t border-primary/40 hidden md:block" />
        <div aria-hidden className="absolute bottom-8 left-8 w-20 h-20 border-l border-b border-primary/40 hidden md:block" />
        <div aria-hidden className="absolute bottom-8 right-8 w-20 h-20 border-r border-b border-primary/40 hidden md:block" />

        <div className="relative z-10 container mx-auto px-4 text-center mt-16">
          <div className="inline-flex items-center gap-3 mb-5">
            <span className="w-10 h-px bg-primary" />
            <Crown size={15} className="text-primary" />
            <span className="text-primary text-[10px] tracking-[0.4em] uppercase">{branding.brandName}</span>
            <Crown size={15} className="text-primary" />
            <span className="w-10 h-px bg-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-serif text-white mb-5 leading-tight">
            Phòng & Suite
          </h1>
          <div className="flex items-center justify-center gap-2 mb-5">
            <span className="w-10 h-px bg-primary/60" />
            <span className="w-1.5 h-1.5 rotate-45 bg-primary" />
            <span className="w-16 h-px bg-primary" />
            <span className="w-1.5 h-1.5 rotate-45 bg-primary" />
            <span className="w-10 h-px bg-primary/60" />
          </div>
          <p className="text-white/75 font-light max-w-xl mx-auto text-lg">
            Chọn chi nhánh để khám phá bộ sưu tập phòng độc quyền tại mỗi địa điểm.
          </p>
        </div>
      </section>

      {/* BRANCH SELECTOR */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <div className="text-center mb-14">
            <p className="text-primary tracking-[0.3em] text-xs uppercase mb-4 font-serif">Hệ thống chi nhánh</p>
            <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">
              Chọn địa điểm lưu trú
            </h2>
            <div className="w-12 h-[2px] bg-primary mx-auto mb-4" />
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">
              Ba chi nhánh — ba trải nghiệm hoàn toàn khác biệt. Mỗi địa điểm mang đến bộ sưu tập phòng đặc trưng riêng.
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(hotels as any[] ?? []).map((hotel) => {
                const info = HOTEL_HIGHLIGHTS[hotel.slug] ?? { highlight: "", rooms: "", feature: "" };
                return (
                  <Link key={hotel.id} href={`/hotels/${hotel.slug}/rooms`}>
                    <article className="group relative cursor-pointer border border-primary/20 hover:border-primary/70 transition-all duration-500 overflow-hidden bg-card hover:shadow-xl">
                      {/* Image */}
                      <div className="relative h-64 overflow-hidden">
                        <img
                          src={hotel.imageUrl || "/images/hero.png"}
                          alt={hotel.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/30 to-transparent" />

                        {/* City badge */}
                        <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-secondary/80 backdrop-blur-sm px-3 py-1.5 border border-primary/30">
                          <MapPin size={11} className="text-primary" />
                          <span className="text-[10px] tracking-widest uppercase text-white/90">{hotel.city}</span>
                        </div>

                        {/* BedDouble icon bottom-right */}
                        <div className="absolute bottom-4 right-4 p-2 bg-primary/20 backdrop-blur-sm border border-primary/40">
                          <BedDouble size={18} className="text-primary" />
                        </div>

                        {/* Highlight overlay */}
                        <div className="absolute bottom-4 left-4">
                          <div className="flex items-center gap-1.5 text-primary">
                            <Sparkles size={11} />
                            <span className="text-[10px] tracking-widest uppercase font-medium">{info.highlight}</span>
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <h3 className="font-serif text-xl text-foreground mb-2 leading-snug group-hover:text-primary transition-colors">
                          {hotel.name}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-4">
                          {hotel.description}
                        </p>

                        {/* Meta chips */}
                        <div className="flex flex-wrap gap-2 mb-5">
                          <span className="text-[10px] tracking-wider uppercase border border-primary/25 text-muted-foreground px-2 py-1 bg-primary/5">
                            {info.rooms}
                          </span>
                          <span className="text-[10px] tracking-wider uppercase border border-primary/25 text-muted-foreground px-2 py-1 bg-primary/5">
                            {info.feature}
                          </span>
                        </div>

                        {/* CTA */}
                        <div className="flex items-center justify-between border-t border-primary/15 pt-4">
                          <span className="text-[11px] tracking-[0.25em] uppercase text-muted-foreground">Xem phòng</span>
                          <div className="flex items-center gap-1.5 text-primary group-hover:gap-2.5 transition-all">
                            <span className="text-[11px] tracking-widest uppercase font-medium">Khám phá</span>
                            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>

                      {/* Active indicator bar */}
                      <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-500" />
                    </article>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* STATS BAND */}
      <section className="py-12 bg-secondary border-y border-primary/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-primary/20">
            {[
              { n: "3", label: "Chi nhánh" },
              { n: "400+", label: "Phòng & Suite" },
              { n: "5★", label: "Tiêu chuẩn quốc tế" },
              { n: "24/7", label: "Dịch vụ butler" },
            ].map((s) => (
              <div key={s.label} className="text-center py-4 px-6">
                <div className="font-serif text-3xl text-primary mb-1">{s.n}</div>
                <div className="text-[10px] tracking-[0.25em] uppercase text-white/60">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
