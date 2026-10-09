"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AccountMenu from "@/src/components/AccountMenu";
import AuroraBackground from "@/src/components/AuroraBackground";
import { PageTransition } from "@/src/components/PageTransition";
import ConfirmDialog from "@/src/components/home/ConfirmDialog";
import CreateBookDialog, { type CreateBookChoice } from "@/src/components/home/CreateBookDialog";
import PromptDialog from "@/src/components/home/PromptDialog";
import SidebarNav from "@/src/components/home/SidebarNav";
import WorldSections, { type WorldDetails } from "@/src/components/home/WorldSections";
import { ApiRequestError, apiFetch, getToken } from "@/src/lib/api/client";
import { touchSection } from "@/src/lib/sectionRecency";
import type {
  Book,
  Character,
  CustomEntity,
  CustomEntityType,
  Item,
  Place,
  World,
} from "@/src/lib/api/generated";

type Status = "loading" | "ready" | "error";
type EntryRef = { kind: "book" | "world"; id: string; name: string };

const LOAD_ERROR =
  "Your workspace could not load. Nothing was lost, you can try again.";

async function fetchWorldDetails(worldId: string): Promise<WorldDetails> {
  const [characters, places, items, types, customEntities] = await Promise.all([
    apiFetch<Character[]>(`/api/worlds/${worldId}/characters`),
    apiFetch<Place[]>(`/api/worlds/${worldId}/places`),
    apiFetch<Item[]>(`/api/worlds/${worldId}/items`),
    apiFetch<CustomEntityType[]>(`/api/worlds/${worldId}/custom-entity-types`),
    apiFetch<CustomEntity[]>(`/api/worlds/${worldId}/custom-entities`),
  ]);
  return {
    characters: characters.data,
    places: places.data,
    items: items.data,
    types: types.data,
    customEntities: customEntities.data,
  };
}

function bookScore(book: Book): number {
  if (!book.lastOpenedAt) return -1;
  const time = Date.parse(book.lastOpenedAt);
  return Number.isNaN(time) ? -1 : time;
}

/**
 * The home middle shows the world of the most recently opened book. When no
 * book exists yet, it falls back to the most recently opened world.
 */
function pickAnchorWorldId(
  worlds: World[],
  booksByWorld: Record<string, Book[]>,
): string | null {
  let bestWorldId: string | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const world of worlds) {
    if (!world.id) continue;
    for (const book of booksByWorld[world.id] ?? []) {
      if (!book.id) continue;
      const score = bookScore(book);
      if (score > bestScore) {
        bestScore = score;
        bestWorldId = world.id;
      }
    }
  }
  return bestWorldId ?? worlds[0]?.id ?? null;
}

