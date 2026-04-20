import { createContext, useContext, useState, useCallback, ReactNode } from "react";

/* ──────────────────────────────────────────────
   Block Types & Field Schema
────────────────────────────────────────────── */

export type BlockType =
  | "hero"
  | "destinations"
  | "experiences"
  | "features"
  | "text_block"
  | "cta_banner"
  | "gallery"
  | "separator"
  | "contact_form"
  | "map"
  | "testimonials"
  | "faq"
  | "stats"
  | "video"
  | "team"
  | "two_columns";

export interface PageBlock {
  id: string;
  type: BlockType;
  visible: boolean;
  settings: Record<string, any>;
}

export interface BlockField {
  key: string;
  label: string;
  type: "text" | "textarea" | "richtext" | "url" | "image" | "select" | "repeater" | "color";
  placeholder?: string;
  options?: { value: string; label: string }[];
  itemFields?: BlockField[];
}

export interface BlockDefinition {
  type: BlockType;
  label: string;
  icon: string;
  description: string;
  color: string;
  category: "basic" | "media" | "engagement" | "data";
  fields: BlockField[];
  defaultSettings: Record<string, any>;
}

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  /* ───── BASIC ───── */
  {
    type: "hero",
    label: "Hero Banner",
    icon: "🖼",
    description: "Banner full-screen với ảnh nền",
    color: "#8B5CF6",
    category: "basic",
    fields: [
      { key: "imageUrl", label: "Ảnh nền", type: "image", placeholder: "/images/hero.png" },
      { key: "kicker", label: "Tagline phía trên", type: "text" },
      { key: "title1", label: "Tiêu đề dòng 1", type: "text" },
      { key: "title2", label: "Tiêu đề dòng 2", type: "text" },
      { key: "subtitle", label: "Mô tả phụ", type: "textarea" },
      { key: "cta", label: "Nội dung nút CTA", type: "text" },
    ],
    defaultSettings: {
      imageUrl: "/images/hero.png",
      kicker: "Tinh hoa của sự xa hoa",
      title1: "Trải Nghiệm Hoàng Gia",
      title2: "Tại Việt Nam",
      subtitle: "Tận hưởng không gian thanh lịch, dịch vụ tinh tế và sự riêng tư tuyệt đối tại chuỗi khách sạn 5 sao.",
      cta: "Khám phá điểm đến",
    },
  },
  {
    type: "text_block",
    label: "Khối Văn Bản",
    icon: "📝",
    description: "Văn bản tự do căn giữa",
    color: "#6B7280",
    category: "basic",
    fields: [
      { key: "kicker", label: "Tagline", type: "text" },
      { key: "title", label: "Tiêu đề", type: "text" },
      { key: "body", label: "Nội dung", type: "textarea" },
      {
        key: "background", label: "Màu nền", type: "select",
        options: [
          { value: "light", label: "Sáng (mặc định)" },
          { value: "dark", label: "Tối (Navy)" },
        ],
      },
    ],
    defaultSettings: { kicker: "", title: "Tiêu đề mới", body: "Nhập nội dung...", background: "light" },
  },
  {
    type: "two_columns",
    label: "Hai Cột (Văn bản)",
    icon: "▦",
    description: "Bố cục hai cột với tiêu đề và nội dung",
    color: "#7C3AED",
    category: "basic",
    fields: [
      { key: "title", label: "Tiêu đề chung", type: "text" },
      { key: "leftTitle", label: "Cột trái — Tiêu đề", type: "text" },
      { key: "leftBody", label: "Cột trái — Nội dung", type: "textarea" },
      { key: "rightTitle", label: "Cột phải — Tiêu đề", type: "text" },
      { key: "rightBody", label: "Cột phải — Nội dung", type: "textarea" },
    ],
    defaultSettings: {
      title: "Cam kết của chúng tôi",
      leftTitle: "Sang trọng",
      leftBody: "Mỗi chi tiết được chăm chút tỉ mỉ để mang đến trải nghiệm hoàng gia.",
      rightTitle: "Đẳng cấp",
      rightBody: "Đội ngũ phục vụ chuyên nghiệp 24/7 với tiêu chuẩn 5 sao quốc tế.",
    },
  },
  {
    type: "separator",
    label: "Phân Cách",
    icon: "⸻",
    description: "Đường phân cách trang trí",
    color: "#D4AF37",
    category: "basic",
    fields: [
      {
        key: "style", label: "Kiểu", type: "select",
        options: [
          { value: "diamond", label: "Kim cương (Diamond)" },
          { value: "line", label: "Đường kẻ đơn giản" },
          { value: "ornament", label: "Trang trí (Ornament)" },
        ],
      },
    ],
    defaultSettings: { style: "diamond" },
  },

  /* ───── MEDIA ───── */
  {
    type: "gallery",
    label: "Thư Viện Ảnh",
    icon: "🖼️",
    description: "Lưới ảnh tùy chỉnh",
    color: "#EC4899",
    category: "media",
    fields: [
      { key: "title", label: "Tiêu đề", type: "text" },
      {
        key: "images", label: "Danh sách ảnh", type: "repeater",
        itemFields: [
          { key: "url", label: "Ảnh", type: "image" },
          { key: "caption", label: "Chú thích", type: "text" },
        ],
      },
    ],
    defaultSettings: {
      title: "Thư Viện Ảnh",
      images: [
        { url: "/images/hero.png", caption: "Lobby sang trọng" },
        { url: "/images/restaurant.png", caption: "Nhà hàng đẳng cấp" },
        { url: "/images/hotel-hanoi.png", caption: "MAISON DELUXE Hà Nội" },
      ],
    },
  },
  {
    type: "video",
    label: "Video Nhúng",
    icon: "🎬",
    description: "Nhúng video YouTube/Vimeo",
    color: "#DC2626",
    category: "media",
    fields: [
      { key: "title", label: "Tiêu đề", type: "text" },
      { key: "subtitle", label: "Mô tả", type: "textarea" },
      { key: "videoUrl", label: "URL video (YouTube/Vimeo)", type: "url", placeholder: "https://youtube.com/watch?v=..." },
      { key: "posterUrl", label: "Ảnh poster (tùy chọn)", type: "image" },
    ],
    defaultSettings: {
      title: "Khám phá MAISON DELUXE",
      subtitle: "Một thước phim ngắn về không gian sang trọng của chúng tôi",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      posterUrl: "",
    },
  },
  {
    type: "map",
    label: "Bản Đồ",
    icon: "🗺️",
    description: "Bản đồ Google Maps nhúng",
    color: "#059669",
    category: "media",
    fields: [
      { key: "title", label: "Tiêu đề", type: "text" },
      { key: "address", label: "Địa chỉ hiển thị", type: "text" },
      { key: "embedUrl", label: "Google Maps Embed URL", type: "url", placeholder: "https://www.google.com/maps/embed?pb=..." },
      { key: "height", label: "Chiều cao (px)", type: "text", placeholder: "450" },
    ],
    defaultSettings: {
      title: "Vị trí của chúng tôi",
      address: "Số 1 Đường Hoàng Diệu, Ba Đình, Hà Nội",
      embedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3724.0!2d105.83991!3d21.0285!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjHCsDAxJzM0LjYiTiAxMDXCsDUwJzIzLjciRQ!5e0!3m2!1svi!2s!4v1700000000000",
      height: "450",
    },
  },

  /* ───── ENGAGEMENT ───── */
  {
    type: "cta_banner",
    label: "Banner CTA",
    icon: "📣",
    description: "Banner kêu gọi hành động",
    color: "#EF4444",
    category: "engagement",
    fields: [
      { key: "title", label: "Tiêu đề", type: "text" },
      { key: "subtitle", label: "Phụ đề", type: "text" },
      { key: "ctaText", label: "Nội dung nút", type: "text" },
      { key: "ctaLink", label: "Link nút", type: "url" },
      { key: "imageUrl", label: "Ảnh nền", type: "image" },
    ],
    defaultSettings: {
      title: "Đặt phòng ngay hôm nay",
      subtitle: "Ưu đãi đặc biệt — tiết kiệm đến 30%",
      ctaText: "Đặt ngay",
      ctaLink: "/hotels/1",
      imageUrl: "/images/hero.png",
    },
  },
  {
    type: "contact_form",
    label: "Form Liên Hệ",
    icon: "✉️",
    description: "Form gửi tin nhắn liên hệ",
    color: "#0EA5E9",
    category: "engagement",
    fields: [
      { key: "title", label: "Tiêu đề", type: "text" },
      { key: "subtitle", label: "Mô tả", type: "textarea" },
      { key: "namePlaceholder", label: "Placeholder Tên", type: "text" },
      { key: "emailPlaceholder", label: "Placeholder Email", type: "text" },
      { key: "messagePlaceholder", label: "Placeholder Tin nhắn", type: "text" },
      { key: "submitText", label: "Nội dung nút gửi", type: "text" },
      { key: "successMessage", label: "Thông báo thành công", type: "text" },
    ],
    defaultSettings: {
      title: "Liên Hệ Với Chúng Tôi",
      subtitle: "Để lại tin nhắn và đội ngũ Concierge sẽ phản hồi trong vòng 24 giờ.",
      namePlaceholder: "Họ và tên",
      emailPlaceholder: "Địa chỉ email",
      messagePlaceholder: "Tin nhắn của quý khách...",
      submitText: "Gửi tin nhắn",
      successMessage: "Cảm ơn! Chúng tôi sẽ liên hệ sớm nhất có thể.",
    },
  },
  {
    type: "faq",
    label: "Câu Hỏi Thường Gặp",
    icon: "❓",
    description: "Accordion câu hỏi thường gặp",
    color: "#F97316",
    category: "engagement",
    fields: [
      { key: "kicker", label: "Tagline", type: "text" },
      { key: "title", label: "Tiêu đề", type: "text" },
      {
        key: "items", label: "Câu hỏi & trả lời", type: "repeater",
        itemFields: [
          { key: "question", label: "Câu hỏi", type: "text" },
          { key: "answer", label: "Câu trả lời", type: "textarea" },
        ],
      },
    ],
    defaultSettings: {
      kicker: "FAQ",
      title: "Câu Hỏi Thường Gặp",
      items: [
        { question: "Thời gian check-in / check-out?", answer: "Check-in từ 14:00, Check-out trước 12:00. Liên hệ Concierge để được sắp xếp linh hoạt." },
        { question: "Khách sạn có bữa sáng buffet?", answer: "Có. Tất cả các phòng đều bao gồm bữa sáng buffet với menu Á-Âu phong phú." },
        { question: "Chính sách hủy phòng?", answer: "Hủy miễn phí trước 48 giờ. Sau thời gian này sẽ tính phí 1 đêm đầu tiên." },
        { question: "Có dịch vụ đưa đón sân bay?", answer: "Có. Vui lòng đặt trước 24 giờ với mức giá ưu đãi cho khách lưu trú." },
      ],
    },
  },
  {
    type: "testimonials",
    label: "Đánh Giá Khách Hàng",
    icon: "⭐",
    description: "Lời chứng thực từ khách hàng",
    color: "#A855F7",
    category: "engagement",
    fields: [
      { key: "title", label: "Tiêu đề", type: "text" },
      {
        key: "items", label: "Đánh giá", type: "repeater",
        itemFields: [
          { key: "name", label: "Tên khách", type: "text" },
          { key: "role", label: "Vai trò / Quốc gia", type: "text" },
          { key: "quote", label: "Lời đánh giá", type: "textarea" },
          { key: "avatar", label: "Avatar URL (tùy chọn)", type: "image" },
          { key: "rating", label: "Số sao (1-5)", type: "text" },
        ],
      },
    ],
    defaultSettings: {
      title: "Khách hàng nói gì về chúng tôi",
      items: [
        { name: "Nguyễn Minh Anh", role: "Doanh nhân · Hà Nội", quote: "Trải nghiệm tuyệt vời, dịch vụ vượt mong đợi. Sẽ quay lại!", avatar: "", rating: "5" },
        { name: "Sarah Johnson", role: "Tourist · UK", quote: "Beautiful property and impeccable service. Highly recommended.", avatar: "", rating: "5" },
        { name: "Tanaka Yuki", role: "Business · Japan", quote: "格別のおもてなしでした。素晴らしい滞在を楽しめました。", avatar: "", rating: "5" },
      ],
    },
  },

  /* ───── DATA ───── */
  {
    type: "destinations",
    label: "Điểm Đến (DB)",
    icon: "🏨",
    description: "Danh sách khách sạn từ DB",
    color: "#F59E0B",
    category: "data",
    fields: [
      { key: "kicker", label: "Tagline", type: "text" },
      { key: "title", label: "Tiêu đề", type: "text" },
    ],
    defaultSettings: { kicker: "Các điểm đến", title: "Nơi cảm xúc thăng hoa" },
  },
  {
    type: "experiences",
    label: "Trải Nghiệm",
    icon: "✨",
    description: "Phần trải nghiệm với ảnh",
    color: "#10B981",
    category: "data",
    fields: [
      { key: "imageUrl", label: "Ảnh", type: "image" },
      { key: "kicker", label: "Tagline", type: "text" },
      { key: "title", label: "Tiêu đề", type: "text" },
      { key: "body", label: "Nội dung", type: "textarea" },
      { key: "quote", label: "Trích dẫn trên ảnh", type: "text" },
      { key: "item1", label: "Bullet 1", type: "text" },
      { key: "item2", label: "Bullet 2", type: "text" },
      { key: "item3", label: "Bullet 3", type: "text" },
      { key: "item4", label: "Bullet 4", type: "text" },
      { key: "cta", label: "Nút CTA", type: "text" },
    ],
    defaultSettings: {
      imageUrl: "/images/restaurant.png",
      kicker: "Trải nghiệm",
      title: "Dấu ấn khó phai",
      body: "Tại MAISON DELUXE, mỗi khoảnh khắc đều được thiết kế để trở thành kỷ niệm vô giá.",
      quote: "\"Nghệ thuật ẩm thực đỉnh cao\"",
      item1: "Nhà hàng đạt chuẩn quốc tế",
      item2: "Spa & Wellness cao cấp",
      item3: "Hồ bơi vô cực toàn cảnh",
      item4: "Butler riêng & phục vụ 24/7",
      cta: "Khám phá thêm",
    },
  },
  {
    type: "features",
    label: "Tiện Nghi",
    icon: "⭐",
    description: "Lưới tiện nghi với icon",
    color: "#3B82F6",
    category: "data",
    fields: [
      { key: "kicker", label: "Tagline", type: "text" },
      { key: "title", label: "Tiêu đề", type: "text" },
      {
        key: "items", label: "Danh sách tiện nghi", type: "repeater",
        itemFields: [
          { key: "icon", label: "Icon (emoji)", type: "text", placeholder: "🏊" },
          { key: "title", label: "Tiêu đề", type: "text" },
          { key: "description", label: "Mô tả", type: "textarea" },
        ],
      },
    ],
    defaultSettings: {
      kicker: "Tiện nghi",
      title: "Dịch vụ đẳng cấp 5 sao",
      items: [
        { icon: "🏊", title: "Hồ bơi vô cực", description: "Tầm nhìn panorama toàn thành phố" },
        { icon: "🍽️", title: "Ẩm thực đỉnh cao", description: "Nhà hàng chuẩn Michelin" },
        { icon: "💆", title: "Spa cao cấp", description: "Liệu trình phục hồi toàn diện" },
        { icon: "🏋️", title: "Fitness Center", description: "Thiết bị hiện đại 24/7" },
        { icon: "🚗", title: "Đưa đón sân bay", description: "Xe VIP chuyên nghiệp" },
        { icon: "👨‍🍳", title: "Butler riêng", description: "Phục vụ cá nhân tận tâm" },
      ],
    },
  },
  {
    type: "stats",
    label: "Số Liệu Ấn Tượng",
    icon: "📊",
    description: "Counters / số liệu thống kê",
    color: "#0891B2",
    category: "data",
    fields: [
      { key: "title", label: "Tiêu đề", type: "text" },
      {
        key: "items", label: "Các số liệu", type: "repeater",
        itemFields: [
          { key: "number", label: "Con số", type: "text", placeholder: "1500+" },
          { key: "label", label: "Nhãn", type: "text", placeholder: "Khách hàng hài lòng" },
        ],
      },
    ],
    defaultSettings: {
      title: "MAISON DELUXE bằng những con số",
      items: [
        { number: "3", label: "Khách sạn 5 sao" },
        { number: "850+", label: "Phòng cao cấp" },
        { number: "50K+", label: "Khách lưu trú" },
        { number: "4.9★", label: "Đánh giá trung bình" },
      ],
    },
  },
  {
    type: "team",
    label: "Đội Ngũ",
    icon: "👥",
    description: "Giới thiệu đội ngũ",
    color: "#DB2777",
    category: "data",
    fields: [
      { key: "title", label: "Tiêu đề", type: "text" },
      { key: "subtitle", label: "Mô tả", type: "textarea" },
      {
        key: "items", label: "Thành viên", type: "repeater",
        itemFields: [
          { key: "name", label: "Họ tên", type: "text" },
          { key: "role", label: "Chức vụ", type: "text" },
          { key: "avatar", label: "Ảnh đại diện", type: "image" },
        ],
      },
    ],
    defaultSettings: {
      title: "Đội Ngũ Lãnh Đạo",
      subtitle: "Những con người tạo nên sự khác biệt của MAISON DELUXE",
      items: [
        { name: "Trần Văn Hùng", role: "Tổng Giám Đốc", avatar: "" },
        { name: "Lê Thị Hoa", role: "Giám đốc Vận hành", avatar: "" },
        { name: "Pierre Dupont", role: "Bếp Trưởng Điều Hành", avatar: "" },
      ],
    },
  },
];

