"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
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
import { button, Confirm, message, write } from "./shared";

function ChapterEditor({
  chapter,
  bookId,
  onDirty,
}: {
  chapter: Chapter;
  bookId: string;
  onDirty: (id: string, dirty: boolean) => void;
}) {
  const cache = useQueryClient();
  const [status, setStatus] = useState("Saved");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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
      Placeholder.configure({ placeholder: "Begin here..." }),
      CharacterCount,
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
    onUpdate: ({ editor: changed }) => {
      revision.current += 1;
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
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive("bold"),
      italic: e?.isActive("italic"),
      list: e?.isActive("bulletList"),
      words: e?.storage.characterCount.words() ?? 0,
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
        if ((e.ctrlKey || e.metaKey) && e.key === "s") {
          e.preventDefault();
          void save();
        }
      }}
    >
      <div className="ws-toolbar">
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
          aria-label="Italic"
          aria-pressed={state?.italic}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <TextItalic size={18} />
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
      {error && (
        <p role="alert" className="px-6 py-3">
          {error} Your text is still here. Try Save again.
        </p>
      )}
      <div className="ws-paper">
        <h2 className="mb-8 font-serif text-3xl">{chapter.name}</h2>
        <EditorContent editor={editor} />
        <p className="mt-12 text-right text-xs text-foreground-muted">
          {state?.words ?? 0} words
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
}: {
  bookId: string;
  chapters: Chapter[];
  requestedChapter?: { id: string };
  onCreate: () => void;
}) {
  const [open, setOpen] = useState<string[]>(() =>
    chapters[0]?.id ? [chapters[0].id] : [],
  );
  const [active, setActive] = useState(chapters[0]?.id);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [closing, setClosing] = useState<string>();
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
              />
            </div>
          )
        );
      })}
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
