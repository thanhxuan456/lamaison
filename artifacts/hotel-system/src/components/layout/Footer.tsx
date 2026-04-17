import { Link } from "wouter";
import { useState, FormEvent } from "react";
import {
  Mail, Phone, MapPin, Facebook, Instagram, Youtube, Twitter,
  Send, Music2, Linkedin,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { useBranding } from "@/lib/branding";
import { useFooterConfig } from "@/lib/site-config";

const SOCIAL_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  tiktok: Music2,
  linkedin: Linkedin,
};

export function Footer() {
  const { t } = useT();
  const { toast } = useToast();
  const { branding } = useBranding();
  const { footer } = useFooterConfig();
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;
    toast({ title: t("toast.success"), description: t("footer.newsletter.success") });
    setEmail("");
  };

  const enabledColumns = footer.columns.filter((c) => c.enabled);
  const enabledSocials = footer.socials.filter((s) => s.enabled && s.url);

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

      <div aria-hidden className="pointer-events-none absolute top-8 left-8 w-20 h-20 border-t border-l border-primary/20" />
      <div aria-hidden className="pointer-events-none absolute top-8 right-8 w-20 h-20 border-t border-r border-primary/20" />
      <div aria-hidden className="pointer-events-none absolute bottom-8 left-8 w-20 h-20 border-b border-l border-primary/20" />
      <div aria-hidden className="pointer-events-none absolute bottom-8 right-8 w-20 h-20 border-b border-r border-primary/20" />

      <div className="container mx-auto px-4 md:px-8 pt-20 pb-10 relative">
        {/* Newsletter widget */}
        {footer.newsletter.enabled && (
          <div className="mb-16 border border-primary/30 bg-secondary/40 backdrop-blur-sm p-8 md:p-10 grid grid-cols-1 lg:grid-cols-5 gap-8 items-center relative">
            <div className="absolute -top-2 -left-2 w-4 h-4 border-t border-l border-primary" />
            <div className="absolute -top-2 -right-2 w-4 h-4 border-t border-r border-primary" />
            <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b border-l border-primary" />
            <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b border-r border-primary" />

            <div className="lg:col-span-2">
              <h3 className="text-primary font-serif text-2xl md:text-3xl tracking-wide mb-2">
                {footer.newsletter.title}
              </h3>
              <div className="w-12 h-[1px] bg-primary mb-3" />
              <p className="text-primary/70 text-sm font-light leading-relaxed">
                {footer.newsletter.body}
              </p>
            </div>
            <form onSubmit={handleSubscribe} className="lg:col-span-3 flex flex-col sm:flex-row gap-3">
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={footer.newsletter.placeholder}
                className="flex-1 bg-transparent border border-primary/40 text-primary placeholder:text-primary/40 px-5 h-14 outline-none focus:border-primary transition-colors text-sm tracking-wide"
              />
              <button type="submit"
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-8 h-14 uppercase tracking-widest text-xs font-medium border border-primary transition-colors">
                {footer.newsletter.submitText} <Send size={14} />
              </button>
            </form>
          </div>
        )}

        {/* Main grid — Brand + dynamic columns + contact */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-14">
          {/* Brand widget */}
          <div className="md:col-span-4">
            <Link href="/" className="flex flex-col items-start group mb-6">
              {branding.useImageLogo && branding.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.brandName} className="h-12 w-auto object-contain" />
              ) : (
                <>
                  <span className="text-3xl font-serif text-primary tracking-[0.1em] uppercase">
                    {branding.brandName}
                  </span>
                  <span className="flex items-center gap-0.5 mt-1">
                    {Array.from({ length: Math.min(Math.max(branding.starRating ?? 5, 1), 10) }).map((_, i) => (
                      <span key={i} className="text-primary text-sm leading-none">★</span>
                    ))}
                  </span>
                </>
              )}
            </Link>
            <p className="text-sm text-primary/80 max-w-md leading-relaxed font-light mb-6">
              {footer.brand.about}
            </p>
            {enabledSocials.length > 0 && (
              <div className="flex items-center gap-3">
                {enabledSocials.map((s, i) => {
                  const Icon = SOCIAL_ICONS[s.platform] ?? Facebook;
                  return (
                    <a key={i} href={s.url} target="_blank" rel="noreferrer"
                      className="w-10 h-10 flex items-center justify-center border border-primary/40 text-primary/80 hover:text-primary-foreground hover:bg-primary hover:border-primary transition-all"
                      aria-label={s.platform} title={s.platform}>
                      <Icon size={16} />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Dynamic link columns */}
          {enabledColumns.map((col) => {
            // Distribute remaining 8 cols evenly across columns + contact (max ~3 each)
            return (
              <div key={col.id} className="md:col-span-3">
                <h4 className="text-primary font-serif tracking-widest uppercase mb-6 text-sm relative pb-3 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-10 after:h-[1px] after:bg-primary">
                  {col.title}
                </h4>
                <ul className="flex flex-col gap-3">
                  {col.links.map((l) => (
                    <li key={l.id}>
                      {l.href.startsWith("http") ? (
                        <a href={l.href} target="_blank" rel="noreferrer"
                          className="text-sm text-primary/70 hover:text-primary transition-colors inline-flex items-center gap-2 group">
                          <span className="w-0 group-hover:w-3 h-[1px] bg-primary transition-all duration-300" />
                          {l.label}
                        </a>
                      ) : (
                        <Link href={l.href}
                          className="text-sm text-primary/70 hover:text-primary transition-colors inline-flex items-center gap-2 group">
                          <span className="w-0 group-hover:w-3 h-[1px] bg-primary transition-all duration-300" />
                          {l.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          {/* Contact widget */}
          {footer.contact.enabled && (
            <div
              className="md:[grid-column:span_var(--contact-span)]"
              style={{ ["--contact-span" as any]: Math.max(2, 8 - enabledColumns.length * 3) }}
            >
              <h4 className="text-primary font-serif tracking-widest uppercase mb-6 text-sm relative pb-3 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-10 after:h-[1px] after:bg-primary">
                {footer.contact.title}
              </h4>
              <ul className="flex flex-col gap-4">
                {footer.contact.email && (
                  <li className="flex items-start gap-3 text-sm text-primary/80">
                    <Mail size={16} className="text-primary mt-0.5 shrink-0" />
                    <a href={`mailto:${footer.contact.email}`} className="hover:text-primary transition-colors">
                      {footer.contact.email}
                    </a>
                  </li>
                )}
                {footer.contact.phone && (
                  <li className="flex items-start gap-3 text-sm text-primary/80">
                    <Phone size={16} className="text-primary mt-0.5 shrink-0" />
                    <a href={`tel:${footer.contact.phone.replace(/\s/g, "")}`} className="hover:text-primary transition-colors">
                      {footer.contact.phone}
                    </a>
                  </li>
                )}
                {footer.contact.address && (
                  <li className="flex items-start gap-3 text-sm text-primary/80">
                    <MapPin size={16} className="text-primary mt-0.5 shrink-0" />
                    <span className="font-serif italic text-primary/70">{footer.contact.address}</span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="border-t border-primary/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          {footer.bottom.showCopyright && (
            <p className="text-xs text-primary/60 tracking-wide">
              &copy; {new Date().getFullYear()} {branding.brandName}. {t("footer.rights")}
            </p>
          )}
          <div className="flex gap-6">
            {footer.bottom.termsLabel && (
              <Link href={footer.bottom.termsHref} className="text-xs text-primary/60 hover:text-primary transition-colors uppercase tracking-widest">
                {footer.bottom.termsLabel}
              </Link>
            )}
            {footer.bottom.privacyLabel && (
              <Link href={footer.bottom.privacyHref} className="text-xs text-primary/60 hover:text-primary transition-colors uppercase tracking-widest">
                {footer.bottom.privacyLabel}
              </Link>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}