/* ──────────────────────────────────────────────
   Multi-Page Data Model
────────────────────────────────────────────── */

export type PageCategory = "main" | "info" | "policy" | "support" | "custom";

export const PAGE_CATEGORIES: { value: PageCategory; label: string; color: string }[] = [
  { value: "main",    label: "Trang chính",   color: "#D4AF37" },
  { value: "info",    label: "Thông tin",     color: "#3B82F6" },
  { value: "policy",  label: "Chính sách",    color: "#EF4444" },
  { value: "support", label: "Hỗ trợ khách",  color: "#10B981" },
  { value: "custom",  label: "Tuỳ chỉnh",     color: "#6B7280" },
];

export interface SitePage {
  id: string;
  slug: string;
  title: string;
  category?: PageCategory;
  blocks: PageBlock[];
}

const PAGES_STORAGE_KEY = "grand-palace-site-pages";

let _seq = 0;
export function genBlockId(): string {
  return `blk_${Date.now()}_${++_seq}`;
}
function genPageId(): string {
  return `pg_${Date.now()}_${++_seq}`;
}

function defaultSettingsFor(type: BlockType) {
  return { ...BLOCK_DEFINITIONS.find(d => d.type === type)!.defaultSettings };
}

const HOME_BLOCKS: PageBlock[] = [
  { id: genBlockId(), type: "hero", visible: true, settings: defaultSettingsFor("hero") },
  { id: genBlockId(), type: "destinations", visible: true, settings: defaultSettingsFor("destinations") },
  { id: genBlockId(), type: "experiences", visible: true, settings: defaultSettingsFor("experiences") },
];

