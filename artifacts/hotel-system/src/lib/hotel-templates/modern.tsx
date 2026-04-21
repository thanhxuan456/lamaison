import { useState } from "react";
import { Link } from "wouter";
import { MapPin, Star, Check, Phone, Mail, User, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HotelTemplateProps } from "./index";

export function ModernTemplate({ hotel, summary, rooms, loadingRooms, fmtPrice, t, heroImage }: HotelTemplateProps) {
  const [tab, setTab] = useState<"overview" | "amenities" | "rooms">("overview");

  return (
    <>
      {/* Hero compact */}
      <section className="relative h-[40vh] min-h-[320px] flex items-end">
        <img src={heroImage} alt={hotel.name} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/40 to-transparent"></div>
        <div className="relative z-10 container mx-auto px-4 md:px-8 pb-10 text-white">
          <div className="flex items-center gap-1 text-primary mb-3">
            {[...Array(5)].map((_, i) => (<Star key={i} size={14} fill="currentColor" />))}
          </div>
          <h1 className="font-serif text-4xl md:text-5xl mb-2 drop-shadow-lg">{hotel.name}</h1>
          <div className="flex items-center gap-2 text-white/80 text-sm">
            <MapPin size={14} className="text-primary" />
            <span>{hotel.address}, {hotel.city}</span>
          </div>
        </div>
      </section>

      {/* Sticky info bar */}
      <section className="sticky top-16 z-30 bg-background/95 backdrop-blur border-b border-primary/10">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-6 text-sm">
              {summary && (
                <>
                  <span className="text-foreground"><b className="text-primary">{summary.availableRooms}</b>/{summary.totalRooms} {t("hotel.book.available")}</span>
                  <span className="text-foreground">{t("hotel.book.from")} <b className="text-primary text-lg font-serif">${hotel.priceFrom}</b></span>
                </>
              )}
            </div>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none px-8 uppercase tracking-widest text-xs">
              <Link href={`/hotels/${hotel.id}/rooms`}>{t("hotel.book.viewRooms")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex border-b border-primary/20 mb-12">
            {([
              { k: "overview" as const, label: t("hotel.intro.kicker") },
              { k: "amenities" as const, label: "Tiện nghi" },
              { k: "rooms" as const, label: t("hotel.rooms.kicker") },
            ]).map(it => (
              <button key={it.k} onClick={() => setTab(it.k)}
                className={`px-6 py-3 text-sm uppercase tracking-widest font-medium transition-colors border-b-2 -mb-[2px] ${tab===it.k ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}>
                {it.label}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div className="max-w-3xl">
              <h3 className="text-3xl font-serif text-foreground mb-6">{t("hotel.intro.title")}</h3>
              <p className="text-muted-foreground text-lg leading-relaxed font-light whitespace-pre-line mb-8">{hotel.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-8 border-t border-primary/10">
                <div className="flex items-center gap-3 text-foreground"><Phone size={16} className="text-primary" /> {hotel.phone}</div>
                <div className="flex items-center gap-3 text-foreground"><Mail size={16} className="text-primary" /> {hotel.email}</div>
              </div>
            </div>
          )}

          {tab === "amenities" && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {hotel.amenities.map((a: string, i: number) => (
                <div key={i} className="flex items-center gap-3 p-4 border border-primary/10 hover:border-primary/40 transition-colors bg-secondary/5">
                  <Check size={18} className="text-primary flex-shrink-0" />
                  <span className="text-foreground text-sm">{a}</span>
                </div>
              ))}
            </div>
          )}

          {tab === "rooms" && (
            loadingRooms ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1,2,3].map(i => <div key={i} className="h-[320px] bg-secondary/5 animate-pulse"></div>)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rooms?.slice(0, 6).map((room: any) => (
                  <div key={room.id} className="group bg-card border border-primary/10 hover:border-primary/40 transition-all flex flex-col overflow-hidden">
                    <div className="aspect-[4/3] overflow-hidden">
                      <img src={room.imageUrl || "/images/room-suite.png"} alt={room.type} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <h4 className="font-serif text-xl text-foreground mb-2">{room.type}</h4>
                      <p className="text-muted-foreground text-sm font-light line-clamp-2 mb-4 flex-1">{room.description}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                        <span className="flex items-center gap-1"><User size={12} className="text-primary" /> {room.capacity}</span>
                        <span className="flex items-center gap-1"><Wind size={12} className="text-primary" /> {room.view}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-primary text-lg font-serif">{fmtPrice(room.pricePerNight)}</span>
                        <Link href={`/rooms/${room.id}`} className="text-xs text-primary uppercase tracking-widest hover:underline">{t("common.details")} →</Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </section>

      {/* CTA banner cuối */}
      <section className="py-16 bg-secondary text-white">
        <div className="container mx-auto px-4 text-center">
          <h3 className="font-serif text-3xl mb-4">{t("hotel.book.title")}</h3>
          <p className="text-white/70 mb-8 max-w-xl mx-auto font-light">{hotel.name} — {hotel.city}</p>
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-none px-12 py-6 uppercase tracking-widest">
            <Link href={`/hotels/${hotel.id}/rooms`}>{t("hotel.book.viewRooms")}</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
