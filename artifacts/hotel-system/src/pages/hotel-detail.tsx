import { useRoute } from "wouter";
import { useGetHotel, useGetHotelSummary, useListHotelRooms } from "@workspace/api-client-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { MapPin, Star, Wifi, Coffee, Wind, Monitor, ChevronRight, Check, User } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useFormatPrice } from "@/lib/branding";

export default function HotelDetail() {
  const [, params] = useRoute("/hotels/:slug");
  const slug = params?.slug ?? "";
  const { t } = useT();
  const fmtPrice = useFormatPrice();

  const { data: hotel, isLoading: loadingHotel } = useGetHotel(slug as any);
  const { data: summary, isLoading: loadingSummary } = useGetHotelSummary(slug as any);
  const { data: rooms, isLoading: loadingRooms } = useListHotelRooms(slug as any);

  if (loadingHotel) {
    return (
      <PageLayout>
        <div className="h-screen flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </PageLayout>
    );
  }

  if (!hotel) {
    return (
      <PageLayout>
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-4xl font-serif text-foreground mb-4">{t("hotel.notFound.title")}</h1>
          <p className="text-muted-foreground mb-8">{t("hotel.notFound.body")}</p>
          <Button asChild className="bg-primary text-primary-foreground rounded-none px-8 py-6 uppercase tracking-widest">
            <Link href="/">{t("common.backHome")}</Link>
          </Button>
        </div>
      </PageLayout>
    );
  }

  let heroImage = "/images/hero.png";
  if (hotel.city.includes("Hà Nội") || hotel.city.includes("Ha Noi")) heroImage = "/images/hotel-hanoi.png";
  if (hotel.city.includes("Đà Nẵng") || hotel.city.includes("Da Nang")) heroImage = "/images/hotel-danang.png";
  if (hotel.city.includes("Hồ Chí Minh") || hotel.city.includes("Ho Chi Minh")) heroImage = "/images/hotel-hcmc.png";

  const amenityIcons: Record<string, any> = {
    "Wi-Fi": Wifi,
    "Restaurant": Coffee,
    "Air Conditioning": Wind,
    "TV": Monitor,
  };

  return (
    <PageLayout>
      <section className="relative h-[60vh] min-h-[500px] flex items-center justify-center">
        <div className="absolute inset-0">
          <img src={heroImage} alt={hotel.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-secondary/50"></div>
        </div>
        <div className="relative z-10 text-center px-4 mt-20">
          <div className="flex items-center justify-center gap-1 text-primary mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={16} fill="currentColor" />
            ))}
          </div>
          <h1 className="text-4xl md:text-6xl font-serif text-white mb-4 drop-shadow-lg">{hotel.name}</h1>
          <div className="flex items-center justify-center gap-2 text-white/90 font-light">
            <MapPin size={18} className="text-primary" />
            <span>{hotel.address}, {hotel.city}, {hotel.location}</span>
          </div>
        </div>
      </section>

      <section className="py-20 bg-background border-b border-primary/10">
        <div className="container mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            <div className="lg:col-span-2">
              <h2 className="text-primary font-serif tracking-[0.2em] text-sm uppercase mb-4">{t("hotel.intro.kicker")}</h2>
              <h3 className="text-3xl font-serif text-foreground mb-6">{t("hotel.intro.title")}</h3>
              <div className="w-12 h-[2px] bg-primary mb-8"></div>
              <p className="text-muted-foreground text-lg leading-relaxed font-light mb-8 whitespace-pre-line">
                {hotel.description}
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
                {hotel.amenities.map((amenity, idx) => {
                  const Icon = amenityIcons[amenity] || Check;
                  return (
                    <div key={idx} className="flex flex-col items-center text-center p-4 border border-primary/10 bg-secondary/5">
                      <Icon size={24} className="text-primary mb-3" />
                      <span className="text-sm font-medium text-foreground">{amenity}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="bg-secondary p-8 border border-primary/30 text-white relative">
                <div className="absolute -top-3 -right-3 w-6 h-6 border-t border-r border-primary"></div>
                <div className="absolute -bottom-3 -left-3 w-6 h-6 border-b border-l border-primary"></div>

                <h4 className="font-serif text-xl mb-6 border-b border-primary/20 pb-4">{t("hotel.book.title")}</h4>

                <div className="space-y-6">
                  <div>
                    <span className="text-white/60 text-sm block mb-1">{t("hotel.book.from")}</span>
                    <span className="text-primary text-3xl font-serif">${hotel.priceFrom}</span>
                    <span className="text-white/60 text-sm"> {t("hotel.book.perNight")}</span>
                  </div>

                  {!loadingSummary && summary && (
                    <>
                      <div className="flex justify-between items-center border-b border-primary/10 pb-4">
                        <span className="text-white/70 font-light">{t("hotel.book.available")}</span>
                        <span className="text-white font-medium">{summary.availableRooms} / {summary.totalRooms}</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-primary/10 pb-4">
                        <span className="text-white/70 font-light">{t("hotel.book.rating")}</span>
                        <span className="text-white font-medium flex items-center gap-1">
                          {summary.avgRating} <Star size={14} className="text-primary" fill="currentColor" />
                        </span>
                      </div>
                    </>
                  )}

                  <div className="pt-4">
                    <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-none py-6 tracking-widest uppercase">
                      <Link href={`/hotels/${hotel.id}/rooms`}>{t("hotel.book.viewRooms")}</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-background">
        <div className="container mx-auto px-4 md:px-8">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-primary font-serif tracking-[0.2em] text-sm uppercase mb-4">{t("hotel.rooms.kicker")}</h2>
              <h3 className="text-3xl md:text-4xl font-serif text-foreground">{t("hotel.rooms.title")}</h3>
            </div>
            <Link href={`/hotels/${hotel.id}/rooms`} className="hidden md:flex items-center text-primary text-sm uppercase tracking-widest font-medium hover:text-primary/80 transition-colors group">
              {t("hotel.rooms.viewAll")} <ChevronRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {loadingRooms ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="h-[400px] bg-secondary/5 animate-pulse border border-primary/10"></div>
              <div className="h-[400px] bg-secondary/5 animate-pulse border border-primary/10"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {rooms?.slice(0, 2).map((room) => (
                <div key={room.id} className="group border border-primary/20 flex flex-col md:flex-row bg-card text-card-foreground overflow-hidden">
                  <div className="w-full md:w-1/2 h-64 md:h-auto relative overflow-hidden">
                    <img
                      src={room.imageUrl || "/images/room-suite.png"}
                      alt={room.type}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="w-full md:w-1/2 p-8 flex flex-col justify-between">
                    <div>
                      <h4 className="font-serif text-2xl text-foreground mb-2">{room.type}</h4>
                      <p className="text-muted-foreground text-sm font-light mb-4 line-clamp-2">{room.description}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <User size={12} className="text-primary" /> {room.capacity} {t("common.guests")}
                        </span>
                        <span className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <Wind size={12} className="text-primary" /> {room.view}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-serif text-primary mb-4">{fmtPrice(room.pricePerNight)}<span className="text-sm text-muted-foreground font-sans">{t("common.perNight")}</span></div>
                      <Button asChild variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-none uppercase tracking-widest text-xs">
                        <Link href={`/rooms/${room.id}`}>{t("common.details")}</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 text-center md:hidden">
            <Button asChild variant="link" className="text-primary uppercase tracking-widest">
              <Link href={`/hotels/${hotel.id}/rooms`}>{t("hotel.rooms.viewAllMobile")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