export default function Home() {
  const router = useRouter();

  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState(LOAD_ERROR);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [booksByWorld, setBooksByWorld] = useState<Record<string, Book[]>>({});
  const [anchorWorld, setAnchorWorld] = useState<World | null>(null);
  const [details, setDetails] = useState<WorldDetails | null>(null);

  const [createWorldOpen, setCreateWorldOpen] = useState(false);
  const [createBookOpen, setCreateBookOpen] = useState(false);
  const [customSectionOpen, setCustomSectionOpen] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<EntryRef | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EntryRef | null>(null);

  const redirectToSignIn = useCallback(() => {
    router.replace("/signin");
  }, [router]);

  const loadAll = useCallback(
    async (showLoading = true) => {
      if (showLoading) setStatus("loading");
      try {
        if (!getToken()) {
          redirectToSignIn();
          return;
        }
        const { data: session } = await apiFetch<{ profile: { userId?: string | null; onboardingComplete?: boolean } | null }>("/api/auth/session");
        if (!session.profile?.onboardingComplete || !session.profile.userId) {
          router.replace("/onboarding");
          return;
        }
        const { data: worldList } = await apiFetch<World[]>("/api/worlds");
        const map: Record<string, Book[]> = {};
        await Promise.all(
          worldList.map(async (world) => {
            if (!world.id) return;
            const { data } = await apiFetch<Book[]>(`/api/worlds/${world.id}/books`);
            map[world.id] = data;
          }),
        );
        setWorlds(worldList);
        setBooksByWorld(map);

        const anchorId = pickAnchorWorldId(worldList, map);
        const world = worldList.find((entry) => entry.id === anchorId) ?? null;
        setAnchorWorld(world);
        setDetails(world?.id ? await fetchWorldDetails(world.id) : null);

        setErrorMessage(LOAD_ERROR);
        setStatus("ready");
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 401) {
          redirectToSignIn();
          return;
        }
        setErrorMessage(LOAD_ERROR);
        setStatus("error");
      }
    },
    [redirectToSignIn, router],
  );

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  /** Runs a mutation, redirecting on an expired session and rethrowing the rest. */
  const runAction = useCallback(
    async (action: () => Promise<void>): Promise<void> => {
      try {
        await action();
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 401) {
          redirectToSignIn();
          return;
        }
        throw error;
      }
    },
    [redirectToSignIn],
  );

  // ---- Navigation (quick access with redirection) ----

  const pingAndGo = useCallback(
    async (pingPath: string, href: string) => {
      try {
        await apiFetch(pingPath, { method: "POST" });
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 401) {
          redirectToSignIn();
          return;
        }
      }
      router.push(href);
    },
    [redirectToSignIn, router],
  );

  const handleOpenBook = (book: Book) => {
    if (!book.id) return;
    void pingAndGo(`/api/books/${book.id}/open`, `/books/${book.id}`);
  };

  const handleOpenWorld = (world: World) => {
    if (!world.id) return;
    void pingAndGo(`/api/worlds/${world.id}/open`, `/worlds/${world.id}`);
  };

  const handleOpenEntity = (sectionKey: string) => {
    if (!anchorWorld?.id) return;
    touchSection(anchorWorld.id, sectionKey);
    // Books list is ordered most recently opened first.
    const linked = (booksByWorld[anchorWorld.id] ?? []).find((book) => book.id);
    if (linked?.id) {
      void pingAndGo(`/api/books/${linked.id}/open`, `/books/${linked.id}?tab=world`);
    } else {
      void pingAndGo(`/api/worlds/${anchorWorld.id}/open`, `/worlds/${anchorWorld.id}`);
    }
  };

  // ---- Mutations ----

  const handleCreateWorld = (name: string) =>
    runAction(async () => {
      await apiFetch("/api/worlds", { method: "POST", body: JSON.stringify({ name }) });
      await loadAll(false);
    });

  const handleCreateBook = (name: string, choice: CreateBookChoice) =>
    runAction(async () => {
      let worldId: string;
      if (choice.mode === "new") {
        const { data: world } = await apiFetch<World>("/api/worlds", {
          method: "POST",
          body: JSON.stringify({ name: choice.worldName }),
        });
        if (!world.id) throw new Error("The world could not be created. Please try again.");
        worldId = world.id;
      } else {
        worldId = choice.worldId;
      }
      await apiFetch(`/api/worlds/${worldId}/books`, {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      await loadAll(false);
    });

  const handleRename = (target: EntryRef, name: string) =>
    runAction(async () => {
      const path = target.kind === "book" ? `/api/books/${target.id}` : `/api/worlds/${target.id}`;
      await apiFetch(path, { method: "PATCH", body: JSON.stringify({ name }) });
      await loadAll(false);
    });

  const handleDelete = (target: EntryRef) =>
    runAction(async () => {
      const path = target.kind === "book" ? `/api/books/${target.id}` : `/api/worlds/${target.id}`;
      await apiFetch(path, { method: "DELETE" });
      await loadAll(false);
    });

  const handleCreateCustomSection = (name: string) =>
    runAction(async () => {
      if (!anchorWorld?.id) return;
      await apiFetch(`/api/worlds/${anchorWorld.id}/custom-entity-types`, {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      await loadAll(false);
    });

  const deleteTitle =
    deleteTarget?.kind === "world" ? "Delete this world?" : "Delete this book?";
  const deleteDescription =
    deleteTarget?.kind === "world"
      ? "Everything inside this world goes with it: characters, places, items, custom sections, and every linked book."
      : "The text and chapters of this book will be deleted. The entities in its world stay untouched.";

  return (
    <main className="relative h-[100dvh] overflow-hidden text-white">
      <AuroraBackground />

      <PageTransition>
        <div className="flex h-[100dvh] w-full">
          <SidebarNav
            mobileOpen={navigationOpen}
            onClose={() => setNavigationOpen(false)}
            worlds={worlds}
            booksByWorld={booksByWorld}
            loading={status === "loading"}
            onOpenBook={handleOpenBook}
            onOpenWorld={handleOpenWorld}
            onCreateBook={() => setCreateBookOpen(true)}
            onCreateWorld={() => setCreateWorldOpen(true)}
            onRenameBook={(book) =>
              book.id && setRenameTarget({ kind: "book", id: book.id, name: book.name ?? "" })
            }
            onDeleteBook={(book) =>
              book.id && setDeleteTarget({ kind: "book", id: book.id, name: book.name ?? "" })
            }
            onRenameWorld={(world) =>
              world.id && setRenameTarget({ kind: "world", id: world.id, name: world.name ?? "" })
            }
            onDeleteWorld={(world) =>
              world.id && setDeleteTarget({ kind: "world", id: world.id, name: world.name ?? "" })
            }
          />

          <div className="flex min-w-0 flex-1 flex-col">
            {/* Top right: account trigger. No backdrop-filter here: it would
                make the menu's fixed click-away overlay cover only the header,
                and the header must stack above the scrollable middle pane so
                the account menu paints over it. */}
            <header className="relative z-[var(--z-sticky)] flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#050d14]/40 px-4 sm:px-6 lg:justify-end">
              <button className="ws-button lg:hidden" onClick={() => setNavigationOpen(true)} aria-label="Open workspace navigation">Menu</button>
              <Link
                href="/home"
                className="flex items-center gap-2.5 lg:hidden"
                aria-label="Pacific Aurora home"
              >
                <span className="h-2 w-2 rounded-full bg-[#2dd4bf] shadow-[0_0_14px_rgba(45,212,191,0.5)]" />
                <span className="text-xs font-medium uppercase tracking-[0.22em] text-[#b7ddd6]">
                  Pacific Aurora
                </span>
              </Link>
              <AccountMenu />
            </header>

            {/* Middle: current world details */}
            <div data-lenis-prevent className="relative flex-1 overflow-y-auto">
              <WorldSections
                status={status}
                errorMessage={errorMessage}
                worldsCount={worlds.length}
                anchorWorld={anchorWorld}
                details={details}
                onRetry={() => void loadAll()}
                onCreateWorld={() => setCreateWorldOpen(true)}
                onCreateCustomSection={() => setCustomSectionOpen(true)}
                onOpenEntity={handleOpenEntity}
              />
            </div>
          </div>
        </div>
      </PageTransition>

      {/* Dialogs */}
      <PromptDialog
        open={createWorldOpen}
        title="Create a world"
        label="World name"
        placeholder="e.g. Aurora"
        submitLabel="Create world"
        onSubmit={async (value) => {
          await handleCreateWorld(value);
          setCreateWorldOpen(false);
        }}
        onCancel={() => setCreateWorldOpen(false)}
      />

      <CreateBookDialog
        open={createBookOpen}
        worlds={worlds}
        onSubmit={async (name, choice) => {
          await handleCreateBook(name, choice);
          setCreateBookOpen(false);
        }}
        onCancel={() => setCreateBookOpen(false)}
      />

      <PromptDialog
        open={customSectionOpen}
        title="Create a custom section"
        label="Section name"
        placeholder="e.g. Factions"
        submitLabel="Create section"
        onSubmit={async (value) => {
          await handleCreateCustomSection(value);
          setCustomSectionOpen(false);
        }}
        onCancel={() => setCustomSectionOpen(false)}
      />

      <PromptDialog
        open={renameTarget !== null}
        title="Edit name"
        label={renameTarget?.kind === "world" ? "World name" : "Book name"}
        initialValue={renameTarget?.name ?? ""}
        placeholder={renameTarget?.kind === "world" ? "e.g. Aurora" : "e.g. Emberfall"}
        submitLabel="Save"
        onSubmit={async (value) => {
          if (!renameTarget) return;
          await handleRename(renameTarget, value);
          setRenameTarget(null);
        }}
        onCancel={() => setRenameTarget(null)}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={deleteTitle}
        description={deleteDescription}
        confirmLabel="Delete"
        onConfirm={async () => {
          if (!deleteTarget) return;
          await handleDelete(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </main>
  );
}
