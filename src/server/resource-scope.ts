import type { SupabaseClient } from "@supabase/supabase-js";
import { NotFoundError } from "@/src/lib/api/errors";

/** Resolve each parent under the request's RLS session before any nested operation. */
export async function authorizeResourcePath(
  req: Request,
  supabase: SupabaseClient,
): Promise<void> {
  const parts = new URL(req.url).pathname.split("/").filter(Boolean).slice(1);
  const check = async (
    table: string,
    column: string,
    value: string,
    parent?: [string, string],
  ) => {
    let query = supabase.from(table).select(column).eq(column, value);
    if (parent) query = query.eq(parent[0], parent[1]);
    const { data, error } = await query.maybeSingle();
    if (error?.code === "22P02" || (!error && !data)) throw new NotFoundError();
    if (error) throw new Error(error.message);
  };
  const [resource, id, child, childId, nested, nestedId] = parts;
  if (!id) return;
  if (resource === "worlds") await check("worlds", "id", id);
  if (resource === "books") {
    await check("books", "id", id);
    if (child === "chapters" && childId) {
      await check("chapters", "id", childId, ["book_id", id]);
      if (nested === "important-points" && nestedId)
        await check("chapter_important_points", "id", nestedId, [
          "chapter_id",
          childId,
        ]);
    }
  }
  if (["characters", "places", "items", "custom-entities"].includes(resource)) {
    await check(resource.replaceAll("-", "_"), "entity_id", id);
    if (resource === "characters" && child === "timelines" && childId) {
      await check("character_book_timelines", "id", childId, [
        "character_entity_id",
        id,
      ]);
      if (nested === "points" && nestedId)
        await check("character_timeline_points", "id", nestedId, [
          "timeline_id",
          childId,
        ]);
    }
  }
  if (resource === "custom-entity-types")
    await check("custom_entity_types", "id", id);
  if (resource === "relationships")
    await check("entity_relationships", "id", id);
}
