import { describe, expect, test } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authorizeResourcePath } from "@/src/server/resource-scope";
import { NotFoundError } from "@/src/lib/api/errors";

// Rows supplied here represent rows visible to the request's RLS session.
// This verifies the HTTP guard; it does not substitute for real RLS tests.
function visibleRows(tables: Record<string, Record<string, string>[]>) {
  return {
    from(table: string) {
      const filters: [string, string][] = [];
      const query = {
        select() {
          return query;
        },
        eq(column: string, value: string) {
          filters.push([column, value]);
          return query;
        },
        async maybeSingle() {
          return {
            error: null,
            data:
              tables[table]?.find((row) =>
                filters.every(([key, value]) => row[key] === value),
              ) ?? null,
          };
        },
      };
      return query;
    },
  } as unknown as SupabaseClient;
}

describe("resource path ownership and parent matching", () => {
  test.each([
    "worlds/other/books",
    "worlds/other/characters",
    "worlds/other/custom-entities",
    "books/other/chapters",
    "characters/other/timelines",
    "places/other",
    "items/other",
    "custom-entity-types/other/attributes",
    "custom-entities/other",
    "relationships/other",
  ])("hidden resource returns 404: %s", async (path) => {
    await expect(
      authorizeResourcePath(
        new Request(`http://localhost/api/${path}`),
        visibleRows({}),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
  test("a visible chapter cannot be accessed through a different visible book", async () => {
    const db = visibleRows({
      books: [{ id: "a" }, { id: "b" }],
      chapters: [{ id: "chapter", book_id: "b" }],
    });
    await expect(
      authorizeResourcePath(
        new Request("http://localhost/api/books/a/chapters/chapter"),
        db,
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
  test("a visible timeline point must belong to the path's character and timeline", async () => {
    const db = visibleRows({
      characters: [{ entity_id: "character" }],
      character_book_timelines: [
        { id: "timeline", character_entity_id: "character" },
      ],
      character_timeline_points: [{ id: "point", timeline_id: "different" }],
    });
    await expect(
      authorizeResourcePath(
        new Request(
          "http://localhost/api/characters/character/timelines/timeline/points/point",
        ),
        db,
      ),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
  test("an owned chapter point with matching parents is allowed", async () => {
    const db = visibleRows({
      books: [{ id: "book" }],
      chapters: [{ id: "chapter", book_id: "book" }],
      chapter_important_points: [{ id: "point", chapter_id: "chapter" }],
    });
    await expect(
      authorizeResourcePath(
        new Request(
          "http://localhost/api/books/book/chapters/chapter/important-points/point",
        ),
        db,
      ),
    ).resolves.toBeUndefined();
  });
});
