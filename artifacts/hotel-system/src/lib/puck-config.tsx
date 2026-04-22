import type { Config, Data } from "@measured/puck";
import DOMPurify from "dompurify";
import {
  Star, Sparkles, Award, Crown, Bed, Coffee, MapPin, Phone, Mail, Wifi,
  Car, Utensils, Waves, Dumbbell, Wine, Gift, Shield, Heart,
  Facebook, Instagram, Youtube, Twitter, Linkedin, Send,
} from "lucide-react";

function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input ?? "", {
    FORBID_TAGS: ["script", "iframe", "object", "embed", "style", "form"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
  });
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

const ICON_MAP = {
  star: Star, sparkles: Sparkles, award: Award, crown: Crown,
  bed: Bed, coffee: Coffee, mappin: MapPin, phone: Phone, mail: Mail,
  wifi: Wifi, car: Car, utensils: Utensils, pool: Waves, gym: Dumbbell,
  wine: Wine, gift: Gift, shield: Shield, heart: Heart,
} as const;
type IconKey = keyof typeof ICON_MAP;
const ICON_OPTIONS = (Object.keys(ICON_MAP) as IconKey[]).map(k => ({ label: k, value: k }));

const SOCIAL_MAP = {
  facebook: Facebook, instagram: Instagram, youtube: Youtube,
  twitter: Twitter, linkedin: Linkedin, send: Send,
} as const;
type SocialKey = keyof typeof SOCIAL_MAP;
const SOCIAL_OPTIONS = (Object.keys(SOCIAL_MAP) as SocialKey[]).map(k => ({ label: k, value: k }));

const ALIGN_OPTIONS = [
  { label: "Trái",  value: "left" },
  { label: "Giữa",  value: "center" },
  { label: "Phải",  value: "right" },
];

const BG_OPTIONS = [
  { label: "Trong suốt", value: "transparent" },
  { label: "Nền tối",     value: "dark" },
  { label: "Nền vàng",    value: "gold" },
  { label: "Nền sáng",    value: "light" },
];

function bgClass(v: string) {
  if (v === "dark")  return "bg-card text-foreground";
  if (v === "gold")  return "bg-primary/10 text-foreground";
  if (v === "light") return "bg-background text-foreground";
  return "";
}

type Props = {
  Hero:          { title: string; subtitle: string; image: string; align: "left"|"center"|"right"; height: "sm"|"md"|"lg" };
  Heading:       { text: string; level: "h1"|"h2"|"h3"|"h4"; align: "left"|"center"|"right" };
  Paragraph:     { text: string; align: "left"|"center"|"right" };
  Image:         { src: string; alt: string; rounded: boolean; maxWidth: number };
  Button:        { label: string; href: string; variant: "primary"|"secondary"; align: "left"|"center"|"right" };
  Columns:       { columns: { content: string }[] };
  Card:          { title: string; description: string; image: string; href: string };
  Spacer:        { size: "sm"|"md"|"lg"|"xl" };
  Divider:       { style: "line"|"ornament" };
  Html:          { html: string };
  Quote:         { text: string; author: string; role: string };
  Video:         { url: string; caption: string };
  Gallery:       { columns: 2|3|4; images: { src: string; alt: string }[] };
  FeatureGrid:   { columns: 2|3|4; items: { icon: IconKey; title: string; text: string }[] };
  Stats:         { items: { value: string; label: string }[] };
  CTABanner:     { title: string; subtitle: string; buttonLabel: string; buttonHref: string; image: string };
  FAQ:           { items: { question: string; answer: string }[] };
  PriceTable:    { plans: { name: string; price: string; period: string; features: string; href: string; highlighted: boolean }[] };
  MapEmbed:      { query: string; height: number };
  SocialLinks:   { items: { platform: SocialKey; url: string }[]; align: "left"|"center"|"right" };
  ImageWithText: { image: string; title: string; text: string; imagePosition: "left"|"right"; buttonLabel: string; buttonHref: string };
  LogoCloud:     { title: string; logos: { src: string; alt: string }[] };
  AnnouncementBar: { text: string; bg: "transparent"|"dark"|"gold"|"light" };
};

