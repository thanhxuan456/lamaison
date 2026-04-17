import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";
import { useT } from "@/lib/i18n";

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const { t } = useT();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label={t("backToTop")}
      title={t("backToTop")}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className={`fixed bottom-8 right-8 z-[60] group flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-secondary text-primary border border-primary shadow-2xl transition-all duration-500 hover:bg-primary hover:text-primary-foreground ${
        visible ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <span className="absolute inset-1 border border-primary/40 group-hover:border-primary-foreground/40 transition-colors"></span>
      <ChevronUp size={22} strokeWidth={1.5} />
    </button>
  );
}
