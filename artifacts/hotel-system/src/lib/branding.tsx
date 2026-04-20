import { createContext, useContext, useState, useEffect } from "react";

const STORAGE_KEY = "maison-deluxe-branding";

export type Currency = "VND" | "USD";

export type NavbarStyle = "auto" | "solid" | "glass";

export interface Branding {
  brandName: string;
  tagline: string;
  starRating: number;
  useImageLogo: boolean;
  logoUrl: string;
  logoHeight: number;
  adminLogoUrl: string;
  faviconUrl: string;
  pageTitle: string;
  currency: Currency;
  navbarStyle: NavbarStyle;
  navbarBgColor: string;
  navbarBgOpacity: number;
}

export const DEFAULT_BRANDING: Branding = {
  brandName: "MAISON DELUXE",
  tagline: "5 Sao Đẳng Cấp",
  starRating: 5,
  useImageLogo: true,
  logoUrl: "/logo-upload.png",
  logoHeight: 100,
  adminLogoUrl: "/logo-upload.png",
  faviconUrl: "/favicon.svg",
  pageTitle: "MAISON DELUXE Hotels & Resorts — Luxury Vietnam",
  currency: "VND",
  navbarStyle: "auto",
  navbarBgColor: "#1a1f2e",
  navbarBgOpacity: 95,
};

export function formatPrice(amount: number | string | null | undefined, currency: Currency = "VND"): string {
  const n = Number(amount ?? 0);
  if (!isFinite(n)) return currency === "USD" ? "0$" : "0 VNĐ";
  const formatted = n.toLocaleString("vi-VN", { maximumFractionDigits: 0 });
  if (currency === "USD") {
    return formatted + "$";
  }
  return formatted + " VNĐ";
}

export function useFormatPrice() {
  const { branding } = useBranding();
  return (amount: number | string | null | undefined) => formatPrice(amount, branding.currency);
}

function loadBranding(): Branding {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return DEFAULT_BRANDING;
    return { ...DEFAULT_BRANDING, ...JSON.parse(s) };
  } catch {
    return DEFAULT_BRANDING;
  }
}

function applyFavicon(url: string) {
  if (typeof document === "undefined" || !url) return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  if (url.startsWith("data:image/png")) link.type = "image/png";
  else if (url.startsWith("data:image/jpeg") || url.startsWith("data:image/jpg")) link.type = "image/jpeg";
  else if (url.endsWith(".svg") || url.startsWith("data:image/svg")) link.type = "image/svg+xml";
  else link.type = "image/x-icon";
  link.href = url;
}

function applyTitle(title: string) {
  if (typeof document === "undefined" || !title) return;
  document.title = title;
}

const BrandingContext = createContext<{
  branding: Branding;
  updateBranding: (b: Partial<Branding>) => void;
  resetBranding: () => void;
} | null>(null);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<Branding>(() => loadBranding());

  useEffect(() => {
    applyFavicon(branding.faviconUrl);
    applyTitle(branding.pageTitle);
  }, [branding.faviconUrl, branding.pageTitle]);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try { setBranding({ ...DEFAULT_BRANDING, ...JSON.parse(e.newValue) }); } catch {}
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const updateBranding = (b: Partial<Branding>) => {
    setBranding(prev => {
      const next = { ...prev, ...b };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const resetBranding = () => {
    setBranding(DEFAULT_BRANDING);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_BRANDING));
  };

  return (
    <BrandingContext.Provider value={{ branding, updateBranding, resetBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) return { branding: DEFAULT_BRANDING, updateBranding: () => {}, resetBranding: () => {} };
  return ctx;
}
