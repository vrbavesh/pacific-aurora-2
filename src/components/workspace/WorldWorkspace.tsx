"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Book, World } from "@/src/lib/api/generated";
import WorldEntities from "./WorldEntities";
import {
  Notice,
  WorkspaceHeader,
  WorkspaceProvider,
  button,
  read,
  write,
} from "./shared";

function WorldContent({ worldId }: { worldId: string }) {
  const world = useQuery({
    queryKey: ["world", worldId],
    queryFn: () => read<World>(`/api/worlds/${worldId}`),
  });
  const books = useQuery({
    queryKey: ["world-books", worldId],
    queryFn: () => read<Book[]>(`/api/worlds/${worldId}/books`),
    enabled: !!world.data,
  });
  useEffect(() => {
    if (world.data)
      void write(`/api/worlds/${worldId}/open`, "POST").catch(() => {});
  }, [worldId, world.data]);
  if (world.isPending) return <Notice>Opening your world...</Notice>;
  if (world.error)
    return <Notice error={world.error} retry={() => void world.refetch()} />;
  return (
    <main className="workspace">
      <WorkspaceHeader title={world.data.name ?? "World"} subtitle="World" />
      <nav
        aria-label="Connected books"
        className="flex items-center gap-3 overflow-x-auto border-b border-border px-5 py-3"
      >
        <span className="shrink-0 text-xs text-foreground-muted">
          Connected books
        </span>
        {books.error ? (
          <span role="alert">
            Could not load books.{" "}
            <button onClick={() => void books.refetch()}>Retry</button>
          </span>
        ) : books.isPending ? (
          <span>Loading...</span>
        ) : (
          books.data.map((book) => (
            <a
              key={book.id}
              className={`${button} shrink-0`}
              href={`/books/${book.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {book.name}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ))
        )}
        {books.data?.length === 0 && (
          <span className="text-sm text-foreground-muted">No books yet</span>
        )}
      </nav>
      <WorldEntities worldId={worldId} />
    </main>
  );
}

export default function WorldWorkspace({ worldId }: { worldId: string }) {
  return (
    <WorkspaceProvider>
      <WorldContent worldId={worldId} />
    </WorkspaceProvider>
  );
}
