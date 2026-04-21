// Quan ly "branch context": chi nhanh user vua dang ghe tham truoc khi sign-in / register.
// Luu vao localStorage de sau khi Clerk login xong, FE goi /api/me/branch de luu vao DB.

const KEY = "maison-deluxe.branchContext.v1";

export interface BranchContext {
  slug: string;
  setAt: number;
}

export function setBranchContext(slug: string) {
  if (!slug) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ slug, setAt: Date.now() } satisfies BranchContext));
  } catch {}
}

export function getBranchContext(): BranchContext | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BranchContext;
    if (!parsed?.slug) return null;
    // Het han sau 24h de tranh sai chi nhanh khi user mo lai may sau nhieu ngay
    if (Date.now() - parsed.setAt > 24 * 60 * 60 * 1000) {
      clearBranchContext();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearBranchContext() {
  try { localStorage.removeItem(KEY); } catch {}
}
