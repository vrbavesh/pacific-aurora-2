"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUp,
  ArrowDown,
  DotsThree,
  Trash,
  PencilSimple,
} from "@phosphor-icons/react";
import type { Chapter, ChapterImportantPoint } from "@/src/lib/api/generated";
import {
  button,
  Confirm,
  Dialog,
  field,
  Field,
  message,
  read,
  write,
} from "./shared";

function ImportantPoints({
  bookId,
  chapterId,
}: {
  bookId: string;
  chapterId: string;
}) {
  const cache = useQueryClient();
  const path = `/api/books/${bookId}/chapters/${chapterId}/important-points`;
  const points = useQuery({
    queryKey: ["points", chapterId],
    queryFn: () => read<ChapterImportantPoint[]>(path),
  });
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = () =>
    cache.invalidateQueries({ queryKey: ["points", chapterId] });
  return (
    <div className="mt-5 space-y-4">
      {points.error && (
        <p role="alert">
          {message(points.error)}{" "}
          <button onClick={() => void points.refetch()}>Retry</button>
        </p>
      )}
      <ul className="space-y-2">
        {points.data?.map((point) => (
          <li key={point.id} className="flex items-start gap-3">
            <span aria-hidden="true">•</span>
            <p className="flex-1 whitespace-pre-wrap text-sm leading-6">
              {point.content}
            </p>
            <button
              className={button}
              aria-label="Delete important point"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await write(`${path}/${point.id}`, "DELETE");
                  await refresh();
                } catch (e) {
                  setError(message(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Trash size={15} />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          const lines = text
            .split(/\n+/)
            .map((line) => line.trim())
            .filter(Boolean);
          if (lines.length === 0) return;
          setBusy(true);
          setError("");
          let saved = 0;
          try {
            for (const line of lines) {
              await write(path, "POST", { content: line });
              saved += 1;
            }
            setText("");
            await refresh();
          } catch (err) {
            // Keep only the lines that never saved so a retry cannot duplicate them.
            setText(lines.slice(saved).join("\n"));
            setError(
              saved > 0
                ? `${saved} of ${lines.length} saved. ${message(err)} The rest is still here.`
                : message(err),
            );
            await refresh();
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Important points (one per line)">
          <textarea
            className={field}
            required
            rows={3}
            value={text}
            disabled={busy}
            onChange={(e) => setText(e.target.value)}
          />
        </Field>
        <button className={button} disabled={busy || !text.trim()}>
          {busy ? "Adding..." : "Add important points"}
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}

export default function ChapterTimeline({
  bookId,
  chapters,
  onOpen,
}: {
  bookId: string;
  chapters: Chapter[];
  onOpen: (id: string) => void;
}) {
  const cache = useQueryClient();
  const [edit, setEdit] = useState<{ id?: string; name: string }>();
  const [deleting, setDeleting] = useState<Chapter>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refresh = () =>
    cache.invalidateQueries({ queryKey: ["chapters", bookId] });
  return (
    <section className="mx-auto max-w-4xl px-5 py-8 sm:py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h2 className="font-serif text-3xl">Chapters</h2>
        <button
          className={`${button} ws-primary`}
          onClick={() => {
            setError("");
            setEdit({ name: "" });
          }}
        >
          New chapter
        </button>
      </div>
      {error && !edit && (
        <p role="alert" className="mb-4">
          {error}
        </p>
      )}
      {chapters.length === 0 && (
        <p className="text-foreground-muted">
          No chapters yet. Create one to begin.
        </p>
      )}
      <div className="space-y-3">
        {chapters.map((chapter, index) => (
          <details key={chapter.id} className="ws-chapter">
            <summary className="cursor-pointer px-5 py-5">
              <span className="mr-4 font-mono text-xs text-foreground-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="font-serif text-xl">{chapter.name}</span>
            </summary>
            <div className="border-t border-border p-5">
              <div className="flex flex-wrap gap-2">
                <button
                  className={`${button} ws-primary`}
                  onClick={() => onOpen(chapter.id!)}
                >
                  Open chapter
                </button>
                {(["up", "down"] as const).map((direction) => (
                  <button
                    key={direction}
                    className={button}
                    aria-label={`Move ${chapter.name} ${direction}`}
                    disabled={
                      busy ||
                      (direction === "up"
                        ? index === 0
                        : index === chapters.length - 1)
                    }
                    onClick={async () => {
                      setBusy(true);
                      setError("");
                      try {
                        await write(
                          `/api/books/${bookId}/chapters/${chapter.id}/move`,
                          "POST",
                          { direction },
                        );
                        await refresh();
                      } catch (e) {
                        setError(message(e));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {direction === "up" ? <ArrowUp /> : <ArrowDown />}
                  </button>
                ))}
                <details className="relative">
                  <summary
                    className={`${button} list-none`}
                    aria-label={`Options for ${chapter.name}`}
                  >
                    <DotsThree size={22} />
                  </summary>
                  <div className="absolute right-0 z-20 mt-1 w-40 border border-border bg-background-elevated p-1">
                    <button
                      className={`${button} w-full`}
                      onClick={() => {
                        setError("");
                        setEdit({ id: chapter.id, name: chapter.name ?? "" });
                      }}
                    >
                      <PencilSimple />
                      Edit name
                    </button>
                    <button
                      className={`${button} w-full`}
                      onClick={() => setDeleting(chapter)}
                    >
                      <Trash />
                      Delete
                    </button>
                  </div>
                </details>
              </div>
              <ImportantPoints bookId={bookId} chapterId={chapter.id!} />
            </div>
          </details>
        ))}
      </div>
      {edit && (
        <Dialog
          title={edit.id ? "Edit chapter name" : "Create a chapter"}
          busy={busy}
          onClose={() => setEdit(undefined)}
        >
          <form
            className="space-y-5"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              try {
                await write(
                  `/api/books/${bookId}/chapters${edit.id ? `/${edit.id}` : ""}`,
                  edit.id ? "PATCH" : "POST",
                  { name: edit.name.trim() },
                );
                await refresh();
                setEdit(undefined);
              } catch (err) {
                setError(message(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Chapter name">
              <input
                autoFocus
                className={field}
                required
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </Field>
            {error && <p role="alert">{error}</p>}
            <button
              className={`${button} ws-primary`}
              disabled={busy || !edit.name.trim()}
            >
              Save chapter
            </button>
          </form>
        </Dialog>
      )}
      {deleting && (
        <Confirm
          title={`Delete ${deleting.name}?`}
          detail="This permanently deletes the chapter, its text, and its important points."
          onClose={() => setDeleting(undefined)}
          onConfirm={async () => {
            await write(
              `/api/books/${bookId}/chapters/${deleting.id}`,
              "DELETE",
            );
            await refresh();
          }}
        />
      )}
    </section>
  );
}
