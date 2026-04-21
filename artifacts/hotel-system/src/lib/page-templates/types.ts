/**
 * Kiểu dữ liệu nội dung cho từng trang menu — dùng làm shape của JSONB column
 * branch_pages.content. Mỗi trang có schema riêng, FE và admin form đều dựa vào type này.
 */

export interface SpaContent {
  hero: {
    eyebrow?: string;
    title: string;
    subtitle?: string;
    image?: string;
    description?: string;
    ctaPrimary?: { label: string; href: string };
    ctaSecondary?: { label: string; href: string };
  };
  stats: { n: string; label: string }[];
  amenities: { icon: string; title: string; desc: string }[];
  treatments: {
    category: string;
    icon: string;
    items: { name: string; duration: string; price: string; desc: string }[];
  }[];
  cta: {
    eyebrow?: string;
    title: string;
    description?: string;
    phone?: string;
    hours?: string;
  };
}

export interface AboutContent {
  hero: { eyebrow?: string; title: string; subtitle?: string; image?: string };
  story: { paragraphs: string[] };
  values: { title: string; desc: string }[];
}

export interface ContactContent {
  hero: { eyebrow?: string; title: string; subtitle?: string };
  branchAddress?: string;
  branchPhone?: string;
  branchEmail?: string;
  hours?: string;
}

export type PageContent = SpaContent | AboutContent | ContactContent;

/** Tat ca template kha dung cho 1 trang. */
export interface PageTemplateRegistry<T> {
  defaultContent: T;
  templates: {
    key: string;
    label: string;
    description: string;
    component: React.ComponentType<{ content: T; branchName?: string; branchCity?: string }>;
  }[];
}
