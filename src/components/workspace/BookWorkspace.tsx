"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import type { Book, Chapter } from "@/src/lib/api/generated";
import WorldEntities from "./WorldEntities";
import ChapterTimeline from "./ChapterTimeline";
import {
  Notice,
  WorkspaceHeader,
  WorkspaceProvider,
  button,
  read,
  write,
} from "./shared";

const Writer = dynamic(() => import("./Writer"), {
  ssr: false,
  loading: () => <Notice>Opening the writer...</Notice>,
});
const Relationships = dynamic(() => import("./Relationships"), {
  ssr: false,
  loading: () => <Notice>Opening relationships...</Notice>,
});
const tabs = ["writer", "world", "relationships", "timeline"] as const;
type Tab = (typeof tabs)[number];

function BookContent({ bookId }: { bookId: string }) {
  const [tab, setTab] = useState<Tab>("writer");
  const [graphVisited, setGraphVisited] = useState(false);
  const [requestedChapter, setRequestedChapter] = useState<{ id: string }>();
  const book = useQuery({
    queryKey: ["book", bookId],
    queryFn: () => read<Book>(`/api/books/${bookId}`),
  });
  const chapters = useQuery({
    queryKey: ["chapters", bookId],
    queryFn: () => read<Chapter[]>(`/api/books/${bookId}/chapters`),
    enabled: !!book.data,
  });
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("tab");
    if (tabs.includes(value as Tab)) setTab(value as Tab);
    if (value === "relationships") setGraphVisited(true);
  }, []);
  useEffect(() => {
    if (book.data)
      void write(`/api/books/${bookId}/open`, "POST").catch(() => {});
  }, [bookId, book.data]);
  if (book.isPending) return <Notice>Opening your book...</Notice>;
  if (book.error)
    return <Notice error={book.error} retry={() => void book.refetch()} />;
  return (
    <main className="workspace">
      <WorkspaceHeader title={book.data.name ?? "Book"} subtitle="Book">
        <Link
          className={`${button} hidden sm:inline-flex`}
          href={`/worlds/${book.data.worldId}`}
        >
          Open world
        </Link>
      </WorkspaceHeader>
      <nav className="ws-tabs" aria-label="Book sections">
        {tabs.map((value) => (
          <button
            key={value}
            className="ws-tab"
            aria-current={tab === value ? "page" : undefined}
            onClick={() => {
              setTab(value);
              if (value === "relationships") setGraphVisited(true);
            }}
          >
            {value}
          </button>
        ))}
      </nav>
      {chapters.error ? (
        <Notice error={chapters.error} retry={() => void chapters.refetch()} />
      ) : chapters.isPending ? (
        <Notice>Loading chapters...</Notice>
      ) : (
        <>
          <div hidden={tab !== "writer"}>
            <Writer
              bookId={bookId}
              chapters={chapters.data}
              requestedChapter={requestedChapter}
              onCreate={() => setTab("timeline")}
            />
          </div>
          {tab === "world" && book.data.worldId && (
            <WorldEntities worldId={book.data.worldId} bookId={bookId} />
          )}
          <div hidden={tab !== "relationships"}>
            {graphVisited && book.data.worldId && (
              <Relationships worldId={book.data.worldId} />
            )}
          </div>
          {tab === "timeline" && (
            <ChapterTimeline
              bookId={bookId}
              chapters={chapters.data}
              onOpen={(id) => {
                setRequestedChapter({ id });
                setTab("writer");
              }}
            />
          )}
        </>
      )}
    </main>
  );
}

export default function BookWorkspace({ bookId }: { bookId: string }) {
  return (
    <WorkspaceProvider>
      <BookContent bookId={bookId} />
    </WorkspaceProvider>
  );
}
