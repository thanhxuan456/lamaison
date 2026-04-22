import DOMPurify from "dompurify";

interface Props {
  html: string | null | undefined;
  className?: string;
}

/**
 * Render WYSIWYG HTML soan boi admin (Tiptap) trong template chi nhanh.
 * Sanitize bang DOMPurify de chan XSS.
 */
export function HotelCustomHtml({ html, className }: Props) {
  const raw = (html ?? "").trim();
  if (!raw) return null;
  const safe = DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
  return (
    <section className={className ?? "py-16 bg-background border-b border-primary/10"}>
      <div className="container mx-auto px-4 md:px-8">
        <div
          className="prose prose-lg dark:prose-invert max-w-3xl mx-auto prose-headings:font-serif prose-headings:text-foreground prose-a:text-primary"
          dangerouslySetInnerHTML={{ __html: safe }}
        />
      </div>
    </section>
  );
}