export const puckConfig: Config<Props> = {
  categories: {
    basic:     { title: "Cơ bản",         components: ["Hero", "Heading", "Paragraph", "Image", "Button", "Spacer", "Divider", "Html"] },
    layout:    { title: "Bố cục",         components: ["Columns", "ImageWithText"] },
    content:   { title: "Nội dung",       components: ["Card", "Quote", "FAQ", "FeatureGrid", "Stats"] },
    media:     { title: "Đa phương tiện", components: ["Gallery", "Video", "MapEmbed"] },
    marketing: { title: "Tiếp thị",       components: ["CTABanner", "PriceTable", "LogoCloud", "SocialLinks", "AnnouncementBar"] },
  },

  components: {
    Hero: {
      label: "Hero (banner lớn)",
      fields: {
        title: { type: "text", label: "Tiêu đề" },
        subtitle: { type: "textarea", label: "Phụ đề" },
        image: { type: "text", label: "URL hình nền" },
        align: { type: "select", label: "Căn lề", options: ALIGN_OPTIONS },
        height: {
          type: "select", label: "Chiều cao",
          options: [
            { label: "Nhỏ (40vh)", value: "sm" },
            { label: "Vừa (60vh)", value: "md" },
            { label: "Lớn (80vh)", value: "lg" },
          ],
        },
      },
      defaultProps: {
        title: "Trải nghiệm đẳng cấp 5 sao",
        subtitle: "Sang trọng và tinh tế trong từng chi tiết",
        image: "", align: "center", height: "md",
      },
      render: ({ title, subtitle, image, align, height }) => {
        const heightCls = height === "sm" ? "h-[40vh]" : height === "lg" ? "h-[80vh]" : "h-[60vh]";
        const alignCls  = align === "left" ? "items-start text-left" : align === "right" ? "items-end text-right" : "items-center text-center";
        return (
          <section
            className={`relative w-full ${heightCls} flex flex-col justify-center px-6 md:px-16 ${alignCls}`}
            style={{
              backgroundImage: image ? `url(${image})` : undefined,
              backgroundColor: image ? undefined : "#1a1a1a",
              backgroundSize: "cover", backgroundPosition: "center",
            }}
          >
            {image && <div className="absolute inset-0 bg-black/40" />}
            <div className="relative z-10 max-w-3xl">
              <h1 className="text-4xl md:text-6xl font-serif text-white mb-4">{title}</h1>
              {subtitle && <p className="text-lg md:text-xl text-white/90">{subtitle}</p>}
            </div>
          </section>
        );
      },
    },

    Heading: {
      label: "Tiêu đề",
      fields: {
        text: { type: "text", label: "Nội dung" },
        level: { type: "select", label: "Cấp độ", options: [
          { label: "H1", value: "h1" }, { label: "H2", value: "h2" },
          { label: "H3", value: "h3" }, { label: "H4", value: "h4" },
        ]},
        align: { type: "select", label: "Căn lề", options: ALIGN_OPTIONS },
      },
      defaultProps: { text: "Tiêu đề mới", level: "h2", align: "left" },
      render: ({ text, level, align }) => {
        const Tag = (level || "h2") as React.ElementType;
        const sizeCls = level === "h1" ? "text-4xl" : level === "h2" ? "text-3xl" : level === "h3" ? "text-2xl" : "text-xl";
        const alignCls = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
        return <Tag className={`${sizeCls} ${alignCls} font-serif text-foreground my-4 px-6`}>{text}</Tag>;
      },
    },

    Paragraph: {
      label: "Đoạn văn",
      fields: {
        text: { type: "textarea", label: "Nội dung" },
        align: { type: "select", label: "Căn lề", options: ALIGN_OPTIONS },
      },
      defaultProps: { text: "Nhập nội dung đoạn văn của bạn ở đây...", align: "left" },
      render: ({ text, align }) => {
        const alignCls = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
        return <p className={`${alignCls} text-base leading-relaxed text-foreground/90 my-3 px-6 max-w-4xl mx-auto`}>{text}</p>;
      },
    },

    Image: {
      label: "Hình ảnh",
      fields: {
        src: { type: "text", label: "URL ảnh" },
        alt: { type: "text", label: "Mô tả (alt)" },
        rounded: { type: "radio", label: "Bo góc", options: [
          { label: "Có",     value: true as any },
          { label: "Không",  value: false as any },
        ]},
        maxWidth: { type: "number", label: "Chiều rộng tối đa (px)", min: 100, max: 2000 },
      },
      defaultProps: { src: "", alt: "", rounded: false, maxWidth: 1200 },
      render: ({ src, alt, rounded, maxWidth }) =>
        src ? (
          <div className="my-4 px-6 flex justify-center">
            <img src={src} alt={alt} style={{ maxWidth: `${maxWidth}px`, width: "100%" }} className={rounded ? "rounded-lg" : ""} />
          </div>
        ) : (
          <div className="my-4 mx-6 h-48 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground text-sm">
            (Chưa có ảnh — nhập URL ở panel bên phải)
          </div>
        ),
    },

    Button: {
      label: "Nút bấm",
      fields: {
        label: { type: "text", label: "Chữ trên nút" },
        href: { type: "text", label: "Liên kết (href)" },
        variant: { type: "select", label: "Kiểu", options: [
          { label: "Chính (primary)",  value: "primary" },
          { label: "Phụ (secondary)",  value: "secondary" },
        ]},
        align: { type: "select", label: "Căn lề", options: ALIGN_OPTIONS },
      },
      defaultProps: { label: "Đặt phòng ngay", href: "/", variant: "primary", align: "left" },
      render: ({ label, href, variant, align }) => {
        const alignCls = align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start";
        const styleCls = variant === "primary"
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "border border-primary text-primary hover:bg-primary/10";
        return (
          <div className={`flex ${alignCls} my-4 px-6`}>
            <a href={href} className={`${styleCls} px-6 py-3 text-sm uppercase tracking-widest transition-colors inline-block`}>{label}</a>
          </div>
        );
      },
    },

    Columns: {
      label: "Cột (chia bố cục)",
      fields: {
        columns: {
          type: "array", label: "Các cột",
          arrayFields: { content: { type: "textarea", label: "Nội dung cột" } },
          defaultItemProps: { content: "Nội dung cột..." },
          getItemSummary: (_item, i) => `Cột ${(i ?? 0) + 1}`,
        },
      },
      defaultProps: { columns: [{ content: "Cột 1" }, { content: "Cột 2" }, { content: "Cột 3" }] },
      render: ({ columns }) => (
        <div className="my-4 px-6 grid gap-6" style={{ gridTemplateColumns: `repeat(${columns?.length || 1}, minmax(0, 1fr))` }}>
          {(columns ?? []).map((c, i) => (
            <div key={i} className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{c.content}</div>
          ))}
        </div>
      ),
    },

    Card: {
      label: "Thẻ (card)",
      fields: {
        title: { type: "text", label: "Tiêu đề" },
        description: { type: "textarea", label: "Mô tả" },
        image: { type: "text", label: "URL ảnh" },
        href: { type: "text", label: "Liên kết khi click" },
      },
      defaultProps: { title: "Tên thẻ", description: "Mô tả ngắn", image: "", href: "" },
      render: ({ title, description, image, href }) => {
        const inner = (
          <div className="border border-primary/20 bg-card overflow-hidden hover:border-primary/50 transition-colors">
            {image && <img src={image} alt={title} className="w-full h-48 object-cover" />}
            <div className="p-4">
              <h3 className="font-serif text-lg text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
        );
        return <div className="my-4 px-6 max-w-md mx-auto">{href ? <a href={href}>{inner}</a> : inner}</div>;
      },
    },

    Spacer: {
      label: "Khoảng trống",
      fields: {
        size: { type: "select", label: "Kích thước", options: [
          { label: "Nhỏ (16px)",      value: "sm" },
          { label: "Vừa (32px)",      value: "md" },
          { label: "Lớn (64px)",      value: "lg" },
          { label: "Rất lớn (128px)", value: "xl" },
        ]},
      },
      defaultProps: { size: "md" },
      render: ({ size }) => {
        const h = size === "sm" ? 16 : size === "md" ? 32 : size === "lg" ? 64 : 128;
        return <div style={{ height: `${h}px` }} />;
      },
    },

    Divider: {
      label: "Đường kẻ ngăn",
      fields: {
        style: { type: "select", label: "Kiểu", options: [
          { label: "Đường thẳng",   value: "line" },
          { label: "Hoa văn vàng",  value: "ornament" },
        ]},
      },
      defaultProps: { style: "line" },
      render: ({ style }) =>
        style === "ornament" ? (
          <div className="my-8 px-6 flex items-center justify-center gap-3 text-primary">
            <span className="h-px w-16 bg-primary/40" />
            <span className="text-xl">◆</span>
            <span className="h-px w-16 bg-primary/40" />
          </div>
        ) : (
          <div className="my-6 px-6"><hr className="border-primary/20" /></div>
        ),
    },

    Html: {
      label: "HTML tuỳ chỉnh",
      fields: { html: { type: "textarea", label: "Mã HTML" } },
      defaultProps: { html: "<div class='p-6 text-center'>HTML của bạn ở đây</div>" },
      render: ({ html }) => <div className="my-4" dangerouslySetInnerHTML={{ __html: sanitizeHtml(html ?? "") }} />,
    },

    Quote: {
      label: "Trích dẫn",
      fields: {
        text: { type: "textarea", label: "Nội dung trích dẫn" },
        author: { type: "text", label: "Tác giả / khách hàng" },
        role: { type: "text", label: "Chức danh (tuỳ chọn)" },
      },
      defaultProps: {
        text: "Một trải nghiệm tuyệt vời, dịch vụ vượt mong đợi.",
        author: "Nguyễn Văn A", role: "Khách lưu trú",
      },
      render: ({ text, author, role }) => (
        <figure className="my-8 px-6 max-w-3xl mx-auto text-center">
          <div className="text-primary text-5xl font-serif leading-none mb-2">"</div>
          <blockquote className="text-xl md:text-2xl font-serif text-foreground leading-relaxed italic">{text}</blockquote>
          {(author || role) && (
            <figcaption className="mt-4 text-sm text-muted-foreground">
              <span className="text-primary font-semibold">{author}</span>
              {role && <span> — {role}</span>}
            </figcaption>
          )}
        </figure>
      ),
    },

    Video: {
      label: "Video YouTube",
      fields: {
        url: { type: "text", label: "URL YouTube (watch hoặc youtu.be)" },
        caption: { type: "text", label: "Chú thích (tuỳ chọn)" },
      },
      defaultProps: { url: "", caption: "" },
      render: ({ url, caption }) => {
        const id = extractYouTubeId(url ?? "");
        if (!id) {
          return (
            <div className="my-4 mx-6 h-48 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground text-sm">
              (Dán link YouTube hợp lệ vào panel bên phải)
            </div>
          );
        }
        return (
          <div className="my-6 px-6 max-w-4xl mx-auto">
            <div className="relative pb-[56.25%] h-0 overflow-hidden bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${id}`}
                title={caption || "YouTube video"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute top-0 left-0 w-full h-full border-0"
              />
            </div>
            {caption && <p className="text-center text-sm text-muted-foreground mt-2">{caption}</p>}
          </div>
        );
      },
    },

    Gallery: {
      label: "Bộ sưu tập ảnh",
      fields: {
        columns: { type: "select", label: "Số cột", options: [
          { label: "2", value: 2 as any }, { label: "3", value: 3 as any }, { label: "4", value: 4 as any },
        ]},
        images: {
          type: "array", label: "Ảnh",
          arrayFields: {
            src: { type: "text", label: "URL ảnh" },
            alt: { type: "text", label: "Mô tả (alt)" },
          },
          defaultItemProps: { src: "", alt: "" },
          getItemSummary: (item, i) => item?.alt || `Ảnh ${(i ?? 0) + 1}`,
        },
      },
      defaultProps: {
        columns: 3,
        images: [{ src: "", alt: "" }, { src: "", alt: "" }, { src: "", alt: "" }],
      },
      render: ({ columns, images }) => (
        <div className="my-6 px-6 grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {(images ?? []).map((img, i) =>
            img.src ? (
              <img key={i} src={img.src} alt={img.alt} className="w-full aspect-square object-cover" />
            ) : (
              <div key={i} className="w-full aspect-square bg-muted/30 border border-dashed border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground">
                (chưa có ảnh)
              </div>
            )
          )}
        </div>
      ),
    },

    FeatureGrid: {
      label: "Lưới tính năng (icon)",
      fields: {
        columns: { type: "select", label: "Số cột", options: [
          { label: "2", value: 2 as any }, { label: "3", value: 3 as any }, { label: "4", value: 4 as any },
        ]},
        items: {
          type: "array", label: "Tính năng",
          arrayFields: {
            icon:  { type: "select", label: "Icon", options: ICON_OPTIONS },
            title: { type: "text",   label: "Tiêu đề" },
            text:  { type: "textarea", label: "Mô tả ngắn" },
          },
          defaultItemProps: { icon: "star" as IconKey, title: "Tính năng", text: "Mô tả ngắn về tính năng này." },
          getItemSummary: (item, i) => item?.title || `Mục ${(i ?? 0) + 1}`,
        },
      },
      defaultProps: {
        columns: 3,
        items: [
          { icon: "wifi" as IconKey,     title: "Wi-Fi miễn phí",   text: "Tốc độ cao toàn khu vực." },
          { icon: "pool" as IconKey,     title: "Hồ bơi vô cực",     text: "Tầm nhìn ra thành phố." },
          { icon: "utensils" as IconKey, title: "Nhà hàng 5 sao",   text: "Đầu bếp quốc tế." },
        ],
      },
      render: ({ columns, items }) => (
        <div className="my-8 px-6 grid gap-6" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {(items ?? []).map((it, i) => {
            const Ic = ICON_MAP[it.icon] ?? Star;
            return (
              <div key={i} className="text-center p-4 border border-primary/20 bg-card">
                <Ic className="mx-auto text-primary mb-3" size={36} />
                <h3 className="font-serif text-lg text-foreground mb-2">{it.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{it.text}</p>
              </div>
            );
          })}
        </div>
      ),
    },

    Stats: {
      label: "Số liệu nổi bật",
      fields: {
        items: {
          type: "array", label: "Số liệu",
          arrayFields: {
            value: { type: "text", label: "Giá trị (vd: 500+)" },
            label: { type: "text", label: "Nhãn" },
          },
          defaultItemProps: { value: "100+", label: "Phòng cao cấp" },
          getItemSummary: (item, i) => item?.label || `Số liệu ${(i ?? 0) + 1}`,
        },
      },
      defaultProps: {
        items: [
          { value: "500+", label: "Phòng cao cấp" },
          { value: "98%",  label: "Khách hài lòng" },
          { value: "15",   label: "Năm kinh nghiệm" },
          { value: "24/7", label: "Hỗ trợ tận tâm" },
        ],
      },
      render: ({ items }) => (
        <div className="my-8 px-6 grid gap-6" style={{ gridTemplateColumns: `repeat(${(items ?? []).length || 1}, minmax(0, 1fr))` }}>
          {(items ?? []).map((it, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl md:text-5xl font-serif text-primary mb-2">{it.value}</div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{it.label}</div>
            </div>
          ))}
        </div>
      ),
    },

    CTABanner: {
      label: "Banner kêu gọi (CTA)",
      fields: {
        title:        { type: "text",     label: "Tiêu đề" },
        subtitle:     { type: "textarea", label: "Phụ đề" },
        buttonLabel:  { type: "text",     label: "Chữ trên nút" },
        buttonHref:   { type: "text",     label: "Liên kết" },
        image:        { type: "text",     label: "URL ảnh nền (tuỳ chọn)" },
      },
      defaultProps: {
        title: "Đặt phòng ngay hôm nay", subtitle: "Ưu đãi đặc biệt cho thành viên mới",
        buttonLabel: "Đặt phòng", buttonHref: "/", image: "",
      },
      render: ({ title, subtitle, buttonLabel, buttonHref, image }) => (
        <section
          className="my-8 mx-6 relative px-8 py-12 md:py-16 text-center overflow-hidden"
          style={{
            backgroundImage: image ? `url(${image})` : undefined,
            backgroundColor: image ? undefined : "#1a1a1a",
            backgroundSize: "cover", backgroundPosition: "center",
          }}
        >
          {image && <div className="absolute inset-0 bg-black/50" />}
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-serif text-white mb-3">{title}</h2>
            {subtitle && <p className="text-white/80 mb-6">{subtitle}</p>}
            {buttonLabel && (
              <a href={buttonHref || "#"} className="inline-block bg-primary text-primary-foreground px-8 py-3 text-sm uppercase tracking-widest hover:bg-primary/90 transition-colors">
                {buttonLabel}
              </a>
            )}
          </div>
        </section>
      ),
    },

    FAQ: {
      label: "Câu hỏi thường gặp",
      fields: {
        items: {
          type: "array", label: "Câu hỏi",
          arrayFields: {
            question: { type: "text",     label: "Câu hỏi" },
            answer:   { type: "textarea", label: "Trả lời" },
          },
          defaultItemProps: { question: "Câu hỏi mới?", answer: "Trả lời ở đây..." },
          getItemSummary: (item, i) => item?.question || `Câu hỏi ${(i ?? 0) + 1}`,
        },
      },
      defaultProps: {
        items: [
          { question: "Giờ check-in / check-out?", answer: "Check-in từ 14:00, check-out trước 12:00." },
          { question: "Có chỗ đỗ xe không?",       answer: "Khách sạn có hầm để xe miễn phí." },
        ],
      },
      render: ({ items }) => (
        <div className="my-8 px-6 max-w-3xl mx-auto space-y-2">
          {(items ?? []).map((it, i) => (
            <details key={i} className="group border border-primary/20 bg-card">
              <summary className="cursor-pointer px-4 py-3 font-serif text-foreground flex items-center justify-between list-none">
                <span>{it.question}</span>
                <span className="text-primary group-open:rotate-45 transition-transform text-xl leading-none">+</span>
              </summary>
              <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{it.answer}</div>
            </details>
          ))}
        </div>
      ),
    },

    PriceTable: {
      label: "Bảng giá phòng",
      fields: {
        plans: {
          type: "array", label: "Gói",
          arrayFields: {
            name:        { type: "text",     label: "Tên gói" },
            price:       { type: "text",     label: "Giá (vd: 2.500.000đ)" },
            period:      { type: "text",     label: "Đơn vị (vd: /đêm)" },
            features:    { type: "textarea", label: "Tính năng (mỗi dòng 1 tính năng)" },
            href:        { type: "text",     label: "Liên kết đặt" },
            highlighted: { type: "radio",    label: "Nổi bật", options: [
              { label: "Có",    value: true as any },
              { label: "Không", value: false as any },
            ]},
          },
          defaultItemProps: { name: "Deluxe", price: "2.500.000đ", period: "/đêm", features: "Giường King\nView thành phố\nBữa sáng buffet", href: "/", highlighted: false },
          getItemSummary: (item, i) => item?.name || `Gói ${(i ?? 0) + 1}`,
        },
      },
      defaultProps: {
        plans: [
          { name: "Superior", price: "1.800.000đ", period: "/đêm", features: "Giường Queen\nView vườn\nBữa sáng",                href: "/", highlighted: false },
          { name: "Deluxe",   price: "2.500.000đ", period: "/đêm", features: "Giường King\nView thành phố\nBữa sáng buffet\nMinibar", href: "/", highlighted: true  },
          { name: "Suite",    price: "4.200.000đ", period: "/đêm", features: "2 phòng ngủ\nView toàn cảnh\nĐưa đón sân bay\nSpa miễn phí", href: "/", highlighted: false },
        ],
      },
      render: ({ plans }) => (
        <div className="my-8 px-6 grid gap-6" style={{ gridTemplateColumns: `repeat(${(plans ?? []).length || 1}, minmax(0, 1fr))` }}>
          {(plans ?? []).map((p, i) => (
            <div key={i} className={`p-6 border bg-card flex flex-col ${p.highlighted ? "border-primary shadow-[0_0_24px_rgba(212,175,55,0.2)]" : "border-primary/20"}`}>
              {p.highlighted && <div className="text-[10px] uppercase tracking-widest text-primary mb-2">Phổ biến</div>}
              <h3 className="font-serif text-2xl text-foreground mb-2">{p.name}</h3>
              <div className="mb-4">
                <span className="text-3xl font-serif text-primary">{p.price}</span>
                <span className="text-sm text-muted-foreground">{p.period}</span>
              </div>
              <ul className="text-sm text-foreground/80 space-y-1 mb-6 flex-1">
                {(p.features ?? "").split("\n").filter(Boolean).map((f, k) => (
                  <li key={k} className="flex gap-2"><span className="text-primary">✓</span><span>{f}</span></li>
                ))}
              </ul>
              {p.href && (
                <a href={p.href} className={`block text-center px-6 py-3 text-sm uppercase tracking-widest transition-colors ${p.highlighted ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border border-primary text-primary hover:bg-primary/10"}`}>
                  Chọn gói
                </a>
              )}
            </div>
          ))}
        </div>
      ),
    },

    MapEmbed: {
      label: "Bản đồ Google",
      fields: {
        query:  { type: "text",   label: "Địa chỉ hoặc toạ độ (vd: 1 Hai Bà Trưng, Hà Nội)" },
        height: { type: "number", label: "Chiều cao (px)", min: 200, max: 800 },
      },
      defaultProps: { query: "Hà Nội", height: 400 },
      render: ({ query, height }) => {
        const q = encodeURIComponent(query || "");
        return (
          <div className="my-6 px-6">
            <iframe
              src={`https://www.google.com/maps?q=${q}&output=embed`}
              title={`Bản đồ ${query}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full border-0"
              style={{ height: `${height || 400}px` }}
            />
          </div>
        );
      },
    },

    SocialLinks: {
      label: "Mạng xã hội",
      fields: {
        align: { type: "select", label: "Căn lề", options: ALIGN_OPTIONS },
        items: {
          type: "array", label: "Liên kết",
          arrayFields: {
            platform: { type: "select", label: "Nền tảng", options: SOCIAL_OPTIONS },
            url:      { type: "text",   label: "URL" },
          },
          defaultItemProps: { platform: "facebook" as SocialKey, url: "https://facebook.com/" },
          getItemSummary: (item, i) => item?.platform || `Mục ${(i ?? 0) + 1}`,
        },
      },
      defaultProps: {
        align: "center",
        items: [
          { platform: "facebook" as SocialKey,  url: "https://facebook.com/" },
          { platform: "instagram" as SocialKey, url: "https://instagram.com/" },
          { platform: "youtube" as SocialKey,   url: "https://youtube.com/" },
        ],
      },
      render: ({ items, align }) => {
        const alignCls = align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start";
        return (
          <div className={`my-6 px-6 flex ${alignCls} gap-4`}>
            {(items ?? []).map((it, i) => {
              const Ic = SOCIAL_MAP[it.platform] ?? Send;
              return (
                <a key={i} href={it.url} target="_blank" rel="noopener noreferrer"
                   className="w-10 h-10 border border-primary/40 text-primary flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Ic size={18} />
                </a>
              );
            })}
          </div>
        );
      },
    },

    ImageWithText: {
      label: "Ảnh + Chữ (2 cột)",
      fields: {
        image:         { type: "text",     label: "URL ảnh" },
        title:         { type: "text",     label: "Tiêu đề" },
        text:          { type: "textarea", label: "Nội dung" },
        imagePosition: { type: "select",   label: "Vị trí ảnh", options: [
          { label: "Trái",  value: "left" },
          { label: "Phải",  value: "right" },
        ]},
        buttonLabel:   { type: "text", label: "Chữ nút (tuỳ chọn)" },
        buttonHref:    { type: "text", label: "Link nút" },
      },
      defaultProps: {
        image: "", title: "Khám phá không gian sang trọng",
        text: "Mỗi căn phòng tại MAISON DELUXE đều được thiết kế tỉ mỉ, kết hợp giữa nét cổ điển Pháp và tiện nghi hiện đại.",
        imagePosition: "left", buttonLabel: "Tìm hiểu thêm", buttonHref: "/",
      },
      render: ({ image, title, text, imagePosition, buttonLabel, buttonHref }) => {
        const imgEl = image ? (
          <img src={image} alt={title} className="w-full h-full object-cover aspect-[4/3]" />
        ) : (
          <div className="w-full aspect-[4/3] bg-muted/30 border border-dashed border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground">(chưa có ảnh)</div>
        );
        const textEl = (
          <div className="flex flex-col justify-center">
            <h2 className="font-serif text-3xl text-foreground mb-4">{title}</h2>
            <p className="text-foreground/80 leading-relaxed mb-6 whitespace-pre-wrap">{text}</p>
            {buttonLabel && (
              <a href={buttonHref || "#"} className="self-start bg-primary text-primary-foreground px-6 py-3 text-sm uppercase tracking-widest hover:bg-primary/90 transition-colors">
                {buttonLabel}
              </a>
            )}
          </div>
        );
        return (
          <section className="my-8 px-6 grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {imagePosition === "right" ? <>{textEl}{imgEl}</> : <>{imgEl}{textEl}</>}
          </section>
        );
      },
    },

    LogoCloud: {
      label: "Logo đối tác",
      fields: {
        title: { type: "text", label: "Tiêu đề (tuỳ chọn)" },
        logos: {
          type: "array", label: "Logo",
          arrayFields: {
            src: { type: "text", label: "URL logo" },
            alt: { type: "text", label: "Tên đối tác" },
          },
          defaultItemProps: { src: "", alt: "" },
          getItemSummary: (item, i) => item?.alt || `Logo ${(i ?? 0) + 1}`,
        },
      },
      defaultProps: {
        title: "Đối tác & chứng nhận",
        logos: [{ src: "", alt: "" }, { src: "", alt: "" }, { src: "", alt: "" }, { src: "", alt: "" }],
      },
      render: ({ title, logos }) => (
        <section className="my-8 px-6">
          {title && <h3 className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-6">{title}</h3>}
          <div className="grid gap-6 items-center" style={{ gridTemplateColumns: `repeat(${(logos ?? []).length || 1}, minmax(0, 1fr))` }}>
            {(logos ?? []).map((l, i) =>
              l.src ? (
                <img key={i} src={l.src} alt={l.alt} className="h-12 w-auto mx-auto object-contain opacity-70 hover:opacity-100 transition-opacity grayscale hover:grayscale-0" />
              ) : (
                <div key={i} className="h-12 bg-muted/30 border border-dashed border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground">(logo)</div>
              )
            )}
          </div>
        </section>
      ),
    },

    AnnouncementBar: {
      label: "Thanh thông báo",
      fields: {
        text: { type: "text", label: "Nội dung" },
        bg:   { type: "select", label: "Nền", options: BG_OPTIONS },
      },
      defaultProps: { text: "🎉 Ưu đãi đặc biệt: Giảm 20% cho đặt phòng trong tháng này!", bg: "gold" },
      render: ({ text, bg }) => (
        <div className={`px-6 py-3 text-center text-sm tracking-wide ${bgClass(bg)}`}>{text}</div>
      ),
    },
  },
};

export const EMPTY_PUCK_DATA: Data = {
  content: [],
  root: { props: {} },
};
