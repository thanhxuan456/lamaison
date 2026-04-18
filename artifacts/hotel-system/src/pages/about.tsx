import { Link } from "wouter";
import { PageLayout } from "@/components/layout/PageLayout";
import { useListHotels } from "@workspace/api-client-react";
import { MapPin, Award, Users, Heart, Shield, Star, ChevronRight, Phone, Mail, Building2, BedDouble, BookOpen, CalendarCheck, Settings } from "lucide-react";
import { useBranding } from "@/lib/branding";

const VALUES = [
  { icon: Star, title: "Đẳng cấp 5 sao", body: "Mỗi chi tiết đều được chăm chút tỉ mỉ, từ nội thất cao cấp đến dịch vụ cá nhân hóa — tất cả tạo nên trải nghiệm vượt trên sự mong đợi." },
  { icon: Heart, title: "Tận tâm phục vụ", body: "Đội ngũ nhân viên được đào tạo chuyên sâu, luôn sẵn sàng 24/7 để đảm bảo mỗi khoảnh khắc lưu trú của bạn là hoàn hảo tuyệt đối." },
  { icon: Shield, title: "An toàn & Bảo mật", body: "Hệ thống an ninh tiên tiến, quy trình vệ sinh nghiêm ngặt và bảo mật thông tin khách hàng là ưu tiên hàng đầu của chúng tôi." },
  { icon: Award, title: "Giải thưởng quốc tế", body: "Liên tục được vinh danh bởi các tổ chức du lịch hàng đầu thế giới như World Travel Awards, Condé Nast Traveller và Forbes Travel Guide." },
  { icon: Users, title: "Cộng đồng & Trách nhiệm", body: "Cam kết phát triển bền vững, hỗ trợ cộng đồng địa phương và bảo tồn văn hóa truyền thống Việt Nam trong từng trải nghiệm." },
  { icon: Building2, title: "Cơ sở vật chất hiện đại", body: "Hệ thống hội nghị đẳng cấp, spa phục hồi và nhà hàng fine dining — tất cả được thiết kế để đáp ứng nhu cầu cao nhất của khách quý." },
];

const MILESTONES = [
  { year: "2005", event: "Khai trương Grand Palace Hà Nội, khởi đầu hành trình 5 sao tại Việt Nam." },
  { year: "2010", event: "Mở rộng ra Đà Nẵng với resort biển đầu tiên trực tiếp trên bãi biển Mỹ Khê." },
  { year: "2015", event: "Nhận giải thưởng Best Luxury Hotel Vietnam lần đầu tiên từ World Travel Awards." },
  { year: "2018", event: "Khai trương tổ hợp khách sạn flagship tại TP. Hồ Chí Minh — tòa tháp 45 tầng biểu tượng." },
  { year: "2022", event: "Đạt chứng nhận xanh Green Key, cam kết phát triển du lịch bền vững." },
  { year: "2024", event: "Phục vụ hơn 500.000 lượt khách, khẳng định vị thế hàng đầu ngành khách sạn cao cấp Việt Nam." },
];

const MANAGEMENT_LINKS = [
  { icon: Building2, label: "Quản lý khách sạn", href: "/admin/hotels", desc: "Xem và chỉnh sửa thông tin các chi nhánh" },
  { icon: BedDouble, label: "Quản lý phòng", href: "/admin/rooms", desc: "Danh sách phòng và cập nhật trạng thái" },
  { icon: CalendarCheck, label: "Quản lý đặt phòng", href: "/admin/bookings", desc: "Theo dõi và xử lý các đơn đặt phòng" },
  { icon: BookOpen, label: "Hóa đơn & Doanh thu", href: "/admin/invoices", desc: "Báo cáo tài chính và hóa đơn khách hàng" },
  { icon: Users, label: "Khách hàng", href: "/admin/guests", desc: "Danh sách và lịch sử khách hàng" },
  { icon: Settings, label: "Bảng điều khiển", href: "/admin", desc: "Tổng quan hệ thống quản lý khách sạn" },
];

