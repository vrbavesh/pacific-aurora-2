import type {
  Book,
  Chapter,
  ChapterImportantPoint,
  World,
} from "@/src/lib/api/generated";
import type {
  BookRepository,
  ChapterRepository,
  WorldRepository,
} from "@/src/server/repositories/types";

export class InMemoryWorldRepo implements WorldRepository {
  private store = new Map<string, World>();
  private seq = 0;
  async list(): Promise<World[]> {
    return [...this.store.values()].sort((a, b) =>
      (b.lastOpenedAt ?? "").localeCompare(a.lastOpenedAt ?? ""),
    );
  }
  async get(id: string): Promise<World | null> {
    return this.store.get(id) ?? null;
  }
  async create(userId: string, name: string): Promise<World> {
    const id = `w${++this.seq}`;
    const world: World = {
      id,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastOpenedAt: null,
    };
    this.store.set(id, world);
    return world;
  }
  async update(id: string, patch: Partial<Pick<World, "name">>): Promise<World> {
    const w = this.store.get(id);
    if (!w) throw new Error("not found");
    const next = { ...w, ...patch, updatedAt: new Date().toISOString() };
    this.store.set(id, next);
    return next;
  }
  async remove(id: string): Promise<void> {
    this.store.delete(id);
  }
  async touchOpened(id: string): Promise<World> {
    const w = this.store.get(id);
    if (!w) throw new Error("not found");
    const next = { ...w, lastOpenedAt: new Date().toISOString() };
    this.store.set(id, next);
    return next;
  }
}

export class InMemoryBookRepo implements BookRepository {
  private store = new Map<string, Book>();
  private seq = 0;
  async list(worldId: string): Promise<Book[]> {
    return [...this.store.values()]
      .filter((b) => b.worldId === worldId)
      .sort((a, b) => (b.lastOpenedAt ?? "").localeCompare(a.lastOpenedAt ?? ""));
  }
  async get(id: string): Promise<Book | null> {
    return this.store.get(id) ?? null;
  }
  async create(worldId: string, name: string): Promise<Book> {
    const id = `b${++this.seq}`;
    const book: Book = {
      id,
      worldId,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastOpenedAt: null,
    };
    this.store.set(id, book);
    return book;
  }
  async update(id: string, patch: Partial<Pick<Book, "name">>): Promise<Book> {
    const b = this.store.get(id);
    if (!b) throw new Error("not found");
    const next = { ...b, ...patch };
    this.store.set(id, next);
    return next;
  }
  async remove(id: string): Promise<void> {
    this.store.delete(id);
  }
  async touchOpened(id: string): Promise<Book> {
    const b = this.store.get(id);
    if (!b) throw new Error("not found");
    const next = { ...b, lastOpenedAt: new Date().toISOString() };
    this.store.set(id, next);
    return next;
  }
}

export class InMemoryChapterRepo implements ChapterRepository {
  private store = new Map<string, Chapter>();
  private seq = 0;
  async list(bookId: string): Promise<Chapter[]> {
    return [...this.store.values()]
      .filter((c) => c.bookId === bookId)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }
  async get(id: string): Promise<Chapter | null> {
    return this.store.get(id) ?? null;
  }
  async create(bookId: string, name: string): Promise<Chapter> {
    const id = `c${++this.seq}`;
    const book = await this.list(bookId);
    const chapter: Chapter = {
      id,
      bookId,
      name,
      position: book.length,
      content: { type: "doc", content: [] },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.store.set(id, chapter);
    return chapter;
  }
  async update(
    id: string,
    patch: Partial<Pick<Chapter, "name" | "content">>,
  ): Promise<Chapter> {
    const c = this.store.get(id);
    if (!c) throw new Error("not found");
    const next = { ...c, ...patch };
    this.store.set(id, next);
    return next;
  }
  async remove(id: string): Promise<void> {
    this.store.delete(id);
  }
  async move(id: string, direction: "up" | "down"): Promise<Chapter[]> {
    const current = this.store.get(id);
    if (!current || !current.bookId) throw new Error("not found");
    const list = await this.list(current.bookId);
    const idx = list.findIndex((c) => c.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx < 0 || swapIdx < 0 || swapIdx >= list.length) return list;
    const a = list[idx];
    const b = list[swapIdx];
    this.store.set(a.id!, { ...a, position: b.position });
    this.store.set(b.id!, { ...b, position: a.position });
    return this.list(current.bookId);
  }
  async listPoints(chapterId: string): Promise<ChapterImportantPoint[]> {
    void chapterId;
    return [];
  }
  async addPoint(chapterId: string, content: string): Promise<ChapterImportantPoint> {
    return { id: "p", chapterId, content, position: 0 };
  }
  async removePoint(): Promise<void> {}
}
