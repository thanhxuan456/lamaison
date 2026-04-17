import { useListHotels } from "@workspace/api-client-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { MapPin, Star, ChevronRight } from "lucide-react";
import { usePageBlocks, PageBlock } from "@/lib/page-blocks";

/* ────────────────────────────────────────
   Block Renderers
──────────────────────────────────────── */

function HeroBlock({ s }: { s: Record<string, any> }) {
  return (
    <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          src={s.imageUrl || "/images/hero.png"}
          alt="Grand Palace Hotel"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-secondary/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-secondary via-transparent to-secondary/30" />
      </div>
      <div className="relative z-10 container mx-auto px-4 text-center mt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <h2 className="text-primary font-serif tracking-[0.2em] text-sm md:text-base uppercase mb-6">
            {s.kicker || "Tinh hoa của sự xa hoa"}
          </h2>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif text-white mb-8 leading-tight drop-shadow-lg">
            {s.title1 || "Trải Nghiệm Hoàng Gia"} <br className="hidden md:block" />
            {s.title2 || "Tại Việt Nam"}
          </h1>
          <div className="w-24 h-[1px] bg-primary mx-auto mb-8" />
          <p className="text-lg md:text-xl text-white/90 font-light max-w-2xl mx-auto mb-12 leading-relaxed">
            {s.subtitle}
          </p>
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none px-8 py-6 text-sm tracking-widest uppercase border border-transparent hover:border-white transition-all"
            onClick={() => { document.getElementById("destinations")?.scrollIntoView({ behavior: "smooth" }); }}
          >
            {s.cta || "Khám phá điểm đến"}
          </Button>
        </motion.div>
      </div>
    </section>
  );
}

