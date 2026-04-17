import { useRef, useEffect, useState, useCallback } from "react";
import DOMPurify from "dompurify";
import {
  Bold, Italic, Underline, Strikethrough, Heading2, Heading3,
  List, ListOrdered, Link2, Quote, AlignLeft, AlignCenter, AlignRight,
  Undo2, Redo2, Eraser, Type, Palette, Code, Eye,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

// Robust HTML sanitization via DOMPurify. Allowlist of safe tags/attrs only.
const ALLOWED_TAGS = [
  "p", "br", "span", "div",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "strike", "sub", "sup",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "a", "img", "figure", "figcaption",
  "table", "thead", "tbody", "tr", "td", "th",
  "hr", "font",
];
const ALLOWED_ATTR = ["href", "src", "alt", "title", "target", "rel", "style", "color", "size", "face", "align"];

function sanitize(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "textarea", "button"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "formaction"],
    ADD_ATTR: ["target"],
  });
}

// Add target=_blank rel=noopener to all sanitized links automatically
if (typeof window !== "undefined") {
  DOMPurify.addHook("afterSanitizeAttributes", (node: any) => {
    if (node.tagName === "A" && node.getAttribute("href")) {
      node.setAttribute("rel", "noopener noreferrer");
      if (!node.getAttribute("target")) node.setAttribute("target", "_blank");
    }
  });
}

const FONT_SIZES = [
  { label: "Nhỏ", value: "2" },
  { label: "Thường", value: "3" },
  { label: "Vừa", value: "4" },
  { label: "Lớn", value: "5" },
  { label: "Rất lớn", value: "6" },
  { label: "Khổng lồ", value: "7" },
];

const COLORS = [
  "#000000", "#374151", "#6B7280", "#9CA3AF",
  "#B8860B", "#D4AF37", "#A30000", "#0F4C5C",
  "#1B5E20", "#0D47A1", "#4A148C", "#FFFFFF",
];

