import { createContext, useContext, useState, useEffect } from "react";

const STORAGE_KEY = "grand-palace-home-content";

export interface HomeContent {
  hero: {
    kicker: string;
    title1: string;
    title2: string;
    subtitle: string;
    cta: string;
    imageUrl: string;
  };
  dest: {
    kicker: string;
    title: string;
  };
  exp: {
    kicker: string;
    title: string;
    body: string;
    quote: string;
    item1: string;
    item2: string;
    item3: string;
    item4: string;
    cta: string;
    imageUrl: string;
  };
}

export const DEFAULT_HOME_CONTENT: HomeContent = {
  hero: {
    kicker: "Tinh hoa của sự xa hoa",
    title1: "Trải Nghiệm Hoàng Gia",
    title2: "Tại Việt Nam",
    subtitle:
      "Tận hưởng không gian thanh lịch, dịch vụ tinh tế và sự riêng tư tuyệt đối tại chuỗi khách sạn 5 sao sang trọng bậc nhất.",
    cta: "Khám phá điểm đến",
    imageUrl: "/images/hero.png",
  },
  dest: {
    kicker: "Các điểm đến",
    title: "Nơi cảm xúc thăng hoa",
  },
  exp: {
    kicker: "Trải nghiệm",
    title: "Dấu ấn khó phai",
    body: "Tại MAISON DELUXE, mỗi khoảnh khắc đều được thiết kế để trở thành một kỷ niệm vô giá. Từ nghệ thuật ẩm thực tinh tế tại các nhà hàng đạt sao Michelin, đến những liệu trình spa phục hồi sinh lực, chúng tôi mang đến một định nghĩa mới về sự xa xỉ.",
    quote: "\u201cNghệ thuật ẩm thực đỉnh cao\u201d",
    item1: "Ẩm thực đẳng cấp quốc tế",
    item2: "Spa & Wellness chuẩn 5 sao",
    item3: "Dịch vụ quản gia cá nhân",
    item4: "Không gian tổ chức sự kiện sang trọng",
    cta: "Khám phá dịch vụ",
    imageUrl: "/images/restaurant.png",
  },
};

function loadContent(): HomeContent {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return DEFAULT_HOME_CONTENT;
    const saved = JSON.parse(s);
    return {
      hero: { ...DEFAULT_HOME_CONTENT.hero, ...saved.hero },
      dest: { ...DEFAULT_HOME_CONTENT.dest, ...saved.dest },
      exp: { ...DEFAULT_HOME_CONTENT.exp, ...saved.exp },
    };
  } catch {
    return DEFAULT_HOME_CONTENT;
  }
}

const SiteContentContext = createContext<{
  content: HomeContent;
  updateContent: (c: HomeContent) => void;
} | null>(null);

export function SiteContentProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<HomeContent>(() => loadContent());

  const updateContent = (newContent: HomeContent) => {
    setContent(newContent);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newContent));
  };

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setContent(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return (
    <SiteContentContext.Provider value={{ content, updateContent }}>
      {children}
    </SiteContentContext.Provider>
  );
}

export function useSiteContent() {
  const ctx = useContext(SiteContentContext);
  if (!ctx) return { content: DEFAULT_HOME_CONTENT, updateContent: () => {} };
  return ctx;
}
