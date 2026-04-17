import { useListHotels } from "@workspace/api-client-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { MapPin, Star, ChevronRight } from "lucide-react";
import { useT } from "@/lib/i18n";

export default function Home() {
  const { data: hotels, isLoading } = useListHotels();
  const [, setLocation] = useLocation();
  const { t } = useT();

  return (
    <PageLayout>
      {/* Hero Section */}
      <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="/images/hero.png"
            alt="Grand Palace Hotel Lobby"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-secondary/60"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-secondary via-transparent to-secondary/30"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 text-center mt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <h2 className="text-primary font-serif tracking-[0.2em] text-sm md:text-base uppercase mb-6">
              {t("home.hero.kicker")}
            </h2>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif text-white mb-8 leading-tight drop-shadow-lg">
              {t("home.hero.title1")} <br className="hidden md:block" /> {t("home.hero.title2")}
            </h1>
            <div className="w-24 h-[1px] bg-primary mx-auto mb-8"></div>
            <p className="text-lg md:text-xl text-white/90 font-light max-w-2xl mx-auto mb-12 leading-relaxed">
              {t("home.hero.subtitle")}
            </p>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none px-8 py-6 text-sm tracking-widest uppercase border border-transparent hover:border-white transition-all"
              onClick={() => {
                document.getElementById("destinations")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {t("home.hero.cta")}
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Destinations Section */}
      <section id="destinations" className="py-24 bg-background relative">
        <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-primary/20 opacity-50 m-8"></div>
        <div className="absolute top-0 right-0 w-32 h-32 border-t-2 border-r-2 border-primary/20 opacity-50 m-8"></div>

        <div className="container mx-auto px-4 md:px-8 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-primary font-serif tracking-[0.2em] text-sm uppercase mb-4">
              {t("home.dest.kicker")}
            </h2>
            <h3 className="text-3xl md:text-5xl font-serif text-foreground mb-6">
              {t("home.dest.title")}
            </h3>
            <div className="w-16 h-[2px] bg-primary mx-auto"></div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[500px] bg-secondary/10 animate-pulse border border-primary/20"></div>
              ))}
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
                      <img
                        src={imageSrc}
                        alt={hotel.name}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-secondary/90 via-secondary/40 to-transparent transition-opacity duration-500 group-hover:opacity-80"></div>
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-8 flex flex-col items-center text-center transform transition-transform duration-500 group-hover:-translate-y-4">
                      <h4 className="text-2xl font-serif text-white mb-2">{hotel.name}</h4>
                      <div className="flex items-center gap-1 text-primary mb-4">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={14} fill="currentColor" />
                        ))}
                      </div>
                      <div className="flex items-center gap-2 text-white/80 text-sm mb-6">
                        <MapPin size={16} className="text-primary" />
                        <span>{hotel.city}</span>
                      </div>

                      <div className="h-0 opacity-0 group-hover:h-auto group-hover:opacity-100 overflow-hidden transition-all duration-500 flex flex-col items-center">
                        <div className="w-12 h-[1px] bg-primary mb-4"></div>
                        <p className="text-white/90 text-sm font-light mb-6 line-clamp-2">
                          {hotel.description}
                        </p>
                        <span className="inline-flex items-center text-primary text-sm uppercase tracking-widest font-medium group/btn">
                          {t("common.details")} <ChevronRight size={16} className="ml-1 transition-transform group-hover/btn:translate-x-1" />
                        </span>
                      </div>
                    </div>

                    <div className="absolute top-4 left-4 w-8 h-8 border-t border-l border-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="absolute bottom-4 right-4 w-8 h-8 border-b border-r border-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Experience Section */}
      <section className="py-24 bg-secondary text-secondary-foreground relative border-y border-primary/30">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="absolute -inset-4 border border-primary/20 z-0"></div>
              <img
                src="/images/restaurant.png"
                alt="Fine Dining"
                className="w-full h-auto aspect-[4/3] object-cover relative z-10 border border-primary/40 shadow-2xl"
              />
              <div className="absolute -bottom-8 -right-8 w-48 h-48 bg-primary/10 border border-primary/30 z-20 flex items-center justify-center p-6 text-center backdrop-blur-sm hidden md:flex">
                <p className="font-serif italic text-primary text-lg">{t("home.exp.quote")}</p>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <h2 className="text-primary font-serif tracking-[0.2em] text-sm uppercase mb-4">
                {t("home.exp.kicker")}
              </h2>
              <h3 className="text-3xl md:text-5xl font-serif text-white mb-6 leading-tight">
                {t("home.exp.title")}
              </h3>
              <div className="w-16 h-[2px] bg-primary mb-8"></div>
              <p className="text-white/70 text-lg font-light leading-relaxed mb-8">
                {t("home.exp.body")}
              </p>
              <ul className="space-y-4 mb-10">
                {[t("home.exp.item1"), t("home.exp.item2"), t("home.exp.item3"), t("home.exp.item4")].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-white/80">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                    <span className="font-light">{item}</span>
                  </li>
                ))}
              </ul>
              <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-none px-8 py-6 text-sm tracking-widest uppercase bg-transparent">
                {t("home.exp.cta")}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
