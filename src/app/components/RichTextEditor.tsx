import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import CharacterCount from "@tiptap/extension-character-count";
import Image from "@tiptap/extension-image";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered,
  Minus,
  Undo2,
  Redo2,
  ImageIcon,
} from "lucide-react";
import { useCallback, useEffect } from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  onStatsChange?: (stats: { words: number; characters: number }) => void;
  editable?: boolean;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded transition ${
        isActive
          ? "bg-primary/20 text-purple-300"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const items = [
    {
      title: "Bold (Ctrl+B)",
      icon: <Bold size={16} />,
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive("bold"),
      disabled: false,
    },
    {
      title: "Italic (Ctrl+I)",
      icon: <Italic size={16} />,
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive("italic"),
      disabled: false,
    },
    {
      title: "Underline (Ctrl+U)",
      icon: <UnderlineIcon size={16} />,
      action: () => editor.chain().focus().toggleUnderline().run(),
      isActive: editor.isActive("underline"),
      disabled: false,
    },
    {
      title: "Heading 1",
      icon: <Heading1 size={16} />,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive("heading", { level: 1 }),
      disabled: false,
    },
    {
      title: "Heading 2",
      icon: <Heading2 size={16} />,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive("heading", { level: 2 }),
      disabled: false,
    },
    {
      title: "Heading 3",
      icon: <Heading3 size={16} />,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive("heading", { level: 3 }),
      disabled: false,
    },
    {
      title: "Quote",
      icon: <Quote size={16} />,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      isActive: editor.isActive("blockquote"),
      disabled: false,
    },
    {
      title: "Bullet List",
      icon: <List size={16} />,
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive("bulletList"),
      disabled: false,
    },
    {
      title: "Numbered List",
      icon: <ListOrdered size={16} />,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive("orderedList"),
      disabled: false,
    },
    {
      title: "Horizontal Divider",
      icon: <Minus size={16} />,
      action: () => editor.chain().focus().setHorizontalRule().run(),
      isActive: false,
      disabled: false,
    },
    {
      title: "Undo (Ctrl+Z)",
      icon: <Undo2 size={16} />,
      action: () => editor.chain().focus().undo().run(),
      isActive: false,
      disabled: !editor.can().undo(),
    },
    {
      title: "Redo (Ctrl+Y)",
      icon: <Redo2 size={16} />,
      action: () => editor.chain().focus().redo().run(),
      isActive: false,
      disabled: !editor.can().redo(),
    },

    {
      title: "Insert Image",
      icon: <ImageIcon size={16} />,
      action: () => {
        const url = window.prompt("URL Gambar:");
        if (url) {
          editor.chain().focus().setImage({ src: url }).run();
        }
      },
      isActive: editor.isActive("image"),
      disabled: false,
    },

  ];

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-card px-3 py-2">
      {items.map((item, i) => (
        <ToolbarButton
          key={i}
          onClick={item.action}
          isActive={item.isActive}
          disabled={item.disabled}
          title={item.title}
        >
          {item.icon}
        </ToolbarButton>
      ))}
    </div>
  );
}

export function RichTextEditor({
  content,
  onChange,
  onStatsChange,
  editable = true,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable codeBlock since we don't want code blocks in a novel editor
        codeBlock: false,
      }),
      Underline,
      Image,
      CharacterCount.configure({
        limit: undefined, // no character limit
      }),
    ],
    content: content || "",
    editable,
    editorProps: {
      attributes: {
        class:
          "prose-editor w-full min-h-[400px] bg-transparent outline-none px-6 py-4 text-foreground",
        style: "font-family: Lora, serif; font-size: 1rem; line-height: 2;",
      },
      // Paste plain text — strip all formatting from external sources
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData("text/plain");
        if (text) {
          event.preventDefault();
          view.dispatch(view.state.tr.insertText(text));
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
      if (onStatsChange) {
        const stats = editor.storage.characterCount;
        onStatsChange({
          words: stats.words(),
          characters: stats.characters(),
        });
      }
    },
    onCreate: ({ editor }) => {
      if (onStatsChange) {
        const stats = editor.storage.characterCount;
        onStatsChange({
          words: stats.words(),
          characters: stats.characters(),
        });
      }
    },
  });

  // Sync external content changes (e.g., loading a chapter)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || "", { emitUpdate: false });
    }
  }, [content, editor]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  if (!editor) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">Memuat editor...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Toolbar editor={editor} />
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export default RichTextEditor;