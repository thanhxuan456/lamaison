import { Link } from "wouter";
import { useState, FormEvent } from "react";
import { Mail, Phone, MapPin, Facebook, Instagram, Youtube, Twitter, Send } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useBranding } from "@/lib/branding";

export function Footer() {
  const { t } = useT();
  const { toast } = useToast();
  const { branding } = useBranding();
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    toast({ title: t("toast.success"), description: t("footer.newsletter.success") });
    setEmail("");
  };

  return (
    <footer className="relative bg-secondary text-secondary-foreground border-t-2 border-primary/30 overflow-hidden">
      {/* Top ornamental border */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-3 -translate-y-1/2 bg-secondary px-6">
        <span className="block w-12 h-[1px] bg-primary/60" />
        <span className="block w-2 h-2 rotate-45 border border-primary"></span>
        <span className="block w-2 h-2 rotate-45 bg-primary"></span>
        <span className="block w-2 h-2 rotate-45 border border-primary"></span>
        <span className="block w-12 h-[1px] bg-primary/60" />
      </div>

      {/* Decorative corner accents */}
      <div className="pointer-events-none absolute top-8 left-8 w-20 h-20 border-t border-l border-primary/20"></div>
      <div className="pointer-events-none absolute top-8 right-8 w-20 h-20 border-t border-r border-primary/20"></div>
      <div className="pointer-events-none absolute bottom-8 left-8 w-20 h-20 border-b border-l border-primary/20"></div>
      <div className="pointer-events-none absolute bottom-8 right-8 w-20 h-20 border-b border-r border-primary/20"></div>

      <div className="container mx-auto px-4 md:px-8 pt-20 pb-10 relative">
        {/* Newsletter band */}
        <div className="mb-16 border border-primary/30 bg-secondary/40 backdrop-blur-sm p-8 md:p-10 grid grid-cols-1 lg:grid-cols-5 gap-8 items-center relative">
          <div className="absolute -top-2 -left-2 w-4 h-4 border-t border-l border-primary"></div>
          <div className="absolute -top-2 -right-2 w-4 h-4 border-t border-r border-primary"></div>
          <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b border-l border-primary"></div>
          <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b border-r border-primary"></div>

          <div className="lg:col-span-2">
            <h3 className="text-primary font-serif text-2xl md:text-3xl tracking-wide mb-2">
              {t("footer.newsletter.title")}
            </h3>
            <div className="w-12 h-[1px] bg-primary mb-3"></div>
            <p className="text-primary/70 text-sm font-light leading-relaxed">
              {t("footer.newsletter.body")}
            </p>
          </div>
          <form onSubmit={handleSubscribe} className="lg:col-span-3 flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("footer.newsletter.placeholder")}
              className="flex-1 bg-transparent border border-primary/40 text-primary placeholder:text-primary/40 px-5 h-14 outline-none focus:border-primary transition-colors text-sm tracking-wide"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-8 h-14 uppercase tracking-widest text-xs font-medium border border-primary transition-colors"
            >
              {t("footer.newsletter.submit")} <Send size={14} />
            </button>
          </form>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-14">
          <div className="md:col-span-4">
            <Link href="/" className="flex flex-col items-start group mb-6">
              {branding.useImageLogo && branding.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.brandName} className="h-12 w-auto object-contain" />
              ) : (
                <>
                  <span className="text-3xl font-serif text-primary tracking-[0.1em] uppercase">
                    {branding.brandName}
                  </span>
                  <span className="text-xs text-primary/70 tracking-[0.3em] uppercase mt-1">
                    {branding.tagline || t("brand.tagline")}
                  </span>
                </>
              )}
            </Link>
            <p className="text-sm text-primary/80 max-w-md leading-relaxed font-light mb-6">
              {t("footer.about")}
            </p>
            <div className="flex items-center gap-3">
              {[
                { Icon: Facebook, href: "#", label: t("social.facebook") },
                { Icon: Instagram, href: "#", label: t("social.instagram") },
                { Icon: Twitter, href: "#", label: t("social.twitter") },
                { Icon: Youtube, href: "#", label: t("social.youtube") },
              ].map(({ Icon, href, label }, i) => (
                <a
                  key={i}
                  href={href}
                  className="w-10 h-10 flex items-center justify-center border border-primary/40 text-primary/80 hover:text-primary-foreground hover:bg-primary hover:border-primary transition-all"
                  aria-label={label}
                  title={label}
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          <div className="md:col-span-3">
            <h4 className="text-primary font-serif tracking-widest uppercase mb-6 text-sm relative pb-3 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-10 after:h-[1px] after:bg-primary">
              {t("footer.explore")}
            </h4>
            <ul className="flex flex-col gap-3">
              {[
                { label: t("footer.about.us"), href: "/" },
                { label: t("footer.dining"), href: "/" },
                { label: t("footer.spa"), href: "/" },
                { label: t("footer.offers"), href: "/" },
                { label: t("nav.bookings"), href: "/bookings" },
              ].map((item, i) => (
                <li key={i}>
                  <Link
                    href={item.href}
                    className="text-sm text-primary/70 hover:text-primary transition-colors inline-flex items-center gap-2 group"
                  >
                    <span className="w-0 group-hover:w-3 h-[1px] bg-primary transition-all duration-300"></span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-5">
            <h4 className="text-primary font-serif tracking-widest uppercase mb-6 text-sm relative pb-3 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-10 after:h-[1px] after:bg-primary">
              {t("footer.contact")}
            </h4>
            <ul className="flex flex-col gap-4">
              <li className="flex items-start gap-3 text-sm text-primary/80">
                <Mail size={16} className="text-primary mt-0.5 shrink-0" />
                <a href="mailto:contact@grandpalace.vn" className="hover:text-primary transition-colors">
                  contact@grandpalace.vn
                </a>
              </li>
              <li className="flex items-start gap-3 text-sm text-primary/80">
                <Phone size={16} className="text-primary mt-0.5 shrink-0" />
                <a href="tel:+8418009999" className="hover:text-primary transition-colors">
                  +84 1800 9999
                </a>
              </li>
              <li className="flex items-start gap-3 text-sm text-primary/80">
                <MapPin size={16} className="text-primary mt-0.5 shrink-0" />
                <span className="font-serif italic text-primary/70">{t("footer.locations")}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-primary/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-primary/60 tracking-wide">
            &copy; {new Date().getFullYear()} {branding.brandName}. {t("footer.rights")}
          </p>
          <div className="flex gap-6">
            <Link href="/" className="text-xs text-primary/60 hover:text-primary transition-colors uppercase tracking-widest">
              {t("footer.terms")}
            </Link>
            <Link href="/" className="text-xs text-primary/60 hover:text-primary transition-colors uppercase tracking-widest">
              {t("footer.privacy")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
