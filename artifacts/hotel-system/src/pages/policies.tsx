import { ReactNode } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Crown, FileText, Shield, Users, Calendar, Phone } from "lucide-react";

/* ──────────────────────────────────────────────
   Shared layout: luxury policy page shell
────────────────────────────────────────────── */
function PolicyShell({
  icon, kicker, title, subtitle, children,
}: {
  icon: ReactNode; kicker: string; title: string; subtitle: string; children: ReactNode;
}) {
  return (
    <PageLayout>
      {/* Hero */}
      <section className="relative bg-gradient-to-b from-card to-background py-20 md:py-28 overflow-hidden border-b border-primary/15">
        <div aria-hidden className="absolute top-8 left-8 w-24 h-24 border-l border-t border-primary/40" />
        <div aria-hidden className="absolute top-8 right-8 w-24 h-24 border-r border-t border-primary/40" />
        <div aria-hidden className="absolute bottom-8 left-8 w-24 h-24 border-l border-b border-primary/40" />
        <div aria-hidden className="absolute bottom-8 right-8 w-24 h-24 border-r border-b border-primary/40" />

        <div className="container mx-auto px-4 md:px-8 text-center relative max-w-4xl">
          <div className="inline-flex items-center gap-3 mb-5 text-primary">
            {icon}
            <span className="text-[11px] tracking-[0.4em] uppercase font-serif">{kicker}</span>
            <Crown size={14} />
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-foreground mb-4 leading-tight">{title}</h1>
          <div className="w-16 h-px bg-primary mx-auto mb-5" />
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">{subtitle}</p>
          <p className="text-[11px] text-muted-foreground/60 mt-4 uppercase tracking-wider">
            Cập nhật lần cuối: 17 tháng 4, 2026
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4 md:px-8 max-w-3xl">
          <article className="prose prose-policy max-w-none text-foreground/85 leading-relaxed
            [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:flex [&_h2]:items-center [&_h2]:gap-3
            [&_h3]:text-lg [&_h3]:text-foreground [&_h3]:font-medium [&_h3]:mt-6 [&_h3]:mb-2
            [&_p]:my-3 [&_p]:text-[15px]
            [&_ul]:my-3 [&_ul]:pl-6 [&_ul]:list-disc [&_ul]:space-y-1.5
            [&_li]:text-[15px]
            [&_strong]:text-primary [&_strong]:font-medium">
            {children}
          </article>

          {/* Contact footer */}
          <div className="mt-16 border-t border-primary/15 pt-10 text-center">
            <p className="text-[10px] tracking-[0.3em] uppercase text-primary mb-3">Cần hỗ trợ thêm?</p>
            <p className="text-foreground mb-2">Đội ngũ Concierge của Grand Palace luôn sẵn sàng giải đáp mọi thắc mắc 24/7.</p>
            <div className="flex items-center justify-center gap-6 mt-5 text-sm">
              <a href="/contact" className="inline-flex items-center gap-2 text-primary hover:underline">
                <Phone size={13} /> Liên hệ ngay
              </a>
              <span className="text-muted-foreground/40">·</span>
              <a href="tel:+84900000000" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
                Hotline: 0900 000 000
              </a>
            </div>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}

/* ──────────────────────────────────────────────
   1. Cancellation Policy — /cancellation-policy
────────────────────────────────────────────── */
export function CancellationPolicyPage() {
  return (
    <PolicyShell
      icon={<Calendar size={14} />}
      kicker="Chính sách"
      title="Chính sách huỷ phòng"
      subtitle="Quy định linh hoạt — minh bạch về các điều khoản huỷ và hoàn tiền cho mọi đặt phòng tại Grand Palace Hotels & Resorts.">

      <h2><Calendar size={20} className="text-primary" /> Tổng quan</h2>
      <p>
        Tại <strong>Grand Palace Hotels &amp; Resorts</strong>, chúng tôi hiểu rằng kế hoạch của quý khách có thể thay đổi.
        Chính sách huỷ phòng dưới đây áp dụng cho tất cả đặt phòng trực tiếp qua website, ứng dụng hoặc đường dây Concierge.
        Đặt phòng qua các kênh OTA (Booking.com, Agoda, Expedia, v.v.) sẽ tuân theo điều khoản riêng của từng kênh.
      </p>

      <h2>Mức phí huỷ phòng</h2>
      <ul>
        <li><strong>Trước 7 ngày so với ngày nhận phòng:</strong> Huỷ miễn phí 100%, hoàn tiền đầy đủ trong vòng 5–7 ngày làm việc.</li>
        <li><strong>Từ 48 giờ đến 7 ngày trước nhận phòng:</strong> Khấu trừ 30% giá trị 1 đêm đầu tiên.</li>
        <li><strong>Trong vòng 48 giờ trước nhận phòng:</strong> Khấu trừ 100% giá trị 1 đêm đầu tiên.</li>
        <li><strong>Không nhận phòng (No-show):</strong> Khấu trừ 100% toàn bộ giá trị đặt phòng.</li>
      </ul>

      <h2>Đặt phòng không hoàn huỷ</h2>
      <p>
        Một số gói ưu đãi đặc biệt (Early Bird, Flash Sale, Stay More Save More) áp dụng chính sách
        <strong> không hoàn — không huỷ — không thay đổi</strong>. Điều khoản cụ thể sẽ được hiển thị rõ ràng tại bước thanh toán
        trước khi quý khách xác nhận đặt phòng.
      </p>

      <h2>Sửa đổi đặt phòng</h2>
      <ul>
        <li>Thay đổi ngày miễn phí nếu thực hiện trước 7 ngày, tuỳ thuộc vào tình trạng phòng trống.</li>
        <li>Nâng hạng phòng có thể được thực hiện bất kỳ lúc nào, áp dụng giá chênh lệch tại thời điểm.</li>
        <li>Giảm số đêm sau check-in: tính phí 1 đêm cho phần huỷ.</li>
      </ul>

      <h2>Trường hợp bất khả kháng</h2>
      <p>
        Trong các tình huống bất khả kháng (thiên tai, dịch bệnh được Chính phủ công bố, hạn chế đi lại quốc tế),
        Grand Palace cam kết hỗ trợ <strong>chuyển đổi đặt phòng miễn phí</strong> sang một thời điểm khác trong vòng 12 tháng,
        hoặc phát hành voucher có giá trị tương đương với hiệu lực 24 tháng.
      </p>

      <h2>Quy trình huỷ &amp; hoàn tiền</h2>
      <ol className="my-3 pl-6 list-decimal space-y-1.5">
        <li>Đăng nhập vào tài khoản tại <a href="/profile" className="text-primary hover:underline">trang cá nhân</a> và chọn đặt phòng cần huỷ.</li>
        <li>Hoặc liên hệ Concierge 24/7 qua hotline 0900 000 000.</li>
        <li>Nhận xác nhận huỷ qua email trong vòng 1 giờ.</li>
        <li>Tiền hoàn về thẻ thanh toán gốc trong vòng 5–7 ngày làm việc.</li>
      </ol>
    </PolicyShell>
  );
}

/* ──────────────────────────────────────────────
   2. Membership Program — /membership
────────────────────────────────────────────── */
export function MembershipPage() {
  const tiers = [
    { name: "Silver", points: "0–4.999", color: "#9CA3AF", perks: ["Tích 5% giá trị mỗi đêm", "Check-in sớm 11:00", "Welcome drink chào mừng", "Wifi cao cấp miễn phí"] },
    { name: "Gold", points: "5.000–14.999", color: "#D4AF37", perks: ["Tích 8% giá trị mỗi đêm", "Nâng hạng phòng theo tình trạng", "Late check-out 14:00", "Voucher F&B 500.000đ/lần lưu trú", "Quyền truy cập Executive Lounge"] },
    { name: "Platinum", points: "15.000–39.999", color: "#A78BFA", perks: ["Tích 12% giá trị mỗi đêm", "Nâng hạng đảm bảo (1 hạng)", "Late check-out 16:00", "Bữa sáng buffet miễn phí", "Spa voucher 1.500.000đ/năm", "Đưa đón sân bay 1 chiều"] },
    { name: "Diamond", points: "≥40.000", color: "#FCD34D", perks: ["Tích 18% giá trị mỗi đêm", "Nâng hạng đảm bảo (2 hạng)", "Personal Butler 24/7", "All-inclusive bữa sáng & cocktail", "Spa voucher 5.000.000đ/năm", "Đưa đón sân bay xe Mercedes 2 chiều", "Phòng họp riêng tư miễn phí 4h/lần"] },
  ];

  return (
    <PolicyShell
      icon={<Users size={14} />}
      kicker="Royal Member"
      title="Chương trình thành viên Grand Palace"
      subtitle="Đặc quyền hoàng gia — càng lưu trú nhiều, đặc quyền càng đẳng cấp. Gia nhập miễn phí và tận hưởng các ưu đãi độc quyền dành riêng cho thành viên.">

      <h2><Users size={20} className="text-primary" /> Chương trình &amp; cách tích điểm</h2>
      <p>
        Mỗi <strong>1 VND</strong> chi tiêu cho phòng, F&amp;B, spa, dịch vụ tại bất kỳ cơ sở Grand Palace nào trên toàn quốc
        sẽ được quy đổi thành <strong>1 điểm Royal</strong>. Điểm tích luỹ sẽ tự động cập nhật vào tài khoản trong vòng 24 giờ
        sau khi check-out.
      </p>

      <h2>Bốn hạng thành viên</h2>
      <div className="not-prose grid md:grid-cols-2 gap-4 my-6">
        {tiers.map(t => (
          <div key={t.name} className="border border-primary/20 bg-card p-5 hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-primary/10">
              <div className="flex items-center gap-2">
                <Crown size={14} style={{ color: t.color }} />
                <span className="font-serif text-lg" style={{ color: t.color }}>{t.name}</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.points} điểm</span>
            </div>
            <ul className="space-y-1.5 text-[13px] text-foreground/85">
              {t.perks.map((p, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary text-xs mt-0.5">◆</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <h2>Đặc quyền chung cho mọi hạng</h2>
      <ul>
        <li>Giá thành viên tốt nhất — đảm bảo thấp hơn 5% so với giá công khai.</li>
        <li>Tham dự sự kiện độc quyền: tiệc tri ân, ra mắt menu mới, workshop ẩm thực.</li>
        <li>Quà sinh nhật cá nhân hoá: voucher lưu trú hoặc trải nghiệm spa.</li>
        <li>Đặt phòng linh hoạt — huỷ miễn phí trước 48 giờ.</li>
        <li>Tích điểm chung trên toàn hệ thống Grand Palace tại Hà Nội, Đà Nẵng, TP. HCM.</li>
      </ul>

      <h2>Đăng ký &amp; nâng hạng</h2>
      <p>
        Đăng ký miễn phí tại <a href="/register" className="text-primary hover:underline">grandpalace.vn/register</a> hoặc tại quầy lễ tân của bất kỳ cơ sở nào.
        Hạng thành viên được tự động nâng cấp ngay khi đạt mốc điểm; mỗi hạng được duy trì <strong>24 tháng</strong> kể từ ngày đạt được,
        sau đó sẽ được xét lại dựa trên tổng điểm tích luỹ của 12 tháng gần nhất.
      </p>

      <h2>Quy đổi điểm</h2>
      <ul>
        <li><strong>1.000 điểm</strong> = giảm trực tiếp 100.000đ vào hoá đơn.</li>
        <li><strong>5.000 điểm</strong> = 1 đêm phòng Deluxe (theo tình trạng).</li>
        <li><strong>15.000 điểm</strong> = 1 đêm Suite + bữa sáng cho 2 người.</li>
        <li><strong>50.000 điểm</strong> = Trải nghiệm Royal Stay 3 ngày 2 đêm tại Presidential Suite.</li>
      </ul>
    </PolicyShell>
  );
}

/* ──────────────────────────────────────────────
   3. Privacy Policy — /privacy
────────────────────────────────────────────── */
export function PrivacyPolicyPage() {
  return (
    <PolicyShell
      icon={<Shield size={14} />}
      kicker="Bảo mật"
      title="Chính sách bảo mật thông tin"
      subtitle="Cam kết của Grand Palace về việc thu thập, sử dụng và bảo vệ thông tin cá nhân của quý khách — tuân thủ Nghị định 13/2023/NĐ-CP và GDPR.">

      <h2><Shield size={20} className="text-primary" /> Cam kết của chúng tôi</h2>
      <p>
        Grand Palace Hotels &amp; Resorts cam kết bảo mật tuyệt đối thông tin cá nhân của khách hàng. Chúng tôi tuân thủ
        <strong> Nghị định 13/2023/NĐ-CP</strong> về Bảo vệ Dữ liệu Cá nhân của Việt Nam, đồng thời đáp ứng các tiêu chuẩn
        quốc tế về bảo mật dữ liệu (GDPR, ISO/IEC 27001).
      </p>

      <h2>Thông tin chúng tôi thu thập</h2>
      <ul>
        <li><strong>Thông tin định danh:</strong> Họ tên, ngày sinh, quốc tịch, số CCCD/passport (cần thiết cho đăng ký lưu trú theo luật).</li>
        <li><strong>Thông tin liên hệ:</strong> Email, số điện thoại, địa chỉ.</li>
        <li><strong>Thông tin thanh toán:</strong> Được mã hoá qua cổng thanh toán PCI-DSS, chúng tôi <strong>không lưu trữ</strong> số thẻ đầy đủ.</li>
        <li><strong>Sở thích &amp; lịch sử lưu trú:</strong> Phòng yêu thích, gối, dị ứng, ngôn ngữ, dùng để cá nhân hoá dịch vụ.</li>
        <li><strong>Dữ liệu kỹ thuật:</strong> IP, loại thiết bị, cookies — phục vụ phân tích &amp; bảo mật.</li>
      </ul>

      <h2>Mục đích sử dụng</h2>
      <ul>
        <li>Xử lý đặt phòng, thanh toán, dịch vụ trong thời gian lưu trú.</li>
        <li>Liên hệ xác nhận, gửi hoá đơn điện tử, hỗ trợ chăm sóc khách hàng.</li>
        <li>Cá nhân hoá trải nghiệm — gợi ý phòng, dịch vụ, ưu đãi phù hợp.</li>
        <li>Gửi thông tin khuyến mãi (chỉ khi quý khách đồng ý đăng ký).</li>
        <li>Tuân thủ các yêu cầu pháp lý (báo cáo lưu trú với cơ quan công an theo quy định).</li>
      </ul>

      <h2>Mã hoá &amp; bảo vệ dữ liệu</h2>
      <p>
        Mọi tin nhắn liên hệ và thông tin nhạy cảm được mã hoá <strong>AES-256-GCM</strong> trước khi lưu vào cơ sở dữ liệu.
        Kết nối giữa thiết bị của quý khách và máy chủ Grand Palace được bảo vệ bằng <strong>TLS 1.3</strong>.
        Quyền truy cập dữ liệu nội bộ tuân theo nguyên tắc <em>least privilege</em> — chỉ nhân viên được phân quyền mới có thể xem.
      </p>

      <h2>Chia sẻ thông tin</h2>
      <p>Chúng tôi <strong>không bán, không cho thuê, không chia sẻ</strong> thông tin cá nhân với bên thứ ba ngoài các trường hợp:</p>
      <ul>
        <li>Đối tác cung cấp dịch vụ thiết yếu (cổng thanh toán, gửi email, SMS) — chỉ giới hạn dữ liệu cần thiết.</li>
        <li>Yêu cầu hợp pháp từ cơ quan nhà nước có thẩm quyền.</li>
        <li>Khi quý khách đồng ý rõ ràng (ví dụ: gói trải nghiệm liên kết với spa/airline).</li>
      </ul>

      <h2>Quyền của khách hàng</h2>
      <ul>
        <li><strong>Quyền truy cập:</strong> Yêu cầu bản sao toàn bộ dữ liệu chúng tôi đang lưu về quý khách.</li>
        <li><strong>Quyền chỉnh sửa:</strong> Cập nhật thông tin sai lệch bất kỳ lúc nào.</li>
        <li><strong>Quyền xoá:</strong> Yêu cầu xoá dữ liệu (trừ những dữ liệu phải lưu theo luật).</li>
        <li><strong>Quyền rút lại đồng ý:</strong> Hủy nhận email marketing với 1 click.</li>
        <li><strong>Quyền khiếu nại:</strong> Liên hệ DPO của chúng tôi qua <a href="mailto:privacy@grandpalace.vn" className="text-primary hover:underline">privacy@grandpalace.vn</a>.</li>
      </ul>

      <h2>Cookies</h2>
      <p>
        Website sử dụng cookies cần thiết (đăng nhập, ngôn ngữ, giỏ hàng) và cookies phân tích (Google Analytics — đã ẩn IP).
        Quý khách có thể tắt cookies không cần thiết qua thanh điều khiển ở chân trang.
      </p>

      <h2>Thời gian lưu trữ</h2>
      <p>
        Dữ liệu lưu trú được lưu giữ trong <strong>5 năm</strong> theo quy định của ngành du lịch Việt Nam.
        Dữ liệu marketing tự động xoá sau <strong>24 tháng</strong> không hoạt động. Tài khoản bị xoá theo yêu cầu sẽ được
        ẩn danh trong vòng 30 ngày.
      </p>
    </PolicyShell>
  );
}

/* ──────────────────────────────────────────────
   4. Terms of Use — /terms
────────────────────────────────────────────── */
export function TermsOfUsePage() {
  return (
    <PolicyShell
      icon={<FileText size={14} />}
      kicker="Điều khoản"
      title="Điều khoản sử dụng"
      subtitle="Khi truy cập website hoặc sử dụng dịch vụ tại Grand Palace Hotels & Resorts, quý khách đồng ý tuân thủ các điều khoản dưới đây.">

      <h2><FileText size={20} className="text-primary" /> Phạm vi áp dụng</h2>
      <p>
        Các điều khoản này áp dụng cho mọi hoạt động trên website <strong>grandpalace.vn</strong>, ứng dụng di động và
        các dịch vụ trực tiếp tại 3 cơ sở của Grand Palace tại Hà Nội, Đà Nẵng, TP. Hồ Chí Minh.
        Khi sử dụng bất kỳ dịch vụ nào, quý khách được xem là đã đọc, hiểu và đồng ý với các điều khoản này.
      </p>

      <h2>Tài khoản người dùng</h2>
      <ul>
        <li>Quý khách phải đủ <strong>18 tuổi</strong> hoặc có sự đồng ý của người giám hộ để đăng ký tài khoản.</li>
        <li>Mọi thông tin cung cấp phải <strong>chính xác, đầy đủ và cập nhật</strong>.</li>
        <li>Quý khách chịu trách nhiệm bảo mật mật khẩu và mọi hoạt động dưới tài khoản của mình.</li>
        <li>Grand Palace có quyền tạm khoá hoặc xoá tài khoản vi phạm mà không cần báo trước.</li>
      </ul>

      <h2>Đặt phòng &amp; thanh toán</h2>
      <ul>
        <li>Tất cả mức giá hiển thị bằng VNĐ, đã bao gồm thuế VAT 10% và phí dịch vụ 5%, trừ khi có ghi chú khác.</li>
        <li>Đặt phòng được xác nhận chính thức sau khi quý khách hoàn tất thanh toán/đặt cọc và nhận email xác nhận.</li>
        <li>Tỉ giá hối đoái cho thanh toán quốc tế áp dụng theo công bố của ngân hàng đối tác tại thời điểm giao dịch.</li>
        <li>Hoá đơn điện tử sẽ được gửi qua email trong vòng 24 giờ sau khi check-out.</li>
      </ul>

      <h2>Quy tắc lưu trú</h2>
      <ul>
        <li>Check-in từ 14:00, check-out trước 12:00. Late check-out có thể yêu cầu, áp dụng phí theo quy định.</li>
        <li>Cần xuất trình giấy tờ tuỳ thân hợp lệ (CCCD/Passport) khi nhận phòng.</li>
        <li>Cấm hút thuốc trong phòng. Phí làm sạch <strong>3.000.000đ/lần vi phạm</strong>.</li>
        <li>Khách sạn có quyền từ chối phục vụ khách có hành vi gây mất trật tự hoặc ảnh hưởng đến khách khác.</li>
        <li>Vật nuôi không được phép trừ chó hỗ trợ có giấy chứng nhận theo luật.</li>
      </ul>

      <h2>Sở hữu trí tuệ</h2>
      <p>
        Toàn bộ nội dung trên website (logo, hình ảnh, văn bản, video, mã nguồn) thuộc sở hữu của
        <strong> Grand Palace Hotels &amp; Resorts</strong> hoặc các đối tác đã cấp phép. Cấm sao chép, phân phối hoặc sử dụng
        cho mục đích thương mại mà không có văn bản đồng ý của chúng tôi. Vi phạm sẽ bị xử lý theo Luật Sở hữu trí tuệ Việt Nam.
      </p>

      <h2>Giới hạn trách nhiệm</h2>
      <p>
        Grand Palace nỗ lực đảm bảo thông tin trên website chính xác và cập nhật, nhưng không đảm bảo tuyệt đối về
        tính hoàn hảo. Trong phạm vi pháp luật cho phép, chúng tôi không chịu trách nhiệm đối với:
      </p>
      <ul>
        <li>Thiệt hại gián tiếp phát sinh từ việc sử dụng website (lỗi kết nối, ngừng dịch vụ ngắn hạn).</li>
        <li>Thông tin từ các website bên thứ ba được liên kết từ trang của chúng tôi.</li>
        <li>Tài sản cá nhân quý khách để trong phòng — vui lòng sử dụng két sắt được trang bị.</li>
      </ul>

      <h2>Thay đổi điều khoản</h2>
      <p>
        Grand Palace có quyền cập nhật các điều khoản này bất kỳ lúc nào. Các thay đổi quan trọng sẽ được thông báo qua email
        cho thành viên ít nhất <strong>30 ngày</strong> trước khi có hiệu lực. Việc tiếp tục sử dụng dịch vụ sau khi cập nhật
        đồng nghĩa với việc quý khách chấp nhận điều khoản mới.
      </p>

      <h2>Luật áp dụng &amp; giải quyết tranh chấp</h2>
      <p>
        Các điều khoản này được điều chỉnh bởi <strong>pháp luật Việt Nam</strong>. Mọi tranh chấp phát sinh sẽ được ưu tiên
        giải quyết qua thương lượng. Nếu không đạt được thoả thuận, vụ việc sẽ được đưa ra
        <strong> Toà án Nhân dân TP. Hà Nội</strong> để giải quyết.
      </p>
    </PolicyShell>
  );
}
