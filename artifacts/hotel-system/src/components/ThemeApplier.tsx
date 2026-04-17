import { useEffect } from "react";

const API = import.meta.env.VITE_API_URL ?? "";
const STORAGE_KEY = "grand-palace-theme-cache";

interface ThemeSettings {
  primaryHsl: string;
  secondaryHsl: string;
  accentHsl: string;
  primaryDarkHsl: string;
  fontFamily: string;
  radius: string;
}

function applyTheme(t: Partial<ThemeSettings>) {
  const root = document.documentElement;
  if (t.primaryHsl) {
    root.style.setProperty("--primary", t.primaryHsl);
    root.style.setProperty("--accent", t.accentHsl ?? t.primaryHsl);
    root.style.setProperty("--ring", t.primaryHsl);
    root.style.setProperty("--input", t.primaryHsl);
    root.style.setProperty("--border", t.primaryHsl);
    root.style.setProperty("--card-border", t.primaryHsl);
    root.style.setProperty("--sidebar-border", t.primaryHsl);
    root.style.setProperty("--sidebar-primary", t.primaryHsl);
    root.style.setProperty("--sidebar-ring", t.primaryHsl);
    root.style.setProperty("--popover-border", t.primaryHsl);
    root.style.setProperty("--chart-1", t.primaryHsl);
  }
  if (t.secondaryHsl) {
    root.style.setProperty("--secondary", t.secondaryHsl);
  }
  if (t.fontFamily) {
    root.style.setProperty("--app-font-sans", t.fontFamily);
    root.style.setProperty("--app-font-serif", t.fontFamily);
  }
  if (t.radius !== undefined) {
    root.style.setProperty("--radius", t.radius);
  }
}

/**
 * Loads the saved theme from the server on app boot and applies CSS variables globally.
 * Falls back to the cached theme in localStorage to avoid a flash of unstyled tokens
 * before the network request completes.
 */
export function ThemeApplier() {
  useEffect(() => {
    // Apply cached theme synchronously (best-effort, before paint)
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) applyTheme(JSON.parse(cached));
    } catch {}

    // Then fetch the latest theme and override
    fetch(`${API}/api/settings/theme`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        applyTheme(data);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
        window.dispatchEvent(new CustomEvent("theme:loaded", { detail: data }));
      })
      .catch(() => {});
  }, []);
  return null;
}

export { applyTheme };
