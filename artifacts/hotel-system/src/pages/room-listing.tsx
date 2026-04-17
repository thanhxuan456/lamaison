import { useRoute } from "wouter";
import { useGetHotel, useListHotelRooms } from "@workspace/api-client-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { User, Wind, Maximize, ArrowRight } from "lucide-react";
import { useT } from "@/lib/i18n";

export default function RoomListing() {
  const [, params] = useRoute("/hotels/:id/rooms");
  const hotelId = params?.id ? parseInt(params.id) : 0;
  const { t } = useT();

  const { data: hotel, isLoading: loadingHotel } = useGetHotel(hotelId);
  const { data: rooms, isLoading: loadingRooms } = useListHotelRooms(hotelId);

  if (loadingHotel || loadingRooms) {
    return (
      <PageLayout>
        <div className="h-[60vh] flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </PageLayout>
    );
  }

  if (!hotel) return null;

  return (
    <PageLayout>
      <section className="bg-secondary pt-32 pb-16 border-b border-primary/20">
        <div className="container mx-auto px-4 md:px-8 text-center">
          <h2 className="text-primary font-serif tracking-[0.2em] text-sm uppercase mb-4">{hotel.name}</h2>
          <h1 className="text-4xl md:text-5xl font-serif text-white mb-6">{t("rooms.title")}</h1>
          <div className="w-16 h-[2px] bg-primary mx-auto mb-6"></div>
          <p className="text-white/70 font-light max-w-2xl mx-auto">{t("rooms.subtitle")}</p>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 md:px-8 max-w-5xl">
          <div className="space-y-16">
            {rooms?.map((room, index) => (
              <div key={room.id} className="flex flex-col md:flex-row gap-8 items-stretch group">
                <div className={`w-full md:w-1/2 relative overflow-hidden border border-primary/20 ${index % 2 !== 0 ? 'md:order-2' : ''}`}>
                  <div className="aspect-[4/3] w-full">
                    <img
                      src={room.imageUrl || "/images/room-suite.png"}
                      alt={room.type}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    />
                  </div>
                  {!room.isAvailable && (
                    <div className="absolute top-4 right-4 bg-secondary text-white text-xs px-3 py-1 uppercase tracking-widest font-medium border border-primary/50">
                      {t("rooms.soldOut")}
                    </div>
                  )}
                </div>

                <div className={`w-full md:w-1/2 flex flex-col justify-center py-4 ${index % 2 !== 0 ? 'md:order-1 items-end text-right' : 'items-start text-left'}`}>
                  <h3 className="text-3xl font-serif text-foreground mb-4">{room.type}</h3>
                  <div className={`flex flex-wrap gap-4 text-sm text-muted-foreground uppercase tracking-widest mb-6 ${index % 2 !== 0 ? 'justify-end' : 'justify-start'}`}>
                    <span className="flex items-center gap-1"><User size={14} className="text-primary"/> {room.capacity} {t("common.guests")}</span>
                    <span className="flex items-center gap-1"><Wind size={14} className="text-primary"/> {room.view}</span>
                    <span className="flex items-center gap-1"><Maximize size={14} className="text-primary"/> {t("rooms.floor")} {room.floor}</span>
                  </div>

                  <p className="text-muted-foreground font-light leading-relaxed mb-8 line-clamp-3">
                    {room.description}
                  </p>

                  <div className="text-3xl font-serif text-primary mb-8">
                    ${room.pricePerNight}<span className="text-sm font-sans text-muted-foreground">{t("common.perNight")}</span>
                  </div>

                  <Button asChild className="bg-secondary text-primary hover:bg-secondary/90 rounded-none px-8 py-6 uppercase tracking-widest text-xs border border-primary/30">
                    <Link href={`/rooms/${room.id}`} className="flex items-center gap-2">
                      {t("common.details")} <ArrowRight size={16} />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
