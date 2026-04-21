import { Link } from "wouter";
import { Sparkles, Crown, Clock, Star, Leaf, Wind, Droplets, ChevronRight, Phone, ArrowRight } from "lucide-react";
import type { SpaContent } from "../types";
import { getIcon } from "./default-content";

interface Props { content: SpaContent; branchName?: string; branchCity?: string; }

export default function SpaClassic({ content, branchName }: Props) {
  const { hero, stats, amenities, treatments, cta } = content;
  return (
    <>
      <section className="relative min-h-[65vh] md:min-h-[600px] flex items-end overflow-hidden pt-32 md:pt-40">
        <div className="absolute inset-0">
          <img src={hero.image ?? "/images/hotel-hanoi.png"} alt={hero.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/50 to-secondary/10" />
        </div>
        <div aria-hidden className="absolute top-28 left-10 w-24 h-24 border-l border-t border-primary/30 hidden md:block" />
        <div aria-hidden className="absolute top-28 right-10 w-24 h-24 border-r border-t border-primary/30 hidden md:block" />
        <div className="relative z-10 container mx-auto px-4 md:px-8 pb-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-3 mb-5">
              <span className="w-10 h-px bg-primary" />
              <Sparkles size={13} className="text-primary" />
              <span className="text-primary text-[10px] tracking-[0.4em] uppercase">{hero.eyebrow ?? "MAISON DELUXE"}{branchName ? ` · ${branchName}` : ""}</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-serif text-white mb-5 leading-tight whitespace-pre-line">{hero.title}</h1>
            <div className="flex items-center gap-2 mb-6">
              <span className="w-12 h-px bg-primary" />
              <span className="w-1.5 h-1.5 rotate-45 bg-primary" />
              <span className="w-20 h-px bg-primary/40" />
            </div>
            <p className="text-white/75 font-light text-lg leading-relaxed max-w-xl">{hero.description}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              {hero.ctaPrimary && (
                <a href={hero.ctaPrimary.href} className="inline-flex items-center gap-2 bg-primary text-primary-foreground uppercase tracking-widest text-xs px-7 py-3.5 hover:bg-primary/90 transition-colors">
                  {hero.ctaPrimary.label} <ArrowRight size={14} />
                </a>
              )}
              {hero.ctaSecondary && (
                <Link href={hero.ctaSecondary.href}>
                  <button className="inline-flex items-center gap-2 border border-primary/60 text-primary uppercase tracking-widest text-xs px-7 py-3.5 hover:bg-primary/10 transition-colors">
                    {hero.ctaSecondary.label}
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-secondary/5 border-y border-primary/10">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-primary/20 text-center">
            {stats.map((s) => (
              <div key={s.label} className="px-6 py-4">
                <div className="font-serif text-3xl text-primary mb-1">{s.n}</div>
                <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <div className="text-center mb-14">
            <p className="text-primary tracking-[0.3em] text-xs uppercase mb-4 font-serif">Tiện nghi đẳng cấp</p>
            <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">Không gian thư giãn toàn diện</h2>
            <div className="w-12 h-[2px] bg-primary mx-auto" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {amenities.map((a) => {
              const Icon = getIcon(a.icon);
              return (
                <div key={a.title} className="group flex items-start gap-4 border border-primary/15 p-6 bg-card hover:border-primary/50 transition-all">
                  <div className="p-3 bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-serif text-base text-foreground mb-1">{a.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{a.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="treatments" className="py-20 bg-secondary/5 border-y border-primary/10">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <div className="text-center mb-14">
            <p className="text-primary tracking-[0.3em] text-xs uppercase mb-4 font-serif">Bộ sưu tập liệu trình</p>
            <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">Trải nghiệm trị liệu độc quyền</h2>
            <div className="w-12 h-[2px] bg-primary mx-auto mb-4" />
          </div>
          <div className="space-y-14">
            {treatments.map((group) => {
              const Icon = getIcon(group.icon);
              return (
                <div key={group.category}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-primary/10 text-primary"><Icon size={16} /></div>
                    <h3 className="font-serif text-xl text-foreground">{group.category}</h3>
                    <span className="flex-1 h-px bg-primary/15" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {group.items.map((item) => (
                      <div key={item.name} className="group relative bg-card border border-primary/15 hover:border-primary/50 transition-all overflow-hidden">
                        <span className="absolute top-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-500" />
                        <div className="p-6">
                          <div className="flex items-center gap-2 mb-3">
                            <Clock size={12} className="text-primary/60" />
                            <span className="text-[10px] tracking-widest uppercase text-muted-foreground">{item.duration}</span>
                          </div>
                          <h4 className="font-serif text-lg text-foreground mb-3 leading-snug">{item.name}</h4>
                          <p className="text-xs text-muted-foreground leading-relaxed mb-5">{item.desc}</p>
                          <div className="flex items-baseline justify-between border-t border-primary/10 pt-4">
                            <span className="font-serif text-primary text-lg">{item.price}</span>
                            <Link href="/contact">
                              <button className="text-[10px] tracking-widest uppercase text-primary hover:text-foreground transition-colors flex items-center gap-1">
                                Đặt lịch <ChevronRight size={11} />
                              </button>
                            </Link>
                          </div>
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

      <section className="py-20 bg-secondary relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: "repeating-linear-gradient(45deg, hsl(46,65%,52%) 0, hsl(46,65%,52%) 1px, transparent 0, transparent 50%)", backgroundSize: "20px 20px" }} />
        </div>
        <div className="relative container mx-auto px-4 text-center">
          <p className="text-primary tracking-[0.3em] text-xs uppercase mb-4 font-serif">{cta.eyebrow}</p>
          <h2 className="text-3xl md:text-4xl font-serif text-white mb-4">{cta.title}</h2>
          <div className="w-12 h-px bg-primary mx-auto mb-6" />
          <p className="text-white/65 max-w-md mx-auto text-sm mb-10 leading-relaxed">{cta.description}</p>
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <Link href="/contact">
              <button className="bg-primary text-primary-foreground uppercase tracking-widest text-xs px-8 py-3.5 hover:bg-primary/90 transition-colors">Liên hệ đặt lịch</button>
            </Link>
            {cta.phone && (
              <a href={`tel:${cta.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 border border-primary text-primary uppercase tracking-widest text-xs px-8 py-3.5 hover:bg-primary/10 transition-colors">
                <Phone size={13} /> {cta.phone}
              </a>
            )}
          </div>
          {cta.hours && <p className="text-white/40 text-[11px] tracking-widest uppercase">{cta.hours}</p>}
        </div>
      </section>
    </>
  );
}
