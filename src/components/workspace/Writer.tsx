"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyleKit } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import { useQueryClient } from "@tanstack/react-query";
import {
  TextB,
  TextItalic,
  ListBullets,
  ArrowCounterClockwise,
  FloppyDisk,
  X,
} from "@phosphor-icons/react";
import type { Chapter, ChapterContent } from "@/src/lib/api/generated";
import { countWords, latestWordWindow } from "@/src/lib/ai-words";
import { button, Confirm, message, write } from "./shared";
import WriterSuggestions, { type WriterSnapshot } from "./WriterSuggestions";

export const WRITER_FONTS = [
  ["Newsreader", "var(--font-serif), Georgia, serif"],
  ["Geist", "var(--font-sans), Arial, sans-serif"],
  ["Georgia", "Georgia, serif"],
  ["Arial", "Arial, sans-serif"],
  ["Courier New", "'Courier New', monospace"],
] as const;
export const WRITER_SIZES = [
  "14px",
  "16px",
  "18px",
  "20px",
  "24px",
  "30px",
] as const;
export const WRITER_COLORS = [
  ["Default", ""],
  ["Teal", "var(--writer-teal)"],
  ["Blue", "var(--writer-blue)"],
  ["Rose", "var(--writer-rose)"],
] as const;
export const WRITER_HIGHLIGHTS = [
  ["None", ""],
  ["Teal", "var(--writer-highlight-teal)"],
  ["Blue", "var(--writer-highlight-blue)"],
  ["Amber", "var(--writer-highlight-amber)"],
] as const;

