/**
 * BranchLoader — man hinh loading dac trung cho tung chi nhanh.
 * Moi thanh pho co bo mau, motif SVG va animation rieng:
 *  - Ha Noi : Hoa sen + sac do/vang (van hoa Bac Bo)
 *  - Da Nang: Song bien + sac xanh ngoc/tealGioi (bien mien Trung)
 *  - HCM    : Tia sao/skyline + sac xanh la/vang (Sai Gon nang dong)
 *  - Default: Vang gold + secondary (brand chinh)
 */
import { useEffect, useState } from "react";

type Theme = {
  bg: string;          // gradient nen
  accent: string;      // mau chu dao (HEX) cho SVG
  accent2: string;     // mau phu (HEX)
  text: string;        // class mau chu chinh
  sub: string;         // class mau chu phu
  motif: "lotus" | "wave" | "star" | "diamond";
};

const THEMES: Record<string, Theme> = {
  hanoi:  { bg: "from-[#3a0d0d] via-[#5a1717] to-[#1a0505]", accent: "#e6b948", accent2: "#c63d3d", text: "text-amber-200", sub: "text-amber-200/60", motif: "lotus" },
  danang: { bg: "from-[#06283d] via-[#0a4060] to-[#011528]", accent: "#5fd6e8", accent2: "#e6c168", text: "text-cyan-100",  sub: "text-cyan-100/60",  motif: "wave"  },
  hcm:    { bg: "from-[#0d3a20] via-[#155c30] to-[#04180c]", accent: "#f5d063", accent2: "#7cd9a3", text: "text-emerald-100", sub: "text-emerald-100/60", motif: "star" },
  default:{ bg: "from-secondary via-secondary/80 to-black", accent: "#d4a64e", accent2: "#ffffff", text: "text-white",     sub: "text-white/60",     motif: "diamond" },
};

function pickTheme(city?: string | null): Theme {
  if (!city) return THEMES.default;
  const c = city.toLowerCase();
  if (c.includes("hà nội") || c.includes("ha noi") || c.includes("hanoi")) return THEMES.hanoi;
  if (c.includes("đà nẵng") || c.includes("da nang") || c.includes("danang")) return THEMES.danang;
  if (c.includes("hồ chí minh") || c.includes("ho chi minh") || c.includes("saigon") || c.includes("sài gòn")) return THEMES.hcm;
  return THEMES.default;
}

function Motif({ theme }: { theme: Theme }) {
  const { accent, accent2, motif } = theme;
  if (motif === "lotus") {
    // 8 canh sen xoay
    return (
      <g>
        {Array.from({ length: 8 }).map((_, i) => (
          <ellipse key={i} cx="60" cy="36" rx="9" ry="22" fill={accent} opacity={0.85}
            transform={`rotate(${i * 45} 60 60)`} style={{ transformOrigin: "60px 60px" }} />
        ))}
        <circle cx="60" cy="60" r="9" fill={accent2} />
      </g>
    );
  }
  if (motif === "wave") {
    return (
      <g>
        {[0, 1, 2].map((i) => (
          <circle key={i} cx="60" cy="60" r={20 + i * 14} fill="none" stroke={accent} strokeWidth="2" opacity={0.85 - i * 0.25} />
        ))}
        <path d="M 30 60 Q 45 45, 60 60 T 90 60" fill="none" stroke={accent2} strokeWidth="3" strokeLinecap="round" />
      </g>
    );
  }
  if (motif === "star") {
    return (
      <g>
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={i} x1="60" y1="60" x2="60" y2="20" stroke={accent} strokeWidth="2" opacity={i % 2 === 0 ? 0.95 : 0.45}
            transform={`rotate(${i * 30} 60 60)`} style={{ transformOrigin: "60px 60px" }} />
        ))}
        <circle cx="60" cy="60" r="11" fill={accent2} />
        <circle cx="60" cy="60" r="6" fill={accent} />
      </g>
    );
  }
  // diamond default
  return (
    <g>
      <rect x="35" y="35" width="50" height="50" fill="none" stroke={accent} strokeWidth="2" transform="rotate(45 60 60)" />
      <rect x="45" y="45" width="30" height="30" fill={accent2} opacity="0.8" transform="rotate(45 60 60)" />
      <circle cx="60" cy="60" r="6" fill={accent} />
    </g>
  );
}

