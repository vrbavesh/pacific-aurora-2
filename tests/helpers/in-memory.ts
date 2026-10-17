import type {
  Book,
  Chapter,
  ChapterImportantPoint,
  World,
} from "@/src/lib/api/generated";
import type {
  AiAnalysisEligibility,
  AiAnalysisReservation,
  AiAnalysisStateRepository,
  BookRepository,
  ChapterRepository,
  WorldRepository,
} from "@/src/server/repositories/types";
import { randomUUID } from "node:crypto";
import { ConflictError, NotFoundError, RateLimitError } from "@/src/lib/api/errors";

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

type AiChapter = { ownerId: string; bookId: string; baseline: number };
type AiCheckpoint = {
  completed: number;
  version: number;
  token: string | null;
  reservedMilestone: number | null;
  leaseExpires: number | null;
};

// Shared across request-scoped doubles, just as the SQL rows are shared across
// independent Supabase sessions. Time is injected for deterministic cooldowns.
export class InMemoryAiStateStore {
  readonly chapters = new Map<string, AiChapter>();
  readonly checkpoints = new Map<string, AiCheckpoint>();
  readonly dispatches = new Map<string, number>();
  readonly declines = new Map<string, Set<string>>();
  readonly receipts = new Map<string, { chapterId: string; kind: string; resourceId: string }>();
  readonly pendingReceipts = new Map<string, {
    chapterId: string; kind: string; promise: Promise<string>;
  }>();
  constructor(readonly now: () => number = Date.now) {}

  registerChapter(ownerId: string, bookId: string, chapterId: string, savedWordCount: number): void {
    this.chapters.set(chapterId, { ownerId, bookId, baseline: Math.floor(savedWordCount / 500) });
  }

  forUser(ownerId: string): AiAnalysisStateRepository {
    const chapter = (bookId: string, chapterId: string): AiChapter => {
      const found = this.chapters.get(chapterId);
      if (!found || found.ownerId !== ownerId || found.bookId !== bookId) throw new NotFoundError();
      return found;
    };
    const eligibility = (bookId: string, chapterId: string): AiAnalysisEligibility => {
      const saved = chapter(bookId, chapterId);
      const state = this.checkpoints.get(chapterId);
      const last = this.dispatches.get(ownerId);
      const next = last === undefined || last + 300_000 <= this.now()
        ? null : new Date(last + 300_000).toISOString();
      return {
        completedMilestone: state?.completed ?? saved.baseline,
        checkpointVersion: state?.version ?? 0,
        nextEligibleAt: next,
      };
    };
    return {
      eligibility: async (bookId, chapterId) => eligibility(bookId, chapterId),
      declined: async (bookId, chapterId) => {
        chapter(bookId, chapterId);
        return [...(this.declines.get(`${ownerId}:${chapterId}`) ?? [])];
      },
      decline: async (bookId, chapterId, fingerprint) => {
        chapter(bookId, chapterId);
        const key = `${ownerId}:${chapterId}`;
        const values = this.declines.get(key) ?? new Set<string>();
        values.add(fingerprint);
        this.declines.set(key, values);
      },
      reserve: async (bookId, chapterId, milestone, checkpointVersion): Promise<AiAnalysisReservation> => {
        const saved = chapter(bookId, chapterId);
        const at = this.now();
        const last = this.dispatches.get(ownerId);
        if (last !== undefined && last + 300_000 > at) {
          throw new RateLimitError("AI analysis is cooling down", Math.ceil((last + 300_000 - at) / 1000));
        }
        const current = this.checkpoints.get(chapterId) ?? {
          completed: saved.baseline, version: 0, token: null,
          reservedMilestone: null, leaseExpires: null,
        };
        if (
          checkpointVersion !== current.version || milestone < 1 ||
          (current.leaseExpires !== null && current.leaseExpires > at)
        ) throw new ConflictError("AI checkpoint changed");
        const token = randomUUID();
        this.checkpoints.set(chapterId, {
          ...current, token, reservedMilestone: milestone, leaseExpires: at + 120_000,
        });
        this.dispatches.set(ownerId, at);
        return { ...eligibility(bookId, chapterId), leaseToken: token };
      },
      finalize: async (bookId, chapterId, leaseToken) => {
        chapter(bookId, chapterId);
        const current = this.checkpoints.get(chapterId);
        if (!current || !leaseToken || current.token !== leaseToken) throw new ConflictError("Stale lease");
        this.checkpoints.set(chapterId, {
          completed: Math.max(current.completed, current.reservedMilestone!), version: current.version + 1,
          token: null, reservedMilestone: null, leaseExpires: null,
        });
        return eligibility(bookId, chapterId);
      },
    };
  }

  async applyOnce(
    ownerId: string, chapterId: string, suggestionId: string, kind: string,
    write: () => Promise<string>,
  ): Promise<string> {
    if (this.chapters.get(chapterId)?.ownerId !== ownerId) throw new NotFoundError();
    const key = `${ownerId}:${suggestionId}`;
    const existing = this.receipts.get(key);
    if (existing) {
      if (existing.chapterId !== chapterId || existing.kind !== kind) throw new ConflictError();
      return existing.resourceId;
    }
    const pending = this.pendingReceipts.get(key);
    if (pending) {
      if (pending.chapterId !== chapterId || pending.kind !== kind) throw new ConflictError();
      return pending.promise;
    }
    const operation = (async () => {
      const resourceId = await write();
      this.receipts.set(key, { chapterId, kind, resourceId });
      return resourceId;
    })();
    this.pendingReceipts.set(key, { chapterId, kind, promise: operation });
    try { return await operation; }
    finally { this.pendingReceipts.delete(key); }
  }

  deleteChapter(chapterId: string): void {
    const ownerId = this.chapters.get(chapterId)?.ownerId;
    this.chapters.delete(chapterId);
    if (ownerId) this.declines.delete(`${ownerId}:${chapterId}`);
    this.checkpoints.delete(chapterId);
    for (const [key, receipt] of this.receipts) {
      if (receipt.chapterId === chapterId) this.receipts.delete(key);
    }
  }

  deleteOwner(ownerId: string): void {
    for (const [chapterId, chapter] of this.chapters) {
      if (chapter.ownerId === ownerId) this.deleteChapter(chapterId);
    }
    this.dispatches.delete(ownerId);
  }
}
