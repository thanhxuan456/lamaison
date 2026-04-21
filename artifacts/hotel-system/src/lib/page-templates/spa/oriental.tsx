import { Link } from "wouter";
import { Sparkles, Phone, Clock, ChevronRight } from "lucide-react";
import type { SpaContent } from "../types";
import { getIcon } from "./default-content";

interface Props { content: SpaContent; branchName?: string; branchCity?: string; }

/**
 * ORIENTAL — Phong cach phuong Dong sang trong: nen toi, hoa van, nhieu hoa tiet vang.
 * Phu hop voi chi nhanh hoang gia, co dien Viet/A Dong.
 */
export default function SpaOriental({ content, branchName, branchCity }: Props) {
  const { hero, stats, amenities, treatments, cta } = content;

  const Pattern = () => (
    <div aria-hidden className="absolute inset-0 opacity-[0.07] pointer-events-none"
      style={{ backgroundImage: "radial-gradient(circle, hsl(46,65%,52%) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
  );

  const FrameCorners = () => (
    <>
      <span className="pointer-events-none absolute -top-px -left-px w-4 h-4 border-t-2 border-l-2 border-primary" />
      <span className="pointer-events-none absolute -top-px -right-px w-4 h-4 border-t-2 border-r-2 border-primary" />
      <span className="pointer-events-none absolute -bottom-px -left-px w-4 h-4 border-b-2 border-l-2 border-primary" />
      <span className="pointer-events-none absolute -bottom-px -right-px w-4 h-4 border-b-2 border-r-2 border-primary" />
    </>
  );

  return (
    <div className="bg-secondary text-white">
      <section className="relative min-h-[90vh] flex items-center pt-32 pb-20 overflow-hidden">
        {hero.image && (
          <div className="absolute inset-0">
            <img src={hero.image} alt={hero.title} className="w-full h-full object-cover opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-r from-secondary via-secondary/85 to-secondary/40" />
          </div>
        )}
        <Pattern />

        <div className="relative z-10 container mx-auto px-6 max-w-6xl">
          <div className="border border-primary/30 p-8 md:p-16 max-w-3xl relative bg-secondary/40 backdrop-blur-sm">
            <FrameCorners />
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-6">
                <span className="w-12 h-px bg-primary/60" />
                <span className="w-2 h-2 rotate-45 bg-primary" />
                <span className="w-12 h-px bg-primary/60" />
              </div>
              <div className="text-primary text-[11px] tracking-[0.5em] uppercase mb-6">{hero.eyebrow}</div>
              {branchName && <div className="text-amber-200/70 text-xs tracking-[0.4em] uppercase mb-6">{branchName}{branchCity ? ` · ${branchCity}` : ""}</div>}
              <h1 className="font-serif text-5xl md:text-7xl text-white mb-8 leading-tight whitespace-pre-line">{hero.title}</h1>
              <div className="w-20 h-[2px] bg-primary mx-auto mb-8" />
              <p className="text-white/80 font-light text-base leading-relaxed">{hero.description}</p>
              <div className="mt-10 flex flex-wrap gap-4 justify-center">
                {hero.ctaPrimary && (
                  <a href={hero.ctaPrimary.href} className="inline-flex items-center gap-2 bg-primary text-secondary uppercase tracking-[0.3em] text-[11px] px-8 py-4 hover:bg-primary/90 transition-colors font-medium">
                    {hero.ctaPrimary.label}
                  </a>
                )}
                {hero.ctaSecondary && (
                  <Link href={hero.ctaSecondary.href}>
                    <button className="inline-flex items-center gap-2 border border-primary text-primary uppercase tracking-[0.3em] text-[11px] px-8 py-4 hover:bg-primary/10 transition-colors">
                      {hero.ctaSecondary.label}
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 border-y border-primary/20 bg-black/30 relative">
        <Pattern />
        <div className="container mx-auto px-4 max-w-6xl relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-primary/20">
            {stats.map((s) => (
              <div key={s.label} className="bg-secondary px-6 py-8 text-center">
                <div className="font-serif text-4xl text-primary mb-2">{s.n}</div>
                <div className="text-[10px] tracking-[0.3em] uppercase text-amber-200/60">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-secondary relative">
        <Pattern />
        <div className="container mx-auto px-4 max-w-6xl relative">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="w-8 h-px bg-primary" />
              <Sparkles size={14} className="text-primary" />
              <span className="w-8 h-px bg-primary" />
            </div>
            <h2 className="font-serif text-3xl md:text-4xl text-white mb-3">Tiện nghi đẳng cấp hoàng gia</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-primary/15">
            {amenities.map((a) => {
              const Icon = getIcon(a.icon);
              return (
                <div key={a.title} className="bg-secondary p-8 text-center hover:bg-black/30 transition-colors group relative">
                  <div className="inline-flex p-4 border border-primary/40 text-primary mb-4 group-hover:bg-primary group-hover:text-secondary transition-colors">
                    <Icon size={22} />
                  </div>
                  <h3 className="font-serif text-lg text-white mb-2">{a.title}</h3>
                  <p className="text-xs text-amber-200/60 leading-relaxed">{a.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="treatments" className="py-24 border-y border-primary/20 bg-black/30 relative">
        <Pattern />
        <div className="container mx-auto px-4 max-w-6xl relative">
          <div className="text-center mb-16">
            <p className="text-primary text-[11px] tracking-[0.5em] uppercase mb-4">Liệu trình hoàng gia</p>
            <h2 className="font-serif text-3xl md:text-4xl text-white">Trải nghiệm độc quyền</h2>
            <div className="w-12 h-[2px] bg-primary mx-auto mt-6" />
          </div>
          <div className="space-y-16">
            {treatments.map((group) => {
              const Icon = getIcon(group.icon);
              return (
                <div key={group.category}>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 border border-primary/40 text-primary"><Icon size={16} /></div>
                    <h3 className="font-serif text-2xl text-white">{group.category}</h3>
                    <span className="flex-1 h-px bg-primary/20" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-primary/15">
                    {group.items.map((item) => (
                      <div key={item.name} className="relative bg-secondary p-7 hover:bg-black/40 transition-colors">
                        <div className="flex items-center gap-2 mb-3">
                          <Clock size={11} className="text-primary/70" />
                          <span className="text-[10px] tracking-widest uppercase text-amber-200/60">{item.duration}</span>
                        </div>
                        <h4 className="font-serif text-lg text-white mb-3">{item.name}</h4>
                        <p className="text-xs text-amber-200/70 leading-relaxed mb-5">{item.desc}</p>
                        <div className="flex items-baseline justify-between border-t border-primary/20 pt-4">
                          <span className="font-serif text-primary text-lg">{item.price}</span>
                          <Link href="/contact">
                            <button className="text-[10px] tracking-widest uppercase text-primary hover:text-white transition-colors flex items-center gap-1">
                              Đặt lịch <ChevronRight size={11} />
                            </button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-24 bg-secondary text-center relative">
        <Pattern />
        <div className="container mx-auto px-4 max-w-2xl relative">
          <p className="text-primary text-[11px] tracking-[0.5em] uppercase mb-4">{cta.eyebrow}</p>
          <h2 className="font-serif text-3xl md:text-4xl text-white mb-6">{cta.title}</h2>
          <div className="w-12 h-[2px] bg-primary mx-auto mb-8" />
          <p className="text-amber-200/70 leading-relaxed mb-10">{cta.description}</p>
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <Link href="/contact">
              <button className="bg-primary text-secondary uppercase tracking-[0.3em] text-[11px] px-8 py-4 hover:bg-primary/90 transition-colors font-medium">Liên hệ đặt lịch</button>
            </Link>
            {cta.phone && (
              <a href={`tel:${cta.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 border border-primary text-primary uppercase tracking-[0.3em] text-[11px] px-8 py-4 hover:bg-primary/10 transition-colors">
                <Phone size={13} /> {cta.phone}
              </a>
            )}
          </div>
          {cta.hours && <p className="text-amber-200/40 text-[11px] tracking-[0.3em] uppercase">{cta.hours}</p>}
        </div>
      </section>
    </div>
  );
}
