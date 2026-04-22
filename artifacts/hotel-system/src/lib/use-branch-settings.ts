import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API = import.meta.env.VITE_API_URL ?? "";

export interface BranchSettingsRow {
  id: number;
  hotelId: number;
  branding: Record<string, any>;
  contact: Record<string, any>;
  payment: Record<string, any>;
  layout: Record<string, any>;
  seo: Record<string, any>;
  features: Record<string, any>;
  social: Record<string, any>;
  hotel?: { id: number; slug: string; name: string };
}

export type SectionKey = "branding" | "contact" | "payment" | "layout" | "seo" | "features" | "social";

// Admin: lay full settings cua 1 chi nhanh
export function useAdminBranchSettings(hotelId: number | null) {
  return useQuery<BranchSettingsRow>({
    queryKey: ["admin-branch-settings", hotelId],
    queryFn: async () => {
      const r = await fetch(`${API}/api/branch-settings/${hotelId}`, { credentials: "include" });
      if (!r.ok) throw new Error("fetch failed");
      return r.json();
    },
    enabled: hotelId != null,
  });
}

// Admin: save 1 section (PATCH)
export function useSaveBranchSettingsSection(hotelId: number | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ section, data }: { section: SectionKey; data: any }) => {
      const r = await fetch(`${API}/api/branch-settings/${hotelId}/${section}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!r.ok) throw new Error("save failed");
      return r.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-branch-settings", hotelId] }),
  });
}

// Public FE: doc settings theo hotel slug (cho header/footer/landing)
export function usePublicBranchSettings(hotelSlug: string | null) {
  return useQuery<BranchSettingsRow>({
    queryKey: ["public-branch-settings", hotelSlug],
    queryFn: async () => {
      const r = await fetch(`${API}/api/branch-settings/by-slug/${hotelSlug}`);
      if (!r.ok) throw new Error("fetch failed");
      return r.json();
    },
    enabled: !!hotelSlug,
    staleTime: 5 * 60_000,
  });
}
