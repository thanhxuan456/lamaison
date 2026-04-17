import { useRoute, Link } from "wouter";
import { useGetHotel, useListHotelRooms } from "@workspace/api-client-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import {
  User, Wind, Maximize, ArrowRight, Crown, Sparkles, Filter,
  ChevronRight, Star, BedDouble, Wifi, Coffee,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { useMemo, useState } from "react";

type Sort = "featured" | "priceAsc" | "priceDesc" | "capacity";

export default function RoomListing() {
  const [, params] = useRoute("/hotels/:id/rooms");
  const hotelId = params?.id ? parseInt(params.id) : 0;
  const { t } = useT();

  const { data: hotel, isLoading: loadingHotel } = useGetHotel(hotelId);
  const { data: rooms, isLoading: loadingRooms } = useListHotelRooms(hotelId);

  const [capacity, setCapacity] = useState<number | null>(null);
  const [sort, setSort] = useState<Sort>("featured");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const filtered = useMemo(() => {
    let list = (rooms ?? []).slice();
    if (capacity) list = list.filter((r) => r.capacity >= capacity);
    if (onlyAvailable) list = list.filter((r) => r.isAvailable);
    switch (sort) {
      case "priceAsc": list.sort((a, b) => a.pricePerNight - b.pricePerNight); break;
      case "priceDesc": list.sort((a, b) => b.pricePerNight - a.pricePerNight); break;
      case "capacity": list.sort((a, b) => b.capacity - a.capacity); break;
    }
    return list;
  }, [rooms, capacity, sort, onlyAvailable]);

  if (loadingHotel || loadingRooms) {
    return (
      <PageLayout>
        <div className="h-[60vh] flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </PageLayout>
    );
  }

  if (!hotel) return null;

  const minPrice = rooms?.length ? Math.min(...rooms.map((r) => r.pricePerNight)) : 0;
  const maxCap = rooms?.length ? Math.max(...rooms.map((r) => r.capacity)) : 0;

  return (
    <PageLayout>
      {/* HERO — full-bleed cinematic */}
      <section className="relative pt-32 pb-24 overflow-hidden bg-secondary">
        <div className="absolute inset-0 opacity-30">
          <img
            src={hotel.imageUrl || "/images/room-suite.png"}
            alt={hotel.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/70 to-transparent" />
        </div>

        {/* Decorative ornaments */}
        <div aria-hidden className="absolute top-8 left-8 w-24 h-24 border-l border-t border-primary/40" />
        <div aria-hidden className="absolute top-8 right-8 w-24 h-24 border-r border-t border-primary/40" />
        <div aria-hidden className="absolute bottom-8 left-8 w-24 h-24 border-l border-b border-primary/40" />
        <div aria-hidden className="absolute bottom-8 right-8 w-24 h-24 border-r border-b border-primary/40" />

        <div className="relative container mx-auto px-4 md:px-8 text-center">
          <div className="inline-flex items-center gap-3 mb-5">
            <span className="w-10 h-px bg-primary" />
            <Crown size={16} className="text-primary" />
            <span className="text-primary text-[10px] tracking-[0.4em] uppercase font-light">
              {hotel.name}
            </span>
            <Crown size={16} className="text-primary" />
            <span className="w-10 h-px bg-primary" />
          </div>
          <h1 className="text-5xl md:text-7xl font-serif text-white mb-6 leading-tight">
            {t("rooms.title")}
          </h1>
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="w-12 h-px bg-primary/60" />
            <span className="w-1.5 h-1.5 rotate-45 bg-primary" />
            <span className="w-20 h-px bg-primary" />
            <span className="w-1.5 h-1.5 rotate-45 bg-primary" />
            <span className="w-12 h-px bg-primary/60" />
          </div>
          <p className="text-white/70 font-light max-w-2xl mx-auto leading-relaxed">
            {t("rooms.subtitle")}
          </p>

          {/* Stat ribbon */}
          <div className="mt-12 inline-flex flex-wrap justify-center divide-x divide-primary/30 border border-primary/30 bg-secondary/40 backdrop-blur-sm">
            <Stat label="Phòng có sẵn" value={String((rooms ?? []).filter((r) => r.isAvailable).length)} />
            <Stat label="Tổng phòng" value={String(rooms?.length ?? 0)} />
            <Stat label="Giá từ" value={`$${minPrice}`} sub="/đêm" />
            <Stat label="Sức chứa tối đa" value={`${maxCap}`} sub="khách" />
          </div>
        </div>
      </section>

      {/* FILTER BAR */}
      <section className="sticky top-20 z-20 bg-background/95 backdrop-blur-md border-b border-primary/15 shadow-sm">
        <div className="container mx-auto px-4 md:px-8 py-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-primary">
            <Filter size={14} />
            <span className="text-[11px] tracking-[0.3em] uppercase font-medium">Tinh chỉnh</span>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <FilterChip active={capacity === null} onClick={() => setCapacity(null)}>Tất cả khách</FilterChip>
            <FilterChip active={capacity === 1} onClick={() => setCapacity(1)}>1+</FilterChip>
            <FilterChip active={capacity === 2} onClick={() => setCapacity(2)}>2+</FilterChip>
            <FilterChip active={capacity === 4} onClick={() => setCapacity(4)}>4+</FilterChip>
          </div>

          <div className="h-6 w-px bg-primary/20 mx-1 hidden md:block" />

          <FilterChip active={onlyAvailable} onClick={() => setOnlyAvailable((v) => !v)}>
            <span className="inline-flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${onlyAvailable ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
              Còn phòng
            </span>
          </FilterChip>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] tracking-widest uppercase text-muted-foreground">Sắp xếp</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="bg-transparent border border-primary/25 text-foreground text-xs uppercase tracking-widest px-3 py-1.5 focus:border-primary focus:outline-none cursor-pointer"
            >
              <option value="featured">Nổi bật</option>
              <option value="priceAsc">Giá ↑</option>
              <option value="priceDesc">Giá ↓</option>
              <option value="capacity">Sức chứa</option>
            </select>
          </div>
        </div>
      </section>

      {/* ROOM CARDS */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          {filtered.length === 0 ? (
            <div className="text-center py-24 border border-dashed border-primary/30">
              <Sparkles className="mx-auto text-primary mb-3" size={32} />
              <p className="text-muted-foreground">Không có phòng phù hợp với bộ lọc.</p>
              <button onClick={() => { setCapacity(null); setOnlyAvailable(false); }}
                className="mt-4 text-primary text-xs uppercase tracking-widest underline">Đặt lại bộ lọc</button>
            </div>
          ) : (
            <div className="space-y-20">
              {filtered.map((room, index) => {
                const reverse = index % 2 !== 0;
                return (
                  <article key={room.id} className="group relative">
                    {/* Index badge */}
                    <div className={`absolute top-0 ${reverse ? "right-0" : "left-0"} z-10 -mt-3 ${reverse ? "-mr-3" : "-ml-3"}`}>
                      <div className="bg-secondary text-primary border border-primary px-3 py-1 text-[10px] tracking-[0.3em] uppercase font-serif">
                        {String(index + 1).padStart(2, "0")}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-0 items-stretch border border-primary/15 bg-card hover:border-primary/40 transition-colors duration-500">
                      {/* IMAGE */}
                      <div className={`md:col-span-7 relative overflow-hidden ${reverse ? "md:order-2" : ""}`}>
                        <div className="aspect-[4/3] md:aspect-auto md:h-full w-full">
                          <img
                            src={room.imageUrl || "/images/room-suite.png"}
                            alt={room.type}
                            className="w-full h-full object-cover transition-transform duration-[2000ms] ease-out group-hover:scale-110"
                          />
                        </div>
                        {/* Image overlay corners */}
                        <div className="absolute inset-3 border border-white/0 group-hover:border-white/30 transition-colors duration-500 pointer-events-none" />

                        {/* Floating price tag */}
                        <div className={`absolute bottom-4 ${reverse ? "right-4" : "left-4"} bg-secondary/95 backdrop-blur text-primary px-4 py-3 border border-primary/40`}>
                          <div className="text-[9px] tracking-[0.3em] uppercase text-white/60">Từ</div>
                          <div className="font-serif text-2xl">${room.pricePerNight}<span className="text-xs text-white/50">/đêm</span></div>
                        </div>

                        {/* Status badge */}
                        {!room.isAvailable ? (
                          <div className="absolute top-4 right-4 bg-secondary/95 backdrop-blur text-white text-[10px] px-3 py-1.5 uppercase tracking-[0.25em] font-medium border border-destructive/60">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                              {t("rooms.soldOut")}
                            </span>
                          </div>
                        ) : (
                          <div className="absolute top-4 right-4 bg-emerald-500/15 backdrop-blur text-emerald-300 text-[10px] px-3 py-1.5 uppercase tracking-[0.25em] font-medium border border-emerald-500/30">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Còn phòng
                            </span>
                          </div>
                        )}

                        {/* Rating */}
                        <div className="absolute top-4 left-4 flex items-center gap-1 bg-secondary/80 backdrop-blur px-2 py-1 border border-primary/30">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={10} className="fill-primary text-primary" />
                          ))}
                        </div>
                      </div>

                      {/* CONTENT */}
                      <div className={`md:col-span-5 flex flex-col justify-between p-8 md:p-10 ${reverse ? "md:order-1" : ""}`}>
                        <div>
                          <div className="text-[10px] tracking-[0.3em] uppercase text-primary mb-3 font-serif">
                            Phòng {room.roomNumber} · {t("rooms.floor")} {room.floor}
                          </div>
                          <h3 className="text-3xl font-serif text-foreground mb-3 leading-tight">
                            {room.type}
                          </h3>
                          <div className="flex items-center gap-2 mb-5">
                            <span className="w-8 h-px bg-primary" />
                            <span className="w-1 h-1 rotate-45 bg-primary" />
                            <span className="w-12 h-px bg-primary/40" />
                          </div>

                          {/* Quick specs */}
                          <div className="grid grid-cols-3 gap-2 mb-6">
                            <Spec icon={<User size={14} />} label={`${room.capacity} khách`} />
                            <Spec icon={<Wind size={14} />} label={room.view} />
                            <Spec icon={<Maximize size={14} />} label={`Tầng ${room.floor}`} />
                          </div>

                          <p className="text-muted-foreground font-light leading-relaxed mb-6 line-clamp-3 text-sm">
                            {room.description}
                          </p>

                          {/* Amenity preview chips */}
                          {room.amenities?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mb-6">
                              {room.amenities.slice(0, 4).map((a, i) => (
                                <span key={i} className="text-[10px] tracking-wider uppercase border border-primary/25 text-muted-foreground px-2 py-1 bg-primary/5">
                                  {a}
                                </span>
                              ))}
                              {room.amenities.length > 4 && (
                                <span className="text-[10px] tracking-wider uppercase border border-primary/40 text-primary px-2 py-1">
                                  +{room.amenities.length - 4}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action footer */}
                        <div className="flex items-center justify-between gap-3 pt-5 border-t border-primary/15">
                          <div className="flex gap-3 text-muted-foreground">
                            <Wifi size={13} />
                            <BedDouble size={13} />
                            <Coffee size={13} />
                          </div>
                          <Button asChild
                            className="rounded-none bg-secondary text-primary hover:bg-primary hover:text-primary-foreground border border-primary/40 px-5 py-5 uppercase tracking-[0.2em] text-[10px] transition-all group/btn">
                            <Link href={`/rooms/${room.id}`} className="flex items-center gap-2">
                              {t("common.details")}
                              <ChevronRight size={14} className="transition-transform group-hover/btn:translate-x-1" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="px-6 py-4 text-left">
      <div className="text-[9px] tracking-[0.3em] uppercase text-primary/70">{label}</div>
      <div className="font-serif text-2xl text-white mt-1">
        {value}
        {sub && <span className="text-[10px] text-white/50 ml-1 tracking-widest uppercase">{sub}</span>}
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`text-[11px] tracking-widest uppercase px-3 py-1.5 border transition-all ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-primary/25 text-muted-foreground hover:border-primary/60 hover:text-foreground"
      }`}>
      {children}
    </button>
  );
}

function Spec({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-primary/5 border border-primary/15 px-2 py-2">
      <span className="text-primary">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}
