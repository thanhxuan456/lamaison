import { useRoute, Link } from "wouter";
import { useGetBooking } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, FileText } from "lucide-react";
import { useBranding } from "@/lib/branding";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const numberToVietnameseWords = (n: number): string => {
  if (!n || n <= 0) return "không";
  const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const readTriple = (num: number): string => {
    const h = Math.floor(num / 100);
    const t = Math.floor((num % 100) / 10);
    const u = num % 10;
    let s = "";
    if (h > 0) s += units[h] + " trăm ";
    if (t > 1) { s += units[t] + " mươi "; if (u === 1) s += "mốt"; else if (u === 5) s += "lăm"; else if (u > 0) s += units[u]; }
    else if (t === 1) { s += "mười "; if (u === 5) s += "lăm"; else if (u > 0) s += units[u]; }
    else if (t === 0 && h > 0 && u > 0) s += "lẻ " + units[u];
    else if (u > 0) s += units[u];
    return s.trim();
  };
  const billion = Math.floor(n / 1_000_000_000);
  const million = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousand = Math.floor((n % 1_000_000) / 1_000);
  const rest = n % 1_000;
  let parts: string[] = [];
  if (billion > 0) parts.push(readTriple(billion) + " tỷ");
  if (million > 0) parts.push(readTriple(million) + " triệu");
  if (thousand > 0) parts.push(readTriple(thousand) + " nghìn");
  if (rest > 0) parts.push(readTriple(rest));
  const result = parts.join(" ").trim();
  return result.charAt(0).toUpperCase() + result.slice(1);
};

const formatCurrency = (n: number) => Number(n).toLocaleString("vi-VN");