interface Props {
  hotelName?: string | null;
  city?: string | null;
  message?: string;
}

const TIPS = [
  "Đang chuẩn bị không gian sang trọng cho bạn",
  "Mở cánh cửa của trải nghiệm hoàng gia",
  "Khám phá tinh hoa của lòng hiếu khách Việt Nam",
  "Một khoảnh khắc — vẻ đẹp đang đến gần",
];

export function BranchLoader({ hotelName, city, message }: Props) {
  const theme = pickTheme(city);
  const [tipIdx, setTipIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTipIdx((i) => (i + 1) % TIPS.length), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br ${theme.bg} overflow-hidden`}>
      {/* shimmer overlay */}
      <div aria-hidden className="absolute inset-0 opacity-20 pointer-events-none"
        style={{ backgroundImage: `radial-gradient(circle at 50% 50%, ${theme.accent}33 0%, transparent 60%)` }} />
      {/* corner ornaments */}
      <span className="pointer-events-none absolute top-8 left-8 w-12 h-12 border-t border-l" style={{ borderColor: `${theme.accent}55` }} />
      <span className="pointer-events-none absolute top-8 right-8 w-12 h-12 border-t border-r" style={{ borderColor: `${theme.accent}55` }} />
      <span className="pointer-events-none absolute bottom-8 left-8 w-12 h-12 border-b border-l" style={{ borderColor: `${theme.accent}55` }} />
      <span className="pointer-events-none absolute bottom-8 right-8 w-12 h-12 border-b border-r" style={{ borderColor: `${theme.accent}55` }} />

      <div className="relative flex flex-col items-center px-6 max-w-md text-center">
        {/* Animated motif — quay cham, scale dap */}
        <div className="relative w-32 h-32 mb-8">
          <div className="absolute inset-0 rounded-full" style={{ boxShadow: `0 0 40px ${theme.accent}66` }} />
          <svg viewBox="0 0 120 120" className="w-full h-full animate-[spin_8s_linear_infinite]" aria-hidden>
            <Motif theme={theme} />
          </svg>
          {/* vong tron pulse ben ngoai */}
          <div className="absolute inset-0 rounded-full border-2 animate-ping"
            style={{ borderColor: `${theme.accent}55`, animationDuration: "2.4s" }} />
        </div>

        {hotelName ? (
          <>
            <div className="text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: theme.accent }}>MAISON DELUXE</div>
            <h2 className={`font-serif text-2xl md:text-3xl ${theme.text} leading-tight mb-2`}>{hotelName}</h2>
            {city && <p className={`text-xs tracking-[0.3em] uppercase ${theme.sub}`}>{city}</p>}
          </>
        ) : (
          <>
            <div className={`h-7 w-48 ${theme.sub} bg-current/10 animate-pulse mb-2`} />
            <div className={`h-3 w-32 ${theme.sub} bg-current/10 animate-pulse`} />
          </>
        )}

        {/* progress bar gold */}
        <div className="mt-8 w-56 h-px relative overflow-hidden" style={{ background: `${theme.accent}22` }}>
          <div className="absolute inset-y-0 left-0 w-1/3 animate-[branchProgress_1.6s_ease-in-out_infinite]"
            style={{ background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)` }} />
        </div>

        <p className={`mt-6 text-sm font-light ${theme.sub} min-h-[1.5rem] transition-opacity duration-500`}>
          {message ?? TIPS[tipIdx]}
        </p>
      </div>

      <style>{`
        @keyframes branchProgress {
          0%   { left: -33%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
