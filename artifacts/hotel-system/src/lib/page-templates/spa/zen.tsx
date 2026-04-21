import { Link } from "wouter";
import { Sparkles, ArrowRight, Clock, Phone } from "lucide-react";
import type { SpaContent } from "../types";
import { getIcon } from "./default-content";

interface Props { content: SpaContent; branchName?: string; branchCity?: string; }

/**
 * ZEN — Phong cach toi gian, nhieu khoang trang, typography sang trong, palette xam-trang-vang nhat.
 * Phu hop voi chi nhanh thien ve thien duong yen tinh, retreat.
 */
export default function SpaZen({ content, branchName }: Props) {
  const { hero, stats, amenities, treatments, cta } = content;
  return (
    <>
      <section className="relative min-h-[80vh] flex items-center justify-center pt-32 pb-20 bg-background">
        {hero.image && (
          <div className="absolute inset-0 opacity-10">
            <img src={hero.image} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="relative z-10 text-center max-w-3xl mx-auto px-6">
          <div className="text-primary text-[10px] tracking-[0.6em] uppercase mb-8">{hero.eyebrow}{branchName ? ` · ${branchName}` : ""}</div>
          <h1 className="font-serif text-5xl md:text-8xl text-foreground mb-12 leading-[1.05] whitespace-pre-line">{hero.title}</h1>
          <div className="w-16 h-px bg-primary mx-auto mb-12" />
          <p className="text-muted-foreground font-light text-lg md:text-xl leading-loose max-w-2xl mx-auto">{hero.description}</p>
          {hero.ctaPrimary && (
            <a href={hero.ctaPrimary.href} className="inline-flex items-center gap-3 mt-12 text-primary text-xs tracking-[0.4em] uppercase border-b border-primary/40 pb-2 hover:border-primary transition-colors">
              {hero.ctaPrimary.label} <ArrowRight size={14} />
            </a>
          )}
        </div>
      </section>

      <section className="py-24 border-y border-primary/10 bg-secondary/5">
        <div className="container mx-auto px-4 max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="font-serif text-5xl text-primary mb-3 font-light">{s.n}</div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-32 bg-background">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="mb-20 max-w-xl">
            <p className="text-primary text-[10px] tracking-[0.5em] uppercase mb-6">Không gian</p>
            <h2 className="font-serif text-4xl md:text-5xl text-foreground leading-tight">Sự yên bình tuyệt đối trong từng chi tiết</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
            {amenities.map((a, i) => {
              const Icon = getIcon(a.icon);
              return (
                <div key={a.title} className="flex items-start gap-6 group">
                  <div className="text-primary/60 group-hover:text-primary transition-colors pt-1">
                    <Icon size={28} strokeWidth={1.2} />
                  </div>
                  <div className="flex-1 border-b border-primary/10 pb-8">
                    <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-2">0{i + 1}</div>
                    <h3 className="font-serif text-2xl text-foreground mb-2 font-light">{a.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-light">{a.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="treatments" className="py-32 bg-secondary/5 border-y border-primary/10">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center mb-20">
            <p className="text-primary text-[10px] tracking-[0.5em] uppercase mb-6">Liệu trình</p>
            <h2 className="font-serif text-4xl md:text-5xl text-foreground font-light">Hành trình của sự tĩnh lặng</h2>
          </div>
          <div className="space-y-24">
            {treatments.map((group) => (
              <div key={group.category}>
                <h3 className="font-serif text-2xl text-foreground mb-12 font-light text-center">{group.category}</h3>
                <div className="space-y-6">
                  {group.items.map((item) => (
                    <Link key={item.name} href="/contact">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-baseline border-b border-primary/10 pb-8 group hover:border-primary/40 transition-colors cursor-pointer">
                        <h4 className="md:col-span-5 font-serif text-2xl text-foreground font-light group-hover:text-primary transition-colors">{item.name}</h4>
                        <p className="md:col-span-4 text-sm text-muted-foreground leading-relaxed font-light">{item.desc}</p>
                        <div className="md:col-span-2 text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-2"><Clock size={11} />{item.duration}</div>
                        <div className="md:col-span-1 font-serif text-xl text-primary text-right">{item.price.split(" ")[0]}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-32 bg-background text-center">
        <div className="container mx-auto px-6 max-w-2xl">
          <Sparkles size={28} className="text-primary/60 mx-auto mb-8" strokeWidth={1.2} />
          <p className="text-primary text-[10px] tracking-[0.5em] uppercase mb-6">{cta.eyebrow}</p>
          <h2 className="font-serif text-4xl md:text-5xl text-foreground mb-8 font-light leading-tight">{cta.title}</h2>
          <p className="text-muted-foreground font-light leading-loose mb-12">{cta.description}</p>
          {cta.phone && (
            <a href={`tel:${cta.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-3 text-primary text-sm tracking-[0.3em] uppercase border-b border-primary/40 pb-2 hover:border-primary transition-colors">
              <Phone size={14} /> {cta.phone}
            </a>
          )}
          {cta.hours && <p className="text-muted-foreground/70 text-[11px] tracking-[0.3em] uppercase mt-12">{cta.hours}</p>}
        </div>
      </section>
    </>
  );
}