const CONTACT_BLOCKS: PageBlock[] = [
  {
    id: genBlockId(), type: "hero", visible: true, settings: {
      ...defaultSettingsFor("hero"),
      kicker: "Chào mừng",
      title1: "Liên Hệ",
      title2: "Với MAISON DELUXE",
      subtitle: "Đội ngũ Concierge của chúng tôi luôn sẵn sàng phục vụ 24/7.",
      cta: "Cuộn xuống để liên hệ",
    },
  },
  { id: genBlockId(), type: "contact_form", visible: true, settings: defaultSettingsFor("contact_form") },
  { id: genBlockId(), type: "map", visible: true, settings: defaultSettingsFor("map") },
];

function makeText(title: string, body: string, kicker = "", background: "light" | "dark" = "light"): PageBlock {
  return { id: genBlockId(), type: "text_block", visible: true, settings: { kicker, title, body, background } };
}
function makeFaq(title: string, items: { question: string; answer: string }[], kicker = "FAQ"): PageBlock {
  return { id: genBlockId(), type: "faq", visible: true, settings: { kicker, title, items } };
}

const FAQ_BLOCKS: PageBlock[] = [
  makeText(
    "Câu hỏi thường gặp",
    "Tổng hợp những thắc mắc phổ biến nhất từ quý khách về dịch vụ, đặt phòng, thanh toán và lưu trú tại MAISON DELUXE Hotels & Resorts. Nếu không tìm thấy câu trả lời, vui lòng liên hệ Concierge 24/7.",
    "Hỗ trợ khách hàng",
  ),
  makeFaq("Đặt phòng & Thanh toán", [
    { question: "Tôi có thể đặt phòng bằng những phương thức nào?", answer: "Quý khách có thể đặt phòng trực tuyến tại website MAISON DELUXE, gọi Hotline 0900 000 000 24/7, hoặc qua các kênh OTA: Booking.com, Agoda, Expedia, Airbnb, Traveloka, Trip.com." },
    { question: "Hệ thống chấp nhận thanh toán nào?", answer: "Chúng tôi chấp nhận: VietQR (chuyển khoản nhanh), thẻ tín dụng Visa/Mastercard/JCB/Amex, ví MoMo/ZaloPay/VNPay, và thanh toán tại quầy bằng tiền mặt VND/USD." },
    { question: "Tôi có cần đặt cọc khi đặt phòng?", answer: "Phòng hạng Standard và Deluxe yêu cầu đặt cọc 30% giá trị đơn. Phòng Suite và Villa yêu cầu thanh toán 100% trước. Hoàn tiền theo chính sách huỷ." },
    { question: "Giá phòng đã bao gồm thuế và phí dịch vụ?", answer: "Tất cả giá hiển thị đã bao gồm 10% VAT và 5% phí dịch vụ. Không có phụ phí ẩn." },
  ], "Đặt phòng"),
  makeFaq("Lưu trú tại khách sạn", [
    { question: "Thời gian check-in / check-out chuẩn?", answer: "Check-in từ 14:00, check-out trước 12:00 trưa. Sắp xếp linh hoạt sớm/muộn miễn phí tuỳ theo tình trạng phòng." },
    { question: "Khách sạn có bữa sáng buffet?", answer: "Có. Tất cả các đặt phòng đều bao gồm bữa sáng buffet quốc tế (Á-Âu) phục vụ từ 06:30-10:30 hàng ngày tại nhà hàng chính." },
    { question: "Có dịch vụ đưa đón sân bay không?", answer: "Có. Xe Mercedes/BMW VIP đưa đón từ Nội Bài, Tân Sơn Nhất, Đà Nẵng. Đặt trước 24 giờ qua Concierge với mức ưu đãi cho khách lưu trú." },
    { question: "Wifi miễn phí?", answer: "Wifi tốc độ cao miễn phí toàn khu vực — phòng nghỉ, lobby, hồ bơi, nhà hàng. Mật khẩu sẽ được cung cấp khi check-in." },
    { question: "Có cho phép thú cưng?", answer: "Một số phòng được thiết kế Pet-Friendly với phí phụ thu 500.000đ/đêm. Vui lòng đăng ký trước khi đặt phòng." },
  ], "Lưu trú"),
  makeFaq("Tiện nghi & Dịch vụ", [
    { question: "Khách sạn có hồ bơi và spa không?", answer: "Có hồ bơi vô cực mở cửa 06:00-22:00, miễn phí cho khách lưu trú. Spa cao cấp với liệu trình từ massage, facial đến yoga & thiền — đặt lịch qua Concierge." },
    { question: "Có phòng họp / sự kiện cho doanh nghiệp?", answer: "Chúng tôi có 5 phòng họp đa năng từ 20-300 chỗ, tiệc cưới ballroom 500 chỗ, đầy đủ thiết bị AV. Liên hệ Sales để được báo giá riêng." },
    { question: "Trẻ em ở miễn phí?", answer: "Trẻ em dưới 6 tuổi ở miễn phí khi dùng chung giường bố mẹ. Thêm giường phụ phụ thu 300.000đ/đêm bao gồm bữa sáng cho 1 trẻ 6-12 tuổi." },
  ], "Tiện nghi"),
];

