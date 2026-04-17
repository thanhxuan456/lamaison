import { useRoute, useLocation } from "wouter";
import { useGetRoom, useGetHotel, useCreateBooking } from "@workspace/api-client-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Check, User, Wind, Maximize } from "lucide-react";
import { useT } from "@/lib/i18n";

export default function RoomDetail() {
  const [, params] = useRoute("/rooms/:id");
  const roomId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { t } = useT();

  const { data: room, isLoading: loadingRoom } = useGetRoom(roomId);
  const hotelId = room?.hotelId || 0;
  const { data: hotel, isLoading: loadingHotel } = useGetHotel(hotelId, { query: { enabled: !!hotelId } });

  const createBooking = useCreateBooking();

  const [bookingData, setBookingData] = useState({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    checkInDate: "",
    checkOutDate: "",
    numberOfGuests: 1,
    specialRequests: ""
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBookingData(prev => ({
      ...prev,
      [name]: name === "numberOfGuests" ? parseInt(value) || 1 : value
    }));
  };

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;

    if (!bookingData.checkInDate || !bookingData.checkOutDate) {
      toast({
        title: t("toast.error"),
        description: t("toast.dateRequired"),
        variant: "destructive"
      });
      return;
    }

    createBooking.mutate({
      data: { roomId: room.id, ...bookingData }
    }, {
      onSuccess: (data) => {
        toast({ title: t("toast.success"), description: t("toast.bookingSuccess") });
        setLocation(`/bookings/${data.id}`);
      },
      onError: () => {
        toast({ title: t("toast.error"), description: t("toast.bookingError"), variant: "destructive" });
      }
    });
  };

  if (loadingRoom || loadingHotel) {
    return (
      <PageLayout>
        <div className="h-screen flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </PageLayout>
    );
  }

  if (!room || !hotel) return null;

  return (
    <PageLayout>
      <div className="pt-24 pb-20 bg-background">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl">
          <div className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-8 flex gap-2">
            <span className="cursor-pointer hover:text-primary" onClick={() => setLocation('/')}>{t("room.breadcrumb.home")}</span>
            <span>/</span>
            <span className="cursor-pointer hover:text-primary" onClick={() => setLocation(`/hotels/${hotel.id}`)}>{hotel.name}</span>
            <span>/</span>
            <span className="text-primary">{room.type}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
            <div className="lg:col-span-2 space-y-12">
              <div className="border border-primary/20 relative aspect-[16/10] overflow-hidden">
                <img src={room.imageUrl || "/images/room-suite.png"} alt={room.type} className="w-full h-full object-cover" />
              </div>

              <div>
                <div className="flex justify-between items-end mb-6 border-b border-primary/20 pb-6">
                  <div>
                    <h1 className="text-4xl font-serif text-foreground mb-2">{room.type}</h1>
                    <p className="text-lg text-primary font-serif">{t("room.room")} {room.roomNumber}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-serif text-foreground">${room.pricePerNight}</div>
                    <div className="text-sm text-muted-foreground uppercase tracking-widest">{t("room.perNight")}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-8 py-6 border-b border-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-primary flex items-center justify-center bg-secondary/5">
                      <User size={18} className="text-primary" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("room.capacity")}</div>
                      <div className="font-medium text-foreground">{room.capacity} {t("common.guests")}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-primary flex items-center justify-center bg-secondary/5">
                      <Wind size={18} className="text-primary" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("room.view")}</div>
                      <div className="font-medium text-foreground">{room.view}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-primary flex items-center justify-center bg-secondary/5">
                      <Maximize size={18} className="text-primary" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("room.floor")}</div>
                      <div className="font-medium text-foreground">{room.floor}</div>
                    </div>
                  </div>
                </div>

                <div className="py-8">
                  <h3 className="font-serif text-2xl text-foreground mb-4">{t("room.detailsTitle")}</h3>
                  <p className="text-muted-foreground leading-relaxed font-light whitespace-pre-line mb-8">
                    {room.description}
                  </p>

                  <h4 className="font-serif text-xl text-foreground mb-6">{t("room.amenitiesTitle")}</h4>
                  <ul className="grid grid-cols-2 gap-y-4">
                    {room.amenities.map((amenity, i) => (
                      <li key={i} className="flex items-center gap-3 text-foreground/80">
                        <Check size={16} className="text-primary" />
                        <span className="font-light">{amenity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <div className="bg-secondary text-secondary-foreground p-8 border border-primary sticky top-32 shadow-2xl">
                <h3 className="font-serif text-2xl text-white mb-6 border-b border-primary/20 pb-4">{t("room.book.title")}</h3>

                {!room.isAvailable ? (
                  <div className="bg-destructive/10 text-destructive border border-destructive/30 p-4 text-center">
                    {t("room.book.unavailable")}
                  </div>
                ) : (
                  <form onSubmit={handleBooking} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="guestName" className="text-white/80 uppercase tracking-widest text-xs">{t("room.book.name")}</Label>
                      <Input id="guestName" name="guestName" required value={bookingData.guestName} onChange={handleInputChange}
                        className="bg-transparent border-primary/30 text-white focus-visible:ring-primary rounded-none h-12"
                        placeholder="Nguyễn Văn A" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="guestEmail" className="text-white/80 uppercase tracking-widest text-xs">{t("room.book.email")}</Label>
                      <Input id="guestEmail" name="guestEmail" type="email" required value={bookingData.guestEmail} onChange={handleInputChange}
                        className="bg-transparent border-primary/30 text-white focus-visible:ring-primary rounded-none h-12"
                        placeholder="email@example.com" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="guestPhone" className="text-white/80 uppercase tracking-widest text-xs">{t("room.book.phone")}</Label>
                      <Input id="guestPhone" name="guestPhone" required value={bookingData.guestPhone} onChange={handleInputChange}
                        className="bg-transparent border-primary/30 text-white focus-visible:ring-primary rounded-none h-12"
                        placeholder="0912345678" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="checkInDate" className="text-white/80 uppercase tracking-widest text-xs">{t("room.book.checkIn")}</Label>
                        <Input id="checkInDate" name="checkInDate" type="date" required value={bookingData.checkInDate} onChange={handleInputChange}
                          className="bg-transparent border-primary/30 text-white focus-visible:ring-primary rounded-none h-12 [color-scheme:dark]" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="checkOutDate" className="text-white/80 uppercase tracking-widest text-xs">{t("room.book.checkOut")}</Label>
                        <Input id="checkOutDate" name="checkOutDate" type="date" required value={bookingData.checkOutDate} onChange={handleInputChange}
                          className="bg-transparent border-primary/30 text-white focus-visible:ring-primary rounded-none h-12 [color-scheme:dark]" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="numberOfGuests" className="text-white/80 uppercase tracking-widest text-xs">{t("room.book.guests")}</Label>
                      <Input id="numberOfGuests" name="numberOfGuests" type="number" min="1" max={room.capacity} required value={bookingData.numberOfGuests} onChange={handleInputChange}
                        className="bg-transparent border-primary/30 text-white focus-visible:ring-primary rounded-none h-12" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="specialRequests" className="text-white/80 uppercase tracking-widest text-xs">{t("room.book.requests")}</Label>
                      <Textarea id="specialRequests" name="specialRequests" value={bookingData.specialRequests} onChange={handleInputChange}
                        className="bg-transparent border-primary/30 text-white focus-visible:ring-primary rounded-none resize-none"
                        placeholder={t("room.book.requestsPh")} rows={3} />
                    </div>

                    <Button type="submit" disabled={createBooking.isPending}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-none py-6 uppercase tracking-widest mt-4 text-sm">
                      {createBooking.isPending ? t("room.book.submitting") : t("room.book.submit")}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