export default function AboutPage() {
  const { branding } = useBranding();
  const { data: hotels } = useListHotels();

  return (
    <PageLayout>
      {/* Hero */}
      <section className="relative h-[60vh] min-h-[480px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="/images/hotel-hanoi.png" alt="Grand Palace" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-secondary/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/40 to-transparent" />
        </div>
        <div className="relative z-10 container mx-auto px-4 text-center mt-16">
          <p className="text-primary font-serif tracking-[0.3em] text-sm uppercase mb-4">Về chúng tôi</p>
          <h1 className="text-4xl md:text-6xl font-serif text-white mb-6 leading-tight">
            {branding.brandName}
          </h1>
          <div className="w-20 h-[1px] bg-primary mx-auto mb-6" />
          <p className="text-white/80 text-lg font-light max-w-2xl mx-auto">
            Hơn hai thập kỷ kiến tạo những khoảnh khắc sang trọng — từ Hà Nội đến Đà Nẵng và TP. Hồ Chí Minh.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-primary tracking-[0.3em] text-xs uppercase mb-4 font-serif">Câu chuyện của chúng tôi</p>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6 leading-snug">
                Kiến tạo di sản<br />khách sạn Việt Nam
              </h2>
              <div className="w-12 h-[2px] bg-primary mb-8" />
              <div className="space-y-4 text-muted-foreground font-light leading-relaxed">
                <p>
                  Grand Palace Hotels & Resorts được thành lập năm 2005 với sứ mệnh mang đến trải nghiệm nghỉ dưỡng sang trọng đẳng cấp quốc tế ngay trên đất nước Việt Nam. Khởi đầu từ một khách sạn boutique giữa lòng phố cổ Hà Nội, chúng tôi đã không ngừng phát triển thành chuỗi khách sạn 5 sao uy tín hàng đầu.
                </p>
                <p>
                  Mỗi chi nhánh của Grand Palace được xây dựng với triết lý riêng biệt — kết hợp kiến trúc đặc trưng của từng vùng miền với tiêu chuẩn dịch vụ quốc tế, tạo nên bản sắc độc đáo không thể nhầm lẫn. Từ cung điện Đông Dương tại Hà Nội, resort biển tại Đà Nẵng đến tòa tháp đương đại tại TP. Hồ Chí Minh.
                </p>
                <p>
                  Với đội ngũ hơn 2.000 nhân viên được đào tạo bởi các chuyên gia khách sạn hàng đầu thế giới, chúng tôi cam kết mang đến dịch vụ butler cá nhân hóa, ẩm thực fine dining và trải nghiệm spa phục hồi toàn diện cho mỗi vị khách quý.
                </p>
              </div>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/hotels/1/rooms">
                  <button className="inline-flex items-center gap-2 bg-primary text-primary-foreground uppercase tracking-widest text-xs px-6 py-3 hover:bg-primary/90 transition-colors">
                    Khám phá phòng <ChevronRight size={14} />
                  </button>
                </Link>
                <Link href="/contact">
                  <button className="inline-flex items-center gap-2 border border-primary text-primary uppercase tracking-widest text-xs px-6 py-3 hover:bg-primary/10 transition-colors">
                    Liên hệ
                  </button>
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-px bg-primary/20 border border-primary/20">
              {[
                { n: "20+", label: "Năm kinh nghiệm" },
                { n: "3", label: "Chi nhánh khách sạn" },
                { n: "500K+", label: "Lượt khách phục vụ" },
                { n: "2.000+", label: "Nhân viên chuyên nghiệp" },
              ].map((s) => (
                <div key={s.label} className="bg-background p-10 text-center">
                  <div className="font-serif text-4xl text-primary mb-2">{s.n}</div>
                  <div className="text-xs tracking-[0.2em] uppercase text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-secondary/5 border-y border-primary/10">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <div className="text-center mb-14">
            <p className="text-primary tracking-[0.3em] text-xs uppercase mb-4 font-serif">Giá trị cốt lõi</p>
            <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">Những gì định nghĩa chúng tôi</h2>
            <div className="w-12 h-[2px] bg-primary mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUES.map((v) => (
              <div key={v.title} className="group bg-background border border-primary/20 p-8 hover:border-primary/60 transition-all hover:shadow-md relative">
                <span className="absolute -top-[3px] -left-[3px] w-2 h-2 rotate-45 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="absolute -top-[3px] -right-[3px] w-2 h-2 rotate-45 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="p-3 bg-primary/10 text-primary inline-flex mb-5">
                  <v.icon size={22} />
                </div>
                <h3 className="font-serif text-lg text-foreground mb-3">{v.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <div className="text-center mb-14">
            <p className="text-primary tracking-[0.3em] text-xs uppercase mb-4 font-serif">Lịch sử phát triển</p>
            <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">Hành trình hai thập kỷ</h2>
            <div className="w-12 h-[2px] bg-primary mx-auto" />
          </div>
          <div className="relative">
            <div className="absolute left-[72px] top-0 bottom-0 w-px bg-primary/20" />
            <div className="space-y-8">
              {MILESTONES.map((m) => (
                <div key={m.year} className="flex items-start gap-8">
                  <div className="w-[72px] flex-shrink-0 font-serif text-primary text-lg text-right pr-4 pt-1">{m.year}</div>
                  <div className="relative flex-1 bg-background border border-primary/20 p-5 ml-4">
                    <span className="absolute -left-[5px] top-5 w-2.5 h-2.5 rotate-45 bg-primary border border-primary" />
                    <p className="text-sm text-muted-foreground leading-relaxed">{m.event}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Our Hotels */}
      {hotels && hotels.length > 0 && (
        <section className="py-20 bg-secondary/5 border-y border-primary/10">
          <div className="container mx-auto px-4 md:px-8 max-w-6xl">
            <div className="text-center mb-14">
              <p className="text-primary tracking-[0.3em] text-xs uppercase mb-4 font-serif">Hệ thống chi nhánh</p>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">Các khách sạn của chúng tôi</h2>
              <div className="w-12 h-[2px] bg-primary mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(hotels as any[]).map((h) => (
                <Link key={h.id} href={`/hotels/${h.slug}`}>
                  <div className="group relative overflow-hidden border border-primary/20 hover:border-primary/60 transition-all cursor-pointer">
                    <div className="h-56 overflow-hidden">
                      <img src={h.imageUrl || "/images/hero.png"} alt={h.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-secondary/40 group-hover:bg-secondary/20 transition-colors" />
                    </div>
                    <div className="p-6 bg-background">
                      <div className="flex items-center gap-1.5 text-primary mb-1">
                        <MapPin size={12} />
                        <span className="text-[10px] tracking-widest uppercase">{h.city}</span>
                      </div>
                      <h3 className="font-serif text-lg text-foreground mb-2">{h.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{h.description}</p>
                      <div className="mt-4 flex items-center gap-1 text-primary text-xs tracking-widest uppercase font-medium">
                        Khám phá <ChevronRight size={12} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Management Links */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <div className="text-center mb-14">
            <p className="text-primary tracking-[0.3em] text-xs uppercase mb-4 font-serif">Quản lý hệ thống</p>
            <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">Trang quản trị</h2>
            <div className="w-12 h-[2px] bg-primary mx-auto mb-4" />
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">
              Dành cho đội ngũ quản lý — truy cập nhanh đến các chức năng quản trị của hệ thống Grand Palace.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MANAGEMENT_LINKS.map((l) => (
              <Link key={l.href} href={l.href}>
                <div className="group flex items-center gap-4 border border-primary/20 hover:border-primary/60 bg-card p-5 cursor-pointer transition-all hover:shadow-md">
                  <div className="p-3 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors flex-shrink-0">
                    <l.icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{l.label}</div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">{l.desc}</div>
                  </div>
                  <ChevronRight size={14} className="text-primary/40 group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-20 bg-secondary relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(45deg, hsl(46,65%,52%) 0, hsl(46,65%,52%) 1px, transparent 0, transparent 50%)", backgroundSize: "20px 20px" }} />
        </div>
        <div className="relative container mx-auto px-4 text-center">
          <p className="text-primary tracking-[0.3em] text-xs uppercase mb-4 font-serif">Kết nối với chúng tôi</p>
          <h2 className="text-3xl md:text-4xl font-serif text-white mb-6">Chúng tôi luôn sẵn sàng phục vụ</h2>
          <div className="w-12 h-[1px] bg-primary mx-auto mb-8" />
          <div className="flex flex-wrap justify-center gap-8 mb-10 text-white/70 text-sm">
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-primary" />
              <span>+84 1800 9999</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-primary" />
              <span>contact@grandpalace.vn</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-primary" />
              <span>Hà Nội · Đà Nẵng · TP.HCM</span>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/contact">
              <button className="bg-primary text-primary-foreground uppercase tracking-widest text-xs px-8 py-3 hover:bg-primary/90 transition-colors">
                Liên hệ ngay
              </button>
            </Link>
            <Link href="/hotels/1/rooms">
              <button className="border border-primary text-primary uppercase tracking-widest text-xs px-8 py-3 hover:bg-primary/10 transition-colors">
                Đặt phòng
              </button>
            </Link>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
