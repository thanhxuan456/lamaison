import { ReactNode } from "react";
import { Link } from "wouter";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { BackToTop } from "@/components/BackToTop";
import { SocialChat } from "@/components/SocialChat";
import { useT } from "@/lib/i18n";

interface AuthPageLayoutProps {
  children: ReactNode;
  mode: "signin" | "register";
}

const FEATURES = [
  { icon: "◈", key: "auth.feature1" },
  { icon: "◈", key: "auth.feature2" },
  { icon: "◈", key: "auth.feature3" },
];

export function AuthPageLayout({ children, mode }: AuthPageLayoutProps) {
  const { t } = useT();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <Navbar variant="auth" />

      {/* Main split layout */}
      <div className="flex-1 flex flex-col lg:flex-row pt-16 lg:pt-20">

        {/* ── LEFT PANEL ─────────────────────────────────────── */}
        <div className="relative lg:w-[45%] min-h-[280px] lg:min-h-0 overflow-hidden">
          {/* Background image */}
          <img
            src={mode === "register" ? "/images/room-suite.png" : "/images/hero.png"}
            alt="Grand Palace"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />

          {/* Multi-layer overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-[hsl(222,40%,8%)]/95 via-[hsl(222,35%,12%)]/85 to-[hsl(30,40%,12%)]/80" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Decorative gold border lines */}
          <div className="absolute inset-4 lg:inset-8 border border-primary/20 pointer-events-none" />
          <div className="absolute inset-5 lg:inset-9 border border-primary/10 pointer-events-none" />

          {/* Corner ornaments */}
          {[
            "top-4 lg:top-8 left-4 lg:left-8",
            "top-4 lg:top-8 right-4 lg:right-8",
            "bottom-4 lg:bottom-8 left-4 lg:left-8",
            "bottom-4 lg:bottom-8 right-4 lg:right-8",
          ].map((pos, i) => (
            <div key={i} className={`absolute ${pos} w-6 h-6 pointer-events-none`}>
              <span className={`absolute block w-4 h-[1px] bg-primary/70 ${i < 2 ? "top-0" : "bottom-0"} ${i % 2 === 0 ? "left-0" : "right-0"}`} />
              <span className={`absolute block w-[1px] h-4 bg-primary/70 ${i < 2 ? "top-0" : "bottom-0"} ${i % 2 === 0 ? "left-0" : "right-0"}`} />
            </div>
          ))}

          {/* Content */}
          <div className="relative h-full flex flex-col justify-center items-center lg:items-start px-8 lg:px-14 py-12 lg:py-20 gap-5 text-center lg:text-left">
            {/* Logo */}
            <Link href="/" className="flex flex-col items-center lg:items-start gap-1 mb-2">
              <img src="/logo.svg" alt="Grand Palace" className="h-12 w-auto brightness-0 invert opacity-90" />
              <span className="text-[10px] tracking-[0.4em] uppercase text-primary/80 font-medium mt-1">
                Hotels & Resorts
              </span>
            </Link>

            {/* Top ornament */}
            <div className="flex items-center gap-2">
              <span className="block w-10 h-[1px] bg-primary/60" />
              <span className="block w-1.5 h-1.5 rotate-45 border border-primary/60" />
              <span className="block w-2 h-2 rotate-45 bg-primary/70" />
              <span className="block w-1.5 h-1.5 rotate-45 border border-primary/60" />
              <span className="block w-10 h-[1px] bg-primary/60" />
            </div>

            {/* Stars */}
            <p className="text-primary/80 text-sm tracking-[0.3em]">★ ★ ★ ★ ★</p>

            {/* Headline */}
            <h1 className="font-serif text-3xl lg:text-4xl xl:text-5xl text-white leading-tight tracking-wide">
              {mode === "signin" ? t("auth.heroTitle.signin") : t("auth.heroTitle.register")}
            </h1>

            {/* Subtitle */}
            <p className="text-white/60 text-sm lg:text-base leading-relaxed max-w-xs">
              {mode === "signin" ? t("auth.heroSub.signin") : t("auth.heroSub.register")}
            </p>

            {/* Divider */}
            <div className="flex items-center gap-3 my-1">
              <span className="block w-12 h-[1px] bg-primary/40" />
              <span className="block w-1 h-1 rotate-45 bg-primary/60" />
              <span className="block w-1 h-1 rotate-45 bg-primary/60" />
              <span className="block w-1 h-1 rotate-45 bg-primary/60" />
              <span className="block w-12 h-[1px] bg-primary/40" />
            </div>

            {/* Feature bullets */}
            <ul className="hidden lg:flex flex-col gap-3">
              {FEATURES.map(({ icon, key }) => (
                <li key={key} className="flex items-center gap-3 text-white/70 text-sm">
                  <span className="text-primary text-xs">{icon}</span>
                  <span>{t(key as any)}</span>
                </li>
              ))}
            </ul>

            {/* Bottom quote */}
            <p className="hidden lg:block text-white/30 text-xs italic mt-auto pt-6 border-t border-white/10 w-full">
              {t("auth.quote")}
            </p>
          </div>
        </div>

        {/* ── RIGHT PANEL ────────────────────────────────────── */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-12 lg:py-16 bg-[hsl(42,33%,98%)] dark:bg-[hsl(222,25%,11%)] relative overflow-hidden">
          {/* Subtle background pattern */}
          <div
            className="absolute inset-0 opacity-[0.025] dark:opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, hsl(46,65%,52%) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          {/* Top-right decorative arc */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full border border-primary/10 pointer-events-none" />
          <div className="absolute -top-28 -right-28 w-80 h-80 rounded-full border border-primary/6 pointer-events-none" />
          {/* Bottom-left arc */}
          <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full border border-primary/10 pointer-events-none" />

          {/* Form container */}
          <div className="relative w-full max-w-[420px]">
            {/* Welcome label shown only on mobile (left panel hidden) */}
            <div className="lg:hidden flex flex-col items-center gap-2 mb-8">
              <div className="flex items-center gap-2 mb-1">
                <span className="block w-8 h-[1px] bg-primary/50" />
                <span className="block w-1.5 h-1.5 rotate-45 bg-primary" />
                <span className="block w-8 h-[1px] bg-primary/50" />
              </div>
              <p className="text-[10px] tracking-[0.35em] uppercase text-primary/70">Grand Palace</p>
              <h2 className="font-serif text-2xl text-foreground tracking-wide text-center">
                {mode === "signin" ? t("auth.heroTitle.signin") : t("auth.heroTitle.register")}
              </h2>
            </div>

            {children}
          </div>
        </div>
      </div>

      <Footer />
      <BackToTop />
      <SocialChat />
    </div>
  );
}
