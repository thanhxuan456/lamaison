import { useRoute, useLocation } from "wouter";
import { useGetRoom, useGetHotel, useCreateBooking } from "@workspace/api-client-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Check, User, Wind, Maximize, Calendar } from "lucide-react";

export default function RoomDetail() {
  const [, params] = useRoute("/rooms/:id");
  const roomId = params?.id ? parseInt(params.id) : 0;
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const { data: room, isLoading: loadingRoom } = useGetRoom(roomId);
  const hotelId = room?.hotelId || 0;
  const { data: hotel, isLoading: loadingHotel } = useGetHotel(hotelId, { 
    query: { enabled: !!hotelId } 
  });
  
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
    
    // Basic validation
    if (!bookingData.checkInDate || !bookingData.checkOutDate) {
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn ngày nhận và trả phòng.",
        variant: "destructive"
      });
      return;
    }

    createBooking.mutate({
      data: {
        roomId: room.id,
        ...bookingData
      }
    }, {
      onSuccess: (data) => {
        toast({
          title: "Thành công",
          description: "Đã đặt phòng thành công. Cảm ơn quý khách.",
        });
        setLocation(`/bookings/${data.id}`);
      },
      onError: () => {
        toast({
          title: "Lỗi",
          description: "Không thể đặt phòng lúc này. Vui lòng thử lại sau.",
          variant: "destructive"
        });
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
          {/* Breadcrumb */}
          <div className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-8 flex gap-2">
            <span className="cursor-pointer hover:text-primary" onClick={() => setLocation('/')}>Trang chủ</span>
            <span>/</span>
            <span className="cursor-pointer hover:text-primary" onClick={() => setLocation(`/hotels/${hotel.id}`)}>{hotel.name}</span>
            <span>/</span>
            <span className="text-primary">{room.type}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
            {/* Left Col: Image & Details */}
            <div className="lg:col-span-2 space-y-12">
              <div className="border border-primary/20 relative aspect-[16/10] overflow-hidden">
                <img 
                  src={room.imageUrl || "/images/room-suite.png"} 
                  alt={room.type} 
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-end mb-6 border-b border-primary/20 pb-6">
                  <div>
                    <h1 className="text-4xl font-serif text-secondary mb-2">{room.type}</h1>
                    <p className="text-lg text-primary font-serif">Phòng {room.roomNumber}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-serif text-secondary">${room.pricePerNight}</div>
                    <div className="text-sm text-muted-foreground uppercase tracking-widest">Mỗi đêm</div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-8 py-6 border-b border-primary/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-primary flex items-center justify-center bg-secondary/5">
                      <User size={18} className="text-primary" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Sức chứa</div>
                      <div className="font-medium text-secondary">{room.capacity} Khách</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-primary flex items-center justify-center bg-secondary/5">
                      <Wind size={18} className="text-primary" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Tầm nhìn</div>
                      <div className="font-medium text-secondary">{room.view}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-primary flex items-center justify-center bg-secondary/5">
                      <Maximize size={18} className="text-primary" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Tầng</div>
                      <div className="font-medium text-secondary">{room.floor}</div>
                    </div>
                  </div>
                </div>
                
                <div className="py-8">
                  <h3 className="font-serif text-2xl text-secondary mb-4">Chi tiết phòng</h3>
                  <p className="text-muted-foreground leading-relaxed font-light whitespace-pre-line mb-8">
                    {room.description}
                  </p>
                  
                  <h4 className="font-serif text-xl text-secondary mb-6">Tiện ích bao gồm</h4>
                  <ul className="grid grid-cols-2 gap-y-4">
                    {room.amenities.map((amenity, i) => (
                      <li key={i} className="flex items-center gap-3 text-secondary/80">
                        <Check size={16} className="text-primary" />
                        <span className="font-light">{amenity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Right Col: Booking Form */}
            <div>
              <div className="bg-secondary text-secondary-foreground p-8 border border-primary sticky top-32 shadow-2xl">
                <h3 className="font-serif text-2xl text-white mb-6 border-b border-primary/20 pb-4">Đặt Phòng Này</h3>
                
                {!room.isAvailable ? (
                  <div className="bg-destructive/10 text-destructive border border-destructive/30 p-4 text-center">
                    Rất tiếc, phòng này hiện không trống. Vui lòng chọn phòng khác.
                  </div>
                ) : (
                  <form onSubmit={handleBooking} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="guestName" className="text-white/80 uppercase tracking-widest text-xs">Họ và tên</Label>
                      <Input 
                        id="guestName" name="guestName" required
                        value={bookingData.guestName} onChange={handleInputChange}
                        className="bg-transparent border-primary/30 text-white focus-visible:ring-primary rounded-none h-12"
                        placeholder="Nguyễn Văn A"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="guestEmail" className="text-white/80 uppercase tracking-widest text-xs">Email</Label>
                      <Input 
                        id="guestEmail" name="guestEmail" type="email" required
                        value={bookingData.guestEmail} onChange={handleInputChange}
                        className="bg-transparent border-primary/30 text-white focus-visible:ring-primary rounded-none h-12"
                        placeholder="email@example.com"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="guestPhone" className="text-white/80 uppercase tracking-widest text-xs">Số điện thoại</Label>
                      <Input 
                        id="guestPhone" name="guestPhone" required
                        value={bookingData.guestPhone} onChange={handleInputChange}
                        className="bg-transparent border-primary/30 text-white focus-visible:ring-primary rounded-none h-12"
                        placeholder="0912345678"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="checkInDate" className="text-white/80 uppercase tracking-widest text-xs">Nhận phòng</Label>
                        <Input 
                          id="checkInDate" name="checkInDate" type="date" required
                          value={bookingData.checkInDate} onChange={handleInputChange}
                          className="bg-transparent border-primary/30 text-white focus-visible:ring-primary rounded-none h-12 [color-scheme:dark]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="checkOutDate" className="text-white/80 uppercase tracking-widest text-xs">Trả phòng</Label>
                        <Input 
                          id="checkOutDate" name="checkOutDate" type="date" required
                          value={bookingData.checkOutDate} onChange={handleInputChange}
                          className="bg-transparent border-primary/30 text-white focus-visible:ring-primary rounded-none h-12 [color-scheme:dark]"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="numberOfGuests" className="text-white/80 uppercase tracking-widest text-xs">Số lượng khách</Label>
                      <Input 
                        id="numberOfGuests" name="numberOfGuests" type="number" min="1" max={room.capacity} required
                        value={bookingData.numberOfGuests} onChange={handleInputChange}
                        className="bg-transparent border-primary/30 text-white focus-visible:ring-primary rounded-none h-12"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="specialRequests" className="text-white/80 uppercase tracking-widest text-xs">Yêu cầu đặc biệt</Label>
                      <Textarea 
                        id="specialRequests" name="specialRequests"
                        value={bookingData.specialRequests} onChange={handleInputChange}
                        className="bg-transparent border-primary/30 text-white focus-visible:ring-primary rounded-none resize-none"
                        placeholder="Ghi chú thêm (không bắt buộc)"
                        rows={3}
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      disabled={createBooking.isPending}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-none py-6 uppercase tracking-widest mt-4 text-sm"
                    >
                      {createBooking.isPending ? "Đang xử lý..." : "Xác Nhận Đặt Phòng"}
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
