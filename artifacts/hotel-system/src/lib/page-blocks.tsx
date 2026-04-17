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
  | "separator";

export interface PageBlock {
  id: string;
  type: BlockType;
  visible: boolean;
  settings: Record<string, any>;
}

export interface BlockField {
  key: string;
  label: string;
  type: "text" | "textarea" | "url" | "select" | "repeater";
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
  fields: BlockField[];
  defaultSettings: Record<string, any>;
}

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    type: "hero",
    label: "Hero Banner",
    icon: "🖼",
    description: "Banner toàn màn hình với ảnh nền, tiêu đề và CTA",
    color: "#8B5CF6",
    fields: [
      { key: "imageUrl", label: "Ảnh nền URL", type: "url", placeholder: "/images/hero.png" },
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
      subtitle: "Tận hưởng không gian thanh lịch, dịch vụ tinh tế và sự riêng tư tuyệt đối tại chuỗi khách sạn 5 sao sang trọng bậc nhất.",
      cta: "Khám phá điểm đến",
    },
  },
  {
    type: "destinations",
    label: "Điểm Đến Nổi Bật",
    icon: "🏨",
    description: "Hiển thị danh sách khách sạn từ cơ sở dữ liệu",
    color: "#F59E0B",
    fields: [
      { key: "kicker", label: "Tagline", type: "text" },
      { key: "title", label: "Tiêu đề chính", type: "text" },
    ],
    defaultSettings: { kicker: "Các điểm đến", title: "Nơi cảm xúc thăng hoa" },
  },
  {
    type: "experiences",
    label: "Trải Nghiệm",
    icon: "✨",
    description: "Phần trải nghiệm với ảnh + nội dung text",
    color: "#10B981",
    fields: [
      { key: "imageUrl", label: "Ảnh minh họa", type: "url" },
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
      body: "Tại Grand Palace, mỗi khoảnh khắc đều được thiết kế để trở thành một kỷ niệm vô giá.",
      quote: "\"Nghệ thuật ẩm thực đỉnh cao\"",
      item1: "Nhà hàng ẩm thực đạt chuẩn quốc tế",
      item2: "Spa & Wellness cao cấp",
      item3: "Hồ bơi vô cực toàn cảnh",
      item4: "Butler riêng & phục vụ 24/7",
      cta: "Khám phá thêm",
    },
  },
  {
    type: "features",
    label: "Tiện Nghi & Dịch Vụ",
    icon: "⭐",
    description: "Lưới cards tiện nghi với icon và mô tả",
    color: "#3B82F6",
    fields: [
      { key: "kicker", label: "Tagline", type: "text" },
      { key: "title", label: "Tiêu đề", type: "text" },
      {
        key: "items",
        label: "Danh sách tiện nghi",
        type: "repeater",
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
    type: "text_block",
    label: "Khối Văn Bản",
    icon: "📝",
    description: "Phần nội dung text tự do",
    color: "#6B7280",
    fields: [
      { key: "kicker", label: "Tagline nhỏ", type: "text" },
      { key: "title", label: "Tiêu đề", type: "text" },
      { key: "body", label: "Nội dung", type: "textarea" },
      {
        key: "background",
        label: "Màu nền",
        type: "select",
        options: [
          { value: "light", label: "Sáng (mặc định)" },
          { value: "dark", label: "Tối (Navy)" },
        ],
      },
    ],
    defaultSettings: { kicker: "", title: "Tiêu đề mới", body: "Nhập nội dung...", background: "light" },
  },
  {
    type: "cta_banner",
    label: "Banner CTA",
    icon: "📣",
    description: "Banner kêu gọi hành động toàn chiều rộng",
    color: "#EF4444",
    fields: [
      { key: "title", label: "Tiêu đề", type: "text" },
      { key: "subtitle", label: "Phụ đề", type: "text" },
      { key: "ctaText", label: "Nội dung nút", type: "text" },
      { key: "ctaLink", label: "Link nút", type: "url", placeholder: "/hotels" },
      { key: "imageUrl", label: "Ảnh nền", type: "url" },
    ],
    defaultSettings: {
      title: "Đặt phòng ngay hôm nay",
      subtitle: "Ưu đãi đặc biệt dành cho đặt phòng trực tiếp — tiết kiệm đến 30%",
      ctaText: "Đặt ngay",
      ctaLink: "/hotels/1",
      imageUrl: "/images/hero.png",
    },
  },
  {
    type: "gallery",
    label: "Thư Viện Ảnh",
    icon: "🖼️",
    description: "Lưới ảnh tùy chỉnh với chú thích",
    color: "#EC4899",
    fields: [
      { key: "title", label: "Tiêu đề", type: "text" },
      {
        key: "images",
        label: "Danh sách ảnh",
        type: "repeater",
        itemFields: [
          { key: "url", label: "URL ảnh", type: "url" },
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
    type: "separator",
    label: "Phân Cách",
    icon: "⸻",
    description: "Đường phân cách trang trí luxury",
    color: "#D4AF37",
    fields: [
      {
        key: "style",
        label: "Kiểu phân cách",
        type: "select",
        options: [
          { value: "diamond", label: "Kim cương (Diamond)" },
          { value: "line", label: "Đường kẻ đơn giản" },
          { value: "ornament", label: "Trang trí (Ornament)" },
        ],
      },
    ],
    defaultSettings: { style: "diamond" },
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

const HOME_BLOCKS: PageBlock[] = [
  { id: genBlockId(), type: "hero", visible: true, settings: { ...BLOCK_DEFINITIONS.find(d => d.type === "hero")!.defaultSettings } },
  { id: genBlockId(), type: "destinations", visible: true, settings: { ...BLOCK_DEFINITIONS.find(d => d.type === "destinations")!.defaultSettings } },
  { id: genBlockId(), type: "experiences", visible: true, settings: { ...BLOCK_DEFINITIONS.find(d => d.type === "experiences")!.defaultSettings } },
];

export const DEFAULT_PAGES: SitePage[] = [
  { id: "home", slug: "/", title: "Trang Chủ", blocks: HOME_BLOCKS },
];

function loadPages(): SitePage[] {
  try {
    // Migrate old single-page data if needed
    const legacy = localStorage.getItem("grand-palace-page-blocks");
    const stored = localStorage.getItem(PAGES_STORAGE_KEY);

    if (stored) return JSON.parse(stored);

    if (legacy) {
      const oldBlocks: PageBlock[] = JSON.parse(legacy);
      const pages: SitePage[] = [{ id: "home", slug: "/", title: "Trang Chủ", blocks: oldBlocks }];
      localStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify(pages));
      return pages;
    }
  } catch {}
  return DEFAULT_PAGES.map(p => ({ ...p, blocks: p.blocks.map(b => ({ ...b, id: genBlockId() })) }));
}

/* ──────────────────────────────────────────────
   Context & Provider
────────────────────────────────────────────── */

interface SitePagesContextType {
  pages: SitePage[];
  savePage: (page: SitePage) => void;
  addPage: (title: string, slug: string) => SitePage;
  deletePage: (id: string) => void;
  renamePage: (id: string, title: string, slug: string) => void;
  getPage: (id: string) => SitePage | undefined;
  getHomeBlocks: () => PageBlock[];
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
  const getHomeBlocks = useCallback(() => pages.find(p => p.id === "home")?.blocks ?? [], [pages]);

  return (
    <SitePagesContext.Provider value={{ pages, savePage, addPage, deletePage, renamePage, getPage, getHomeBlocks }}>
      {children}
    </SitePagesContext.Provider>
  );
}

export function useSitePages() {
  const ctx = useContext(SitePagesContext);
  if (!ctx) throw new Error("useSitePages must be used inside PageBlocksProvider");
  return ctx;
}

/** Convenience hook for home.tsx — returns visible blocks for the home page */
export function usePageBlocks() {
  const ctx = useContext(SitePagesContext);
  if (!ctx) return { blocks: loadPages().find(p => p.id === "home")?.blocks ?? [] };
  return { blocks: ctx.pages.find(p => p.id === "home")?.blocks ?? [] };
}
