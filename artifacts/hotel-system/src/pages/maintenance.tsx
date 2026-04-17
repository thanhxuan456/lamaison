import { useEffect, useState } from "react";

export default function Maintenance() {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(222,25%,10%)] text-white px-6 text-center relative overflow-hidden">
      {/* Gold grain overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-5"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, hsl(46,65%,52%) 1px, transparent 0)", backgroundSize: "32px 32px" }} />

      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-xl">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <img src="/logo.svg" alt="Grand Palace" className="h-16 brightness-0 invert opacity-70" />
        </div>

        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-8 border border-primary/40 flex items-center justify-center bg-primary/10">
          <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
          </svg>
        </div>

        {/* Ornament */}
        <div className="flex items-center gap-3 justify-center mb-6">
          <div className="h-px w-12 bg-primary/40" />
          <div className="text-primary text-xs tracking-[0.4em] uppercase">Bảo Trì Hệ Thống</div>
          <div className="h-px w-12 bg-primary/40" />
        </div>

        <h1 className="font-serif text-4xl text-white mb-4 leading-tight">
          Chúng Tôi Đang Nâng Cấp
        </h1>
        <p className="text-white/60 text-sm leading-relaxed mb-10">
          Grand Palace Hotels &amp; Resorts đang thực hiện bảo trì định kỳ để mang đến<br />
          trải nghiệm tốt hơn cho quý khách. Website sẽ trở lại trong thời gian sớm nhất.
        </p>

        {/* Loading indicator */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>

        {/* Contact */}
        <div className="border border-primary/20 bg-white/5 px-6 py-5 text-sm">
          <div className="text-primary text-[10px] tracking-[0.3em] uppercase mb-3 font-serif">Liên hệ khẩn cấp</div>
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <a href="tel:+84900000000" className="text-white/70 hover:text-primary transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              +84 900 000 000
            </a>
            <a href="mailto:support@grandpalace.vn" className="text-white/70 hover:text-primary transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              support@grandpalace.vn
            </a>
          </div>
        </div>

        <p className="mt-10 text-[10px] text-white/30 tracking-widest uppercase">
          © {new Date().getFullYear()} Grand Palace Hotels &amp; Resorts
        </p>
      </div>
    </div>
  );
}
