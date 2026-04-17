import { Link } from "wouter";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useT } from "@/lib/i18n";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useT();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 border-b border-transparent ${
        isScrolled
          ? "bg-secondary/95 backdrop-blur-md border-primary/20 shadow-sm py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex flex-col items-center group cursor-pointer">
            <span className="text-2xl md:text-3xl font-serif text-primary tracking-[0.1em] uppercase group-hover:text-primary/80 transition-colors">
              Grand Palace
            </span>
            <span className="text-[10px] md:text-xs text-primary/70 tracking-[0.3em] uppercase mt-1">
              {t("brand.tagline")}
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8">
            <Link
              href="/"
              className="text-sm font-medium text-primary/90 hover:text-primary transition-colors tracking-wider uppercase relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-0 after:h-[1px] after:bg-primary hover:after:w-full after:transition-all after:duration-300"
            >
              {t("nav.home")}
            </Link>
            <Link
              href="/bookings"
              className="text-sm font-medium text-primary/90 hover:text-primary transition-colors tracking-wider uppercase relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-0 after:h-[1px] after:bg-primary hover:after:w-full after:transition-all after:duration-300"
            >
              {t("nav.bookings")}
            </Link>
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden sm:block"><LanguageSwitcher /></div>
            <div className="hidden sm:block"><ThemeToggle /></div>
            <Button
              variant="outline"
              className="hidden lg:inline-flex border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-none px-6 h-10 tracking-widest uppercase text-xs"
              asChild
            >
              <Link href="/">{t("nav.bookNow")}</Link>
            </Button>

            {/* Mobile Menu Toggle */}
            <button
              className="lg:hidden text-primary p-1"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? t("menu.close") : t("menu.open")}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 w-full bg-secondary border-b border-primary/20 shadow-lg py-6 px-4 flex flex-col gap-5 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3 sm:hidden">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <Link
            href="/"
            className="text-lg font-medium text-primary tracking-wider uppercase border-b border-primary/10 pb-4"
            onClick={() => setMobileMenuOpen(false)}
          >
            {t("nav.home")}
          </Link>
          <Link
            href="/bookings"
            className="text-lg font-medium text-primary tracking-wider uppercase border-b border-primary/10 pb-4"
            onClick={() => setMobileMenuOpen(false)}
          >
            {t("nav.bookings")}
          </Link>
          <Button
            variant="default"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-none py-6 tracking-widest uppercase"
            asChild
          >
            <Link href="/" onClick={() => setMobileMenuOpen(false)}>{t("nav.bookNow")}</Link>
          </Button>
        </div>
      )}
    </nav>
  );
}