const CANCELLATION_BLOCKS: PageBlock[] = [
  makeText(
    "Chính sách huỷ phòng",
    `<p>Tại <strong>MAISON DELUXE Hotels & Resorts</strong>, chúng tôi cam kết minh bạch và linh hoạt trong mọi giao dịch. Vui lòng đọc kỹ chính sách huỷ phòng dưới đây trước khi xác nhận đặt phòng.</p>

<h2>1. Huỷ miễn phí</h2>
<p>Quý khách được huỷ miễn phí 100% nếu thông báo trước <strong>48 giờ</strong> so với giờ check-in (14:00 ngày đến). Tiền hoàn về ví/thẻ trong 5-7 ngày làm việc.</p>

<h2>2. Phí huỷ muộn</h2>
<ul>
<li>Huỷ trong vòng <strong>24-48 giờ</strong> trước check-in: phí bằng <strong>1 đêm đầu tiên</strong>.</li>
<li>Huỷ trong vòng <strong>24 giờ</strong> hoặc no-show: phí bằng <strong>100% tổng giá trị đơn</strong>.</li>
</ul>

<h2>3. Trường hợp bất khả kháng</h2>
<p>Trong trường hợp thiên tai, dịch bệnh, hoãn chuyến bay (có giấy xác nhận hãng bay), chúng tôi sẽ <strong>miễn phí huỷ hoặc dời lịch</strong> trong vòng 12 tháng.</p>

<h2>4. Đặt phòng không hoàn tiền</h2>
<p>Các gói "Early Bird" / "Saver" được giảm sâu hơn nhưng <strong>không thể huỷ hoặc thay đổi</strong> sau khi xác nhận. Vui lòng đọc kỹ điều kiện trước khi đặt.</p>

<h2>5. Đặt phòng qua OTA</h2>
<p>Đối với đặt phòng qua Booking.com, Agoda, Expedia, Airbnb, Traveloka, Trip.com — chính sách huỷ áp dụng theo kênh đó. Vui lòng liên hệ trực tiếp OTA quý vị đã đặt.</p>

<h2>6. Liên hệ huỷ phòng</h2>
<p>Email: <strong>cancel@maisondeluxe.vn</strong> · Hotline: <strong>0900 000 000</strong> (24/7)</p>`,
    "Chính sách",
  ),
];

