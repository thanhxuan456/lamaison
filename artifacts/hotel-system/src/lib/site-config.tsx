import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

const API = import.meta.env.VITE_API_URL ?? "";

// ---------- Types ----------
export interface MenuItem {
  id: string;
  label: string;
  href: string;
  enabled: boolean;
  target?: "_self" | "_blank";
}

export interface MainMenu {
  items: MenuItem[];
  ctaLabel: string;
  ctaHref: string;
  ctaEnabled: boolean;
}

export interface FooterLink { id: string; label: string; href: string }
export interface FooterColumn { id: string; title: string; enabled: boolean; links: FooterLink[] }
export interface FooterSocial { platform: "facebook" | "instagram" | "twitter" | "youtube" | "tiktok" | "linkedin"; url: string; enabled: boolean }

export interface FooterConfig {
  brand: { about: string };
  newsletter: { enabled: boolean; title: string; body: string; placeholder: string; submitText: string };
  contact: { enabled: boolean; title: string; email: string; phone: string; address: string };
  columns: FooterColumn[];
  socials: FooterSocial[];
  bottom: { showCopyright: boolean; termsLabel: string; termsHref: string; privacyLabel: string; privacyHref: string };
}

// ---------- Defaults (mirror server) ----------
export const DEFAULT_MAIN_MENU: MainMenu = {
  items: [
    { id: "home", label: "Trang chủ", href: "/", enabled: true, target: "_self" },
    { id: "about", label: "Về chúng tôi", href: "/about", enabled: true, target: "_self" },
    { id: "rooms", label: "Spa & Thư Giãn", href: "/spa", enabled: true, target: "_self" },
    { id: "contact", label: "Liên hệ", href: "/contact", enabled: true, target: "_self" },
    { id: "bookings", label: "Đặt phòng của tôi", href: "/bookings", enabled: true, target: "_self" },
  ],
  ctaLabel: "Đặt phòng ngay",
  ctaHref: "/hotels/1/rooms",
  ctaEnabled: false,
};

export const DEFAULT_FOOTER: FooterConfig = {
  brand: { about: "Trải nghiệm sự xa hoa bậc nhất tại Việt Nam." },
  newsletter: { enabled: true, title: "Bản tin đặc quyền", body: "Đăng ký để nhận ưu đãi riêng tư.", placeholder: "Email của bạn", submitText: "Đăng ký" },
  contact: { enabled: true, title: "Liên hệ", email: "contact@grandpalace.vn", phone: "+84 1800 9999", address: "Hà Nội · Đà Nẵng · TP.HCM" },
  columns: [
    { id: "explore", title: "Khám phá", enabled: true, links: [
      { id: "1", label: "Về chúng tôi", href: "/about" },
      { id: "2", label: "Phòng & Suite", href: "/hotels/1/rooms" },
      { id: "3", label: "Ẩm thực", href: "/" },
      { id: "4", label: "Spa & Thư giãn", href: "/" },
    ]},
    { id: "support", title: "Hỗ trợ", enabled: true, links: [
      { id: "1", label: "Liên hệ", href: "/contact" },
      { id: "2", label: "Câu hỏi thường gặp", href: "/contact" },
    ]},
  ],
  socials: [
    { platform: "facebook", url: "https://facebook.com/grandpalace", enabled: true },
    { platform: "instagram", url: "https://instagram.com/grandpalace", enabled: true },
    { platform: "twitter", url: "https://twitter.com/grandpalace", enabled: true },
    { platform: "youtube", url: "https://youtube.com/grandpalace", enabled: true },
  ],
  bottom: { showCopyright: true, termsLabel: "Điều khoản sử dụng", termsHref: "/", privacyLabel: "Chính sách bảo mật", privacyHref: "/" },
};

