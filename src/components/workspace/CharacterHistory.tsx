"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash } from "@phosphor-icons/react";
import type {
  Book,
  CharacterTimeline,
  CharacterTimelinePoint,
} from "@/src/lib/api/generated";
import type { ChapterChoice } from "./WorldEntities";
import { button, field, Field, message, read, write } from "./shared";

export default function CharacterHistory({
  entityId,
  books,
  chapters,
  initialBookId,
}: {
  entityId: string;
  books: Book[];
  chapters: ChapterChoice[];
  initialBookId?: string;
}) {
  const [bookId, setBookId] = useState(initialBookId ?? books[0]?.id ?? "");
  return (
    <section className="mt-8 border-t border-border pt-6">
      <h3 className="mb-4 font-serif text-xl">Character timeline</h3>
      {books.length === 0 ? (
        <p className="text-sm text-foreground-muted">
          Create a book to start this character’s timeline.
        </p>
      ) : (
        <>
          <Field label="Book">
            <select
              className={field}
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
            >
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.name}
                </option>
              ))}
            </select>
          </Field>
          <HistoryPoints
            key={bookId}
            entityId={entityId}
            bookId={bookId}
            chapters={chapters.filter((chapter) => chapter.bookId === bookId)}
          />
        </>
      )}
    </section>
  );
}

function HistoryPoints({
  entityId,
  bookId,
  chapters,
}: {
  entityId: string;
  bookId: string;
  chapters: ChapterChoice[];
}) {
  const cache = useQueryClient();
  const [text, setText] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const root = `/api/characters/${entityId}/timelines`;
  const timelines = useQuery({
    queryKey: ["character-timelines", entityId],
    queryFn: () => read<CharacterTimeline[]>(root),
  });
  const timeline = timelines.data?.find((item) => item.bookId === bookId);
  const points = useQuery({
    queryKey: ["character-points", timeline?.id],
    queryFn: () =>
      read<CharacterTimelinePoint[]>(`${root}/${timeline!.id}/points`),
    enabled: !!timeline?.id,
  });
  const refresh = async () => {
    await cache.invalidateQueries({
      queryKey: ["character-timelines", entityId],
    });
    await cache.invalidateQueries({ queryKey: ["character-points"] });
  };
  return (
    <div className="mt-4 space-y-4">
      {(timelines.error || points.error) && (
        <p role="alert">
          {message(timelines.error || points.error)}{" "}
          <button
            onClick={() => {
              void timelines.refetch();
              if (timeline) void points.refetch();
            }}
          >
            Retry
          </button>
        </p>
      )}
      <ul className="space-y-3">
        {points.data?.map((point) => (
          <li key={point.id} className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-xs text-foreground-muted">
                {chapters.find((chapter) => chapter.id === point.chapterId)
                  ?.name ?? "General"}
              </p>
              <p className="whitespace-pre-wrap text-sm">{point.content}</p>
            </div>
            <button
              className={button}
              disabled={busy}
              aria-label="Delete timeline point"
              onClick={async () => {
                setBusy(true);
                try {
                  await write(
                    `${root}/${timeline!.id}/points/${point.id}`,
                    "DELETE",
                  );
                  await refresh();
                } catch (err) {
                  setError(message(err));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Trash size={14} />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const target =
              timeline ??
              (await write<CharacterTimeline>(root, "POST", { bookId }));
            await write(`${root}/${target.id}/points`, "POST", {
              content: text.trim(),
              chapterId: chapterId || null,
            });
            setText("");
            await refresh();
          } catch (err) {
            setError(message(err));
            await refresh();
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Chapter">
          <select
            className={field}
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
          >
            <option value="">General</option>
            {chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="What happened?">
          <textarea
            className={field}
            rows={3}
            required
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </Field>
        {error && <p role="alert">{error}</p>}
        <button
          className={button}
          disabled={
            busy || !text.trim() || timelines.isPending || !!timelines.error
          }
        >
          Add point
        </button>
      </form>
    </div>
  );
}
