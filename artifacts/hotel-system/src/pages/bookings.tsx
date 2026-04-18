import { useListBookings } from "@workspace/api-client-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { Calendar, MapPin, ChevronRight, Lock } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useAuth } from "@clerk/react";

export default function Bookings() {
  const { data: bookings, isLoading } = useListBookings();
  const { t } = useT();
  const { isSignedIn, isLoaded } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoaded && !isSignedIn) {
    return (
      <PageLayout>
        <div className="bg-secondary pt-32 pb-16 border-b border-primary/20">
          <div className="container mx-auto px-4 md:px-8">
            <h1 className="text-4xl md:text-5xl font-serif text-white mb-6">{t("bookings.title")}</h1>
            <div className="w-16 h-[2px] bg-primary mb-6" />
          </div>
        </div>
        <div className="py-24 bg-background flex items-center justify-center min-h-[50vh]">
          <div className="text-center border border-primary/20 bg-card p-14 max-w-md mx-4">
            <div className="p-4 bg-primary/10 text-primary inline-flex mb-6">
              <Lock size={28} />
            </div>
            <h2 className="text-2xl font-serif text-foreground mb-3">Yêu cầu đăng nhập</h2>
            <p className="text-muted-foreground mb-8 text-sm leading-relaxed">
              Vui lòng đăng nhập để xem lịch sử đặt phòng và quản lý các đơn đặt phòng của bạn.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="bg-primary text-primary-foreground rounded-none px-8 uppercase tracking-widest text-xs">
                <Link href="/sign-in">Đăng nhập</Link>
              </Button>
              <Button asChild variant="outline" className="border-primary text-primary rounded-none px-8 uppercase tracking-widest text-xs">
                <Link href="/register">Đăng ký</Link>
              </Button>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="bg-secondary pt-32 pb-16 border-b border-primary/20">
        <div className="container mx-auto px-4 md:px-8">
          <h1 className="text-4xl md:text-5xl font-serif text-white mb-6">{t("bookings.title")}</h1>
          <div className="w-16 h-[2px] bg-primary mb-6"></div>
          <p className="text-white/70 font-light max-w-2xl">{t("bookings.subtitle")}</p>
        </div>
      </div>

      <div className="py-16 bg-background min-h-[50vh]">
        <div className="container mx-auto px-4 md:px-8 max-w-5xl">
          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-secondary/5 animate-pulse border border-primary/10"></div>
              ))}
            </div>
          ) : bookings?.length === 0 ? (
            <div className="text-center py-20 border border-primary/20 bg-secondary/5">
              <h3 className="text-2xl font-serif text-foreground mb-4">{t("bookings.empty.title")}</h3>
              <p className="text-muted-foreground mb-8">{t("bookings.empty.body")}</p>
              <Button asChild className="bg-primary text-primary-foreground rounded-none px-8 py-6 uppercase tracking-widest">
                <Link href="/">{t("bookings.empty.cta")}</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {bookings?.map(booking => (
                <div key={booking.id} className="border border-primary/20 bg-card text-card-foreground flex flex-col md:flex-row group transition-all hover:border-primary/50 hover:shadow-lg">
                  <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-2xl font-serif text-foreground">
                          {booking.hotel?.name || `#${booking.hotelId}`}
                        </h3>
                        <span className={`text-xs uppercase tracking-widest px-3 py-1 border ${
                          booking.status === 'confirmed' ? 'border-green-500 text-green-700 bg-green-50 dark:bg-green-950/30 dark:text-green-400' :
                          booking.status === 'cancelled' ? 'border-destructive text-destructive bg-destructive/10' :
                          'border-primary text-primary bg-primary/10'
                        }`}>
                          {booking.status === 'confirmed' ? t("bookings.status.confirmed") :
                           booking.status === 'cancelled' ? t("bookings.status.cancelled") : booking.status}
                        </span>
                      </div>

                      <div className="text-muted-foreground flex flex-col gap-2 mb-6">
                        <span className="flex items-center gap-2">
                          <MapPin size={16} className="text-primary" />
                          {booking.hotel?.city || 'Việt Nam'}
                        </span>
                        <span className="flex items-center gap-2">
                          <Calendar size={16} className="text-primary" />
                          {format(new Date(booking.checkInDate), 'dd/MM/yyyy')} - {format(new Date(booking.checkOutDate), 'dd/MM/yyyy')}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-end border-t border-primary/10 pt-4">
                      <div>
                        <div className="text-xs uppercase tracking-widest text-muted-foreground">{t("bookings.total")}</div>
                        <div className="text-2xl font-serif text-primary">${booking.totalPrice}</div>
                      </div>
                      <Button asChild variant="ghost" className="text-foreground hover:text-primary hover:bg-transparent rounded-none px-0 uppercase tracking-widest text-sm group-hover:underline underline-offset-4">
                        <Link href={`/bookings/${booking.id}`} className="flex items-center">
                          {t("common.details")} <ChevronRight size={16} className="ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
