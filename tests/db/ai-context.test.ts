import { expect, test } from "vitest";
import { SupabaseAiContextRepository } from "@/src/server/repositories/supabase-ai-context";

type Row = Record<string, unknown>;

function database(points: Row[]) {
  const tables: Record<string, Row[]> = {
    books: [{ id: "book-1", world_id: "world-1" }],
    chapters: [{ id: "chapter-1", book_id: "book-1", name: "Opening" }],
    worlds: [{ id: "world-1", name: "North", created_at: "2026-10-15T00:00:00Z", updated_at: "2026-10-15T00:00:00Z", last_opened_at: null }],
    world_entities: [
      { id: "character-1", world_id: "world-1", kind: "character", name: "Mara", updated_at: "2026-10-15T00:00:00Z" },
      { id: "foreign", world_id: "world-2", kind: "character", name: "Secret", updated_at: "2026-10-15T00:00:00Z" },
    ],
    characters: [{ entity_id: "character-1", status: "alive" }, { entity_id: "foreign", status: "alive" }],
    places: [], items: [], custom_entities: [], custom_entity_types: [], custom_entity_attributes: [],
    entity_relationships: [], chapter_important_points: points, character_book_timelines: [], character_timeline_points: [],
  };
  const client = {
    from(table: string) {
      let rows = tables[table] ?? [];
      let from = 0;
      let to = 199;
      const query = {
        select() { return query; },
        order(column: string) { rows = [...rows].sort((a, b) => String(a[column]).localeCompare(String(b[column]))); return query; },
        range(start: number, end: number) { from = start; to = end; return query; },
        eq(field: string, value: string) { rows = rows.filter((row) => row[field] === value); return query; },
        in(field: string, values: string[]) { rows = rows.filter((row) => values.includes(String(row[field]))); return query; },
        then(resolve: (value: { data: Row[]; error: null }) => unknown) { return Promise.resolve(resolve({ data: rows.slice(from, to + 1), error: null })); },
      };
      return query;
    },
  };
  return new SupabaseAiContextRepository(client as never);
}

test("snapshot reads every page and includes only the active RLS-visible world", async () => {
  const points = Array.from({ length: 205 }, (_, index) => ({ id: `point-${String(index).padStart(3, "0")}`, chapter_id: "chapter-1", content: `Point ${index}`, position: index }));
  const context = await database(points).snapshot("book-1", "chapter-1");
  expect(context.chapterPoints).toHaveLength(205);
  expect(context.chapterPoints[204].point.content).toBe("Point 204");
  expect(context.characters.map((character) => character.name)).toEqual(["Mara"]);
});

test("oversized complete context fails before a provider dispatch", async () => {
  const points = Array.from({ length: 100 }, (_, index) => ({ id: `point-${index}`, chapter_id: "chapter-1", content: "x".repeat(2000), position: index }));
  await expect(database(points).snapshot("book-1", "chapter-1"))
    .rejects.toMatchObject({ status: 422, code: "context_too_large" });
});
