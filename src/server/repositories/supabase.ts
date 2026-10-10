import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Book,
  Chapter,
  ChapterImportantPoint,
  World,
} from "@/src/lib/api/generated";
import { NotFoundError } from "@/src/lib/api/errors";
import type {
  BookRepository,
  ChapterRepository,
  WorldRepository,
} from "./types";

type Row = Record<string, unknown>;

function first<T extends Row>(
  data: T | T[] | null,
  error: { code?: string; message?: string } | null,
): T {
  if (error) {
    if (error.code === "PGRST116") throw new NotFoundError();
    throw new Error(error.message ?? "Supabase error");
  }
  const rows = Array.isArray(data)
    ? data
    : data !== null && data !== undefined
      ? [data]
      : [];
  if (rows.length === 0) throw new NotFoundError();
  return rows[0];
}

const s = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;
const n = (v: unknown): number | undefined =>
  typeof v === "number" ? v : undefined;
const snull = (v: unknown): string | null | undefined =>
  v === null ? null : typeof v === "string" ? v : undefined;

function toWorld(r: Row): World {
  return {
    id: s(r.id),
    name: s(r.name),
    createdAt: s(r.created_at),
    updatedAt: s(r.updated_at),
    lastOpenedAt: snull(r.last_opened_at),
  };
}
function toBook(r: Row): Book {
  return {
    id: s(r.id),
    worldId: s(r.world_id),
    name: s(r.name),
    createdAt: s(r.created_at),
    updatedAt: s(r.updated_at),
    lastOpenedAt: snull(r.last_opened_at),
  };
}
function toChapter(r: Row): Chapter {
  return {
    id: s(r.id),
    bookId: s(r.book_id),
    name: s(r.name),
    position: n(r.position),
    content: r.content as Chapter["content"],
    createdAt: s(r.created_at),
    updatedAt: s(r.updated_at),
  };
}
function toPoint(r: Row): ChapterImportantPoint {
  return {
    id: s(r.id),
    chapterId: s(r.chapter_id),
    content: s(r.content),
    position: n(r.position),
  };
}

export class WorldRepositoryImpl implements WorldRepository {
  constructor(private supabase: SupabaseClient) {}
  async list(userId: string): Promise<World[]> {
    const { data, error } = await this.supabase
      .from("worlds")
      .select("*")
      .eq("owner_id", userId)
      .order("last_opened_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map(toWorld);
  }
  async get(id: string): Promise<World | null> {
    const { data, error } = await this.supabase
      .from("worlds")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toWorld(data as Row) : null;
  }
  async create(userId: string, name: string): Promise<World> {
    const { data, error } = await this.supabase
      .from("worlds")
      .insert({ owner_id: userId, name })
      .select()
      .single();
    return toWorld(first<Row>(data, error));
  }
  async update(id: string, patch: Partial<Pick<World, "name">>): Promise<World> {
    const { data, error } = await this.supabase
      .from("worlds")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    return toWorld(first<Row>(data, error));
  }
  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.from("worlds").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }
  async touchOpened(id: string): Promise<World> {
    const { data, error } = await this.supabase
      .from("worlds")
      .update({ last_opened_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    return toWorld(first<Row>(data, error));
  }
}

export class BookRepositoryImpl implements BookRepository {
  constructor(private supabase: SupabaseClient) {}
  async list(worldId: string): Promise<Book[]> {
    const { data, error } = await this.supabase
      .from("books")
      .select("*")
      .eq("world_id", worldId)
      .order("last_opened_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map(toBook);
  }
  async get(id: string): Promise<Book | null> {
    const { data, error } = await this.supabase
      .from("books")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toBook(data as Row) : null;
  }
  async create(worldId: string, name: string): Promise<Book> {
    const { data, error } = await this.supabase
      .from("books")
      .insert({ world_id: worldId, name })
      .select()
      .single();
    return toBook(first<Row>(data, error));
  }
  async update(id: string, patch: Partial<Pick<Book, "name">>): Promise<Book> {
    const { data, error } = await this.supabase
      .from("books")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    return toBook(first<Row>(data, error));
  }
  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.from("books").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }
  async touchOpened(id: string): Promise<Book> {
    const { data, error } = await this.supabase
      .from("books")
      .update({ last_opened_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    return toBook(first<Row>(data, error));
  }
}

export class ChapterRepositoryImpl implements ChapterRepository {
  constructor(private supabase: SupabaseClient) {}
  async list(bookId: string): Promise<Chapter[]> {
    const { data, error } = await this.supabase
      .from("chapters")
      .select("*")
      .eq("book_id", bookId)
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map(toChapter);
  }
  async get(id: string): Promise<Chapter | null> {
    const { data, error } = await this.supabase
      .from("chapters")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? toChapter(data as Row) : null;
  }
  async create(bookId: string, name: string): Promise<Chapter> {
    const existing = await this.list(bookId);
    const { data, error } = await this.supabase
      .from("chapters")
      .insert({ book_id: bookId, name, position: existing.length })
      .select()
      .single();
    return toChapter(first<Row>(data, error));
  }
  async update(
    id: string,
    patch: Partial<Pick<Chapter, "name" | "content">>,
  ): Promise<Chapter> {
    const { data, error } = await this.supabase
      .from("chapters")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    return toChapter(first<Row>(data, error));
  }
  async remove(id: string): Promise<void> {
    const { error } = await this.supabase.from("chapters").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }
  async move(id: string, direction: "up" | "down"): Promise<Chapter[]> {
    const { data, error } = await this.supabase.rpc("move_chapter_atomic", {
      target_chapter_id: id,
      move_direction: direction,
    });
    if (error) throw new Error(error.message);
    const chapters = ((data ?? []) as Row[]).map(toChapter);
    if (chapters.length === 0) throw new NotFoundError();
    return chapters;
  }
  async listPoints(chapterId: string): Promise<ChapterImportantPoint[]> {
    const { data, error } = await this.supabase
      .from("chapter_important_points")
      .select("*")
      .eq("chapter_id", chapterId)
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map(toPoint);
  }
  async addPoint(
    chapterId: string,
    content: string,
  ): Promise<ChapterImportantPoint> {
    const existing = await this.listPoints(chapterId);
    const { data, error } = await this.supabase
      .from("chapter_important_points")
      .insert({ chapter_id: chapterId, content, position: existing.length })
      .select()
      .single();
    return toPoint(first<Row>(data, error));
  }
  async removePoint(pointId: string): Promise<void> {
    const { error } = await this.supabase
      .from("chapter_important_points")
      .delete()
      .eq("id", pointId);
    if (error) throw new Error(error.message);
  }
}
