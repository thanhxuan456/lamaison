import { useRoute, useLocation } from "wouter";
import { useGetBooking, useCancelBooking } from "@workspace/api-client-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { MapPin, User, Phone, Mail, FileText } from "lucide-react";
import { useT } from "@/lib/i18n";

export default function BookingDetail() {
  const [, params] = useRoute("/bookings/:id");
  const bookingId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { t } = useT();

  const { data: booking, isLoading, refetch } = useGetBooking(bookingId);
  const cancelBooking = useCancelBooking();

  const handleCancel = () => {
    cancelBooking.mutate({ id: bookingId }, {
      onSuccess: () => {
        toast({ title: t("toast.success"), description: t("toast.cancelSuccess") });
        refetch();
      },
      onError: () => {
        toast({ title: t("toast.error"), description: t("toast.cancelError"), variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="h-screen flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </PageLayout>
    );
  }

  if (!booking) {
    return (
      <PageLayout>
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-4xl font-serif text-foreground mb-4">{t("booking.notFound.title")}</h1>
          <p className="text-muted-foreground mb-8">{t("booking.notFound.body")}</p>
          <Button onClick={() => setLocation("/bookings")} className="bg-primary text-primary-foreground rounded-none px-8 py-6 uppercase tracking-widest">
            {t("booking.backList")}
          </Button>
        </div>
      </PageLayout>
    );
  }

  const isCancelled = booking.status === 'cancelled';

  return (
    <PageLayout>
      <div className="bg-background pt-24 pb-20">
        <div className="container mx-auto px-4 md:px-8 max-w-4xl">
          <div className="mb-8 flex justify-between items-center">
            <Button variant="ghost" onClick={() => setLocation("/bookings")} className="text-muted-foreground hover:text-primary pl-0 uppercase tracking-widest text-xs">
              {t("booking.back")}
            </Button>
            <div className="text-sm font-serif text-muted-foreground">
              {t("booking.code")}: #{booking.id.toString().padStart(6, '0')}
            </div>
          </div>

          <div className="bg-card text-card-foreground border border-primary/20 shadow-xl overflow-hidden">
            <div className={`p-8 md:p-12 text-white relative overflow-hidden ${isCancelled ? 'bg-secondary/80' : 'bg-secondary'}`}>
              <div className="absolute top-0 right-0 w-64 h-64 border-[40px] border-primary/10 rounded-full -translate-y-1/2 translate-x-1/4"></div>

              <div className="relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-primary/20 pb-8 mb-8">
                  <div>
                    <h1 className="text-3xl md:text-5xl font-serif mb-4">{booking.hotel?.name}</h1>
                    <div className="flex items-center gap-2 text-white/80">
                      <MapPin size={18} className="text-primary" />
                      <span>{booking.hotel?.address}, {booking.hotel?.city}</span>
                    </div>
                  </div>
                  <div className="text-left md:text-right">
                    <span className={`inline-block px-4 py-1 border text-sm uppercase tracking-widest mb-4 ${
                      isCancelled ? 'border-destructive text-destructive bg-destructive/10' : 'border-primary text-primary bg-primary/10'
                    }`}>
                      {isCancelled ? t("booking.cancelled") : t("booking.confirmed")}
                    </span>
                    <div className="text-3xl font-serif text-primary">${booking.totalPrice}</div>
                    <div className="text-sm text-white/60">{t("booking.paid")}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div>
                    <div className="text-primary/70 text-xs uppercase tracking-widest mb-2">{t("booking.checkIn")}</div>
                    <div className="text-xl font-serif">{format(new Date(booking.checkInDate), 'dd/MM/yyyy')}</div>
                    <div className="text-sm text-white/60">{t("booking.checkInNote")}</div>
                  </div>
                  <div>
                    <div className="text-primary/70 text-xs uppercase tracking-widest mb-2">{t("booking.checkOut")}</div>
                    <div className="text-xl font-serif">{format(new Date(booking.checkOutDate), 'dd/MM/yyyy')}</div>
                    <div className="text-sm text-white/60">{t("booking.checkOutNote")}</div>
                  </div>
                  <div>
                    <div className="text-primary/70 text-xs uppercase tracking-widest mb-2">{t("booking.roomInfo")}</div>
                    <div className="text-xl font-serif">{booking.room?.type}</div>
                    <div className="text-sm text-white/60">{booking.numberOfGuests} {t("common.guests")}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 md:p-12">
              <h3 className="font-serif text-2xl text-foreground mb-8 flex items-center gap-3">
                <User className="text-primary" /> {t("booking.guestTitle")}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                <div className="space-y-6">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{t("booking.fullName")}</div>
                    <div className="text-lg font-medium text-foreground">{booking.guestName}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{t("booking.phone")}</div>
                    <div className="flex items-center gap-2 text-lg font-medium text-foreground">
                      <Phone size={16} className="text-primary" /> {booking.guestPhone}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{t("booking.email")}</div>
                    <div className="flex items-center gap-2 text-lg font-medium text-foreground">
                      <Mail size={16} className="text-primary" /> {booking.guestEmail}
                    </div>
                  </div>
                </div>

                <div className="bg-secondary/5 p-6 border border-primary/10">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                    <FileText size={16} className="text-primary" /> {t("booking.requests")}
                  </div>
                  <p className="text-foreground font-light italic">
                    {booking.specialRequests ? `"${booking.specialRequests}"` : t("booking.noRequests")}
                  </p>
                </div>
              </div>

              {!isCancelled && (
                <div className="border-t border-primary/20 pt-8 flex justify-end">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-none uppercase tracking-widest">
                        {t("booking.cancelBtn")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-none border-primary bg-background">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-serif text-2xl text-foreground">{t("booking.cancelTitle")}</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                          {t("booking.cancelDesc")}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel className="rounded-none uppercase tracking-widest text-xs">{t("booking.keep")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-none uppercase tracking-widest text-xs">
                          {t("booking.confirmCancel")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
