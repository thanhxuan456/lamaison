import { Link } from "wouter";

interface ServerErrorProps {
  code?: number;
  message?: string;
}

export default function ServerError({ code = 500, message }: ServerErrorProps) {
  const descriptions: Record<number, { title: string; desc: string }> = {
    500: { title: "Lỗi Máy Chủ", desc: "Đã xảy ra lỗi không mong muốn. Đội ngũ kỹ thuật đã được thông báo và đang xử lý." },
    503: { title: "Dịch Vụ Tạm Ngưng", desc: "Máy chủ tạm thời không thể xử lý yêu cầu. Vui lòng thử lại sau ít phút." },
    403: { title: "Truy Cập Bị Từ Chối", desc: "Bạn không có quyền truy cập vào trang này. Vui lòng đăng nhập hoặc liên hệ hỗ trợ." },
  };

  const info = descriptions[code] ?? descriptions[500];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(42,33%,98%)] dark:bg-[hsl(222,25%,10%)] px-6 text-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-red-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-lg">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <img src="/logo.svg" alt="MAISON DELUXE" className="h-12 opacity-70 hover:opacity-100 transition-opacity cursor-pointer" />
          </Link>
        </div>

        {/* Error code */}
        <div className="font-serif text-[100px] leading-none font-bold text-red-500/15 dark:text-red-500/10 select-none mb-2">
          {code}
        </div>

        {/* Ornament */}
        <div className="flex items-center gap-3 justify-center mb-6">
          <div className="h-px w-16 bg-primary/30" />
          <div className="text-primary text-lg">✦</div>
          <div className="h-px w-16 bg-primary/30" />
        </div>

        <h1 className="font-serif text-3xl text-foreground mb-3">{info.title}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-2">
          {message ?? info.desc}
        </p>
        <p className="text-muted-foreground/60 text-xs mb-8">
          Nếu vấn đề tiếp diễn, vui lòng liên hệ{" "}
          <a href="mailto:support@maisondeluxe.vn" className="text-primary hover:underline">support@maisondeluxe.vn</a>
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button onClick={() => window.location.reload()}
            className="px-8 py-3 bg-primary text-black text-xs tracking-[0.2em] uppercase font-medium hover:bg-primary/90 transition-colors">
            Thử Lại
          </button>
          <Link href="/">
            <button className="px-8 py-3 border border-primary/40 text-foreground text-xs tracking-[0.2em] uppercase hover:border-primary hover:bg-primary/5 transition-colors">
              Về Trang Chủ
            </button>
          </Link>
        </div>

        <div className="mt-10 text-[10px] text-muted-foreground/40 tracking-widest uppercase">
          Mã lỗi: {code} · MAISON DELUXE Hotels &amp; Resorts
        </div>
      </div>
    </div>
  );
}