const MEMBERSHIP_BLOCKS: PageBlock[] = [
  makeText(
    "MAISON DELUXE Privilege",
    `<p>Chương trình khách hàng thân thiết <strong>MAISON DELUXE Privilege</strong> tri ân quý khách với những đặc quyền được thiết kế riêng — từ ưu đãi giá phòng, nâng cấp miễn phí đến trải nghiệm độc quyền tại 3 khu nghỉ dưỡng của chúng tôi.</p>`,
    "Chương trình thành viên",
  ),
  {
    id: genBlockId(), type: "features", visible: true, settings: {
      kicker: "4 hạng thành viên",
      title: "Đặc quyền theo từng hạng",
      items: [
        { icon: "🥉", title: "Silver Member",   description: "Từ 1 đêm đầu tiên · Giảm 5% giá phòng · Welcome drink · Late check-out 13:00 (theo tình trạng phòng)" },
        { icon: "🥈", title: "Gold Member",     description: "Từ 5 đêm/năm · Giảm 10% · Nâng cấp phòng miễn phí · Bữa sáng cho 2 người · Tích điểm 1.5x" },
        { icon: "🥇", title: "Platinum Member", description: "Từ 15 đêm/năm · Giảm 15% · Phòng Junior Suite · Đưa đón sân bay · Spa welcome treatment · Tích điểm 2x" },
        { icon: "💎", title: "Diamond Member",  description: "Từ 30 đêm/năm · Giảm 20% · Suite/Villa · Butler riêng · Buffet trưa & tối · Trải nghiệm độc quyền · Tích điểm 3x" },
      ],
    },
  },
  makeText(
    "Tích điểm — Đổi quà",
    `<h2>Tích điểm thế nào?</h2>
<p>Mỗi <strong>1.000.000 VND</strong> chi tiêu (phòng, F&B, spa, giặt là) = <strong>10 điểm Privilege</strong>. Điểm hiển thị tức thì trên app & dashboard.</p>

<h2>Đổi điểm thế nào?</h2>
<ul>
<li><strong>100 điểm</strong> = 1 đêm Standard tại bất kỳ MAISON DELUXE nào</li>
<li><strong>250 điểm</strong> = 1 đêm Suite + bữa sáng</li>
<li><strong>500 điểm</strong> = Voucher spa cao cấp 90 phút</li>
<li><strong>1000 điểm</strong> = Trọn gói nghỉ dưỡng 3 ngày 2 đêm Villa</li>
</ul>

<h2>Điểm có hết hạn?</h2>
<p>Điểm có giá trị <strong>24 tháng</strong> kể từ ngày tích. Đăng ký miễn phí trọn đời tại quầy lễ tân hoặc qua app MAISON DELUXE.</p>`,
  ),
  {
    id: genBlockId(), type: "cta_banner", visible: true, settings: {
      title: "Tham gia ngay hôm nay",
      subtitle: "Miễn phí trọn đời — đặc quyền lập tức ngay đêm đầu tiên",
      ctaText: "Đăng ký Privilege",
      ctaLink: "/contact",
      imageUrl: "",
    },
  },
];

