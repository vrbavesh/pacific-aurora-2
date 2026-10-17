import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiWorldContext } from "@/src/lib/api/generated";
import { ApiError, NotFoundError } from "@/src/lib/api/errors";
import type { AiContextRepository } from "./types";

type Row = Record<string, unknown>;
type Filter = { field: string; value: string | string[] };
const PAGE_SIZE = 200;
const MAX_CONTEXT_BYTES = 128 * 1024;

const str = (value: unknown) => typeof value === "string" ? value : "";
const number = (value: unknown) => typeof value === "number" ? value : 0;
const optional = (value: unknown) => value === null || typeof value === "string" ? value : null;
const tooLarge = () => new ApiError(422, "context_too_large", "This world has too much context for one AI analysis");

export class SupabaseAiContextRepository implements AiContextRepository {
  private bytes = 0;
  constructor(private readonly supabase: SupabaseClient) {}

  private async rows(table: string, columns: string, order: string, filter?: Filter): Promise<Row[]> {
    if (Array.isArray(filter?.value) && filter.value.length === 0) return [];
    const result: Row[] = [];
    for (let start = 0; ; start += PAGE_SIZE) {
      let query = this.supabase.from(table).select(columns).order(order).range(start, start + PAGE_SIZE - 1);
      if (filter) query = Array.isArray(filter.value)
        ? query.in(filter.field, filter.value)
        : query.eq(filter.field, filter.value);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      const page = (data ?? []) as unknown as Row[];
      this.bytes += Buffer.byteLength(JSON.stringify(page));
      if (this.bytes > MAX_CONTEXT_BYTES) throw tooLarge();
      result.push(...page);
      if (page.length < PAGE_SIZE) return result;
    }
  }

  private async forIds(table: string, columns: string, order: string, field: string, ids: string[]): Promise<Row[]> {
    const result: Row[] = [];
    for (let index = 0; index < ids.length; index += 80) {
      result.push(...await this.rows(table, columns, order, { field, value: ids.slice(index, index + 80) }));
    }
    return result;
  }