// ---------- Generic store hook factory ----------
function useServerSetting<T>(key: string, defaults: T) {
  const cacheKey = `gp-cfg-${key}`;
  const [value, setValue] = useState<T>(() => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return { ...defaults, ...JSON.parse(cached) };
    } catch {}
    return defaults;
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/settings/${key}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setValue({ ...defaults, ...data });
          try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback(async (next: T) => {
    const res = await fetch(`${API}/api/settings/${key}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!res.ok) throw new Error(`Save failed: ${res.status}`);
    const saved = await res.json();
    setValue({ ...defaults, ...saved });
    try { localStorage.setItem(cacheKey, JSON.stringify(saved)); } catch {}
    return saved as T;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { value, setValue, save, loaded };
}

// ---------- Main Menu ----------
interface MainMenuCtx { menu: MainMenu; save: (m: MainMenu) => Promise<MainMenu>; loaded: boolean }
const MainMenuContext = createContext<MainMenuCtx | null>(null);
export function MainMenuProvider({ children }: { children: ReactNode }) {
  const { value, save, loaded } = useServerSetting<MainMenu>("mainMenu", DEFAULT_MAIN_MENU);
  return <MainMenuContext.Provider value={{ menu: value, save, loaded }}>{children}</MainMenuContext.Provider>;
}
export function useMainMenu(): MainMenuCtx {
  return useContext(MainMenuContext) ?? { menu: DEFAULT_MAIN_MENU, save: async (m) => m, loaded: false };
}

// ---------- Contact Map ----------
export interface ContactMap {
  enabled: boolean;
  provider: "openstreetmap" | "google" | "custom";
  title: string;
  address: string;
  lat: number;
  lng: number;
  zoom: number;
  embedUrl: string;
  height: number;
}

export const DEFAULT_CONTACT_MAP: ContactMap = {
  enabled: true,
  provider: "openstreetmap",
  title: "Tìm chúng tôi",
  address: "Hà Nội · Đà Nẵng · TP.HCM",
  lat: 21.0285,
  lng: 105.8542,
  zoom: 14,
  embedUrl: "",
  height: 420,
};

interface MapCtx { map: ContactMap; save: (m: ContactMap) => Promise<ContactMap>; loaded: boolean }
const ContactMapContext = createContext<MapCtx | null>(null);
export function ContactMapProvider({ children }: { children: ReactNode }) {
  const { value, save, loaded } = useServerSetting<ContactMap>("contactMap", DEFAULT_CONTACT_MAP);
  return <ContactMapContext.Provider value={{ map: value, save, loaded }}>{children}</ContactMapContext.Provider>;
}
export function useContactMap(): MapCtx {
  return useContext(ContactMapContext) ?? { map: DEFAULT_CONTACT_MAP, save: async (m) => m, loaded: false };
}

/** Build the iframe src for the configured provider. Only http(s) URLs allowed. */
export function buildMapEmbedUrl(m: ContactMap): string {
  if (m.provider === "custom" || m.provider === "google") {
    const url = m.embedUrl.trim();
    if (!/^https?:\/\//i.test(url)) return ""; // reject javascript:, data:, etc.
    return url;
  }
  // OpenStreetMap embed
  const d = 0.01 / Math.max(1, m.zoom / 14);
  const bbox = `${m.lng - d},${m.lat - d / 2},${m.lng + d},${m.lat + d / 2}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${m.lat},${m.lng}`;
}

// ---------- Footer ----------
interface FooterCtx { footer: FooterConfig; save: (f: FooterConfig) => Promise<FooterConfig>; loaded: boolean }
const FooterContext = createContext<FooterCtx | null>(null);
export function FooterConfigProvider({ children }: { children: ReactNode }) {
  const { value, save, loaded } = useServerSetting<FooterConfig>("footer", DEFAULT_FOOTER);
  return <FooterContext.Provider value={{ footer: value, save, loaded }}>{children}</FooterContext.Provider>;
}
export function useFooterConfig(): FooterCtx {
  return useContext(FooterContext) ?? { footer: DEFAULT_FOOTER, save: async (f) => f, loaded: false };
}
