"use client";

import type { ReactNode } from "react";
import { useEffect, useReducer, useRef } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "@tiptap/markdown";
import {
  Bold,
  CornerDownLeft,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const editorSurfaceClass =
  "prose prose-sm dark:prose-invert max-w-none min-h-80 px-3 py-2 focus:outline-none " +
  "prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-li:text-foreground " +
  "prose-p:mb-3 prose-p:mt-0 prose-p:leading-relaxed last:prose-p:mb-0 " +
  "prose-ul:my-2 prose-ol:my-2";

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon-sm"
      className="shrink-0"
      disabled={disabled}
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function BackgroundEditorToolbar({ editor }: { editor: Editor }) {
  const [, tick] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const rerender = () => tick();
    editor.on("selectionUpdate", rerender);
    editor.on("transaction", rerender);
    return () => {
      editor.off("selectionUpdate", rerender);
      editor.off("transaction", rerender);
    };
  }, [editor]);

  return (
    <div
      role="toolbar"
      aria-label="Format background text"
      className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-1.5 py-1"
    >
      <ToolbarButton
        title="Bold"
        active={editor.isActive("bold")}
        disabled={!editor.can().toggleBold()}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Italic"
        active={editor.isActive("italic")}
        disabled={!editor.can().toggleItalic()}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-4" />
      </ToolbarButton>
      <Separator orientation="vertical" className="mx-0.5 h-6" decorative />
      <ToolbarButton
        title="Line break (Shift+Enter)"
        onClick={() => editor.chain().focus().setHardBreak().run()}
      >
        <CornerDownLeft className="size-4" />
      </ToolbarButton>
      <Separator orientation="vertical" className="mx-0.5 h-6" decorative />
      <ToolbarButton
        title="Heading"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="size-4" />
      </ToolbarButton>
      <Separator orientation="vertical" className="mx-0.5 h-6" decorative />
      <ToolbarButton
        title="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-4" />
      </ToolbarButton>
      <Separator orientation="vertical" className="mx-0.5 h-6" decorative />
      <ToolbarButton
        title="Undo"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Redo"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="size-4" />
      </ToolbarButton>
    </div>
  );
}

export type BackgroundRichTextEditorProps = {
  value: string;
  onChange: (markdown: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export function BackgroundRichTextEditor({
  value,
  onChange,
  disabled = false,
  placeholder = "Write the background scenario here…",
  className,
}: BackgroundRichTextEditorProps) {
  const lastEmitted = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3] },
        }),
        Placeholder.configure({
          placeholder,
          emptyNodeClass: "is-editor-empty",
        }),
        Markdown.configure({
          markedOptions: {
            gfm: true,
            breaks: true,
          },
        }),
      ],
      content: value || "",
      contentType: "markdown",
      editable: !disabled,
      editorProps: {
        attributes: {
          class: cn("tiptap background-rich-text-tiptap", editorSurfaceClass),
        },
      },
      onUpdate: ({ editor: ed }) => {
        const md = ed.getMarkdown();
        lastEmitted.current = md;
        onChangeRef.current(md);
      },
    },
    []
  );

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    if (editor.isFocused) return;

    const current = editor.getMarkdown();

    if (lastEmitted.current !== null && value === lastEmitted.current) {
      if (value !== current) {
        lastEmitted.current = current;
        onChangeRef.current(current);
      }
      return;
    }

    if (value === current) {
      lastEmitted.current = value;
      return;
    }

    editor.commands.setContent(value || "", { contentType: "markdown", emitUpdate: false });
    lastEmitted.current = value;
  }, [value, editor]);

  /** Radix Tabs unmount inactive panels — flush latest markdown before the editor is destroyed (after focusout). */
  useEffect(() => {
    const ed = editor;
    if (!ed) return;
    return () => {
      try {
        const destroyed = (ed as unknown as { isDestroyed?: boolean }).isDestroyed;
        if (destroyed) return;
        const md = ed.getMarkdown();
        lastEmitted.current = md;
        onChangeRef.current(md);
      } catch {
        /* editor teardown */
      }
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || disabled) return;
    const root = editor.view.dom as HTMLElement;

    const flushToParent = () => {
      const md = editor.getMarkdown();
      lastEmitted.current = md;
      onChangeRef.current(md);
    };

    const onFocusOut = (e: FocusEvent) => {
      const rt = e.relatedTarget as Node | null;
      if (rt && root.contains(rt)) return;
      flushToParent();
    };

    root.addEventListener("focusout", onFocusOut);
    return () => root.removeEventListener("focusout", onFocusOut);
  }, [editor, disabled]);

  return (
    <div
      className={cn(
        "background-rich-text-root rounded-md border border-input bg-background shadow-xs overflow-hidden",
        className
      )}
    >
      {editor && !disabled ? <BackgroundEditorToolbar editor={editor} /> : null}
      {editor ? (
        <EditorContent editor={editor} className="bg-background [&_.tiptap]:min-h-80" />
      ) : (
        <div
          className="min-h-80 animate-pulse bg-muted/25"
          aria-hidden
        />
      )}
    </div>
  );
}