  async snapshot(bookId: string, chapterId: string): Promise<AiWorldContext> {
    this.bytes = 0;
    const books = await this.rows("books", "id,world_id", "id", { field: "id", value: bookId });
    const book = books[0];
    if (!book) throw new NotFoundError();
    const chapters = await this.rows("chapters", "id,name", "id", { field: "book_id", value: bookId });
    if (!chapters.some((chapter) => chapter.id === chapterId)) throw new NotFoundError();
    const worlds = await this.rows("worlds", "id,name,created_at,updated_at,last_opened_at", "id", { field: "id", value: str(book.world_id) });
    const world = worlds[0];
    if (!world) throw new NotFoundError();
    const worldId = str(world.id);
    const entities = await this.rows("world_entities", "id,kind,name,updated_at", "id", { field: "world_id", value: worldId });
    const ids = entities.map((entity) => str(entity.id));
    const entityById = new Map(entities.map((entity) => [str(entity.id), entity]));
    const [characterRows, placeRows, itemRows, customRows, typeRows, relationshipRows, chapterPointRows, timelineRows] = await Promise.all([
      this.forIds("characters", "*", "entity_id", "entity_id", ids.filter((id) => entityById.get(id)?.kind === "character")),
      this.forIds("places", "*", "entity_id", "entity_id", ids.filter((id) => entityById.get(id)?.kind === "place")),
      this.forIds("items", "*", "entity_id", "entity_id", ids.filter((id) => entityById.get(id)?.kind === "item")),
      this.forIds("custom_entities", "*", "entity_id", "entity_id", ids.filter((id) => entityById.get(id)?.kind === "custom")),
      this.rows("custom_entity_types", "id,name,position", "id", { field: "world_id", value: worldId }),
      this.rows("entity_relationships", "id,entity_a_id,entity_b_id,relationship_type,sentiment", "id", { field: "world_id", value: worldId }),
      this.forIds("chapter_important_points", "id,chapter_id,content,position", "id", "chapter_id", chapters.map((chapter) => str(chapter.id))),
      this.rows("character_book_timelines", "id,character_entity_id", "id", { field: "book_id", value: bookId }),
    ]);
    const [attributeRows, timelinePointRows] = await Promise.all([
      this.forIds("custom_entity_attributes", "id,entity_type_id,name,field_type,required,position,options", "id", "entity_type_id", typeRows.map((row) => str(row.id))),
      this.forIds("character_timeline_points", "id,timeline_id,content,position,chapter_id", "id", "timeline_id", timelineRows.map((row) => str(row.id))),
    ]);
    const chapterById = new Map(chapters.map((chapter) => [str(chapter.id), chapter]));
    const timelineById = new Map(timelineRows.map((timeline) => [str(timeline.id), timeline]));
    const context: AiWorldContext = {
      world: { id: worldId, name: str(world.name), createdAt: str(world.created_at), updatedAt: str(world.updated_at), lastOpenedAt: optional(world.last_opened_at) as string | null },
      characters: characterRows.map((row) => ({ entityId: str(row.entity_id), name: str(entityById.get(str(row.entity_id))?.name), age: typeof row.age === "number" ? row.age : null, health: optional(row.health) as string | null, distinctions: optional(row.distinctions) as string | null, traits: optional(row.traits) as string | null, mutations: optional(row.mutations) as string | null, status: row.status === "dead" ? "dead" : "alive", notes: optional(row.notes) as string | null, updatedAt: str(entityById.get(str(row.entity_id))?.updated_at) })),
      places: placeRows.map((row) => ({ entityId: str(row.entity_id), name: str(entityById.get(str(row.entity_id))?.name), status: optional(row.status) as string | null, lastChapterId: optional(row.last_chapter_id) as string | null, updatedAt: str(entityById.get(str(row.entity_id))?.updated_at) })),
      items: itemRows.map((row) => ({ entityId: str(row.entity_id), name: str(entityById.get(str(row.entity_id))?.name), status: optional(row.status) as string | null, power: optional(row.power) as string | null, wielderEntityId: optional(row.wielder_entity_id) as string | null, manualWielderName: optional(row.manual_wielder_name) as string | null, updatedAt: str(entityById.get(str(row.entity_id))?.updated_at) })),
      customEntityTypes: typeRows.map((row) => ({ id: str(row.id), worldId, name: str(row.name), position: number(row.position), attributes: attributeRows.filter((attribute) => attribute.entity_type_id === row.id).map((attribute) => ({ id: str(attribute.id), entityTypeId: str(attribute.entity_type_id), name: str(attribute.name), fieldType: attribute.field_type as "text" | "number" | "boolean" | "date" | "select" | "multiselect", required: attribute.required === true, position: number(attribute.position), options: Array.isArray(attribute.options) ? attribute.options as string[] : null })) })),
      customEntities: customRows.map((row) => ({ entityId: str(row.entity_id), name: str(entityById.get(str(row.entity_id))?.name), entityTypeId: str(row.entity_type_id), attributes: (row.attributes ?? {}) as Record<string, unknown>, updatedAt: str(entityById.get(str(row.entity_id))?.updated_at) })),
      relationships: relationshipRows.map((row) => ({ id: str(row.id), entityAId: str(row.entity_a_id), entityAName: str(entityById.get(str(row.entity_a_id))?.name), entityBId: str(row.entity_b_id), entityBName: str(entityById.get(str(row.entity_b_id))?.name), relationshipType: str(row.relationship_type), sentiment: number(row.sentiment) })),
      chapterPoints: chapterPointRows.map((row) => ({ chapterId: str(row.chapter_id), chapterName: str(chapterById.get(str(row.chapter_id))?.name), point: { id: str(row.id), chapterId: str(row.chapter_id), content: str(row.content), position: number(row.position) } })),
      characterTimelinePoints: timelinePointRows.map((row) => { const timeline = timelineById.get(str(row.timeline_id)); const characterEntityId = str(timeline?.character_entity_id); return { characterEntityId, characterName: str(entityById.get(characterEntityId)?.name), point: { id: str(row.id), timelineId: str(row.timeline_id), content: str(row.content), position: number(row.position), chapterId: optional(row.chapter_id) as string | null } }; }),
    };
    if (Buffer.byteLength(JSON.stringify(context)) > MAX_CONTEXT_BYTES) throw tooLarge();
    return context;
  }
}
