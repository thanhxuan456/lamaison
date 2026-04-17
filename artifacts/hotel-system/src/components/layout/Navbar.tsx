import { Link } from "wouter";
import { useState, useEffect } from "react";
import { Menu, X, ShieldCheck, User, ChevronDown, LogOut, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LocationSwitcher } from "@/components/LocationSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useT } from "@/lib/i18n";
import { useUser, useClerk, Show } from "@clerk/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const ADMIN_EMAIL = "tthanhxuan456@gmail.com";

function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { t } = useT();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const isAdmin = email === ADMIN_EMAIL;
  const name = user?.firstName ?? user?.fullName ?? "Guest";
  const initials = (user?.fullName ?? name).split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group relative inline-flex items-center gap-2 h-10 px-3 outline-none">
        <span className="absolute inset-0 border border-primary/40 group-hover:border-primary group-data-[state=open]:border-primary transition-colors duration-300" />
        <span className="absolute -top-[3px] -left-[3px] w-1.5 h-1.5 rotate-45 bg-primary opacity-0 group-hover:opacity-100 group-data-[state=open]:opacity-100 transition-opacity" />
        <span className="absolute -top-[3px] -right-[3px] w-1.5 h-1.5 rotate-45 bg-primary opacity-0 group-hover:opacity-100 group-data-[state=open]:opacity-100 transition-opacity" />
        <span className="absolute -bottom-[3px] -left-[3px] w-1.5 h-1.5 rotate-45 bg-primary opacity-0 group-hover:opacity-100 group-data-[state=open]:opacity-100 transition-opacity" />
        <span className="absolute -bottom-[3px] -right-[3px] w-1.5 h-1.5 rotate-45 bg-primary opacity-0 group-hover:opacity-100 group-data-[state=open]:opacity-100 transition-opacity" />

        {user?.imageUrl ? (
          <img src={user.imageUrl} alt={name} className="w-6 h-6 rounded-full border border-primary/60 object-cover" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/60 flex items-center justify-center">
            <span className="font-serif text-[9px] text-primary font-bold">{initials}</span>
          </div>
        )}
        <span className="font-serif text-[12px] tracking-[0.15em] text-primary uppercase hidden lg:block">{name}</span>
        {isAdmin && <ShieldCheck size={12} className="text-primary hidden lg:block" />}
        <ChevronDown size={11} strokeWidth={2} className="text-primary/70 transition-transform duration-300 group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={10} className="rounded-none border-primary/50 bg-card min-w-[200px] p-0 shadow-2xl relative">
        <span className="pointer-events-none absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 border-primary z-10" />
        <span className="pointer-events-none absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-primary z-10" />
        <span className="pointer-events-none absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2 border-primary z-10" />
        <span className="pointer-events-none absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-primary z-10" />

        <div className="px-4 py-3 border-b border-primary/15 bg-primary/5">
          <div className="font-serif text-sm text-foreground font-medium truncate">{user?.fullName ?? name}</div>
          <div className="text-[11px] text-muted-foreground truncate">{email}</div>
          {isAdmin && (
            <div className="flex items-center gap-1 mt-1">
              <ShieldCheck size={10} className="text-primary" />
              <span className="text-[10px] tracking-widest text-primary uppercase">Administrator</span>
            </div>
          )}
        </div>

        <DropdownMenuItem asChild className="rounded-none cursor-pointer px-4 py-3 text-sm text-foreground focus:bg-primary/10 border-b border-primary/10">
          <Link href="/profile" className="flex items-center gap-2">
            <User size={13} className="text-primary" /> {t("profile.title")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="rounded-none cursor-pointer px-4 py-3 text-sm text-foreground focus:bg-primary/10 border-b border-primary/10">
          <Link href="/bookings" className="flex items-center gap-2">
            <Calendar size={13} className="text-primary" /> {t("nav.bookings")}
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild className="rounded-none cursor-pointer px-4 py-3 text-sm text-primary focus:bg-primary/10 border-b border-primary/10">
            <Link href="/admin" className="flex items-center gap-2">
              <ShieldCheck size={13} className="text-primary" /> {t("profile.adminPanel")}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-primary/10 m-0" />
        <DropdownMenuItem
          onSelect={() => signOut()}
          className="rounded-none cursor-pointer px-4 py-3 text-sm text-red-500 focus:bg-red-50 flex items-center gap-2"
        >
          <LogOut size={13} /> {t("profile.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
            <Link href="/" className="text-sm font-medium text-primary/90 hover:text-primary transition-colors tracking-wider uppercase relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-0 after:h-[1px] after:bg-primary hover:after:w-full after:transition-all after:duration-300">
              {t("nav.home")}
            </Link>
            <Link href="/bookings" className="text-sm font-medium text-primary/90 hover:text-primary transition-colors tracking-wider uppercase relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-0 after:h-[1px] after:bg-primary hover:after:w-full after:transition-all after:duration-300">
              {t("nav.bookings")}
            </Link>
          </div>

          {/* Right cluster */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden md:block"><LocationSwitcher /></div>
            <div className="hidden sm:block"><LanguageSwitcher /></div>
            <div className="hidden sm:block"><ThemeToggle /></div>

            {/* Signed-in: user menu */}
            <Show when="signed-in">
              <UserMenu />
            </Show>

            {/* Signed-out: sign in + register */}
            <Show when="signed-out">
              <Link href="/sign-in" className="hidden lg:inline-flex items-center text-xs font-medium text-primary/90 hover:text-primary tracking-[0.2em] uppercase border-b border-transparent hover:border-primary pb-0.5 transition-colors">
                {t("nav.signIn")}
              </Link>
              <Button variant="outline" className="hidden lg:inline-flex border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-none px-5 h-10 tracking-widest uppercase text-xs" asChild>
                <Link href="/register">{t("nav.register")}</Link>
              </Button>
            </Show>

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
          <div className="flex items-center gap-3 flex-wrap">
            <div className="md:hidden"><LocationSwitcher /></div>
            <div className="sm:hidden"><LanguageSwitcher /></div>
            <div className="sm:hidden"><ThemeToggle /></div>
          </div>
          <Link href="/" className="text-lg font-medium text-primary tracking-wider uppercase border-b border-primary/10 pb-4" onClick={() => setMobileMenuOpen(false)}>
            {t("nav.home")}
          </Link>
          <Link href="/bookings" className="text-lg font-medium text-primary tracking-wider uppercase border-b border-primary/10 pb-4" onClick={() => setMobileMenuOpen(false)}>
            {t("nav.bookings")}
          </Link>
          <Show when="signed-in">
            <Link href="/profile" className="text-lg font-medium text-primary tracking-wider uppercase border-b border-primary/10 pb-4" onClick={() => setMobileMenuOpen(false)}>
              {t("profile.title")}
            </Link>
          </Show>
          <Show when="signed-out">
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-primary text-primary rounded-none py-5 uppercase tracking-widest text-xs" asChild>
                <Link href="/sign-in" onClick={() => setMobileMenuOpen(false)}>{t("nav.signIn")}</Link>
              </Button>
              <Button className="flex-1 bg-primary text-primary-foreground rounded-none py-5 uppercase tracking-widest text-xs" asChild>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>{t("nav.register")}</Link>
              </Button>
            </div>
          </Show>
        </div>
      )}
    </nav>
  );
}
