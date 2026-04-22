import { Link } from "wouter";
import { MapPin, Star, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HotelTemplateProps } from "./index";
import { HotelCustomHtml } from "./custom-html";

export function EditorialTemplate({ hotel, summary, rooms, loadingRooms, fmtPrice, t, heroImage }: HotelTemplateProps) {
  return (
    <>
      {/* Hero typography-first */}
      <section className="pt-40 pb-20 bg-background border-b border-foreground/10">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <div className="flex items-center gap-4 text-xs uppercase tracking-[0.5em] text-muted-foreground mb-10">
            <span className="font-serif text-primary">№ {String(hotel.id).padStart(2, "0")}</span>
            <span className="w-12 h-px bg-foreground/30" />
            <span>Editorial Issue</span>
            <span className="w-12 h-px bg-foreground/30" />
            <span>{hotel.city}</span>
          </div>
          <h1 className="font-serif text-[clamp(48px,8vw,120px)] leading-[0.95] text-foreground tracking-tight mb-10">
            {hotel.name}
          </h1>
          <div className="grid md:grid-cols-12 gap-10 items-end">
            <div className="md:col-span-7">
              <p className="text-foreground/75 text-xl leading-relaxed font-light whitespace-pre-line">{hotel.description}</p>
            </div>
            <div className="md:col-span-5 md:border-l md:border-foreground/15 md:pl-8 space-y-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-1">Địa điểm</div>
                <div className="text-foreground flex items-center gap-2"><MapPin size={14} className="text-primary" />{hotel.address}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-1">Đánh giá</div>
                <div className="text-foreground flex items-center gap-1"><Star size={14} className="text-primary" fill="currentColor" />{hotel.rating} / 5.0</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground mb-1">Khởi điểm</div>
                <div className="font-serif text-3xl text-primary">${hotel.priceFrom}<span className="text-xs text-muted-foreground font-sans"> / đêm</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Full-bleed image */}
      <section>
        <img src={heroImage} alt={hotel.name} className="w-full h-[70vh] object-cover" />
      </section>

      {/* Numbered chapter — Tiện nghi */}
      <section className="py-24 bg-background border-b border-foreground/10">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <div className="grid md:grid-cols-12 gap-10">
            <div className="md:col-span-3">
              <div className="font-serif text-7xl text-primary leading-none">01</div>
              <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground mt-3">Chương một</div>
            </div>
            <div className="md:col-span-9">
              <h2 className="font-serif text-4xl text-foreground mb-8">{t("hotel.intro.kicker")}</h2>
              <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
                {hotel.amenities.map((a: string, i: number) => (
                  <div key={i} className="flex items-baseline gap-3 py-3 border-b border-foreground/10">
                    <span className="text-[10px] text-primary font-mono">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-foreground font-light">{a}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Custom content chapter */}
      <section className="bg-background">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl pt-16">
          <div className="font-serif text-7xl text-primary leading-none">02</div>
          <div className="text-xs uppercase tracking-[0.4em] text-muted-foreground mt-3 mb-2">Chương hai — Câu chuyện riêng</div>
        </div>
        <HotelCustomHtml html={hotel.pageHtml} className="pt-6 pb-20 bg-background" />
      </section>

      {/* Rooms list — magazine style */}
      <section className="py-24 bg-foreground text-background">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <div className="grid md:grid-cols-12 gap-10 mb-12">
            <div className="md:col-span-3">
              <div className="font-serif text-7xl text-primary leading-none">03</div>
              <div className="text-xs uppercase tracking-[0.4em] text-background/60 mt-3">Chương ba</div>
            </div>
            <div className="md:col-span-9">
              <h2 className="font-serif text-4xl mb-2">{t("hotel.rooms.title")}</h2>
              {summary && <p className="text-background/60 text-sm">Còn trống {summary.availableRooms} / {summary.totalRooms} phòng</p>}
            </div>
          </div>
          {loadingRooms ? (
            <div className="space-y-px">
              {[0,1,2].map(i => <div key={i} className="h-28 bg-background/5 animate-pulse" />)}
            </div>
          ) : (
            <div className="divide-y divide-background/15 border-y border-background/15">
              {rooms?.slice(0, 4).map((room: any, idx: number) => (
                <Link key={room.id} href={`/rooms/${room.id}`}
                  className="group grid grid-cols-12 items-center gap-6 py-6 hover:bg-background/5 transition-colors px-2">
                  <div className="col-span-1 font-mono text-xs text-primary">{String(idx + 1).padStart(2, "0")}</div>
                  <div className="col-span-2"><img src={room.imageUrl || "/images/room-suite.png"} alt={room.type} className="w-full h-16 object-cover" /></div>
                  <div className="col-span-5">
                    <div className="font-serif text-2xl">{room.type}</div>
                    <div className="text-background/60 text-sm font-light line-clamp-1">{room.description}</div>
                  </div>
                  <div className="col-span-3 font-serif text-xl text-primary text-right">{fmtPrice(room.pricePerNight)}</div>
                  <div className="col-span-1 flex justify-end">
                    <ArrowUpRight size={20} className="text-primary transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </div>
                </Link>
              ))}
            </div>
          )}
          <div className="text-center mt-12">
            <Button asChild className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 px-10 py-6 uppercase tracking-widest text-xs">
              <Link href={`/hotels/${hotel.id}/rooms`}>{t("hotel.book.viewRooms")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
