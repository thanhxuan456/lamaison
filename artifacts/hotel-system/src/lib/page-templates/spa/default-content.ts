import type { SpaContent } from "../types";

export const DEFAULT_SPA_CONTENT: SpaContent = {
  hero: {
    eyebrow: "MAISON DELUXE",
    title: "Spa & Thư Giãn",
    image: "/images/hotel-hanoi.png",
    description: "Nơi tâm hồn được phục hồi và cơ thể được tái sinh. Trải nghiệm nghi lễ chăm sóc hoàng gia kết hợp trí tuệ y học cổ truyền Việt Nam với khoa học sắc đẹp hiện đại.",
    ctaPrimary: { label: "Xem liệu trình", href: "#treatments" },
    ctaSecondary: { label: "Đặt lịch ngay", href: "/contact" },
  },
  stats: [
    { n: "8", label: "Phòng trị liệu" },
    { n: "20+", label: "Liệu trình độc quyền" },
    { n: "100%", label: "Nguyên liệu thiên nhiên" },
    { n: "5★", label: "Đánh giá của khách" },
  ],
  amenities: [
    { icon: "Wind",     title: "Hồ bơi vô cực",     desc: "Hồ bơi 25m, view thành phố hoặc biển" },
    { icon: "Droplets", title: "Phòng xông hơi",    desc: "Xông khô & xông ướt đạt chuẩn 5 sao" },
    { icon: "Leaf",     title: "Vườn thảo dược",    desc: "Nguồn nguyên liệu tươi mỗi ngày" },
    { icon: "Star",     title: "Phòng spa riêng tư",desc: "8 phòng trị liệu đơn và đôi" },
    { icon: "Crown",    title: "Royal Lounge",      desc: "Không gian thư giãn trước và sau liệu trình" },
    { icon: "Clock",    title: "Mở cửa 24/7",       desc: "Phục vụ theo yêu cầu bất kỳ lúc nào" },
  ],
  treatments: [
    {
      category: "Liệu pháp thư giãn", icon: "Leaf",
      items: [
        { name: "Vietnamese Royal Ritual", duration: "120 phút", price: "2.800.000 ₫", desc: "Nghi lễ spa hoàng gia Việt Nam kết hợp massage toàn thân với thảo dược quý hiếm và tinh dầu hoa lài." },
        { name: "Herbal Compress Massage", duration: "90 phút",  price: "1.900.000 ₫", desc: "Massage truyền thống với túi thảo dược nóng, giải tỏa căng thẳng và cải thiện tuần hoàn máu." },
        { name: "Aromatherapy Journey",    duration: "75 phút",  price: "1.600.000 ₫", desc: "Hành trình thư giãn với tinh dầu thiên nhiên cao cấp, khơi dậy các giác quan và cân bằng năng lượng." },
      ],
    },
    {
      category: "Chăm sóc da mặt", icon: "Droplets",
      items: [
        { name: "Royal Gold Facial",       duration: "90 phút", price: "3.200.000 ₫", desc: "Liệu trình phục hồi da cao cấp với collagen vàng 24K và serum nhau thai tế bào gốc." },
        { name: "Lotus Brightening Facial",duration: "60 phút", price: "1.800.000 ₫", desc: "Làm sáng da tự nhiên với chiết xuất hoa sen Việt Nam, vitamin C thuần và enzyme papaya." },
        { name: "Hydra Deep Cleanse",      duration: "75 phút", price: "1.500.000 ₫", desc: "Làm sạch sâu và dưỡng ẩm chuyên sâu, phục hồi làn da căng mịn và tươi sáng." },
      ],
    },
    {
      category: "Gói nghỉ dưỡng trọn vẹn", icon: "Star",
      items: [
        { name: "MAISON DELUXE Day Spa", duration: "4 giờ", price: "5.500.000 ₫", desc: "Trải nghiệm toàn diện bao gồm tắm ngâm thảo dược, facial, massage và bữa trà chiều sang trọng." },
        { name: "Couple's Retreat",       duration: "3 giờ", price: "8.800.000 ₫", desc: "Gói spa đôi trong phòng suite riêng biệt, bao gồm champagne, hoa tươi và hai liệu trình massage." },
        { name: "Detox & Renewal",        duration: "5 giờ", price: "6.800.000 ₫", desc: "Chương trình thanh lọc toàn diện với body wrap, massage detox, facial và tắm muối khoáng." },
      ],
    },
  ],
  cta: {
    eyebrow: "Đặt lịch hẹn",
    title: "Bắt đầu hành trình thư giãn",
    description: "Liên hệ đội ngũ spa của chúng tôi để được tư vấn và đặt lịch hẹn. Chúng tôi sẽ thiết kế trải nghiệm hoàn hảo dành riêng cho bạn.",
    phone: "+84 1800 9999",
    hours: "Mở cửa 7:00 – 22:00 · 7 ngày trong tuần",
  },
};

import { Wind, Droplets, Leaf, Star, Crown, Clock, Sparkles, ChevronRight, ArrowRight, Phone } from "lucide-react";

const ICON_MAP: Record<string, any> = { Wind, Droplets, Leaf, Star, Crown, Clock, Sparkles, ChevronRight, ArrowRight, Phone };
export function getIcon(name: string) {
  return ICON_MAP[name] ?? Sparkles;
}