export default function ContractView() {
  const [, params] = useRoute("/bookings/:id/contract");
  const bookingId = params?.id ? parseInt(params.id) : 0;
  const { data: booking, isLoading } = useGetBooking(bookingId);
  const { branding } = useBranding();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Đang tải hợp đồng...</div>;
  if (!booking) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Không tìm thấy thông tin đặt phòng.</div>;

  const checkIn = new Date(booking.checkInDate);
  const checkOut = new Date(booking.checkOutDate);
  const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
  const total = Number(booking.totalPrice ?? 0);
  const today = new Date();
  const contractNumber = `HD-${String(booking.id).padStart(6, "0")}-${format(today, "yyyyMM")}`;

  const hotel = booking.hotel;
  const room = booking.room;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      {/* Top action bar — hidden when printing */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-wrap items-center gap-3 print:hidden">
        <Link href={`/bookings/${booking.id}`}>
          <Button variant="outline" className="rounded-none"><ArrowLeft size={14} className="mr-2" /> Quay lại</Button>
        </Link>
        <div className="ml-auto flex gap-2">
          <Button onClick={() => window.print()} className="bg-primary text-primary-foreground rounded-none uppercase tracking-widest text-xs">
            <Printer size={14} className="mr-2" /> In / Tải PDF
          </Button>
        </div>
      </div>

      {/* Contract paper */}
      <div className="max-w-4xl mx-auto bg-white text-gray-900 border border-primary/30 print:border-none shadow-[0_8px_32px_rgba(0,0,0,0.12)] print:shadow-none p-10 print:p-8 font-serif">
        {/* Header — Quốc hiệu + Logo */}
        <div className="text-center mb-2">
          <div className="font-bold text-sm uppercase tracking-wider">Cộng Hòa Xã Hội Chủ Nghĩa Việt Nam</div>
          <div className="font-bold text-sm">Độc lập – Tự do – Hạnh phúc</div>
          <div className="w-24 h-px bg-gray-900 mx-auto mt-1" />
        </div>

        <div className="flex items-center justify-center gap-4 mb-2 mt-6">
          {branding.useImageLogo && branding.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.brandName} className="h-12 w-auto object-contain" />
          ) : (
            <div className="w-12 h-12 border-2 border-primary flex items-center justify-center font-serif text-xl text-primary">
              {(branding.brandName || "G").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-serif text-base uppercase tracking-widest text-primary">{branding.brandName}</div>
            <div className="text-[10px] tracking-widest text-gray-500 uppercase">{branding.tagline}</div>
          </div>
        </div>

        <div className="text-center mt-6 mb-8">
          <h1 className="font-bold text-2xl uppercase tracking-wider">Hợp Đồng Dịch Vụ Lưu Trú</h1>
          <div className="text-sm mt-1">Số: <span className="font-mono">{contractNumber}</span></div>
        </div>

        {/* Legal basis */}
        <div className="text-sm leading-7 mb-6 italic text-gray-700">
          <p className="font-medium not-italic text-gray-900 mb-2">Căn cứ pháp lý:</p>
          <ul className="list-disc pl-6 space-y-1 text-[13px]">
            <li>Bộ luật Dân sự nước CHXHCN Việt Nam số 91/2015/QH13;</li>
            <li>Luật Du lịch số 09/2017/QH14 ngày 19/6/2017;</li>
            <li>Luật Cư trú số 68/2020/QH14 và Nghị định 62/2021/NĐ-CP;</li>
            <li>Nghị định 168/2017/NĐ-CP quy định chi tiết một số điều của Luật Du lịch;</li>
            <li>Thỏa thuận tự nguyện của các bên ký kết dưới đây.</li>
          </ul>
        </div>

        <p className="text-sm mb-4">
          Hôm nay, ngày <strong>{format(today, "dd")}</strong> tháng <strong>{format(today, "MM")}</strong> năm <strong>{format(today, "yyyy")}</strong>,
          tại {hotel?.address ?? "—"}, {hotel?.city ?? "—"}, chúng tôi gồm:
        </p>

        {/* Bên A */}
        <section className="mb-5 text-sm leading-7">
          <div className="font-bold uppercase mb-1">BÊN A (Bên cung cấp dịch vụ lưu trú):</div>
          <div className="pl-4 space-y-0.5">
            <div><strong>Tên cơ sở lưu trú:</strong> {hotel?.name ?? branding.brandName}</div>
            <div><strong>Địa chỉ:</strong> {hotel?.address ?? "—"}, {hotel?.city ?? "—"}</div>
            <div><strong>Điện thoại:</strong> {hotel?.phone ?? "—"}</div>
            <div><strong>Đại diện:</strong> Quản lý Lễ tân – {branding.brandName}</div>
          </div>
        </section>

        {/* Bên B */}
        <section className="mb-6 text-sm leading-7">
          <div className="font-bold uppercase mb-1">BÊN B (Khách hàng thuê phòng):</div>
          <div className="pl-4 space-y-0.5">
            <div><strong>Họ và tên:</strong> {booking.guestName}</div>
            <div><strong>Số điện thoại:</strong> {booking.guestPhone}</div>
            <div><strong>Email:</strong> {booking.guestEmail}</div>
            <div><strong>Số CMND/CCCD/Hộ chiếu:</strong> ............................................................ <span className="text-gray-400 text-xs">(xuất trình khi nhận phòng)</span></div>
            <div><strong>Số người lưu trú:</strong> {booking.numberOfGuests} người</div>
          </div>
        </section>

        <p className="text-sm mb-4">Hai bên thống nhất ký kết hợp đồng dịch vụ lưu trú với các điều khoản sau:</p>

        {/* Điều 1 */}
        <section className="mb-4 text-sm leading-7">
          <div className="font-bold">ĐIỀU 1: ĐỐI TƯỢNG VÀ THỜI HẠN HỢP ĐỒNG</div>
          <div className="pl-4 mt-1">
            <p>1.1. Bên A đồng ý cho Bên B sử dụng dịch vụ lưu trú với thông tin chi tiết:</p>
            <ul className="pl-6 mt-1 space-y-0.5 list-disc">
              <li>Phòng: <strong>{room?.roomNumber ?? "—"}</strong> – Loại: <strong>{room?.type ?? "—"}</strong></li>
              <li>Sức chứa: tối đa {room?.capacity ?? booking.numberOfGuests} khách</li>
              <li>Mã đặt phòng: <strong className="font-mono">#{String(booking.id).padStart(6, "0")}</strong></li>
            </ul>
            <p className="mt-1">1.2. Thời hạn lưu trú:</p>
            <ul className="pl-6 mt-1 space-y-0.5 list-disc">
              <li>Nhận phòng: <strong>{format(checkIn, "EEEE, dd/MM/yyyy", { locale: vi })}</strong> – từ 14:00</li>
              <li>Trả phòng: <strong>{format(checkOut, "EEEE, dd/MM/yyyy", { locale: vi })}</strong> – trước 12:00</li>
              <li>Tổng số đêm lưu trú: <strong>{nights} đêm</strong></li>
            </ul>
          </div>
        </section>

        {/* Điều 2 */}
        <section className="mb-4 text-sm leading-7">
          <div className="font-bold">ĐIỀU 2: GIÁ DỊCH VỤ VÀ PHƯƠNG THỨC THANH TOÁN</div>
          <div className="pl-4 mt-1">
            <p>2.1. Tổng giá trị hợp đồng: <strong>{formatCurrency(total)} VNĐ</strong> ({numberToVietnameseWords(total)} đồng).</p>
            <p>2.2. Giá trên đã bao gồm: thuế VAT theo quy định, dịch vụ phòng cơ bản (giường, nước uống miễn phí, wifi, vệ sinh hàng ngày), bảo hiểm cơ bản trong khuôn viên cơ sở lưu trú.</p>
            <p>2.3. Giá chưa bao gồm: dịch vụ ăn uống, giặt là, minibar, spa, đưa đón sân bay và các dịch vụ phát sinh khác.</p>
            <p>2.4. Phương thức thanh toán: Tiền mặt / Chuyển khoản / Thẻ tín dụng / VietQR. Bên B thanh toán đầy đủ trước hoặc tại thời điểm nhận phòng.</p>
            <p>2.5. Hóa đơn VAT (nếu yêu cầu) sẽ được Bên A xuất theo thông tin Bên B cung cấp tại quầy lễ tân.</p>
          </div>
        </section>

        {/* Điều 3 */}
        <section className="mb-4 text-sm leading-7">
          <div className="font-bold">ĐIỀU 3: QUYỀN VÀ NGHĨA VỤ CỦA BÊN A</div>
          <div className="pl-4 mt-1">
            <p>3.1. Cung cấp phòng và các dịch vụ kèm theo đúng tiêu chuẩn đã cam kết.</p>
            <p>3.2. Bảo đảm vệ sinh, an ninh, phòng cháy chữa cháy theo quy định pháp luật.</p>
            <p>3.3. Thực hiện đăng ký lưu trú với cơ quan công an theo Luật Cư trú và Nghị định 62/2021/NĐ-CP.</p>
            <p>3.4. Bảo mật thông tin cá nhân của khách hàng theo quy định của Luật An ninh mạng và Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.</p>
            <p>3.5. Có quyền yêu cầu Bên B xuất trình giấy tờ tùy thân hợp pháp khi nhận phòng và từ chối phục vụ trong các trường hợp pháp luật quy định.</p>
          </div>
        </section>

        {/* Điều 4 */}
        <section className="mb-4 text-sm leading-7">
          <div className="font-bold">ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN B</div>
          <div className="pl-4 mt-1">
            <p>4.1. Sử dụng phòng và các dịch vụ đúng mục đích lưu trú hợp pháp.</p>
            <p>4.2. Xuất trình giấy tờ tùy thân (CMND/CCCD/Hộ chiếu) khi nhận phòng để Bên A thực hiện đăng ký lưu trú.</p>
            <p>4.3. Tuân thủ nội quy của cơ sở lưu trú, không gây mất trật tự, không sử dụng/tàng trữ chất cấm, vũ khí, vật liệu cháy nổ.</p>
            <p>4.4. Thanh toán đầy đủ và đúng hạn các khoản dịch vụ theo Điều 2 và các dịch vụ phát sinh.</p>
            <p>4.5. Bồi thường thiệt hại đối với tài sản của Bên A do lỗi của Bên B hoặc người đi cùng gây ra theo giá trị thực tế.</p>
          </div>
        </section>

        {/* Điều 5 */}
        <section className="mb-4 text-sm leading-7">
          <div className="font-bold">ĐIỀU 5: HỦY/ĐỔI ĐẶT PHÒNG</div>
          <div className="pl-4 mt-1">
            <p>5.1. Hủy trước 72 giờ so với giờ nhận phòng: hoàn 100% giá trị đã thanh toán (trừ phí giao dịch ngân hàng nếu có).</p>
            <p>5.2. Hủy trong vòng 24–72 giờ: hoàn 50% giá trị.</p>
            <p>5.3. Hủy trong vòng 24 giờ hoặc no-show: không hoàn tiền.</p>
            <p>5.4. Trong các trường hợp bất khả kháng (thiên tai, dịch bệnh, lệnh hành chính): hai bên thỏa thuận giải quyết theo Bộ luật Dân sự 2015.</p>
          </div>
        </section>

        {/* Điều 6 */}
        <section className="mb-4 text-sm leading-7">
          <div className="font-bold">ĐIỀU 6: ĐIỀU KHOẢN CHUNG</div>
          <div className="pl-4 mt-1">
            <p>6.1. Hai bên cam kết thực hiện đúng các điều khoản trong hợp đồng. Mọi sửa đổi/bổ sung phải được lập thành văn bản và có sự đồng ý của hai bên.</p>
            <p>6.2. Tranh chấp phát sinh sẽ được hai bên thương lượng giải quyết. Trường hợp không thể thương lượng, sẽ đưa ra Tòa án nhân dân có thẩm quyền nơi Bên A đặt trụ sở giải quyết theo quy định pháp luật Việt Nam.</p>
            <p>6.3. Hợp đồng có hiệu lực kể từ ngày Bên B hoàn tất thanh toán hoặc nhận phòng (tùy thời điểm nào đến trước) và chấm dứt khi Bên B trả phòng và hoàn tất thanh toán đầy đủ.</p>
            <p>6.4. Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản.</p>
          </div>
        </section>

        {/* Yêu cầu đặc biệt */}
        {booking.specialRequests && (
          <section className="mb-6 text-sm leading-7">
            <div className="font-bold">PHỤ LỤC: YÊU CẦU ĐẶC BIỆT CỦA KHÁCH</div>
            <div className="pl-4 mt-1 italic">{booking.specialRequests}</div>
          </section>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-12 mb-4">
          <div className="text-center">
            <div className="font-bold uppercase text-sm">Đại diện Bên A</div>
            <div className="text-xs italic text-gray-600">(Ký, ghi rõ họ tên & đóng dấu)</div>
            <div className="h-24" />
            <div className="border-t border-gray-400 pt-1 text-sm">{branding.brandName}</div>
          </div>
          <div className="text-center">
            <div className="font-bold uppercase text-sm">Bên B</div>
            <div className="text-xs italic text-gray-600">(Ký và ghi rõ họ tên)</div>
            <div className="h-24" />
            <div className="border-t border-gray-400 pt-1 text-sm">{booking.guestName}</div>
          </div>
        </div>

        <div className="mt-10 pt-4 border-t border-gray-200 text-center text-[10px] text-gray-500">
          <p>Hợp đồng này được tạo tự động từ hệ thống đặt phòng {branding.brandName}. In ngày {format(today, "dd/MM/yyyy HH:mm")}</p>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 1.5cm; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