const PRIVACY_BLOCKS: PageBlock[] = [
  makeText(
    "Chính sách bảo mật thông tin",
    `<p>MAISON DELUXE Hotels & Resorts tôn trọng và cam kết bảo vệ thông tin cá nhân của quý khách theo đúng quy định của <strong>Luật An toàn thông tin mạng 2015</strong> và <strong>Nghị định 13/2023/NĐ-CP</strong> về bảo vệ dữ liệu cá nhân.</p>

<h2>1. Thông tin chúng tôi thu thập</h2>
<ul>
<li><strong>Thông tin định danh:</strong> Họ tên, CMND/CCCD/Hộ chiếu, ngày sinh, quốc tịch (theo yêu cầu Luật Cư trú).</li>
<li><strong>Thông tin liên hệ:</strong> Email, số điện thoại, địa chỉ.</li>
<li><strong>Thông tin thanh toán:</strong> Thông tin thẻ được mã hoá end-to-end, lưu tại bên thanh toán đạt chuẩn PCI-DSS.</li>
<li><strong>Lịch sử lưu trú & sở thích:</strong> Để cá nhân hoá dịch vụ.</li>
</ul>

<h2>2. Mục đích sử dụng</h2>
<ul>
<li>Xử lý đặt phòng, thanh toán, xuất hoá đơn.</li>
<li>Khai báo lưu trú với cơ quan quản lý xuất nhập cảnh theo luật.</li>
<li>Gửi xác nhận, nhắc nhở, thông tin chương trình thành viên.</li>
<li>Cải thiện chất lượng dịch vụ & cá nhân hoá trải nghiệm.</li>
</ul>

<h2>3. Chia sẻ thông tin</h2>
<p>Chúng tôi <strong>KHÔNG bán hoặc cho thuê</strong> thông tin cá nhân. Chỉ chia sẻ với:</p>
<ul>
<li>Cơ quan chức năng khi có yêu cầu hợp pháp.</li>
<li>Đối tác thanh toán (Stripe, MoMo, VNPay) — đã ký NDA.</li>
<li>OTA bên thứ ba khi quý khách đặt phòng qua kênh đó.</li>
</ul>

<h2>4. Quyền của quý khách</h2>
<ul>
<li><strong>Quyền truy cập</strong> — xem thông tin của mình bất kỳ lúc nào.</li>
<li><strong>Quyền chỉnh sửa</strong> — yêu cầu cập nhật thông tin sai lệch.</li>
<li><strong>Quyền xoá</strong> — yêu cầu xoá vĩnh viễn (sau khi hoàn tất giao dịch).</li>
<li><strong>Quyền rút đồng ý</strong> — huỷ nhận email marketing bất cứ lúc nào.</li>
</ul>

<h2>5. Bảo mật kỹ thuật</h2>
<p>Chúng tôi áp dụng SSL/TLS 256-bit, mã hoá AES-256 cho dữ liệu lưu trữ, xác thực 2 lớp cho hệ thống nội bộ, audit log đầy đủ và backup mã hoá hàng ngày.</p>

<h2>6. Cookie & tracking</h2>
<p>Website sử dụng cookie để ghi nhớ tuỳ chọn ngôn ngữ, giỏ hàng và phân tích hành vi (Google Analytics ẩn danh). Quý khách có thể tắt cookie tại trình duyệt.</p>

<h2>7. Liên hệ về quyền riêng tư</h2>
<p>Data Protection Officer: <strong>privacy@maisondeluxe.vn</strong> · Hotline: <strong>0900 000 000</strong></p>`,
    "Bảo mật",
  ),
];

