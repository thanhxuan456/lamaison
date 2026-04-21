export interface PostCategory {
  value: string;
  label: string;
}

export const POST_CATS_KEY = "grand-palace-post-categories";

export const DEFAULT_POST_CATS: PostCategory[] = [
  { value: "news",       label: "Tin tức" },
  { value: "promotion",  label: "Khuyến mãi" },
  { value: "experience", label: "Trải nghiệm" },
  { value: "culinary",   label: "Ẩm thực" },
  { value: "travel",     label: "Du lịch" },
];

export function loadPostCategories(): PostCategory[] {
  try {
    const raw = localStorage.getItem(POST_CATS_KEY);
    if (!raw) return DEFAULT_POST_CATS;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length === 0) return DEFAULT_POST_CATS;
    return arr.filter(c => c && c.value && c.label);
  } catch { return DEFAULT_POST_CATS; }
}

export function savePostCategories(cats: PostCategory[]) {
  try { localStorage.setItem(POST_CATS_KEY, JSON.stringify(cats)); } catch {}
  // Notify other tabs/components in the same window
  window.dispatchEvent(new CustomEvent("post-categories:changed"));
}

export function slugifyCat(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function catLabel(cats: PostCategory[], v: string): string {
  return cats.find(c => c.value === v)?.label ?? v;
}
