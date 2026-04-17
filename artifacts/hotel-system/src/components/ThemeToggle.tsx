import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { t } = useT();

  useEffect(() => setMounted(true), []);

  const current = (mounted ? resolvedTheme || theme : "light") as string;
  const isDark = current === "dark";
  const label = isDark ? t("theme.switchToLight") : t("theme.switchToDark");

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="group relative inline-flex items-center justify-center w-11 h-11 transition-all duration-500"
    >
      {/* Outer ornamental ring */}
      <span className="absolute inset-0 border border-primary/40 rotate-45 group-hover:rotate-[225deg] group-hover:border-primary transition-all duration-700"></span>
      {/* Inner circle */}
      <span className="absolute inset-[3px] rounded-full border border-primary/30 group-hover:border-primary/70 group-hover:bg-primary/10 transition-all duration-500"></span>
      {/* Decorative corner dots */}
      <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[3px] w-1 h-1 bg-primary rounded-full opacity-60 group-hover:opacity-100 transition-opacity"></span>
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[3px] w-1 h-1 bg-primary rounded-full opacity-60 group-hover:opacity-100 transition-opacity"></span>

      {/* Icons */}
      <Sun
        size={16}
        strokeWidth={1.5}
        className={`absolute text-primary transition-all duration-500 ${
          isDark ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100 drop-shadow-[0_0_6px_rgba(212,175,55,0.6)]"
        }`}
      />
      <Moon
        size={16}
        strokeWidth={1.5}
        className={`absolute text-primary transition-all duration-500 ${
          isDark ? "rotate-0 scale-100 opacity-100 drop-shadow-[0_0_6px_rgba(212,175,55,0.6)]" : "-rotate-90 scale-0 opacity-0"
        }`}
      />
    </button>
  );
}