const TERMS_BLOCKS: PageBlock[] = [
  makeText(
    "Điều khoản sử dụng",
    `<p>Khi truy cập và sử dụng website, ứng dụng và dịch vụ của <strong>MAISON DELUXE Hotels & Resorts</strong>, quý khách đồng ý tuân thủ các điều khoản dưới đây.</p>

<h2>1. Định nghĩa</h2>
<p>"MAISON DELUXE", "chúng tôi", "công ty" — chỉ Công ty TNHH MAISON DELUXE Hotels & Resorts, có trụ sở tại Việt Nam.<br/>"Khách hàng", "quý khách", "bạn" — chỉ cá nhân/tổ chức sử dụng dịch vụ.</p>

<h2>2. Tài khoản người dùng</h2>
<ul>
<li>Quý khách phải cung cấp thông tin <strong>chính xác và đầy đủ</strong> khi đăng ký.</li>
<li>Quý khách có trách nhiệm bảo mật mật khẩu và mọi hoạt động dưới tài khoản của mình.</li>
<li>Chúng tôi có quyền tạm khoá tài khoản nếu phát hiện gian lận, lạm dụng hoặc vi phạm điều khoản.</li>
</ul>

<h2>3. Đặt phòng & Thanh toán</h2>
<ul>
<li>Đặt phòng chỉ được xác nhận sau khi nhận được thanh toán/đặt cọc theo chính sách.</li>
<li>Giá phòng có thể thay đổi tuỳ thời điểm. Giá xác nhận tại email/SMS xác nhận là giá cuối cùng.</li>
<li>Thanh toán được xử lý qua các cổng đạt chuẩn PCI-DSS — chúng tôi không lưu trữ số thẻ.</li>
</ul>

<h2>4. Quy định lưu trú</h2>
<ul>
<li>Khách trên 18 tuổi mới được tự đăng ký. Khách dưới 18 phải có cha mẹ/người giám hộ.</li>
<li>Cấm hút thuốc trong phòng — phí phạt 2.000.000đ/lần vi phạm.</li>
<li>Cấm mang chất cấm, vũ khí, hoá chất nguy hiểm vào khách sạn.</li>
<li>Mọi thiệt hại về tài sản do khách gây ra sẽ được tính phí theo giá thay thế.</li>
</ul>

<h2>5. Sở hữu trí tuệ</h2>
<p>Toàn bộ nội dung (logo, hình ảnh, văn bản, video, mã nguồn) trên website thuộc sở hữu của MAISON DELUXE. <strong>Cấm sao chép, phân phối, sửa đổi</strong> dưới mọi hình thức nếu không có văn bản chấp thuận.</p>

<h2>6. Giới hạn trách nhiệm</h2>
<p>MAISON DELUXE không chịu trách nhiệm với:</p>
<ul>
<li>Tài sản cá nhân không gửi két an toàn.</li>
<li>Thiệt hại gián tiếp/ngẫu nhiên ngoài tầm kiểm soát.</li>
<li>Gián đoạn dịch vụ do bất khả kháng (thiên tai, dịch bệnh, sự cố hạ tầng).</li>
</ul>

<h2>7. Thay đổi điều khoản</h2>
<p>Chúng tôi có quyền cập nhật điều khoản bất cứ lúc nào. Phiên bản mới có hiệu lực ngay khi đăng tải. Quý khách nên kiểm tra định kỳ.</p>

<h2>8. Luật áp dụng & giải quyết tranh chấp</h2>
<p>Điều khoản này tuân theo <strong>luật pháp Việt Nam</strong>. Mọi tranh chấp sẽ được giải quyết tại Toà án có thẩm quyền tại TP.HCM.</p>

<h2>9. Liên hệ pháp lý</h2>
<p>Phòng Pháp chế: <strong>legal@maisondeluxe.vn</strong> · Hotline: <strong>0900 000 000</strong></p>`,
    "Pháp lý",
  ),
];

export const DEFAULT_PAGES: SitePage[] = [
  { id: "home",         slug: "/",                     title: "Trang Chủ",                   category: "main",    blocks: HOME_BLOCKS },
  { id: "contact",      slug: "/contact",              title: "Liên Hệ",                     category: "support", blocks: CONTACT_BLOCKS },
  { id: "faq",          slug: "/faq",                  title: "Câu hỏi thường gặp",           category: "support", blocks: FAQ_BLOCKS },
  { id: "cancellation", slug: "/cancellation-policy",  title: "Chính sách huỷ phòng",         category: "policy",  blocks: CANCELLATION_BLOCKS },
  { id: "membership",   slug: "/membership",           title: "Chương trình thành viên",      category: "info",    blocks: MEMBERSHIP_BLOCKS },
  { id: "privacy",      slug: "/privacy",              title: "Bảo mật thông tin",            category: "policy",  blocks: PRIVACY_BLOCKS },
  { id: "terms",        slug: "/terms",                title: "Điều khoản sử dụng",           category: "policy",  blocks: TERMS_BLOCKS },
];

