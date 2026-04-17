import { Link } from "wouter";
import { useState, useEffect } from "react";
import { Menu, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 border-b border-transparent ${
        isScrolled
          ? "bg-secondary/95 backdrop-blur-md border-primary/20 shadow-sm py-4"
          : "bg-transparent py-6"
      }`}
    >
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex flex-col items-center group cursor-pointer">
            <span className="text-2xl md:text-3xl font-serif text-primary tracking-[0.1em] uppercase group-hover:text-primary/80 transition-colors">
              Grand Palace
            </span>
            <span className="text-[10px] md:text-xs text-primary/70 tracking-[0.3em] uppercase mt-1">
              Hotels & Resorts
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm font-medium text-primary/90 hover:text-primary transition-colors tracking-wider uppercase relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-0 after:h-[1px] after:bg-primary hover:after:w-full after:transition-all after:duration-300">
              Trang chủ
            </Link>
            <Link href="/bookings" className="text-sm font-medium text-primary/90 hover:text-primary transition-colors tracking-wider uppercase relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-0 after:h-[1px] after:bg-primary hover:after:w-full after:transition-all after:duration-300">
              Đặt phòng của tôi
            </Link>
            <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-none px-6 py-5 tracking-widest uppercase text-xs" asChild>
              <Link href="/">Đặt Phòng Ngay</Link>
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-primary"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-secondary border-b border-primary/20 shadow-lg py-6 px-4 flex flex-col gap-6 animate-in slide-in-from-top-2">
          <Link
            href="/"
            className="text-lg font-medium text-primary tracking-wider uppercase border-b border-primary/10 pb-4"
            onClick={() => setMobileMenuOpen(false)}
          >
            Trang chủ
          </Link>
          <Link
            href="/bookings"
            className="text-lg font-medium text-primary tracking-wider uppercase border-b border-primary/10 pb-4"
            onClick={() => setMobileMenuOpen(false)}
          >
            Đặt phòng của tôi
          </Link>
          <Button variant="default" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-none py-6 tracking-widest uppercase" asChild>
            <Link href="/" onClick={() => setMobileMenuOpen(false)}>Đặt Phòng Ngay</Link>
          </Button>
        </div>
      )}
    </nav>
  );
}
