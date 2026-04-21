import { useQuery } from "@tanstack/react-query";
import { useMe } from "./use-me";

const API = import.meta.env.VITE_API_URL ?? "";

export interface BranchPageRow {
  id: number;
  hotelId: number;
  pageSlug: string;
  layoutTemplate: string;
  content: any;
  enabled: number;
  hotel?: { id: number; slug: string; name: string; city: string; location: string };
}

async function fetchBranchPage(hotelSlug: string, pageSlug: string): Promise<BranchPageRow | null> {
  const r = await fetch(`${API}/api/branch-pages/by-slug/${encodeURIComponent(hotelSlug)}/${pageSlug}`, { credentials: "include" });
  if (!r.ok) return null;
  return r.json();
}

/**
 * Hook lay noi dung trang menu cua chi nhanh hien tai. Ưu tien:
 *  1) Chi nhanh dang nhap gan nhat (lastLoginHotelSlug) — neu user da dang nhap qua chi nhanh
 *  2) Chi nhanh dang ky lan dau (signupHotelSlug)
 * Neu khong co chi nhanh nao, hoac khong co override, tra ve null (FE dung default content + template "classic").
 */
export function useBranchPage(pageSlug: string) {
  const { data: me } = useMe();
  const hotelSlug = me?.lastLoginHotel?.slug ?? me?.signupHotel?.slug ?? null;

  return useQuery({
    queryKey: ["branch-page", hotelSlug, pageSlug],
    queryFn: () => (hotelSlug ? fetchBranchPage(hotelSlug, pageSlug) : Promise.resolve(null)),
    enabled: !!hotelSlug,
    staleTime: 60_000,
  });
}

/**
 * Helper deep-merge: lop noi dung override len default. Cho phep admin chi sua 1 vai field
 * ma khong phai copy toan bo content.
 */
export function mergeContent<T extends Record<string, any>>(defaults: T, override: Partial<T> | null | undefined): T {
  if (!override) return defaults;
  const out: any = { ...defaults };
  for (const k of Object.keys(override)) {
    const v = (override as any)[k];
    if (v == null) continue;
    if (Array.isArray(v)) {
      out[k] = v; // mang: ghi de toan bo (admin sua mang phai gui full)
    } else if (typeof v === "object" && typeof defaults[k] === "object" && !Array.isArray(defaults[k])) {
      out[k] = mergeContent(defaults[k], v);
    } else {
      out[k] = v;
    }
  }
  return out;
}
