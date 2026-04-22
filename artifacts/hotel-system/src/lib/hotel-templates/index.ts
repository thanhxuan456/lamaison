import type { ComponentType } from "react";
import { ClassicTemplate } from "./classic";
import { MagazineTemplate } from "./magazine";
import { ModernTemplate } from "./modern";
import { BoutiqueTemplate } from "./boutique";
import { EditorialTemplate } from "./editorial";

export interface HotelTemplateProps {
  hotel: any;
  summary: any;
  rooms: any[] | undefined;
  loadingSummary: boolean;
  loadingRooms: boolean;
  fmtPrice: (n: number | string) => string;
  t: (key: string) => string;
  heroImage: string;
}

export interface HotelTemplateMeta {
  id: string;
  label: string;
  description: string;
  component: ComponentType<HotelTemplateProps>;
}

export const HOTEL_TEMPLATES: HotelTemplateMeta[] = [
  {
    id: "classic",
    label: "Classic — Trang trọng",
    description: "Hero giữa, 2 cột giới thiệu + booking, lưới phòng (mặc định).",
    component: ClassicTemplate,
  },
  {
    id: "magazine",
    label: "Magazine — Tạp chí sang trọng",
    description: "Hero lớn lệch trái, trích dẫn nổi bật, danh sách phòng dạng tạp chí.",
    component: MagazineTemplate,
  },
  {
    id: "modern",
    label: "Modern — Hiện đại, tối giản",
    description: "Hero compact, tab Tổng quan / Tiện nghi / Phòng, CTA banner cuối trang.",
    component: ModernTemplate,
  },
  {
    id: "boutique",
    label: "Boutique — Ấm áp, mềm mại",
    description: "Hero lệch với ảnh bo cong, huy hiệu đánh giá tròn, lưới phòng dạng card bo góc lớn.",
    component: BoutiqueTemplate,
  },
  {
    id: "editorial",
    label: "Editorial — Tạp chí typography",
    description: "Tiêu đề khổ lớn, bố cục theo chương 01/02/03, danh sách phòng dạng index báo chí.",
    component: EditorialTemplate,
  },
];

export function getHotelTemplate(id?: string | null) {
  return HOTEL_TEMPLATES.find(t => t.id === id) ?? HOTEL_TEMPLATES[0];
}
