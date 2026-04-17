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
        { url: "/images/hotel-hanoi.png", caption: "Grand Palace Hà Nội" },
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
      title: "Khám phá Grand Palace",
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
      body: "Tại Grand Palace, mỗi khoảnh khắc đều được thiết kế để trở thành kỷ niệm vô giá.",
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
      title: "Grand Palace bằng những con số",
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
      subtitle: "Những con người tạo nên sự khác biệt của Grand Palace",
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

export interface SitePage {
  id: string;
  slug: string;
  title: string;
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
      title2: "Với Grand Palace",
      subtitle: "Đội ngũ Concierge của chúng tôi luôn sẵn sàng phục vụ 24/7.",
      cta: "Cuộn xuống để liên hệ",
    },
  },
  { id: genBlockId(), type: "contact_form", visible: true, settings: defaultSettingsFor("contact_form") },
  { id: genBlockId(), type: "map", visible: true, settings: defaultSettingsFor("map") },
];

export const DEFAULT_PAGES: SitePage[] = [
  { id: "home", slug: "/", title: "Trang Chủ", blocks: HOME_BLOCKS },
  { id: "contact", slug: "/contact", title: "Liên Hệ", blocks: CONTACT_BLOCKS },
  { id: "cancellation", slug: "/cancellation-policy", title: "Chính sách huỷ phòng", blocks: [] },
  { id: "membership", slug: "/membership", title: "Chương trình thành viên", blocks: [] },
  { id: "privacy", slug: "/privacy", title: "Bảo mật thông tin", blocks: [] },
  { id: "terms", slug: "/terms", title: "Điều khoản sử dụng", blocks: [] },
];

function loadPages(): SitePage[] {
  try {
    const stored = localStorage.getItem(PAGES_STORAGE_KEY);
    if (stored) {
      const parsed: SitePage[] = JSON.parse(stored);
      // Ensure default pages exist
      const hasContact = parsed.find(p => p.id === "contact");
      if (!hasContact) {
        parsed.push({ id: "contact", slug: "/contact", title: "Liên Hệ", blocks: CONTACT_BLOCKS.map(b => ({ ...b, id: genBlockId() })) });
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
  addPage: (title: string, slug: string) => SitePage;
  deletePage: (id: string) => void;
  renamePage: (id: string, title: string, slug: string) => void;
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

  const addPage = useCallback((title: string, slug: string): SitePage => {
    const newPage: SitePage = { id: genPageId(), slug, title, blocks: [] };
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

  const renamePage = useCallback((id: string, title: string, slug: string) => {
    setPages(prev => {
      const next = prev.map(p => p.id === id ? { ...p, title, slug } : p);
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