export function safeWriterLink(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function ChapterEditor({
  chapter,
  bookId,
  onDirty,
  onContent,
  snapshot,
}: {
  chapter: Chapter;
  bookId: string;
  onDirty: (id: string, dirty: boolean) => void;
  onContent: (id: string, text: string) => void;
  snapshot?: WriterSnapshot;
}) {
  const cache = useQueryClient();
  const [status, setStatus] = useState("Saved");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [linkEntry, setLinkEntry] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const revision = useRef(0);
  const draftKey = `pacific_aurora_draft:${bookId}:${chapter.id}`;
  const [draft] = useState<ChapterContent | null>(() => {
    try {
      const stored = sessionStorage.getItem(draftKey);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (draft) {
      setStatus("Recovered unsaved changes");
      onDirty(chapter.id!, true);
    }
  }, [draft, chapter.id, onDirty]);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyleKit,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right"],
      }),
      Placeholder.configure({ placeholder: "Begin here..." }),
    ],
    content:
      draft ??
      (chapter.content?.type
        ? chapter.content
        : { type: "doc", content: [{ type: "paragraph" }] }),
    editorProps: {
      attributes: {
        class: "ws-manuscript",
        "aria-label": `${chapter.name} manuscript`,
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onCreate: ({ editor: created }) => onContent(chapter.id!, created.getText()),
    onUpdate: ({ editor: changed }) => {
      revision.current += 1;
      onContent(chapter.id!, changed.getText());
      setStatus("Unsaved changes");
      onDirty(chapter.id!, true);
      try {
        sessionStorage.setItem(draftKey, JSON.stringify(changed.getJSON()));
      } catch {
        setError(
          "Draft recovery is unavailable. Save your text before leaving this page.",
        );
      }
    },
  });
  useEffect(() => {
    if (editor) onContent(chapter.id!, editor.getText());
  }, [editor, chapter.id, onContent]);
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive("bold"),
      italic: e?.isActive("italic"),
      list: e?.isActive("bulletList"),
      orderedList: e?.isActive("orderedList"),
      underline: e?.isActive("underline"),
      strike: e?.isActive("strike"),
      link: e?.isActive("link"),
      heading:
        ([1, 2, 3] as const).find((level) =>
          e?.isActive("heading", { level }),
        ) ?? 0,
      alignment:
        (["center", "right"] as const).find((alignment) =>
          e?.isActive({ textAlign: alignment }),
        ) ?? "left",
      fontFamily: e?.getAttributes("textStyle").fontFamily ?? "",
      fontSize: e?.getAttributes("textStyle").fontSize ?? "",
      color: e?.getAttributes("textStyle").color ?? "",
      backgroundColor: e?.getAttributes("textStyle").backgroundColor ?? "",
    }),
  });
  const save = useCallback(async () => {
    if (!editor || saving) return;
    const savedRevision = revision.current;
    const content = editor.getJSON() as ChapterContent;
    setSaving(true);
    setError("");
    try {
      await write(`/api/books/${bookId}/chapters/${chapter.id}`, "PATCH", {
        content,
      });
      cache.setQueryData<Chapter[]>(["chapters", bookId], (rows) =>
        rows?.map((row) => (row.id === chapter.id ? { ...row, content } : row)),
      );
      if (revision.current === savedRevision) {
        setStatus("Saved");
        onDirty(chapter.id!, false);
        try {
          sessionStorage.removeItem(draftKey);
        } catch {
          /* The server copy is saved. */
        }
      }
    } catch (e) {
      setError(message(e));
      setStatus("Not saved");
    } finally {
      setSaving(false);
    }
  }, [editor, saving, bookId, chapter.id, cache, onDirty, draftKey]);
  return (
    <div
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
          e.preventDefault();
          void save();
        }
      }}
    >
      <div className="ws-toolbar">
        <label className="ws-format-field">
          <span>Font</span>
          <select
            aria-label="Font family"
            value={state?.fontFamily ?? ""}
            onChange={(e) =>
              e.target.value
                ? editor?.chain().focus().setFontFamily(e.target.value).run()
                : editor?.chain().focus().unsetFontFamily().run()
            }
          >
            <option value="">Default</option>
            {WRITER_FONTS.map(([label, value]) => (
              <option key={label} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="ws-format-field">
          <span>Size</span>
          <select
            aria-label="Font size"
            value={state?.fontSize ?? ""}
            onChange={(e) =>
              e.target.value
                ? editor?.chain().focus().setFontSize(e.target.value).run()
                : editor?.chain().focus().unsetFontSize().run()
            }
          >
            <option value="">Default</option>
            {WRITER_SIZES.map((size) => (
              <option key={size} value={size}>
                {size.slice(0, -2)}
              </option>
            ))}
          </select>
        </label>
        <label className="ws-format-field">
          <span>Style</span>
          <select
            aria-label="Paragraph style"
            value={state?.heading || 0}
            onChange={(e) => {
              const level = Number(e.target.value);
              if (level === 0) editor?.chain().focus().setParagraph().run();
              else
                editor
                  ?.chain()
                  .focus()
                  .setHeading({ level: level as 1 | 2 | 3 })
                  .run();
            }}
          >
            <option value={0}>Paragraph</option>
            <option value={1}>Heading 1</option>
            <option value={2}>Heading 2</option>
            <option value={3}>Heading 3</option>
          </select>
        </label>
        <button
          className={button}
          aria-label="Bold"
          aria-pressed={state?.bold}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <TextB size={18} />
        </button>
        <button
          className={button}
          aria-label="Underline"
          aria-pressed={state?.underline}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          Underline
        </button>
        <button
          className={button}
          aria-label="Strikethrough"
          aria-pressed={state?.strike}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          Strike
        </button>
        <button
          className={button}
          aria-label="Italic"
          aria-pressed={state?.italic}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <TextItalic size={18} />
        </button>
        <button
          className={button}
          aria-label="Numbered list"
          aria-pressed={state?.orderedList}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </button>
        <label className="ws-format-field">
          <span>Align</span>
          <select
            aria-label="Text alignment"
            value={state?.alignment ?? "left"}
            onChange={(e) =>
              editor?.chain().focus().setTextAlign(e.target.value).run()
            }
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </label>
        <label className="ws-format-field">
          <span>Color</span>
          <select
            aria-label="Text color"
            value={state?.color ?? ""}
            onChange={(e) =>
              e.target.value
                ? editor?.chain().focus().setColor(e.target.value).run()
                : editor?.chain().focus().unsetColor().run()
            }
          >
            {WRITER_COLORS.map(([label, value]) => (
              <option key={label} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="ws-format-field">
          <span>Highlight</span>
          <select
            aria-label="Highlight color"
            value={state?.backgroundColor ?? ""}
            onChange={(e) =>
              e.target.value
                ? editor
                    ?.chain()
                    .focus()
                    .setBackgroundColor(e.target.value)
                    .run()
                : editor?.chain().focus().unsetBackgroundColor().run()
            }
          >
            {WRITER_HIGHLIGHTS.map(([label, value]) => (
              <option key={label} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          className={button}
          aria-label="Edit link"
          aria-pressed={state?.link}
          onClick={() => {
            setLinkValue(editor?.getAttributes("link").href ?? "");
            setLinkEntry((value) => !value);
          }}
        >
          Link
        </button>
        <button
          className={button}
          aria-label="Bullet list"
          aria-pressed={state?.list}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <ListBullets size={18} />
        </button>
        <button
          className={button}
          aria-label="Undo"
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <ArrowCounterClockwise size={18} />
        </button>
        <span className="ml-auto text-xs text-foreground-muted" role="status">
          {saving ? "Saving..." : status}
        </span>
        <button
          className={`${button} ws-primary`}
          disabled={!editor || saving}
          onClick={() => void save()}
        >
          <FloppyDisk size={17} />
          Save
        </button>
      </div>
      {linkEntry && (
        <form
          className="ws-link-entry"
          onSubmit={(e) => {
            e.preventDefault();
            const href = safeWriterLink(linkValue);
            if (!href) {
              setError("Enter a valid http or https link.");
              return;
            }
            editor
              ?.chain()
              .focus()
              .extendMarkRange("link")
              .setLink({ href })
              .run();
            setError("");
            setLinkEntry(false);
          }}
        >
          <label htmlFor={`link-${chapter.id}`}>Link URL</label>
          <input
            id={`link-${chapter.id}`}
            className="ws-field"
            type="url"
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            placeholder="https://example.com"
          />
          <button className={button} type="submit">
            Apply link
          </button>
          <button
            className={button}
            type="button"
            onClick={() => {
              editor?.chain().focus().unsetLink().run();
              setLinkEntry(false);
            }}
          >
            Remove link
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="px-6 py-3">
          {error} Your text is still here. Try Save again.
        </p>
      )}
      <div className="ws-paper">
        <h2 className="mb-8 font-serif text-3xl">{chapter.name}</h2>
        <EditorContent editor={editor} />
        <p className="mt-12 text-right text-xs text-foreground-muted">
          {snapshot?.wordCount ?? 0} words
        </p>
      </div>
    </div>
  );
}

export default function Writer({
  bookId,
  chapters,
  requestedChapter,
  onCreate,
  visible = true,
}: {
  bookId: string;
  chapters: Chapter[];
  requestedChapter?: { id: string };
  onCreate: () => void;
  visible?: boolean;
}) {
  const [open, setOpen] = useState<string[]>(() =>
    chapters[0]?.id ? [chapters[0].id] : [],
  );
  const [active, setActive] = useState(chapters[0]?.id);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [closing, setClosing] = useState<string>();
  const [snapshots, setSnapshots] = useState<Record<string, WriterSnapshot>>({});
  const reportContent = useCallback((id: string, text: string) => {
    setSnapshots((previous) => {
      const wordCount = countWords(text);
      const windowText = latestWordWindow(text);
      if (previous[id]?.wordCount === wordCount && previous[id]?.windowText === windowText) return previous;
      return { ...previous, [id]: { wordCount, windowText, revision: (previous[id]?.revision ?? 0) + 1 } };
    });
  }, []);
  const updateDirty = useCallback(
    (id: string, value: boolean) =>
      setDirty((previous) => ({ ...previous, [id]: value })),
    [],
  );
  const openChapter = useCallback((id: string) => {
    setOpen((ids) => (ids.includes(id) ? ids : [...ids, id]));
    setActive(id);
  }, []);
  useEffect(() => {
    if (requestedChapter) openChapter(requestedChapter.id);
  }, [requestedChapter, openChapter]);
  useEffect(() => {
    setOpen((ids) =>
      ids.filter((id) => chapters.some((chapter) => chapter.id === id)),
    );
    if (active && !chapters.some((chapter) => chapter.id === active))
      setActive(undefined);
    setDirty((previous) =>
      Object.fromEntries(
        Object.entries(previous).filter(([id]) =>
          chapters.some((chapter) => chapter.id === id),
        ),
      ),
    );
  }, [chapters, active]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (Object.values(dirty).some(Boolean)) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const close = (id: string) => {
    try {
      sessionStorage.removeItem(`pacific_aurora_draft:${bookId}:${id}`);
    } catch {}
    setOpen((ids) => ids.filter((value) => value !== id));
    setSnapshots((previous) => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
    updateDirty(id, false);
    if (active === id) setActive(open.find((value) => value !== id));
    setClosing(undefined);
  };
  return (
    <section aria-label="Writer">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-3">
        <label className="text-sm text-foreground-muted" htmlFor="open-chapter">
          Open chapter
        </label>
        <select
          id="open-chapter"
          className="ws-field max-w-xs"
          value=""
          onChange={(e) => openChapter(e.target.value)}
        >
          <option value="" disabled>
            Choose a chapter
          </option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className={button} onClick={onCreate}>
          Manage chapters
        </button>
      </div>
      <div
        className="flex overflow-x-auto border-b border-border"
        aria-label="Open chapters"
      >
        {open.map((id) => {
          const chapter = chapters.find((c) => c.id === id);
          return (
            chapter && (
              <div
                key={id}
                className="flex shrink-0 items-center border-r border-border"
              >
                <button
                  className="ws-tab"
                  aria-current={id === active ? "page" : undefined}
                  onClick={() => setActive(id)}
                >
                  {chapter.name}
                  {dirty[id] ? " *" : ""}
                </button>
                <button
                  className="p-2 text-foreground-muted"
                  aria-label={`Close ${chapter.name}`}
                  onClick={() => (dirty[id] ? setClosing(id) : close(id))}
                >
                  <X size={14} />
                </button>
              </div>
            )
          );
        })}
      </div>
      {!active && (
        <div className="p-12 text-center text-foreground-muted">
          Open a chapter to start writing.
        </div>
      )}
      {open.map((id) => {
        const chapter = chapters.find((c) => c.id === id);
        return (
          chapter && (
            <div key={id} hidden={active !== id}>
              <ChapterEditor
                chapter={chapter}
                bookId={bookId}
                onDirty={updateDirty}
                onContent={reportContent}
                snapshot={snapshots[id]}
              />
            </div>
          )
        );
      })}
      <WriterSuggestions
        bookId={bookId}
        chapters={chapters}
        activeChapterId={active}
        openChapterIds={open}
        snapshots={snapshots}
        visible={visible}
      />
      {closing && (
        <Confirm
          title="Discard unsaved changes?"
          confirmLabel="Discard"
          detail="This chapter has unsaved text. Save it before closing to keep your work."
          onClose={() => setClosing(undefined)}
          onConfirm={async () => close(closing)}
        />
      )}
    </section>
  );
}
