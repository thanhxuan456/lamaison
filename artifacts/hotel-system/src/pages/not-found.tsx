import { Link } from "wouter";
import { useT } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useT();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(42,33%,98%)] dark:bg-[hsl(222,25%,10%)] px-6 text-center relative overflow-hidden">
      {/* Background ornament */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/">
            <img src="/logo.svg" alt="Grand Palace" className="h-14 opacity-80 hover:opacity-100 transition-opacity cursor-pointer" />
          </Link>
        </div>

        {/* 404 number */}
        <div className="font-serif text-[120px] leading-none font-bold text-primary/20 dark:text-primary/15 select-none mb-2">
          404
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 justify-center mb-6">
          <div className="h-px w-16 bg-primary/30" />
          <div className="text-primary text-lg">✦</div>
          <div className="h-px w-16 bg-primary/30" />
        </div>

        <h1 className="font-serif text-3xl text-foreground mb-3">Trang Không Tìm Thấy</h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-8">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.<br />
          Hãy quay lại trang chủ để tiếp tục trải nghiệm dịch vụ hoàng gia.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/">
            <button className="px-8 py-3 bg-primary text-black text-xs tracking-[0.2em] uppercase font-medium hover:bg-primary/90 transition-colors">
              Về Trang Chủ
            </button>
          </Link>
          <Link href="/bookings">
            <button className="px-8 py-3 border border-primary/40 text-foreground text-xs tracking-[0.2em] uppercase hover:border-primary hover:bg-primary/5 transition-colors">
              Đặt Phòng
            </button>
          </Link>
        </div>

        <p className="mt-12 text-[11px] text-muted-foreground/60 tracking-widest uppercase">
          Grand Palace Hotels &amp; Resorts
        </p>
      </div>
    </div>
  );
}
