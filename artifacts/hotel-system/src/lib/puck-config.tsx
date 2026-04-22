import type { Config, Data } from "@measured/puck";
import DOMPurify from "dompurify";

// Sanitize HTML do admin nhap vao block Html: chan script, on-event, javascript: URL,
// iframe/object/embed... DOMPurify chay client-side va cung su dung khi render public.
function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input ?? "", {
    FORBID_TAGS: ["script", "iframe", "object", "embed", "style", "form"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur"],
  });
}

/**
 * Cau hinh Puck cho trinh keo-tha trang CMS.
 *
 * Moi component trong `components` la 1 block co the keo vao canvas.
 * Field types ho tro: text, textarea, number, select, radio, array, object.
 * Tham khao: https://puckeditor.com/docs/api-reference/configuration
 */

type Props = {
  Hero: {
    title: string;
    subtitle: string;
    image: string;
    align: "left" | "center" | "right";
    height: "sm" | "md" | "lg";
  };
  Heading: {
    text: string;
    level: "h1" | "h2" | "h3" | "h4";
    align: "left" | "center" | "right";
  };
  Paragraph: { text: string; align: "left" | "center" | "right" };
  Image: { src: string; alt: string; rounded: boolean; maxWidth: number };
  Button: { label: string; href: string; variant: "primary" | "secondary"; align: "left" | "center" | "right" };
  Columns: {
    columns: { content: string }[];
  };
  Card: { title: string; description: string; image: string; href: string };
  Spacer: { size: "sm" | "md" | "lg" | "xl" };
  Html: { html: string };
};

const ALIGN_OPTIONS = [
  { label: "Trái", value: "left" },
  { label: "Giữa", value: "center" },
  { label: "Phải", value: "right" },
];

export const puckConfig: Config<Props> = {
  components: {
    Hero: {
      label: "Hero (banner lớn)",
      fields: {
        title: { type: "text", label: "Tiêu đề" },
        subtitle: { type: "textarea", label: "Phụ đề" },
        image: { type: "text", label: "URL hình nền" },
        align: { type: "select", label: "Căn lề", options: ALIGN_OPTIONS },
        height: {
          type: "select",
          label: "Chiều cao",
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
        image: "",
        align: "center",
        height: "md",
      },
      render: ({ title, subtitle, image, align, height }) => {
        const heightCls = height === "sm" ? "h-[40vh]" : height === "lg" ? "h-[80vh]" : "h-[60vh]";
        const alignCls = align === "left" ? "items-start text-left" : align === "right" ? "items-end text-right" : "items-center text-center";
        return (
          <section
            className={`relative w-full ${heightCls} flex flex-col justify-center px-6 md:px-16 ${alignCls}`}
            style={{
              backgroundImage: image ? `url(${image})` : undefined,
              backgroundColor: image ? undefined : "#1a1a1a",
              backgroundSize: "cover",
              backgroundPosition: "center",
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
        level: {
          type: "select",
          label: "Cấp độ",
          options: [
            { label: "H1", value: "h1" },
            { label: "H2", value: "h2" },
            { label: "H3", value: "h3" },
            { label: "H4", value: "h4" },
          ],
        },
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
      defaultProps: {
        text: "Nhập nội dung đoạn văn của bạn ở đây...",
        align: "left",
      },
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
        rounded: {
          type: "radio",
          label: "Bo góc",
          options: [
            { label: "Có", value: true as any },
            { label: "Không", value: false as any },
          ],
        },
        maxWidth: { type: "number", label: "Chiều rộng tối đa (px)", min: 100, max: 2000 },
      },
      defaultProps: { src: "", alt: "", rounded: false, maxWidth: 1200 },
      render: ({ src, alt, rounded, maxWidth }) =>
        src ? (
          <div className="my-4 px-6 flex justify-center">
            <img
              src={src}
              alt={alt}
              style={{ maxWidth: `${maxWidth}px`, width: "100%" }}
              className={rounded ? "rounded-lg" : ""}
            />
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
        variant: {
          type: "select",
          label: "Kiểu",
          options: [
            { label: "Chính (primary)", value: "primary" },
            { label: "Phụ (secondary)", value: "secondary" },
          ],
        },
        align: { type: "select", label: "Căn lề", options: ALIGN_OPTIONS },
      },
      defaultProps: { label: "Đặt phòng ngay", href: "/", variant: "primary", align: "left" },
      render: ({ label, href, variant, align }) => {
        const alignCls = align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start";
        const styleCls =
          variant === "primary"
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "border border-primary text-primary hover:bg-primary/10";
        return (
          <div className={`flex ${alignCls} my-4 px-6`}>
            <a href={href} className={`${styleCls} px-6 py-3 text-sm uppercase tracking-widest transition-colors inline-block`}>
              {label}
            </a>
          </div>
        );
      },
    },

    Columns: {
      label: "Cột (chia bố cục)",
      fields: {
        columns: {
          type: "array",
          label: "Các cột",
          arrayFields: {
            content: { type: "textarea", label: "Nội dung cột" },
          },
          defaultItemProps: { content: "Nội dung cột..." },
          getItemSummary: (item, i) => `Cột ${(i ?? 0) + 1}`,
        },
      },
      defaultProps: {
        columns: [{ content: "Cột 1" }, { content: "Cột 2" }, { content: "Cột 3" }],
      },
      render: ({ columns }) => (
        <div className="my-4 px-6 grid gap-6" style={{ gridTemplateColumns: `repeat(${columns?.length || 1}, minmax(0, 1fr))` }}>
          {(columns ?? []).map((c, i) => (
            <div key={i} className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {c.content}
            </div>
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
        size: {
          type: "select",
          label: "Kích thước",
          options: [
            { label: "Nhỏ (16px)", value: "sm" },
            { label: "Vừa (32px)", value: "md" },
            { label: "Lớn (64px)", value: "lg" },
            { label: "Rất lớn (128px)", value: "xl" },
          ],
        },
      },
      defaultProps: { size: "md" },
      render: ({ size }) => {
        const h = size === "sm" ? 16 : size === "md" ? 32 : size === "lg" ? 64 : 128;
        return <div style={{ height: `${h}px` }} />;
      },
    },

    Html: {
      label: "HTML tuỳ chỉnh",
      fields: {
        html: { type: "textarea", label: "Mã HTML" },
      },
      defaultProps: { html: "<div class='p-6 text-center'>HTML của bạn ở đây</div>" },
      render: ({ html }) => <div className="my-4" dangerouslySetInnerHTML={{ __html: sanitizeHtml(html ?? "") }} />,
    },
  },
};

export const EMPTY_PUCK_DATA: Data = {
  content: [],
  root: { props: {} },
};
