import { useListBookings } from "@workspace/api-client-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { format } from "date-fns";
import { Calendar, MapPin, ChevronRight } from "lucide-react";

export default function Bookings() {
  const { data: bookings, isLoading } = useListBookings();

  return (
    <PageLayout>
      <div className="bg-secondary pt-32 pb-16 border-b border-primary/20">
        <div className="container mx-auto px-4 md:px-8">
          <h1 className="text-4xl md:text-5xl font-serif text-white mb-6">Đặt Phòng Của Tôi</h1>
          <div className="w-16 h-[2px] bg-primary mb-6"></div>
          <p className="text-white/70 font-light max-w-2xl">
            Quản lý các đặt phòng của bạn tại hệ thống khách sạn Grand Palace.
          </p>
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
              <h3 className="text-2xl font-serif text-secondary mb-4">Chưa có đặt phòng nào</h3>
              <p className="text-muted-foreground mb-8">Bạn chưa thực hiện bất kỳ đặt phòng nào tại hệ thống của chúng tôi.</p>
              <Button asChild className="bg-primary text-primary-foreground rounded-none px-8 py-6 uppercase tracking-widest">
                <Link href="/">Khám Phá Khách Sạn</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {bookings?.map(booking => (
                <div key={booking.id} className="border border-primary/20 bg-white flex flex-col md:flex-row group transition-all hover:border-primary/50 hover:shadow-lg">
                  <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-2xl font-serif text-secondary">
                          {booking.hotel?.name || `Khách sạn #${booking.hotelId}`}
                        </h3>
                        <span className={`text-xs uppercase tracking-widest px-3 py-1 border ${
                          booking.status === 'confirmed' ? 'border-green-500 text-green-700 bg-green-50' : 
                          booking.status === 'cancelled' ? 'border-destructive text-destructive bg-destructive/10' : 
                          'border-primary text-primary bg-primary/10'
                        }`}>
                          {booking.status === 'confirmed' ? 'Đã xác nhận' : 
                           booking.status === 'cancelled' ? 'Đã hủy' : booking.status}
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
                        <div className="text-xs uppercase tracking-widest text-muted-foreground">Tổng tiền</div>
                        <div className="text-2xl font-serif text-primary">${booking.totalPrice}</div>
                      </div>
                      <Button asChild variant="ghost" className="text-secondary hover:text-primary hover:bg-transparent rounded-none px-0 uppercase tracking-widest text-sm group-hover:underline underline-offset-4">
                        <Link href={`/bookings/${booking.id}`} className="flex items-center">
                          Chi Tiết <ChevronRight size={16} className="ml-1" />
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
