import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="bg-secondary text-secondary-foreground border-t border-primary/20 pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex flex-col items-start group mb-6">
              <span className="text-3xl font-serif text-primary tracking-[0.1em] uppercase">
                Grand Palace
              </span>
              <span className="text-xs text-primary/70 tracking-[0.3em] uppercase mt-1">
                Hotels & Resorts
              </span>
            </Link>
            <p className="text-sm text-primary/80 max-w-md leading-relaxed">
              Trải nghiệm sự xa hoa bậc nhất tại Việt Nam. Nơi mỗi chi tiết đều được chăm chút tỉ mỉ, mang đến cho bạn cảm giác trân quý như hoàng gia.
            </p>
          </div>
          
          <div>
            <h4 className="text-primary font-serif tracking-widest uppercase mb-6 text-sm">Khám Phá</h4>
            <ul className="flex flex-col gap-4">
              <li><Link href="/" className="text-sm text-primary/70 hover:text-primary transition-colors">Về Chúng Tôi</Link></li>
              <li><Link href="/" className="text-sm text-primary/70 hover:text-primary transition-colors">Ẩm Thực</Link></li>
              <li><Link href="/" className="text-sm text-primary/70 hover:text-primary transition-colors">Spa & Thư Giãn</Link></li>
              <li><Link href="/" className="text-sm text-primary/70 hover:text-primary transition-colors">Ưu Đãi Đặc Quyền</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-primary font-serif tracking-widest uppercase mb-6 text-sm">Liên Hệ</h4>
            <ul className="flex flex-col gap-4">
              <li className="text-sm text-primary/70">contact@grandpalace.vn</li>
              <li className="text-sm text-primary/70">+84 1800 9999</li>
              <li className="text-sm text-primary/70 mt-4 font-serif italic text-primary/50">Hà Nội • Đà Nẵng • TP. Hồ Chí Minh</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-primary/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-primary/50">
            &copy; {new Date().getFullYear()} Grand Palace Hotels & Resorts. Tất cả các quyền được bảo lưu.
          </p>
          <div className="flex gap-6">
            <Link href="/" className="text-xs text-primary/50 hover:text-primary transition-colors">Điều khoản sử dụng</Link>
            <Link href="/" className="text-xs text-primary/50 hover:text-primary transition-colors">Chính sách bảo mật</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
