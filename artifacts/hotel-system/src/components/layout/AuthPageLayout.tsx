import { ReactNode } from "react";
import { PageLayout } from "./PageLayout";
import { useT } from "@/lib/i18n";

interface AuthPageLayoutProps {
  children: ReactNode;
  mode: "signin" | "register";
}

export function AuthPageLayout({ children, mode }: AuthPageLayoutProps) {
  const { t } = useT();

  return (
    <PageLayout>
      {/* Hero strip */}
      <div className="relative border-b border-primary/20 bg-secondary/60 overflow-hidden">
        {/* Subtle diagonal lines background */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, currentColor 0, currentColor 1px, transparent 0, transparent 50%)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-6 py-10 flex flex-col items-center gap-3 text-center">
          {/* Top ornament */}
          <div className="flex items-center gap-3 mb-1">
            <span className="block w-16 h-[1px] bg-primary/50" />
            <span className="block w-1.5 h-1.5 rotate-45 bg-primary/70" />
            <span className="block w-2.5 h-2.5 rotate-45 border border-primary" />
            <span className="block w-1.5 h-1.5 rotate-45 bg-primary/70" />
            <span className="block w-16 h-[1px] bg-primary/50" />
          </div>

          <p className="text-[11px] tracking-[0.35em] uppercase text-primary/80 font-medium">
            Grand Palace Hotels & Resorts
          </p>
          <h1 className="font-serif text-2xl md:text-3xl text-foreground tracking-wide">
            {mode === "signin" ? t("auth.heroTitle.signin") : t("auth.heroTitle.register")}
          </h1>
          <p className="text-sm text-muted-foreground max-w-sm">
            {mode === "signin" ? t("auth.heroSub.signin") : t("auth.heroSub.register")}
          </p>

          {/* Bottom ornament */}
          <div className="flex items-center gap-3 mt-1">
            <span className="block w-8 h-[1px] bg-primary/40" />
            <span className="block w-1 h-1 rotate-45 bg-primary/60" />
            <span className="block w-1 h-1 rotate-45 bg-primary/60" />
            <span className="block w-1 h-1 rotate-45 bg-primary/60" />
            <span className="block w-8 h-[1px] bg-primary/40" />
          </div>
        </div>
      </div>

      {/* Form area */}
      <div className="flex-1 flex items-start justify-center px-4 pb-20 pt-12 relative bg-background">
        {/* Decorative corner - top left */}
        <div className="absolute top-0 left-0 w-24 h-24 pointer-events-none opacity-20">
          <span className="absolute top-4 left-4 block w-10 h-[1px] bg-primary" />
          <span className="absolute top-4 left-4 block w-[1px] h-10 bg-primary" />
          <span className="absolute top-5 left-5 block w-1.5 h-1.5 rotate-45 border border-primary" />
        </div>
        {/* Decorative corner - top right */}
        <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none opacity-20">
          <span className="absolute top-4 right-4 block w-10 h-[1px] bg-primary" />
          <span className="absolute top-4 right-4 block w-[1px] h-10 bg-primary" />
          <span className="absolute top-5 right-5 block w-1.5 h-1.5 rotate-45 border border-primary" />
        </div>

        <div className="w-full max-w-[420px]">
          {children}
        </div>
      </div>
    </PageLayout>
  );
}
