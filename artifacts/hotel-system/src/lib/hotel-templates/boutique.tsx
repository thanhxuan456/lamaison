import { Link } from "wouter";
import { MapPin, Star, Check, Heart, Coffee, Wifi, Wind, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HotelTemplateProps } from "./index";
import { HotelCustomHtml } from "./custom-html";

const amenityIcons: Record<string, any> = {
  "Wi-Fi": Wifi, "Restaurant": Coffee, "Air Conditioning": Wind,
};

export function BoutiqueTemplate({ hotel, summary, rooms, loadingRooms, fmtPrice, t, heroImage }: HotelTemplateProps) {
  return (
    <>
      {/* Hero asymmetric */}
      <section className="relative bg-[#f7efe1] dark:bg-secondary pt-32 pb-16">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5 lg:order-2 relative">
              <img src={heroImage} alt={hotel.name} className="w-full h-[460px] object-cover rounded-tl-[120px] rounded-br-[120px] shadow-2xl" />
              <div className="absolute -bottom-6 -left-6 bg-primary text-primary-foreground p-4 rounded-full w-24 h-24 flex flex-col items-center justify-center text-center shadow-xl">
                <Star size={14} fill="currentColor" />
                <div className="font-serif text-lg leading-none mt-1">{hotel.rating}</div>
                <div className="text-[9px] tracking-widest uppercase mt-0.5">Sao</div>
              </div>
            </div>
            <div className="lg:col-span-7 lg:order-1">
              <div className="flex items-center gap-2 text-primary mb-4">
                <Heart size={14} fill="currentColor" />
                <span className="text-xs uppercase tracking-[0.4em] font-serif">Boutique Collection</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-serif text-foreground mb-6 leading-tight">{hotel.name}</h1>
              <div className="flex items-center gap-2 text-muted-foreground mb-6">
                <MapPin size={16} className="text-primary" />
                <span className="font-light">{hotel.address}, {hotel.city}</span>
              </div>
              <p className="text-foreground/80 text-lg leading-relaxed font-light max-w-xl whitespace-pre-line">{hotel.description}</p>
              <div className="flex flex-wrap gap-3 mt-8">
                <Button asChild className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 uppercase tracking-widest text-xs">
                  <Link href={`/hotels/${hotel.id}/rooms`}>{t("hotel.book.viewRooms")}</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full border-primary/40 text-primary px-8 py-6 uppercase tracking-widest text-xs">
                  <a href="#noi-dung">Khám phá</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Amenities pill row */}
      <section className="py-10 bg-background border-b border-primary/10">
        <div className="container mx-auto px-4 md:px-8 flex flex-wrap items-center justify-center gap-3">
          {hotel.amenities.map((a: string, i: number) => {
            const Icon = amenityIcons[a] || Check;
            return (
              <span key={i} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/5 border border-primary/15 text-sm text-foreground">
                <Icon size={14} className="text-primary" /> {a}
              </span>
            );
          })}
        </div>
      </section>

      <div id="noi-dung" />
      <HotelCustomHtml html={hotel.pageHtml} className="py-16 bg-[#fdf9f0] dark:bg-secondary/40" />

      {/* Rooms cards rounded */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 md:px-8">
          <div className="text-center mb-12">
            <div className="text-xs uppercase tracking-[0.4em] text-primary font-serif mb-3">{t("hotel.rooms.kicker")}</div>
            <h2 className="text-4xl font-serif text-foreground">{t("hotel.rooms.title")}</h2>
          </div>
          {loadingRooms ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[0,1,2].map(i => <div key={i} className="h-80 bg-secondary/5 animate-pulse rounded-3xl" />)}
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {rooms?.slice(0, 3).map((room: any) => (
                <div key={room.id} className="group rounded-3xl overflow-hidden bg-card border border-primary/15 hover:shadow-xl transition-shadow">
                  <div className="h-56 overflow-hidden">
                    <img src={room.imageUrl || "/images/room-suite.png"} alt={room.type} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                  <div className="p-6">
                    <h3 className="font-serif text-xl text-foreground mb-2">{room.type}</h3>
                    <p className="text-muted-foreground text-sm font-light line-clamp-2 mb-4">{room.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="text-primary font-serif text-xl">{fmtPrice(room.pricePerNight)}</div>
                      <Link href={`/rooms/${room.id}`} className="text-xs uppercase tracking-widest text-primary inline-flex items-center gap-1 hover:gap-2 transition-all">
                        Chi tiết <ChevronRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {summary && (
            <div className="mt-12 text-center text-sm text-muted-foreground">
              Còn trống <span className="text-primary font-serif text-lg">{summary.availableRooms}</span> / {summary.totalRooms} phòng
            </div>
          )}
        </div>
      </section>
    </>
  );
}