export function RichTextEditor({ value, onChange, placeholder, minHeight = 160 }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showColors, setShowColors] = useState(false);
  const [showHtml, setShowHtml] = useState(false);
  const [htmlDraft, setHtmlDraft] = useState("");

  // Sync external value changes only when editor isn't focused
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (document.activeElement !== el && el.innerHTML !== value) {
      el.innerHTML = value || "";
    }
  }, [value]);

  const exec = useCallback((cmd: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, arg);
    if (editorRef.current) onChange(sanitize(editorRef.current.innerHTML));
  }, [onChange]);

  const handleInput = () => {
    if (editorRef.current) onChange(sanitize(editorRef.current.innerHTML));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  const handleLink = () => {
    const url = prompt("Nhập đường dẫn (URL):", "https://");
    if (url && url.trim()) exec("createLink", url.trim());
  };

  const openHtml = () => {
    setHtmlDraft(value || "");
    setShowHtml(true);
  };

  const saveHtml = () => {
    onChange(sanitize(htmlDraft));
    setShowHtml(false);
  };

  return (
    <div className="border border-primary/20 bg-background">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1 border-b border-primary/15 bg-muted/30">
        <ToolbarBtn onClick={() => exec("undo")} title="Hoàn tác (Ctrl+Z)"><Undo2 size={12} /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec("redo")} title="Làm lại (Ctrl+Y)"><Redo2 size={12} /></ToolbarBtn>
        <Sep />

        <select
          onChange={e => { exec("fontSize", e.target.value); e.target.value = ""; }}
          className="h-6 text-[11px] bg-transparent border border-primary/15 rounded-none cursor-pointer outline-none px-1"
          title="Cỡ chữ"
        >
          <option value="">Cỡ chữ</option>
          {FONT_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <Sep />

        <ToolbarBtn onClick={() => exec("bold")} title="Đậm (Ctrl+B)"><Bold size={12} /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec("italic")} title="Nghiêng (Ctrl+I)"><Italic size={12} /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec("underline")} title="Gạch chân"><Underline size={12} /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec("strikeThrough")} title="Gạch ngang"><Strikethrough size={12} /></ToolbarBtn>
        <Sep />

        <ToolbarBtn onClick={() => exec("formatBlock", "<h2>")} title="Tiêu đề lớn"><Heading2 size={12} /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec("formatBlock", "<h3>")} title="Tiêu đề nhỏ"><Heading3 size={12} /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec("formatBlock", "<p>")} title="Đoạn văn"><Type size={12} /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec("formatBlock", "<blockquote>")} title="Trích dẫn"><Quote size={12} /></ToolbarBtn>
        <Sep />

        <ToolbarBtn onClick={() => exec("insertUnorderedList")} title="Danh sách có chấm"><List size={12} /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec("insertOrderedList")} title="Danh sách số"><ListOrdered size={12} /></ToolbarBtn>
        <Sep />

        <ToolbarBtn onClick={() => exec("justifyLeft")} title="Căn trái"><AlignLeft size={12} /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec("justifyCenter")} title="Căn giữa"><AlignCenter size={12} /></ToolbarBtn>
        <ToolbarBtn onClick={() => exec("justifyRight")} title="Căn phải"><AlignRight size={12} /></ToolbarBtn>
        <Sep />

        <ToolbarBtn onClick={handleLink} title="Chèn liên kết"><Link2 size={12} /></ToolbarBtn>

        <div className="relative">
          <ToolbarBtn onClick={() => setShowColors(s => !s)} active={showColors} title="Màu chữ"><Palette size={12} /></ToolbarBtn>
          {showColors && (
            <div className="absolute z-30 top-full mt-1 left-0 bg-card border border-primary/30 p-1.5 shadow-xl grid grid-cols-6 gap-1">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => { exec("foreColor", c); setShowColors(false); }}
                  className="w-5 h-5 border border-muted-foreground/30 hover:scale-110 transition-transform"
                  style={{ background: c }} title={c} />
              ))}
            </div>
          )}
        </div>

        <Sep />
        <ToolbarBtn onClick={() => exec("removeFormat")} title="Xóa định dạng"><Eraser size={12} /></ToolbarBtn>
        <ToolbarBtn onClick={openHtml} title="Chỉnh sửa HTML"><Code size={12} /></ToolbarBtn>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        className="rich-text-editor px-3 py-2.5 text-sm text-foreground outline-none prose-rt overflow-y-auto scrollbar-luxury"
        style={{ minHeight }}
      />

      {/* HTML modal */}
      {showHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowHtml(false)}>
          <div className="bg-card border border-primary/40 w-full max-w-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2">
                <Code size={13} className="text-primary" />
                <h3 className="font-serif text-sm">Chỉnh sửa HTML</h3>
              </div>
              <button onClick={() => setShowHtml(false)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
            </div>
            <div className="p-4 space-y-3">
              <textarea
                value={htmlDraft}
                onChange={e => setHtmlDraft(e.target.value)}
                className="w-full h-72 border border-primary/20 focus:border-primary bg-background p-3 text-xs font-mono outline-none scrollbar-luxury"
                spellCheck={false}
              />
              <div className="border-t border-primary/15 pt-3">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                  <Eye size={10} /> Xem trước
                </div>
                <div className="border border-primary/10 bg-background p-3 text-sm prose-rt max-h-32 overflow-y-auto scrollbar-luxury"
                  dangerouslySetInnerHTML={{ __html: sanitize(htmlDraft) }} />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setShowHtml(false)} className="px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground border border-primary/20 hover:text-foreground">Hủy</button>
                <button onClick={saveHtml} className="px-4 py-2 text-xs uppercase tracking-widest bg-primary text-primary-foreground">Lưu HTML</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .rich-text-editor:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground) / 0.5);
          pointer-events: none;
        }
        .prose-rt h2 { font-family: var(--font-serif, serif); font-size: 1.4em; line-height: 1.2; margin: 0.5em 0 0.3em; }
        .prose-rt h3 { font-family: var(--font-serif, serif); font-size: 1.15em; line-height: 1.3; margin: 0.5em 0 0.3em; }
        .prose-rt p { margin: 0.4em 0; }
        .prose-rt ul { list-style: disc; padding-left: 1.4em; margin: 0.4em 0; }
        .prose-rt ol { list-style: decimal; padding-left: 1.4em; margin: 0.4em 0; }
        .prose-rt blockquote { border-left: 3px solid hsl(var(--primary) / 0.5); padding: 0.2em 0.8em; margin: 0.5em 0; font-style: italic; color: hsl(var(--muted-foreground)); }
        .prose-rt a { color: hsl(var(--primary)); text-decoration: underline; }
        .prose-rt strong { font-weight: 600; }
      `}</style>
    </div>
  );
}

function ToolbarBtn({ children, onClick, active, title }: { children: React.ReactNode; onClick: () => void; active?: boolean; title?: string }) {
  return (
    <button
      type="button"
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      title={title}
      className={`p-1.5 transition-colors ${active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-primary/10"}`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-4 bg-primary/15 mx-0.5" />;
}

/* ──────────────────────────────────────────────
   Render helper — safely renders HTML or plain text
────────────────────────────────────────────── */
export function RichText({ html, className = "", as: As = "div" }: { html?: string; className?: string; as?: any }) {
  if (!html) return null;
  // If string contains HTML tags, render as HTML (sanitized). Otherwise plain text with line breaks preserved.
  const looksLikeHtml = /<[a-z][\s\S]*>/i.test(html);
  if (looksLikeHtml) {
    return <As className={`prose-rt ${className}`} dangerouslySetInnerHTML={{ __html: sanitize(html) }} />;
  }
  return <As className={`whitespace-pre-line ${className}`}>{html}</As>;
}
