import { useEffect, useRef } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code,
  Heading1, Heading2, Heading3, List, ListOrdered, Quote, Minus,
  Link2, Image as ImageIcon, Undo2, Redo2,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

function ToolBtn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void; active?: boolean; disabled?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button type="button" onMouseDown={e => e.preventDefault()} onClick={onClick} disabled={disabled} title={title}
      className={`h-8 w-8 inline-flex items-center justify-center border border-transparent transition-colors disabled:opacity-30 ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "text-muted-foreground hover:bg-foreground/10 hover:text-white"
      }`}>
      {children}
    </button>
  );
}

function Sep() { return <span className="self-stretch w-px bg-border mx-0.5" />; }

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const prev = editor.getAttributes("link").href ?? "";
    const url = window.prompt("Đường dẫn (URL):", prev);
    if (url === null) return;
    if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const insertImage = () => {
    const url = window.prompt("URL ảnh (https://… hoặc data:image/…):");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/30 sticky top-0 z-10">
      <ToolBtn title="Hoàn tác (Ctrl+Z)" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={14} /></ToolBtn>
      <ToolBtn title="Làm lại (Ctrl+Y)" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={14} /></ToolBtn>
      <Sep />
      <ToolBtn title="Tiêu đề H1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={14} /></ToolBtn>
      <ToolBtn title="Tiêu đề H2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={14} /></ToolBtn>
      <ToolBtn title="Tiêu đề H3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={14} /></ToolBtn>
      <Sep />
      <ToolBtn title="Đậm (Ctrl+B)"   active={editor.isActive("bold")}      onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={14} /></ToolBtn>
      <ToolBtn title="Nghiêng (Ctrl+I)" active={editor.isActive("italic")}  onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={14} /></ToolBtn>
      <ToolBtn title="Gạch chân (Ctrl+U)" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}><UnderlineIcon size={14} /></ToolBtn>
      <ToolBtn title="Gạch ngang"      active={editor.isActive("strike")}    onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={14} /></ToolBtn>
      <ToolBtn title="Mã inline"       active={editor.isActive("code")}      onClick={() => editor.chain().focus().toggleCode().run()}><Code size={14} /></ToolBtn>
      <Sep />
      <ToolBtn title="Căn trái"   active={editor.isActive({ textAlign: "left" })}    onClick={() => editor.chain().focus().setTextAlign("left").run()}><AlignLeft size={14} /></ToolBtn>
      <ToolBtn title="Căn giữa"   active={editor.isActive({ textAlign: "center" })}  onClick={() => editor.chain().focus().setTextAlign("center").run()}><AlignCenter size={14} /></ToolBtn>
      <ToolBtn title="Căn phải"   active={editor.isActive({ textAlign: "right" })}   onClick={() => editor.chain().focus().setTextAlign("right").run()}><AlignRight size={14} /></ToolBtn>
      <ToolBtn title="Căn đều"    active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()}><AlignJustify size={14} /></ToolBtn>
      <Sep />
      <ToolBtn title="Danh sách dấu chấm" active={editor.isActive("bulletList")}  onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={14} /></ToolBtn>
      <ToolBtn title="Danh sách số"      active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={14} /></ToolBtn>
      <ToolBtn title="Trích dẫn"          active={editor.isActive("blockquote")}  onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={14} /></ToolBtn>
      <ToolBtn title="Đường ngang" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={14} /></ToolBtn>
      <Sep />
      <ToolBtn title="Chèn link" active={editor.isActive("link")} onClick={setLink}><Link2 size={14} /></ToolBtn>
      <ToolBtn title="Chèn ảnh" onClick={insertImage}><ImageIcon size={14} /></ToolBtn>
    </div>
  );
}

export function RichTextEditor({ value, onChange, placeholder, minHeight = 380 }: Props) {
  const lastEmitted = useRef<string>(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Placeholder.configure({ placeholder: placeholder ?? "Bắt đầu viết..." }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { class: "text-primary underline underline-offset-2" } }),
      Image.configure({ inline: false, HTMLAttributes: { class: "rounded my-3 max-w-full h-auto" } }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none focus:outline-none px-4 py-3",
        style: `min-height: ${minHeight}px`,
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      lastEmitted.current = html;
      onChange(html);
    },
  });

  // Sync external value changes (e.g. when loading a post)
  useEffect(() => {
    if (!editor) return;
    if (value !== lastEmitted.current && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
      lastEmitted.current = value;
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="border border-input rounded bg-background overflow-hidden">
      <Toolbar editor={editor} />
      <div className="max-h-[70vh] overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
