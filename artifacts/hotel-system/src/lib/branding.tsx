import { createContext, useContext, useState, useEffect } from "react";

const STORAGE_KEY = "grand-palace-branding";

export interface Branding {
  brandName: string;
  tagline: string;
  useImageLogo: boolean;
  logoUrl: string;
  adminLogoUrl: string;
  faviconUrl: string;
  pageTitle: string;
}

export const DEFAULT_BRANDING: Branding = {
  brandName: "Grand Palace",
  tagline: "5 Sao Đẳng Cấp",
  useImageLogo: false,
  logoUrl: "/logo.svg",
  adminLogoUrl: "/logo.svg",
  faviconUrl: "/favicon.svg",
  pageTitle: "Grand Palace Hotels & Resorts — Luxury Vietnam",
};

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
