/**
 * Page templates registry — moi trang menu (spa, about, contact...) co the co
 * nhieu layout template, admin chon template + sua noi dung cho tung chi nhanh.
 */
import type { PageTemplateRegistry, SpaContent } from "./types";
import { DEFAULT_SPA_CONTENT } from "./spa/default-content";
import SpaClassic from "./spa/classic";
import SpaZen from "./spa/zen";
import SpaOriental from "./spa/oriental";

export const SPA_REGISTRY: PageTemplateRegistry<SpaContent> = {
  defaultContent: DEFAULT_SPA_CONTENT,
  templates: [
    { key: "classic",  label: "Classic Royal",   description: "Phong cách hoàng gia kinh điển, vàng trên kem.", component: SpaClassic },
    { key: "zen",      label: "Zen Minimal",     description: "Tối giản, nhiều khoảng trắng, phù hợp retreat yên tĩnh.", component: SpaZen },
    { key: "oriental", label: "Oriental Luxury", description: "Phong cách Á Đông sang trọng, nền tối, hoa văn vàng.", component: SpaOriental },
  ],
};

export const PAGE_REGISTRIES = {
  spa: SPA_REGISTRY,
} as const;

export type PageRegistryKey = keyof typeof PAGE_REGISTRIES;

/** Lay component template theo key, fallback ve template dau tien. */
export function getSpaTemplate(key?: string | null) {
  return SPA_REGISTRY.templates.find((t) => t.key === key) ?? SPA_REGISTRY.templates[0];
}

export { DEFAULT_SPA_CONTENT };
export type { SpaContent };
