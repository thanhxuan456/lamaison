import { Link } from "wouter";
import { MapPin, Star, Check, Quote, ChevronRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HotelTemplateProps } from "./index";

export function MagazineTemplate({ hotel, summary, rooms, loadingRooms, fmtPrice, t, heroImage }: HotelTemplateProps) {
  return (
    <>
      {/* Hero ảnh full-bleed lệch phải, info trái */}
      <section className="relative bg-secondary text-white">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[80vh]">
          <div className="lg:col-span-5 flex flex-col justify-center px-8 lg:px-16 py-20 lg:py-0 z-10">
            <span className="text-primary text-xs uppercase tracking-[0.3em] mb-4">{hotel.city} · {hotel.location}</span>
            <h1 className="font-serif text-5xl lg:text-6xl leading-tight mb-6">{hotel.name}</h1>
            <div className="flex items-center gap-1 text-primary mb-8">
              {[...Array(5)].map((_, i) => (<Star key={i} size={14} fill="currentColor" />))}
              {summary && <span className="text-white/60 text-sm ml-3">{summary.avgRating}/5 · {summary.availableRooms}/{summary.totalRooms} {t("hotel.book.available")}</span>}
            </div>
            <p className="text-white/70 font-light text-lg leading-relaxed mb-8 line-clamp-4">{hotel.description}</p>
            <div className="flex items-center gap-6">
              <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none px-8 py-6 uppercase tracking-widest">
                <Link href={`/hotels/${hotel.id}/rooms`}>{t("hotel.book.viewRooms")}</Link>
              </Button>
              <div className="text-sm">
                <div className="text-white/50">{t("hotel.book.from")}</div>
                <div className="text-primary text-2xl font-serif">${hotel.priceFrom}</div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-7 relative min-h-[400px] lg:min-h-0">
            <img src={heroImage} alt={hotel.name} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute bottom-8 right-8 bg-background/90 backdrop-blur px-6 py-4 max-w-xs">
              <MapPin size={16} className="text-primary inline mr-2" />
              <span className="text-foreground text-sm">{hotel.address}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quote nổi bật */}
      <section className="py-24 bg-background">
        <div className="container mx-auto max-w-4xl px-8 text-center">
          <Quote size={48} className="text-primary mx-auto mb-6 opacity-50" />
          <p className="font-serif italic text-2xl md:text-3xl text-foreground leading-snug mb-6">
            {hotel.description.split(".").slice(0, 1).join(".")}.
          </p>
          <div className="w-16 h-[2px] bg-primary mx-auto"></div>
        </div>
      </section>

      {/* Tiện nghi full-width strip */}
      <section className="py-16 bg-secondary/5 border-y border-primary/10">
        <div className="container mx-auto px-4">
          <h2 className="text-primary font-serif tracking-[0.3em] text-xs uppercase text-center mb-12">{t("hotel.intro.kicker")}</h2>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            {hotel.amenities.map((a: string, i: number) => (
              <div key={i} className="flex items-center gap-3 text-foreground">
                <Check size={18} className="text-primary" />
                <span className="font-light">{a}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rooms dạng tạp chí — alternating */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-primary font-serif tracking-[0.2em] text-sm uppercase mb-4">{t("hotel.rooms.kicker")}</h2>
            <h3 className="text-4xl font-serif text-foreground">{t("hotel.rooms.title")}</h3>
          </div>
          {loadingRooms ? (
            <div className="space-y-12">
              {[1,2].map(i => <div key={i} className="h-[300px] bg-secondary/5 animate-pulse"></div>)}
            </div>
          ) : (
            <div className="space-y-16 max-w-5xl mx-auto">
              {rooms?.slice(0, 3).map((room: any, idx: number) => (
                <div key={room.id} className={`grid grid-cols-1 md:grid-cols-2 gap-8 items-center ${idx % 2 === 1 ? "md:[direction:rtl]" : ""}`}>
                  <div className="overflow-hidden md:[direction:ltr]">
                    <img src={room.imageUrl || "/images/room-suite.png"} alt={room.type} className="w-full h-[350px] object-cover hover:scale-105 transition-transform duration-700" />
                  </div>
                  <div className="md:[direction:ltr] px-2">
                    <div className="text-primary text-xs uppercase tracking-[0.3em] mb-2">Suite #{String(idx+1).padStart(2,"0")}</div>
                    <h4 className="font-serif text-3xl text-foreground mb-4">{room.type}</h4>
                    <p className="text-muted-foreground font-light leading-relaxed mb-6 line-clamp-3">{room.description}</p>
                    <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><User size={12} className="text-primary" /> {room.capacity} {t("common.guests")}</span>
                      <span className="text-primary font-serif text-xl">{fmtPrice(room.pricePerNight)}</span>
                    </div>
                    <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-none uppercase tracking-widest text-xs px-8">
                      <Link href={`/rooms/${room.id}`}>{t("common.details")} <ChevronRight size={14} className="ml-2" /></Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
