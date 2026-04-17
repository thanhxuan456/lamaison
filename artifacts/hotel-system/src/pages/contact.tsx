import { PageLayout } from "@/components/layout/PageLayout";
import { useSitePages } from "@/lib/page-blocks";
import { Mail, Phone, MapPin, Crown } from "lucide-react";
import { useFooterConfig } from "@/lib/site-config";

export default function ContactPage() {
  const { pages } = useSitePages();
  const { footer } = useFooterConfig();
  const contactPage = pages.find((p) => p.slug === "/contact");

  // If page-blocks system has a /contact page with custom blocks, render them.
  // Otherwise show a stylish default contact page.
  if (contactPage && contactPage.blocks.length > 0) {
    // Defer to lazy import would be cleaner; for now show a simple message + contact card
    // since BlockRenderer is co-located with home.tsx.
  }

  return (
    <PageLayout>
      {/* Hero */}
      <section className="relative pt-32 pb-20 bg-secondary overflow-hidden">
        <div aria-hidden className="absolute top-8 left-8 w-24 h-24 border-l border-t border-primary/40" />
        <div aria-hidden className="absolute top-8 right-8 w-24 h-24 border-r border-t border-primary/40" />
        <div aria-hidden className="absolute bottom-8 left-8 w-24 h-24 border-l border-b border-primary/40" />
        <div aria-hidden className="absolute bottom-8 right-8 w-24 h-24 border-r border-b border-primary/40" />

        <div className="container mx-auto px-4 md:px-8 text-center relative">
          <div className="inline-flex items-center gap-3 mb-5">
            <span className="w-10 h-px bg-primary" />
            <Crown size={16} className="text-primary" />
            <span className="text-primary text-[10px] tracking-[0.4em] uppercase">Liên hệ chúng tôi</span>
            <Crown size={16} className="text-primary" />
            <span className="w-10 h-px bg-primary" />
          </div>
          <h1 className="text-5xl md:text-6xl font-serif text-white mb-6 leading-tight">Hân hạnh phục vụ</h1>
          <p className="text-white/70 font-light max-w-2xl mx-auto">
            Đội ngũ concierge của chúng tôi luôn sẵn sàng hỗ trợ quý khách 24/7.
          </p>
        </div>
      </section>

      {/* Contact cards */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 md:px-8 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ContactCard icon={<Mail size={20} />} label="Email" value={footer.contact.email} href={`mailto:${footer.contact.email}`} />
            <ContactCard icon={<Phone size={20} />} label="Hotline" value={footer.contact.phone} href={`tel:${footer.contact.phone.replace(/\s/g, "")}`} />
            <ContactCard icon={<MapPin size={20} />} label="Địa điểm" value={footer.contact.address} />
          </div>

          <div className="mt-12 border border-primary/20 bg-card p-8 md:p-12 text-center">
            <h2 className="font-serif text-3xl text-foreground mb-3">Gửi tin nhắn</h2>
            <div className="w-12 h-px bg-primary mx-auto mb-6" />
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Quý khách có yêu cầu đặc biệt? Vui lòng liên hệ qua email hoặc hotline ở trên — chúng tôi phản hồi trong vòng 1 giờ.
            </p>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}

function ContactCard({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  const Inner = (
    <>
      <div className="w-12 h-12 inline-flex items-center justify-center border border-primary/40 text-primary mb-4 mx-auto bg-primary/5">{icon}</div>
      <div className="text-[10px] tracking-[0.35em] uppercase text-muted-foreground mb-2">{label}</div>
      <div className="font-serif text-lg text-foreground">{value}</div>
    </>
  );
  return href ? (
    <a href={href} className="block bg-card border border-primary/20 p-8 text-center hover:border-primary transition-all hover:shadow-lg">{Inner}</a>
  ) : (
    <div className="bg-card border border-primary/20 p-8 text-center">{Inner}</div>
  );
}
