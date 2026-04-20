import { createContext, useContext, useState, useCallback, ReactNode } from "react";

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface FooterSocial {
  platform: "facebook" | "instagram" | "twitter" | "youtube" | "tiktok" | "linkedin";
  url: string;
  enabled: boolean;
}

export interface FooterContent {
  brand: {
    name: string;
    tagline: string;
    about: string;
  };
  newsletter: {
    title: string;
    body: string;
    placeholder: string;
    submitText: string;
  };
  contact: {
    email: string;
    phone: string;
    address: string;
  };
  columns: FooterColumn[];
  socials: FooterSocial[];
  bottomBar: {
    copyright: string;
    termsLabel: string;
    termsLink: string;
    privacyLabel: string;
    privacyLink: string;
  };
}

const STORAGE_KEY = "grand-palace-footer-content";

export const DEFAULT_FOOTER_CONTENT: FooterContent = {
  brand: {
    name: "MAISON DELUXE",
    tagline: "Hotels & Resorts",
    about: "Chuỗi khách sạn 5 sao sang trọng bậc nhất Việt Nam, mang đến trải nghiệm hoàng gia với dịch vụ tinh tế và không gian đẳng cấp quốc tế.",
  },
  newsletter: {
    title: "Đăng ký nhận ưu đãi",
    body: "Nhận tin tức và ưu đãi độc quyền dành cho thành viên MAISON DELUXE.",
    placeholder: "Email của quý khách...",
    submitText: "Đăng ký",
  },
  contact: {
    email: "contact@maisondeluxe.vn",
    phone: "+84 1800 9999",
    address: "Hà Nội · Đà Nẵng · TP.HCM",
  },
  columns: [
    {
      title: "Khám phá",
      links: [
        { label: "Về chúng tôi", href: "/" },
        { label: "Ẩm thực", href: "/" },
        { label: "Spa & Wellness", href: "/" },
        { label: "Ưu đãi đặc biệt", href: "/" },
        { label: "Đặt phòng của tôi", href: "/bookings" },
      ],
    },
    {
      title: "Hỗ trợ",
      links: [
        { label: "Liên hệ", href: "/contact" },
        { label: "Câu hỏi thường gặp", href: "/contact" },
        { label: "Chính sách hủy", href: "/" },
        { label: "Chương trình thành viên", href: "/" },
      ],
    },
  ],
  socials: [
    { platform: "facebook", url: "https://facebook.com/maisondeluxe", enabled: true },
    { platform: "instagram", url: "https://instagram.com/maisondeluxe", enabled: true },
    { platform: "twitter", url: "https://twitter.com/maisondeluxe", enabled: true },
    { platform: "youtube", url: "https://youtube.com/maisondeluxe", enabled: true },
    { platform: "tiktok", url: "", enabled: false },
    { platform: "linkedin", url: "", enabled: false },
  ],
  bottomBar: {
    copyright: "© {year} MAISON DELUXE Hotels & Resorts. Tất cả các quyền được bảo lưu.",
    termsLabel: "Điều khoản",
    termsLink: "/",
    privacyLabel: "Bảo mật",
    privacyLink: "/",
  },
};

function load(): FooterContent {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_FOOTER_CONTENT, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_FOOTER_CONTENT;
}

interface FooterContextType {
  content: FooterContent;
  saveContent: (c: FooterContent) => void;
  resetContent: () => void;
}

const FooterContentContext = createContext<FooterContextType | null>(null);

export function FooterContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<FooterContent>(load);

  const saveContent = useCallback((c: FooterContent) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    setContent(c);
  }, []);

  const resetContent = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setContent(DEFAULT_FOOTER_CONTENT);
  }, []);

  return (
    <FooterContentContext.Provider value={{ content, saveContent, resetContent }}>
      {children}
    </FooterContentContext.Provider>
  );
}

export function useFooterContent() {
  const ctx = useContext(FooterContentContext);
  if (!ctx) return { content: load(), saveContent: () => {}, resetContent: () => {} };
  return ctx;
}