function freshDefault(p: SitePage): SitePage {
  return { ...p, blocks: p.blocks.map(b => ({ ...b, id: genBlockId() })) };
}

const PAGES_SEEDED_KEY = "grand-palace-site-pages-seeded";

function loadPages(): SitePage[] {
  try {
    const stored = localStorage.getItem(PAGES_STORAGE_KEY);
    if (stored) {
      const parsed: SitePage[] = JSON.parse(stored);
      let mutated = false;

      // Track which default templates we've seeded for this user so we never re-seed
      // a page whose blocks were intentionally cleared.
      const seededRaw = localStorage.getItem(PAGES_SEEDED_KEY);
      const seeded: Set<string> = new Set(seededRaw ? JSON.parse(seededRaw) : []);

      for (const def of DEFAULT_PAGES) {
        const existing = parsed.find(p => p.id === def.id);
        if (!existing) {
          // New default page — add it (and mark seeded if it has template content).
          parsed.push(freshDefault(def));
          if (def.blocks.length > 0) seeded.add(def.id);
          mutated = true;
        } else {
          // First-time seed of a template that was previously empty AND we have not yet seeded.
          if (
            !seeded.has(def.id) &&
            (!existing.blocks || existing.blocks.length === 0) &&
            def.blocks.length > 0
          ) {
            existing.blocks = freshDefault(def).blocks;
            seeded.add(def.id);
            mutated = true;
          }
          // Back-fill category if missing.
          if (!existing.category && def.category) {
            existing.category = def.category;
            mutated = true;
          }
          // Mark already-populated default pages as seeded so future ships won't re-fill.
          if (!seeded.has(def.id) && existing.blocks && existing.blocks.length > 0) {
            seeded.add(def.id);
          }
        }
      }
      if (mutated) {
        localStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify(parsed));
        localStorage.setItem(PAGES_SEEDED_KEY, JSON.stringify(Array.from(seeded)));
      }
      return parsed;
    }
    // Migrate old single-page data if needed
    const legacy = localStorage.getItem("grand-palace-page-blocks");
    if (legacy) {
      const oldBlocks: PageBlock[] = JSON.parse(legacy);
      const pages: SitePage[] = [
        { id: "home", slug: "/", title: "Trang Chủ", blocks: oldBlocks },
        { id: "contact", slug: "/contact", title: "Liên Hệ", blocks: CONTACT_BLOCKS.map(b => ({ ...b, id: genBlockId() })) },
      ];
      localStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify(pages));
      return pages;
    }
  } catch {}
  return DEFAULT_PAGES.map(p => ({ ...p, blocks: p.blocks.map(b => ({ ...b, id: genBlockId() })) }));
}

interface SitePagesContextType {
  pages: SitePage[];
  savePage: (page: SitePage) => void;
  addPage: (title: string, slug: string, category?: PageCategory) => SitePage;
  deletePage: (id: string) => void;
  renamePage: (id: string, title: string, slug: string, category?: PageCategory) => void;
  getPage: (id: string) => SitePage | undefined;
  getPageBySlug: (slug: string) => SitePage | undefined;
}

const SitePagesContext = createContext<SitePagesContextType | null>(null);

export function PageBlocksProvider({ children }: { children: ReactNode }) {
  const [pages, setPages] = useState<SitePage[]>(loadPages);

  const persist = useCallback((next: SitePage[]) => {
    localStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify(next));
    setPages(next);
  }, []);

  const savePage = useCallback((page: SitePage) => {
    setPages(prev => {
      const next = prev.map(p => p.id === page.id ? page : p);
      localStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const addPage = useCallback((title: string, slug: string, category: PageCategory = "custom"): SitePage => {
    const newPage: SitePage = { id: genPageId(), slug, title, category, blocks: [] };
    setPages(prev => {
      const next = [...prev, newPage];
      localStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    return newPage;
  }, []);

  const deletePage = useCallback((id: string) => {
    setPages(prev => {
      const next = prev.filter(p => p.id !== id);
      localStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const renamePage = useCallback((id: string, title: string, slug: string, category?: PageCategory) => {
    setPages(prev => {
      const next = prev.map(p => p.id === id ? { ...p, title, slug, ...(category ? { category } : {}) } : p);
      localStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const getPage = useCallback((id: string) => pages.find(p => p.id === id), [pages]);
  const getPageBySlug = useCallback((slug: string) => pages.find(p => p.slug === slug), [pages]);

  return (
    <SitePagesContext.Provider value={{ pages, savePage, addPage, deletePage, renamePage, getPage, getPageBySlug }}>
      {children}
    </SitePagesContext.Provider>
  );
}

export function useSitePages() {
  const ctx = useContext(SitePagesContext);
  if (!ctx) throw new Error("useSitePages must be used inside PageBlocksProvider");
  return ctx;
}

/** Convenience hook for home.tsx — returns blocks for the home page */
export function usePageBlocks() {
  const ctx = useContext(SitePagesContext);
  if (!ctx) return { blocks: loadPages().find(p => p.id === "home")?.blocks ?? [] };
  return { blocks: ctx.pages.find(p => p.id === "home")?.blocks ?? [] };
}
