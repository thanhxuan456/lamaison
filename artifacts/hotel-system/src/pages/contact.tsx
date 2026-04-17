import { useState, FormEvent } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { useFooterConfig, useContactMap, buildMapEmbedUrl } from "@/lib/site-config";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, MapPin, Crown, Send, Loader2, CheckCircle2, Lock } from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "";

export default function ContactPage() {
  const { footer } = useFooterConfig();
  const { map } = useContactMap();
  const { toast } = useToast();
  const mapSrc = map.enabled ? buildMapEmbedUrl(map) : "";

  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (form.name.trim().length < 2) {
      toast({ title: "Vui lòng nhập tên", variant: "destructive" }); return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      toast({ title: "Email không hợp lệ", variant: "destructive" }); return;
    }
    if (form.message.trim().length < 5) {
      toast({ title: "Vui lòng nhập nội dung", variant: "destructive" }); return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/contact-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Gửi thất bại (${res.status})`);
      }
      setSubmitted(true);
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
      toast({ title: "Đã gửi tin nhắn", description: "Chúng tôi sẽ liên hệ trong vòng 1 giờ." });
    } catch (err: any) {
      toast({ title: "Lỗi", description: err.message ?? "Vui lòng thử lại", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

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
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <ContactCard icon={<Mail size={20} />} label="Email" value={footer.contact.email}
              href={footer.contact.email ? `mailto:${footer.contact.email}` : undefined} />
            <ContactCard icon={<Phone size={20} />} label="Hotline" value={footer.contact.phone}
              href={footer.contact.phone ? `tel:${footer.contact.phone.replace(/\s/g, "")}` : undefined} />
            <ContactCard icon={<MapPin size={20} />} label="Địa điểm" value={footer.contact.address} />
          </div>

          {/* Contact form */}
          <div className="border border-primary/20 bg-card p-8 md:p-12 relative">
            <div className="absolute -top-2 -left-2 w-4 h-4 border-t border-l border-primary" />
            <div className="absolute -top-2 -right-2 w-4 h-4 border-t border-r border-primary" />
            <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b border-l border-primary" />
            <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b border-r border-primary" />

            <div className="text-center mb-10">
              <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-3">Gửi tin nhắn</h2>
              <div className="w-12 h-px bg-primary mx-auto mb-4" />
              <p className="text-muted-foreground max-w-xl mx-auto text-sm">
                Quý khách có yêu cầu đặc biệt? Hãy để lại thông tin — chúng tôi phản hồi trong vòng 1 giờ.
              </p>
            </div>

            {submitted ? (
              <div className="text-center py-12 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 inline-flex items-center justify-center mb-5">
                  <CheckCircle2 className="text-primary" size={32} />
                </div>
                <h3 className="font-serif text-2xl text-foreground mb-2">Cảm ơn quý khách</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Tin nhắn đã được gửi đến đội ngũ concierge. Chúng tôi sẽ liên hệ trong thời gian sớm nhất.
                </p>
                <button onClick={() => setSubmitted(false)}
                  className="text-xs tracking-widest uppercase border border-primary text-primary px-6 py-3 hover:bg-primary hover:text-primary-foreground transition-colors">
                  Gửi tin nhắn khác
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
                <Field label="Họ và tên *">
                  <input required value={form.name} onChange={update("name")} className={inputCls} placeholder="Nguyễn Văn A" />
                </Field>
                <Field label="Email *">
                  <input type="email" required value={form.email} onChange={update("email")} className={inputCls} placeholder="email@example.com" />
                </Field>
                <Field label="Số điện thoại">
                  <input type="tel" value={form.phone} onChange={update("phone")} className={inputCls} placeholder="+84 ..." />
                </Field>
                <Field label="Chủ đề">
                  <input value={form.subject} onChange={update("subject")} className={inputCls} placeholder="Đặt phòng, sự kiện, ..." />
                </Field>
                <Field label="Nội dung *" full>
                  <textarea required rows={6} value={form.message} onChange={update("message")}
                    className={`${inputCls} resize-y min-h-[140px] py-3`}
                    placeholder="Vui lòng cho biết yêu cầu của quý khách..." />
                </Field>

                <div className="md:col-span-2 flex flex-col items-center gap-3 pt-2">
                  <button type="submit" disabled={submitting}
                    className="inline-flex items-center gap-3 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed px-10 h-14 uppercase tracking-[0.25em] text-xs font-medium border border-primary transition-colors">
                    {submitting ? (<><Loader2 size={14} className="animate-spin" /> Đang gửi…</>) : (<>Gửi tin nhắn <Send size={14} /></>)}
                  </button>
                  <p className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
                    <Lock size={12} className="text-primary" />
                    Tin nhắn được mã hoá AES-256 trước khi lưu trữ.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Map */}
      {map.enabled && mapSrc && (
        <section className="bg-secondary py-20">
          <div className="container mx-auto px-4 md:px-8 max-w-6xl">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-3 mb-4">
                <span className="w-8 h-px bg-primary" />
                <MapPin size={14} className="text-primary" />
                <span className="text-primary text-[10px] tracking-[0.4em] uppercase">{map.title}</span>
                <MapPin size={14} className="text-primary" />
                <span className="w-8 h-px bg-primary" />
              </div>
              <h2 className="font-serif text-3xl md:text-4xl text-white mb-3">{map.address}</h2>
            </div>
            <div className="border border-primary/30 bg-card overflow-hidden relative">
              <div className="absolute -top-2 -left-2 w-4 h-4 border-t border-l border-primary z-10" />
              <div className="absolute -top-2 -right-2 w-4 h-4 border-t border-r border-primary z-10" />
              <div className="absolute -bottom-2 -left-2 w-4 h-4 border-b border-l border-primary z-10" />
              <div className="absolute -bottom-2 -right-2 w-4 h-4 border-b border-r border-primary z-10" />
              <iframe
                title="Bản đồ"
                src={mapSrc}
                style={{ height: map.height, border: 0 }}
                className="w-full block"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
        </section>
      )}
    </PageLayout>
  );
}

const inputCls =
  "w-full bg-background border border-primary/30 text-foreground placeholder:text-muted-foreground/60 px-4 h-12 outline-none focus:border-primary transition-colors text-sm";

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <label className="block text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-2">{label}</label>
      {children}
    </div>
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