function DestinationsBlock({ s }: { s: Record<string, any> }) {
  const { data: hotels, isLoading } = useListHotels();
  const [, setLocation] = useLocation();

  return (
    <section id="destinations" className="py-24 bg-background relative">
      <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-primary/20 opacity-50 m-8" />
      <div className="absolute top-0 right-0 w-32 h-32 border-t-2 border-r-2 border-primary/20 opacity-50 m-8" />
      <div className="container mx-auto px-4 md:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-primary font-serif tracking-[0.2em] text-sm uppercase mb-4">
            {s.kicker || "Các điểm đến"}
          </h2>
          <h3 className="text-3xl md:text-5xl font-serif text-foreground mb-6">
            {s.title || "Nơi cảm xúc thăng hoa"}
          </h3>
          <div className="w-16 h-[2px] bg-primary mx-auto" />
        </div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => <div key={i} className="h-[500px] bg-secondary/10 animate-pulse border border-primary/20" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {hotels?.map((hotel, index) => {
              let imageSrc = "/images/hotel-hanoi.png";
              if (hotel.city.includes("Đà Nẵng") || hotel.city.includes("Da Nang")) imageSrc = "/images/hotel-danang.png";
              if (hotel.city.includes("Hồ Chí Minh") || hotel.city.includes("Ho Chi Minh")) imageSrc = "/images/hotel-hcmc.png";
              return (
                <motion.div
                  key={hotel.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.8, delay: index * 0.2 }}
                  className="group relative overflow-hidden border border-primary/30 cursor-pointer h-[500px]"
                  onClick={() => setLocation(`/hotels/${hotel.id}`)}
                >
                  <div className="absolute inset-0">
                    <img src={imageSrc} alt={hotel.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-secondary/90 via-secondary/40 to-transparent" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-8 flex flex-col items-center text-center transform transition-transform duration-500 group-hover:-translate-y-4">
                    <h4 className="text-2xl font-serif text-white mb-2">{hotel.name}</h4>
                    <div className="flex items-center gap-1 text-primary mb-4">
                      {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="currentColor" />)}
                    </div>
                    <div className="flex items-center gap-2 text-white/80 text-sm mb-6">
                      <MapPin size={16} className="text-primary" /><span>{hotel.city}</span>
                    </div>
                    <div className="h-0 opacity-0 group-hover:h-auto group-hover:opacity-100 overflow-hidden transition-all duration-500 flex flex-col items-center">
                      <div className="w-12 h-[1px] bg-primary mb-4" />
                      <p className="text-white/90 text-sm font-light mb-6 line-clamp-2">{hotel.description}</p>
                      <span className="inline-flex items-center text-primary text-sm uppercase tracking-widest font-medium group/btn">
                        Chi tiết <ChevronRight size={16} className="ml-1 transition-transform group-hover/btn:translate-x-1" />
                      </span>
                    </div>
                  </div>
                  <div className="absolute top-4 left-4 w-8 h-8 border-t border-l border-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-b border-r border-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function ExperiencesBlock({ s }: { s: Record<string, any> }) {
  const items = [s.item1, s.item2, s.item3, s.item4].filter(Boolean);
  return (
    <section className="py-24 bg-secondary text-secondary-foreground relative border-y border-primary/30">
      <div className="container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="order-2 lg:order-1 relative">
            <div className="absolute -inset-4 border border-primary/20 z-0" />
            <img
              src={s.imageUrl || "/images/restaurant.png"}
              alt="Experience"
              className="w-full h-auto aspect-[4/3] object-cover relative z-10 border border-primary/40 shadow-2xl"
            />
            {s.quote && (
              <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-primary/10 border border-primary/30 z-20 flex items-center justify-center p-6 text-center backdrop-blur-sm hidden md:flex">
                <p className="font-serif italic text-primary text-lg">{s.quote}</p>
              </div>
            )}
          </div>
          <div className="order-1 lg:order-2">
            <h2 className="text-primary font-serif tracking-[0.2em] text-sm uppercase mb-4">{s.kicker || "Trải nghiệm"}</h2>
            <h3 className="text-3xl md:text-5xl font-serif text-white mb-6 leading-tight">{s.title || "Dấu ấn khó phai"}</h3>
            <div className="w-16 h-[2px] bg-primary mb-8" />
            <p className="text-white/70 text-lg font-light leading-relaxed mb-8">{s.body}</p>
            {items.length > 0 && (
              <ul className="space-y-4 mb-10">
                {items.map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-white/80">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full shrink-0" />
                    <span className="font-light">{item}</span>
                  </li>
                ))}
              </ul>
            )}
            {s.cta && (
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-none px-8 py-6 text-sm tracking-widest uppercase bg-transparent">
                {s.cta}
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeaturesBlock({ s }: { s: Record<string, any> }) {
  const items: any[] = s.items || [];
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center mb-16">
          {s.kicker && <h2 className="text-primary font-serif tracking-[0.2em] text-sm uppercase mb-4">{s.kicker}</h2>}
          <h3 className="text-3xl md:text-5xl font-serif text-foreground mb-4">{s.title || "Tiện nghi 5 sao"}</h3>
          <div className="w-16 h-[2px] bg-primary mx-auto" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {items.map((item: any, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="border border-primary/20 p-8 text-center hover:border-primary/50 hover:bg-primary/3 transition-all group"
            >
              <div className="text-4xl mb-4">{item.icon || "⭐"}</div>
              <h4 className="font-serif text-lg text-foreground mb-2 group-hover:text-primary transition-colors">{item.title}</h4>
              <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TextBlock({ s }: { s: Record<string, any> }) {
  const isDark = s.background === "dark";
  return (
    <section className={`py-20 ${isDark ? "bg-secondary text-white" : "bg-background"}`}>
      <div className="container mx-auto px-4 md:px-8 max-w-3xl text-center">
        {s.kicker && (
          <h2 className="text-primary font-serif tracking-[0.2em] text-sm uppercase mb-4">{s.kicker}</h2>
        )}
        <h3 className={`text-3xl md:text-4xl font-serif mb-6 ${isDark ? "text-white" : "text-foreground"}`}>{s.title}</h3>
        <div className="w-16 h-[2px] bg-primary mx-auto mb-8" />
        <p className={`text-lg font-light leading-relaxed ${isDark ? "text-white/75" : "text-muted-foreground"}`}>{s.body}</p>
      </div>
    </section>
  );
}

function CtaBannerBlock({ s }: { s: Record<string, any> }) {
  const [, setLocation] = useLocation();
  return (
    <section className="relative py-24 overflow-hidden">
      {s.imageUrl && (
        <>
          <img src={s.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-secondary/80" />
        </>
      )}
      <div className={`relative z-10 container mx-auto px-4 text-center ${s.imageUrl ? "" : "bg-secondary py-20"}`}>
        <h2 className="text-3xl md:text-5xl font-serif text-white mb-4">{s.title}</h2>
        <p className="text-white/80 text-lg mb-8">{s.subtitle}</p>
        {s.ctaText && (
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none px-10 py-6 text-sm tracking-widest uppercase"
            onClick={() => s.ctaLink && setLocation(s.ctaLink)}
          >
            {s.ctaText}
          </Button>
        )}
      </div>
    </section>
  );
}

function GalleryBlock({ s }: { s: Record<string, any> }) {
  const images: any[] = s.images || [];
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4 md:px-8">
        {s.title && (
          <div className="text-center mb-12">
            <h3 className="text-3xl font-serif text-foreground mb-4">{s.title}</h3>
            <div className="w-16 h-[2px] bg-primary mx-auto" />
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {images.map((img: any, i: number) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="relative aspect-square overflow-hidden border border-primary/20 group"
            >
              <img src={img.url} alt={img.caption || ""} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              {img.caption && (
                <div className="absolute inset-x-0 bottom-0 bg-secondary/80 text-white text-xs px-3 py-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300 font-serif tracking-wide text-center">
                  {img.caption}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SeparatorBlock({ s }: { s: Record<string, any> }) {
  const style = s.style || "diamond";
  return (
    <div className="py-8 flex items-center justify-center gap-4">
      {style === "line" && <div className="w-full max-w-md h-[1px] bg-primary/30" />}
      {style === "diamond" && (
        <>
          <div className="flex-1 max-w-[120px] h-[1px] bg-primary/30" />
          <div className="w-2.5 h-2.5 rotate-45 bg-primary" />
          <div className="w-1.5 h-1.5 rotate-45 border border-primary" />
          <div className="w-2.5 h-2.5 rotate-45 bg-primary" />
          <div className="flex-1 max-w-[120px] h-[1px] bg-primary/30" />
        </>
      )}
      {style === "ornament" && (
        <>
          <div className="flex-1 max-w-[80px] h-[1px] bg-primary/30" />
          <div className="flex items-center gap-1.5 text-primary/60 font-serif text-lg tracking-widest">◆ ◇ ◆</div>
          <div className="flex-1 max-w-[80px] h-[1px] bg-primary/30" />
        </>
      )}
    </div>
  );
}

/* ── Block Dispatcher ── */
function BlockRenderer({ block }: { block: PageBlock }) {
  if (!block.visible) return null;
  const s = block.settings;
  switch (block.type) {
    case "hero":         return <HeroBlock s={s} />;
    case "destinations": return <DestinationsBlock s={s} />;
    case "experiences":  return <ExperiencesBlock s={s} />;
    case "features":     return <FeaturesBlock s={s} />;
    case "text_block":   return <TextBlock s={s} />;
    case "cta_banner":   return <CtaBannerBlock s={s} />;
    case "gallery":      return <GalleryBlock s={s} />;
    case "separator":    return <SeparatorBlock s={s} />;
    default:             return null;
  }
}

/* ── Home Page ── */
export default function Home() {
  const { blocks } = usePageBlocks();

  return (
    <PageLayout>
      {blocks.map((block) => (
        <BlockRenderer key={block.id} block={block} />
      ))}
    </PageLayout>
  );
}
