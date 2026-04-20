import { useState, FormEvent } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { useFooterConfig, useContactMap, buildMapEmbedUrl } from "@/lib/site-config";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, MapPin, Crown, Send, Loader2, CheckCircle2, Lock, Clock } from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "";

export default function ContactPage() {
  const { footer } = useFooterConfig();
  const { map } = useContactMap();
  const { toast } = useToast();
  const mapSrc = map.enabled ? buildMapEmbedUrl(map) : "";

  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
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

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="relative min-h-[480px] flex items-end bg-secondary overflow-hidden">
        {/* Background image layer */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1600&q=80')" }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-secondary/40 via-secondary/60 to-secondary" />

        {/* Corner ornaments */}
        <div aria-hidden className="absolute top-10 left-10 w-16 h-16 border-l-2 border-t-2 border-primary/50" />
        <div aria-hidden className="absolute top-10 right-10 w-16 h-16 border-r-2 border-t-2 border-primary/50" />

        {/* Horizontal gold rule */}
        <div aria-hidden className="absolute top-1/2 left-0 right-0 flex items-center gap-0 opacity-10">
          <div className="flex-1 h-px bg-primary" />
        </div>

        <div className="container mx-auto px-6 md:px-12 pb-16 pt-40 relative z-10">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-12 h-px bg-primary" />
              <Crown size={14} className="text-primary" />
              <span className="text-primary text-[10px] tracking-[0.45em] uppercase font-light">Liên hệ chúng tôi</span>
            </div>
            <h1 className="text-6xl md:text-7xl font-serif text-white leading-none mb-5">
              Hân hạnh<br />
              <span className="text-primary italic">phục vụ</span>
            </h1>
            <p className="text-white/60 font-light text-lg max-w-xl leading-relaxed">
              Đội ngũ concierge của chúng tôi luôn sẵn sàng hỗ trợ quý khách 24 giờ mỗi ngày, 7 ngày mỗi tuần.
            </p>
          </div>
        </div>
      </section>

      {/* ── QUICK INFO BAR ─────────────────────────────────────── */}
      <div className="bg-primary">
        <div className="container mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-primary-foreground/20">
            <QuickInfo icon={<Phone size={15} />} label="Hotline 24/7" value={footer.contact.phone}
              href={footer.contact.phone ? `tel:${footer.contact.phone.replace(/\s/g, "")}` : undefined} />
            <QuickInfo icon={<Mail size={15} />} label="Email" value={footer.contact.email}
              href={footer.contact.email ? `mailto:${footer.contact.email}` : undefined} />
            <QuickInfo icon={<MapPin size={15} />} label="Chi nhánh" value={footer.contact.address} />
          </div>
        </div>
      </div>

      {/* ── MAIN: TWO COLUMNS ──────────────────────────────────── */}
      <section className="bg-background py-24">
        <div className="container mx-auto px-6 md:px-12 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 xl:gap-24">

            {/* LEFT — Contact details */}
            <div className="lg:col-span-2 flex flex-col gap-10">
              {/* Section label */}
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <span className="w-8 h-px bg-primary" />
                  <span className="text-primary text-[10px] tracking-[0.4em] uppercase">Thông tin liên lạc</span>
                </div>
                <h2 className="font-serif text-4xl text-foreground leading-snug mb-4">
                  Chúng tôi luôn<br />ở đây vì quý khách
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Dù quý khách cần tư vấn đặt phòng, sắp xếp sự kiện riêng tư, hay có bất kỳ yêu cầu nào — đội ngũ chúng tôi sẵn sàng lắng nghe và đáp ứng.
                </p>
              </div>

              {/* Detail cards */}
              <div className="flex flex-col gap-4">
                <DetailCard
                  icon={<Phone size={18} className="text-primary" />}
                  label="Hotline"
                  value={footer.contact.phone}
                  href={footer.contact.phone ? `tel:${footer.contact.phone.replace(/\s/g, "")}` : undefined}
                  sub="Hỗ trợ 24/7 — không ngày nghỉ"
                />
                <DetailCard
                  icon={<Mail size={18} className="text-primary" />}
                  label="Email"
                  value={footer.contact.email}
                  href={footer.contact.email ? `mailto:${footer.contact.email}` : undefined}
                  sub="Phản hồi trong vòng 1 giờ"
                />
                <DetailCard
                  icon={<MapPin size={18} className="text-primary" />}
                  label="Địa điểm"
                  value={footer.contact.address}
                  sub="Hà Nội · Đà Nẵng · TP. Hồ Chí Minh"
                />
                <DetailCard
                  icon={<Clock size={18} className="text-primary" />}
                  label="Giờ phục vụ"
                  value="24 / 7 / 365"
                  sub="Concierge luôn trực chiều & tối"
                />
              </div>

              {/* Decorative gold divider */}
              <div className="flex items-center gap-4 py-2">
                <div className="flex-1 h-px bg-primary/20" />
                <Crown size={14} className="text-primary/40" />
                <div className="flex-1 h-px bg-primary/20" />
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { n: "15+", t: "Năm kinh nghiệm" },
                  { n: "5★", t: "Tiêu chuẩn dịch vụ" },
                  { n: "24/7", t: "Hỗ trợ liên tục" },
                  { n: "100%", t: "Khách hài lòng" },
                ].map((b) => (
                  <div key={b.n} className="border border-primary/20 bg-card p-4 relative group hover:border-primary/50 transition-colors">
                    <div className="absolute top-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-500" />
                    <div className="font-serif text-2xl text-primary leading-none mb-1">{b.n}</div>
                    <div className="text-[10px] tracking-widest uppercase text-muted-foreground">{b.t}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — Contact form */}
            <div className="lg:col-span-3">
              <div className="relative bg-card border border-primary/20 p-8 md:p-12">
                {/* Corner pins */}
                <span className="absolute -top-px -left-px w-5 h-5 border-t-2 border-l-2 border-primary" />
                <span className="absolute -top-px -right-px w-5 h-5 border-t-2 border-r-2 border-primary" />
                <span className="absolute -bottom-px -left-px w-5 h-5 border-b-2 border-l-2 border-primary" />
                <span className="absolute -bottom-px -right-px w-5 h-5 border-b-2 border-r-2 border-primary" />

                <div className="mb-10">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-8 h-px bg-primary" />
                    <span className="text-primary text-[10px] tracking-[0.4em] uppercase">Gửi yêu cầu</span>
                  </div>
                  <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-2">Để lại lời nhắn</h2>
                  <p className="text-muted-foreground text-sm">
                    Quý khách có yêu cầu đặc biệt? Hãy điền vào biểu mẫu — chúng tôi phản hồi trong vòng 1 giờ.
                  </p>
                </div>

                {submitted ? (
                  <SuccessState onReset={() => setSubmitted(false)} />
                ) : (
                  <form onSubmit={onSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <FloatField label="Họ và tên *">
                        <input required value={form.name} onChange={update("name")}
                          className={inputCls} placeholder="Nguyễn Văn A" />
                      </FloatField>
                      <FloatField label="Email *">
                        <input type="email" required value={form.email} onChange={update("email")}
                          className={inputCls} placeholder="email@example.com" />
                      </FloatField>
                      <FloatField label="Số điện thoại">
                        <input type="tel" value={form.phone} onChange={update("phone")}
                          className={inputCls} placeholder="+84 900 000 000" />
                      </FloatField>
                      <FloatField label="Chủ đề">
                        <select value={form.subject} onChange={update("subject")} className={inputCls}>
                          <option value="">Chọn chủ đề...</option>
                          <option value="Đặt phòng">Đặt phòng</option>
                          <option value="Sự kiện & Tiệc">Sự kiện &amp; Tiệc</option>
                          <option value="Spa & Dịch vụ">Spa &amp; Dịch vụ</option>
                          <option value="Khiếu nại">Khiếu nại</option>
                          <option value="Hợp tác">Hợp tác</option>
                          <option value="Khác">Khác</option>
                        </select>
                      </FloatField>
                    </div>

                    <FloatField label="Nội dung *">
                      <textarea required rows={5} value={form.message} onChange={update("message")}
                        className={`${inputCls} resize-none py-3 min-h-[130px]`}
                        placeholder="Vui lòng cho biết yêu cầu của quý khách..." />
                    </FloatField>

                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
                      <button type="submit" disabled={submitting}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed px-12 h-14 uppercase tracking-[0.25em] text-xs font-medium transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
                        {submitting
                          ? <><Loader2 size={14} className="animate-spin" /> Đang gửi…</>
                          : <><Send size={14} /> Gửi tin nhắn</>}
                      </button>
                      <p className="flex items-center gap-2 text-[11px] text-muted-foreground whitespace-nowrap">
                        <Lock size={11} className="text-primary shrink-0" />
                        Mã hoá AES-256 trước khi lưu trữ
                      </p>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAP ────────────────────────────────────────────────── */}
      {map.enabled && mapSrc && (
        <section className="relative">
          {/* Top label bar */}
          <div className="bg-secondary py-16">
            <div className="container mx-auto px-6 md:px-12 max-w-7xl">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-8 h-px bg-primary" />
                    <MapPin size={13} className="text-primary" />
                    <span className="text-primary text-[10px] tracking-[0.4em] uppercase">Vị trí</span>
                  </div>
                  <h2 className="font-serif text-4xl md:text-5xl text-white">{map.address}</h2>
                </div>
                <p className="text-white/50 text-sm max-w-xs leading-relaxed">
                  Toạ lạc tại vị trí đắc địa, thuận tiện di chuyển từ sân bay và trung tâm thành phố.
                </p>
              </div>

              {/* Map frame */}
              <div className="relative">
                <span className="absolute -top-px -left-px w-6 h-6 border-t-2 border-l-2 border-primary z-10" />
                <span className="absolute -top-px -right-px w-6 h-6 border-t-2 border-r-2 border-primary z-10" />
                <span className="absolute -bottom-px -left-px w-6 h-6 border-b-2 border-l-2 border-primary z-10" />
                <span className="absolute -bottom-px -right-px w-6 h-6 border-b-2 border-r-2 border-primary z-10" />
                <div className="border border-primary/30 overflow-hidden">
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
            </div>
          </div>
        </section>
      )}
    </PageLayout>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

const inputCls =
  "w-full bg-background border border-primary/25 text-foreground placeholder:text-muted-foreground/50 px-4 h-12 outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-200 text-sm";

function FloatField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="group">
      <label className="block text-[10px] tracking-[0.35em] uppercase text-muted-foreground mb-2 group-focus-within:text-primary transition-colors">
        {label}
      </label>
      {children}
    </div>
  );
}

function QuickInfo({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  const cls = "flex items-center gap-4 px-8 py-5 text-primary-foreground hover:bg-primary-foreground/5 transition-colors w-full";
  const inner = (
    <>
      <span className="shrink-0 opacity-80">{icon}</span>
      <div className="min-w-0">
        <div className="text-[9px] tracking-[0.4em] uppercase opacity-60 mb-0.5">{label}</div>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
    </>
  );
  return href
    ? <a href={href} className={cls}>{inner}</a>
    : <div className={cls}>{inner}</div>;
}

function DetailCard({ icon, label, value, href, sub }: {
  icon: React.ReactNode; label: string; value: string; href?: string; sub?: string;
}) {
  const cls = "flex items-start gap-5 p-5 bg-card border border-primary/15 hover:border-primary/40 transition-all duration-300 group";
  const inner = (
    <>
      <div className="w-10 h-10 shrink-0 border border-primary/30 flex items-center justify-center bg-primary/5 group-hover:bg-primary/10 transition-colors mt-0.5">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[9px] tracking-[0.35em] uppercase text-muted-foreground mb-1">{label}</div>
        <div className="font-medium text-foreground text-sm mb-0.5 truncate">{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground/70">{sub}</div>}
      </div>
    </>
  );
  return href
    ? <a href={href} className={cls}>{inner}</a>
    : <div className={cls}>{inner}</div>;
}

function SuccessState({ onReset }: { onReset: () => void }) {
  return (
    <div className="text-center py-16 max-w-sm mx-auto">
      <div className="relative inline-flex mb-8">
        <div className="w-20 h-20 border-2 border-primary/30 flex items-center justify-center bg-primary/5">
          <CheckCircle2 className="text-primary" size={36} />
        </div>
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
          <span className="w-1.5 h-1.5 bg-primary-foreground rounded-full" />
        </span>
      </div>
      <h3 className="font-serif text-3xl text-foreground mb-3">Cảm ơn quý khách</h3>
      <div className="w-10 h-px bg-primary mx-auto mb-5" />
      <p className="text-muted-foreground text-sm leading-relaxed mb-8">
        Tin nhắn đã được gửi đến đội ngũ concierge. Chúng tôi sẽ liên hệ với quý khách trong thời gian sớm nhất.
      </p>
      <button onClick={onReset}
        className="text-[11px] tracking-[0.3em] uppercase border border-primary text-primary px-8 py-3 hover:bg-primary hover:text-primary-foreground transition-all duration-300">
        Gửi tin nhắn khác
      </button>
    </div>
  );
}
