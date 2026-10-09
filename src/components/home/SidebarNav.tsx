"use client";

import { PencilSimple, Plus, Trash, X } from "@phosphor-icons/react";
import type { Book, World } from "@/src/lib/api/generated";
import { StaggerContainer, StaggerItem } from "@/src/components/PageTransition";
import EntryMenu, { type EntryMenuItem } from "@/src/components/home/EntryMenu";

interface SidebarNavProps {
  mobileOpen?: boolean;
  onClose?: () => void;
  worlds: World[];
  booksByWorld: Record<string, Book[]>;
  loading: boolean;
  onOpenBook: (book: Book) => void;
  onOpenWorld: (world: World) => void;
  onCreateBook: () => void;
  onCreateWorld: () => void;
  onRenameBook: (book: Book) => void;
  onDeleteBook: (book: Book) => void;
  onRenameWorld: (world: World) => void;
  onDeleteWorld: (world: World) => void;
}

function bookScore(book: Book): number {
  if (!book.lastOpenedAt) return -1;
  const time = Date.parse(book.lastOpenedAt);
  return Number.isNaN(time) ? -1 : time;
}

function SectionSkeleton() {
  return (
    <div className="space-y-1.5" aria-hidden="true">
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          className="h-12 animate-pulse border border-white/[0.05] bg-white/[0.03]"
        />
      ))}
    </div>
  );
}

export default function SidebarNav({
  mobileOpen = false,
  onClose,
  worlds,
  booksByWorld,
  loading,
  onOpenBook,
  onOpenWorld,
  onCreateBook,
  onCreateWorld,
  onRenameBook,
  onDeleteBook,
  onRenameWorld,
  onDeleteWorld,
}: SidebarNavProps) {
  const bookRows = worlds
    .flatMap((world) =>
      world.id
        ? (booksByWorld[world.id] ?? []).map((book) => ({ book, worldName: world.name ?? "" }))
        : [],
    )
    .filter((row) => Boolean(row.book.id))
    .sort((a, b) => bookScore(b.book) - bookScore(a.book));

  const bookMenu = (book: Book): EntryMenuItem[] => [
    {
      label: "Edit name",
      icon: <PencilSimple size={14} weight="regular" />,
      onSelect: () => onRenameBook(book),
    },
    {
      label: "Delete",
      icon: <Trash size={14} weight="regular" />,
      onSelect: () => onDeleteBook(book),
      danger: true,
    },
  ];

  const worldMenu = (world: World): EntryMenuItem[] => [
    {
      label: "Edit name",
      icon: <PencilSimple size={14} weight="regular" />,
      onSelect: () => onRenameWorld(world),
    },
    {
      label: "Delete",
      icon: <Trash size={14} weight="regular" />,
      onSelect: () => onDeleteWorld(world),
      danger: true,
    },
  ];

  return (
    <>
    {mobileOpen && <button className="fixed inset-0 z-20 bg-black/60 lg:hidden" onClick={onClose} aria-label="Close navigation" />}
    <aside
      aria-label="Workspace navigation"
      className={`${mobileOpen ? "fixed inset-y-0 left-0 z-30 flex" : "hidden"} w-72 shrink-0 flex-col border-r border-white/10 bg-[#08141f] lg:static lg:flex`}
    >
      <div data-lenis-prevent className="flex-1 overflow-y-auto p-4">
        <button type="button" className="mb-4 p-2 lg:hidden" aria-label="Close workspace navigation" onClick={onClose}><X size={20} /></button>
        <StaggerContainer>
            {/* BOOKS */}
            <StaggerItem>
              <section aria-labelledby="nav-books-heading">
                <div className="flex items-center justify-between px-1">
                  <h2
                    id="nav-books-heading"
                    className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45"
                  >
                    Books
                  </h2>
                  <button
                    type="button"
                    onClick={onCreateBook}
                    aria-label="Create a new book"
                    className="p-1.5 text-white/45 transition hover:bg-white/[0.07] hover:text-[#2dd4bf] active:scale-95"
                  >
                    <Plus size={15} weight="regular" />
                  </button>
                </div>

                <div className="mt-3">
                  {loading ? (
                    <SectionSkeleton />
                  ) : bookRows.length === 0 ? (
                    <p className="px-1 py-4 text-center text-xs italic text-white/35">
                      No books yet
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {bookRows.map(({ book, worldName }) => (
                        <li
                          key={book.id}
                          className="group flex items-center border border-white/[0.06] bg-white/[0.02] transition hover:border-[#2dd4bf]/25 hover:bg-white/[0.04]"
                        >
                          <button
                            type="button"
                            onClick={() => onOpenBook(book)}
                            className="min-w-0 flex-1 px-3 py-2.5 text-left"
                          >
                            <span className="block truncate text-sm text-white/75 transition group-hover:text-white">
                              {book.name ?? ""}
                            </span>
                            <span className="mt-0.5 block truncate text-[10px] text-white/35">
                              {worldName}
                            </span>
                          </button>
                          <EntryMenu
                            label={`Options for ${book.name ?? "book"}`}
                            items={bookMenu(book)}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </StaggerItem>

            {/* WORLDS */}
            <StaggerItem delay={0.08}>
              <section aria-labelledby="nav-worlds-heading" className="border-t border-white/10 pt-6">
                <div className="flex items-center justify-between px-1">
                  <h2
                    id="nav-worlds-heading"
                    className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45"
                  >
                    Worlds
                  </h2>
                  <button
                    type="button"
                    onClick={onCreateWorld}
                    aria-label="Create a new world"
                    className="p-1.5 text-white/45 transition hover:bg-white/[0.07] hover:text-[#2dd4bf] active:scale-95"
                  >
                    <Plus size={15} weight="regular" />
                  </button>
                </div>

                <div className="mt-3">
                  {loading ? (
                    <SectionSkeleton />
                  ) : worlds.length === 0 ? (
                    <p className="px-1 py-4 text-center text-xs italic text-white/35">
                      No worlds yet
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {worlds
                        .filter((world) => Boolean(world.id))
                        .map((world) => {
                          const count = world.id ? (booksByWorld[world.id]?.length ?? 0) : 0;
                          return (
                            <li
                              key={world.id}
                              className="group flex items-center border border-white/[0.06] bg-white/[0.02] transition hover:border-[#2dd4bf]/25 hover:bg-white/[0.04]"
                            >
                              <button
                                type="button"
                                onClick={() => onOpenWorld(world)}
                                className="min-w-0 flex-1 px-3 py-2.5 text-left"
                              >
                                <span className="block truncate text-sm text-white/75 transition group-hover:text-white">
                                  {world.name ?? ""}
                                </span>
                                <span className="mt-0.5 block truncate text-[10px] text-white/35">
                                  {count > 0
                                    ? `${count} ${count === 1 ? "book" : "books"}`
                                    : "No books"}
                                </span>
                              </button>
                              <EntryMenu
                                label={`Options for ${world.name ?? "world"}`}
                                items={worldMenu(world)}
                              />
                            </li>
                          );
                        })}
                    </ul>
                  )}
                </div>
              </section>
            </StaggerItem>
          </StaggerContainer>
      </div>
    </aside>
    </>
  );
}
