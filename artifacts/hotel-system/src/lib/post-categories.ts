export interface PostCategory {
  value: string;
  label: string;
}

const API = import.meta.env.VITE_API_URL ?? "";
const SETTINGS_KEY = "postCategories";

export const DEFAULT_POST_CATS: PostCategory[] = [
  { value: "news",       label: "Tin tức" },
  { value: "promotion",  label: "Khuyến mãi" },
  { value: "experience", label: "Trải nghiệm" },
  { value: "culinary",   label: "Ẩm thực" },
  { value: "travel",     label: "Du lịch" },
];

function sanitize(arr: unknown): PostCategory[] {
  if (!Array.isArray(arr)) return DEFAULT_POST_CATS;
  const out = arr
    .filter((c: any) => c && typeof c.value === "string" && typeof c.label === "string" && c.value && c.label)
    .map((c: any) => ({ value: c.value, label: c.label }));
  return out.length ? out : DEFAULT_POST_CATS;
}

export async function fetchPostCategories(): Promise<PostCategory[]> {
  try {
    const r = await fetch(`${API}/api/settings/${SETTINGS_KEY}`);
    if (!r.ok) return DEFAULT_POST_CATS;
    const json = await r.json();
    return sanitize(json?.items);
  } catch { return DEFAULT_POST_CATS; }
}

export async function savePostCategories(cats: PostCategory[]): Promise<PostCategory[]> {
  const r = await fetch(`${API}/api/settings/${SETTINGS_KEY}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: cats }),
  });
  if (!r.ok) throw new Error("Không thể lưu danh sách chuyên mục");
  const json = await r.json();
  const out = sanitize(json?.items);
  // Notify other components in the same window
  window.dispatchEvent(new CustomEvent("post-categories:changed"));
  return out;
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
