import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Character,
  CharacterTimeline,
  CharacterTimelinePoint,
  CustomEntity,
  CustomEntityAttribute,
  CustomEntityType,
  Item,
  Place,
  Relationship,
} from "@/src/lib/api/generated";
import type {
  CharacterRepository,
  CharacterTimelineRepository,
  CustomEntityTypeRepository,
  ItemRepository,
  PlaceRepository,
  RelationshipRepository,
} from "./types";

type Row = Record<string, unknown>;

const s = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;
const n = (v: unknown): number | undefined =>
  typeof v === "number" ? v : undefined;
const b = (v: unknown): boolean | undefined =>
  typeof v === "boolean" ? v : undefined;
const snull = (v: unknown): string | null | undefined =>
  v === null ? null : typeof v === "string" ? v : undefined;

function joinedName(r: Row): string | undefined {
  const we = r.world_entities as
    | { name?: unknown }
    | { name?: unknown }[]
    | null
    | undefined;
  const pick = (o: { name?: unknown } | null | undefined) => s(o?.name);
  return Array.isArray(we) ? pick(we[0]) : pick(we);
}

function joinedUpdatedAt(r: Row): string | undefined {
  const we = r.world_entities as
    | { updated_at?: unknown }
    | { updated_at?: unknown }[]
    | null
    | undefined;
  const pick = (o: { updated_at?: unknown } | null | undefined) =>
    s(o?.updated_at);
  return Array.isArray(we) ? pick(we[0]) : pick(we);
}

function firstErr(error: { message?: string } | null) {
  if (error) throw new Error(error.message ?? "Supabase error");
}

function rpcId(data: unknown): string {
  const id = s(data);
  if (!id) throw new Error("Atomic entity write did not return an id");
  return id;
}

// ---------- Character ----------
function toCharacter(r: Row): Character {
  return {
    entityId: s(r.entity_id),
    name: joinedName(r) ?? "",
    age: n(r.age),
    health: s(r.health),
    distinctions: s(r.distinctions),
    traits: s(r.traits),
    mutations: s(r.mutations),
    status: (s(r.status) ?? "alive") as Character["status"],
    notes: s(r.notes),
    updatedAt: joinedUpdatedAt(r),
  };
}

const CHARACTER_SELECT =
  "entity_id,age,health,distinctions,traits,mutations,status,notes,world_entities(name,world_id,updated_at)";

export class CharacterRepositoryImpl implements CharacterRepository {
  constructor(private supabase: SupabaseClient) {}
  private rows(worldId: string) {
    return this.supabase
      .from("characters")
      .select(CHARACTER_SELECT)
      .eq("world_entities.world_id", worldId);
  }
  async list(worldId: string): Promise<Character[]> {
    // RLS already scopes to the owner; filter by world via the joined row.
    const { data, error } = await this.supabase
      .from("characters")
      .select(CHARACTER_SELECT);
    firstErr(error);
    return ((data ?? []) as Row[])
      .filter((r) => {
        const we = r.world_entities as { world_id?: unknown } | { world_id?: unknown }[] | null;
        const wid = Array.isArray(we) ? we[0]?.world_id : we?.world_id;
        return wid === worldId;
      })
      .map(toCharacter);
  }
  // NOTE: PostgREST cannot filter a nested resource's columns reliably,
  // so list fetches visible rows and narrows by world_id client-side.
  // (Owner scoping is enforced by RLS; this only filters by the requested world.)
  async get(entityId: string): Promise<Character | null> {
    const { data, error } = await this.supabase
      .from("characters")
      .select(CHARACTER_SELECT)
      .eq("entity_id", entityId)
      .maybeSingle();
    firstErr(error);
    return data ? toCharacter(data as Row) : null;
  }
  async create(
    worldId: string,
    input: Omit<Character, "entityId">,
  ): Promise<Character> {
    const { data, error } = await this.supabase.rpc(
      "create_world_entity_atomic",
      {
        target_world_id: worldId,
        target_kind: "character",
        target_name: input.name,
        subtype_data: {
          age: input.age ?? null,
          health: input.health ?? null,
          distinctions: input.distinctions ?? null,
          traits: input.traits ?? null,
          mutations: input.mutations ?? null,
          status: input.status ?? "alive",
          notes: input.notes ?? null,
        },
      },
    );
    firstErr(error);
    const created = await this.get(rpcId(data));
    if (!created) throw new Error("Created character could not be loaded");
    return created;
  }
  async update(
    entityId: string,
    patch: Partial<Omit<Character, "entityId">>,
  ): Promise<Character> {
    const { data, error } = await this.supabase.rpc(
      "update_world_entity_atomic",
      { target_entity_id: entityId, patch },
    );
    firstErr(error);
    rpcId(data);
    const updated = await this.get(entityId);
    if (!updated) throw new Error("Updated character could not be loaded");
    return updated;
  }
  async remove(entityId: string): Promise<void> {
    const { error } = await this.supabase
      .from("world_entities")
      .delete()
      .eq("id", entityId);
    firstErr(error);
  }
}

// ---------- Place ----------
function toPlace(r: Row): Place {
  return {
    entityId: s(r.entity_id),
    name: joinedName(r) ?? "",
    status: s(r.status),
    lastChapterId: snull(r.last_chapter_id),
    updatedAt: joinedUpdatedAt(r),
  };
}

const PLACE_SELECT =
  "entity_id,status,last_chapter_id,world_entities(name,world_id,updated_at)";

export class PlaceRepositoryImpl implements PlaceRepository {
  constructor(private supabase: SupabaseClient) {}
  async list(worldId: string): Promise<Place[]> {
    const { data, error } = await this.supabase
      .from("places")
      .select(PLACE_SELECT);
    firstErr(error);
    return ((data ?? []) as Row[])
      .filter((r) => {
        const we = r.world_entities as { world_id?: unknown } | { world_id?: unknown }[] | null;
        const wid = Array.isArray(we) ? we[0]?.world_id : we?.world_id;
        return wid === worldId;
      })
      .map(toPlace);
  }
  async get(entityId: string): Promise<Place | null> {
    const { data, error } = await this.supabase
      .from("places")
      .select(PLACE_SELECT)
      .eq("entity_id", entityId)
      .maybeSingle();
    firstErr(error);
    return data ? toPlace(data as Row) : null;
  }
  async create(worldId: string, input: Omit<Place, "entityId">): Promise<Place> {
    const { data, error } = await this.supabase.rpc(
      "create_world_entity_atomic",
      {
        target_world_id: worldId,
        target_kind: "place",
        target_name: input.name,
        subtype_data: {
          status: input.status ?? null,
          lastChapterId: input.lastChapterId ?? null,
        },
      },
    );
    firstErr(error);
    const created = await this.get(rpcId(data));
    if (!created) throw new Error("Created place could not be loaded");
    return created;
  }
  async update(
    entityId: string,
    patch: Partial<Omit<Place, "entityId">>,
  ): Promise<Place> {
    const { data, error } = await this.supabase.rpc(
      "update_world_entity_atomic",
      { target_entity_id: entityId, patch },
    );
    firstErr(error);
    rpcId(data);
    const updated = await this.get(entityId);
    if (!updated) throw new Error("Updated place could not be loaded");
    return updated;
  }
  async remove(entityId: string): Promise<void> {
    const { error } = await this.supabase
      .from("world_entities")
      .delete()
      .eq("id", entityId);
    firstErr(error);
  }
}

// ---------- Item ----------
function toItem(r: Row): Item {
  return {
    entityId: s(r.entity_id),
    name: joinedName(r) ?? "",
    status: s(r.status),
    power: s(r.power),
    wielderEntityId: snull(r.wielder_entity_id),
    manualWielderName: snull(r.manual_wielder_name),
    updatedAt: joinedUpdatedAt(r),
  };
}

const ITEM_SELECT =
  "entity_id,status,power,wielder_entity_id,manual_wielder_name,world_entities(name,world_id,updated_at)";

export class ItemRepositoryImpl implements ItemRepository {
  constructor(private supabase: SupabaseClient) {}
  async list(worldId: string): Promise<Item[]> {
    const { data, error } = await this.supabase.from("items").select(ITEM_SELECT);
    firstErr(error);
    return ((data ?? []) as Row[])
      .filter((r) => {
        const we = r.world_entities as { world_id?: unknown } | { world_id?: unknown }[] | null;
        const wid = Array.isArray(we) ? we[0]?.world_id : we?.world_id;
        return wid === worldId;
      })
      .map(toItem);
  }
  async get(entityId: string): Promise<Item | null> {
    const { data, error } = await this.supabase
      .from("items")
      .select(ITEM_SELECT)
      .eq("entity_id", entityId)
      .maybeSingle();
    firstErr(error);
    return data ? toItem(data as Row) : null;
  }
  async create(worldId: string, input: Omit<Item, "entityId">): Promise<Item> {
    const { data, error } = await this.supabase.rpc(
      "create_world_entity_atomic",
      {
        target_world_id: worldId,
        target_kind: "item",
        target_name: input.name,
        subtype_data: {
          status: input.status ?? null,
          power: input.power ?? null,
          wielderEntityId: input.wielderEntityId ?? null,
          manualWielderName: input.manualWielderName ?? null,
        },
      },
    );
    firstErr(error);
    const created = await this.get(rpcId(data));
    if (!created) throw new Error("Created item could not be loaded");
    return created;
  }
  async update(
    entityId: string,
    patch: Partial<Omit<Item, "entityId">>,
  ): Promise<Item> {
    const { data, error } = await this.supabase.rpc(
      "update_world_entity_atomic",
      { target_entity_id: entityId, patch },
    );
    firstErr(error);
    rpcId(data);
    const updated = await this.get(entityId);
    if (!updated) throw new Error("Updated item could not be loaded");
    return updated;
  }
  async remove(entityId: string): Promise<void> {
    const { error } = await this.supabase
      .from("world_entities")
      .delete()
      .eq("id", entityId);
    firstErr(error);
  }
}

// ---------- Custom entity types + entities ----------
function toType(r: Row): CustomEntityType {
  return {
    id: s(r.id),
    worldId: s(r.world_id),
    name: s(r.name),
    position: n(r.position),
    updatedAt: s(r.updated_at),
  };
}
function toAttr(r: Row): CustomEntityAttribute {
  return {
    id: s(r.id),
    entityTypeId: s(r.entity_type_id),
    name: s(r.name),
    fieldType: s(r.field_type) as CustomEntityAttribute["fieldType"],
    required: b(r.required),
    position: n(r.position),
    options: Array.isArray(r.options) ? (r.options as string[]) : r.options === null ? null : undefined,
  };
}
function toCustomEntity(r: Row): CustomEntity {
  return {
    entityId: s(r.entity_id),
    name: joinedName(r) ?? "",
    entityTypeId: s(r.entity_type_id),
    attributes: (r.attributes ?? {}) as CustomEntity["attributes"],
    updatedAt: joinedUpdatedAt(r),
  };
}

const CUSTOM_ENTITY_SELECT =
  "entity_id,entity_type_id,attributes,world_entities(name,world_id,updated_at)";

export class CustomEntityTypeRepositoryImpl implements CustomEntityTypeRepository {
  constructor(private supabase: SupabaseClient) {}
  async list(worldId: string): Promise<CustomEntityType[]> {
    const { data, error } = await this.supabase
      .from("custom_entity_types")
      .select("*")
      .eq("world_id", worldId)
      .order("position", { ascending: true });
    firstErr(error);
    return ((data ?? []) as Row[]).map(toType);
  }
  async get(id: string): Promise<CustomEntityType | null> {
    const { data, error } = await this.supabase
      .from("custom_entity_types")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    firstErr(error);
    return data ? toType(data as Row) : null;
  }
  async create(worldId: string, name: string, position?: number): Promise<CustomEntityType> {
    const { data, error } = await this.supabase
      .from("custom_entity_types")
      .insert({ world_id: worldId, name, position: position ?? 0 })
      .select()
      .single();
    firstErr(error);
    return toType(data as Row);
  }
  async update(id: string, patch: Partial<Pick<CustomEntityType, "name" | "position">>): Promise<CustomEntityType> {
    const { data, error } = await this.supabase
      .from("custom_entity_types")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    firstErr(error);
    return toType(data as Row);
  }
  async remove(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("custom_entity_types")
      .delete()
      .eq("id", id);
    firstErr(error);
  }
  async listAttributes(typeId: string): Promise<CustomEntityAttribute[]> {
    const { data, error } = await this.supabase
      .from("custom_entity_attributes")
      .select("*")
      .eq("entity_type_id", typeId)
      .order("position", { ascending: true });
    firstErr(error);
    return ((data ?? []) as Row[]).map(toAttr);
  }
  async addAttribute(typeId: string, input: Omit<CustomEntityAttribute, "id" | "entityTypeId">): Promise<CustomEntityAttribute> {
    const { data, error } = await this.supabase
      .from("custom_entity_attributes")
      .insert({
        entity_type_id: typeId,
        name: input.name,
        field_type: input.fieldType,
        required: input.required ?? false,
        position: input.position ?? 0,
        options: input.options ?? null,
      })
      .select()
      .single();
    firstErr(error);
    return toAttr(data as Row);
  }
  async listEntities(worldId: string): Promise<CustomEntity[]> {
    const { data, error } = await this.supabase
      .from("custom_entities")
      .select(CUSTOM_ENTITY_SELECT);
    firstErr(error);
    return ((data ?? []) as Row[])
      .filter((r) => {
        const we = r.world_entities as { world_id?: unknown } | { world_id?: unknown }[] | null;
        const wid = Array.isArray(we) ? we[0]?.world_id : we?.world_id;
        return wid === worldId;
      })
      .map(toCustomEntity);
  }
  async createEntity(worldId: string, entityTypeId: string, name: string, attributes?: Record<string, unknown>): Promise<CustomEntity> {
    const { data, error } = await this.supabase.rpc(
      "create_world_entity_atomic",
      {
        target_world_id: worldId,
        target_kind: "custom",
        target_name: name,
        subtype_data: {
          entityTypeId,
          attributes: attributes ?? {},
        },
      },
    );
    firstErr(error);
    const id = rpcId(data);
    const created = (await this.listEntities(worldId)).find(
      (entity) => entity.entityId === id,
    );
    if (!created) throw new Error("Created custom entity could not be loaded");
    return created;
  }
  async updateEntity(entityId: string, patch: Partial<Pick<CustomEntity, "name" | "attributes">>): Promise<CustomEntity> {
    const { data, error } = await this.supabase.rpc(
      "update_world_entity_atomic",
      { target_entity_id: entityId, patch },
    );
    firstErr(error);
    rpcId(data);
    const { data: row, error: loadError } = await this.supabase
      .from("custom_entities")
      .select(CUSTOM_ENTITY_SELECT)
      .eq("entity_id", entityId)
      .single();
    firstErr(loadError);
    return toCustomEntity(row as Row);
  }
  async removeEntity(entityId: string): Promise<void> {
    const { error } = await this.supabase
      .from("world_entities")
      .delete()
      .eq("id", entityId);
    firstErr(error);
  }
}

// ---------- Relationship ----------
function toRelationship(r: Row): Relationship {
  return {
    id: s(r.id),
    worldId: s(r.world_id),
    entityAId: s(r.entity_a_id),
    entityBId: s(r.entity_b_id),
    relationshipType: s(r.relationship_type),
    sentiment: n(r.sentiment),
  };
}

export class RelationshipRepositoryImpl implements RelationshipRepository {
  constructor(private supabase: SupabaseClient) {}
  async list(worldId: string): Promise<Relationship[]> {
    const { data, error } = await this.supabase
      .from("entity_relationships")
      .select("*")
      .eq("world_id", worldId);
    firstErr(error);
    return ((data ?? []) as Row[]).map(toRelationship);
  }
  async get(id: string): Promise<Relationship | null> {
    const { data, error } = await this.supabase
      .from("entity_relationships")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    firstErr(error);
    return data ? toRelationship(data as Row) : null;
  }
  async create(worldId: string, input: { entityAId: string; entityBId: string; relationshipType: string; sentiment?: number }): Promise<Relationship> {
    let a = input.entityAId;
    let b2 = input.entityBId;
    if (a > b2) [a, b2] = [b2, a];
    const { data, error } = await this.supabase
      .from("entity_relationships")
      .insert({
        world_id: worldId,
        entity_a_id: a,
        entity_b_id: b2,
        relationship_type: input.relationshipType,
        sentiment: input.sentiment ?? 50,
      })
      .select()
      .single();
    firstErr(error);
    return toRelationship(data as Row);
  }
  async update(id: string, patch: Partial<Pick<Relationship, "relationshipType" | "sentiment">>): Promise<Relationship> {
    const rest: Record<string, unknown> = {};
    if (patch.relationshipType !== undefined) rest.relationship_type = patch.relationshipType;
    if (patch.sentiment !== undefined) rest.sentiment = patch.sentiment;
    const { data, error } = await this.supabase
      .from("entity_relationships")
      .update(rest)
      .eq("id", id)
      .select()
      .single();
    firstErr(error);
    return toRelationship(data as Row);
  }
  async remove(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("entity_relationships")
      .delete()
      .eq("id", id);
    firstErr(error);
  }
}

// ---------- Character timelines ----------
function toTimeline(r: Row): CharacterTimeline {
  return { id: s(r.id), characterEntityId: s(r.character_entity_id), bookId: s(r.book_id) };
}
function toTimelinePoint(r: Row): CharacterTimelinePoint {
  return {
    id: s(r.id),
    timelineId: s(r.timeline_id),
    content: s(r.content),
    position: n(r.position),
    chapterId: snull(r.chapter_id),
  };
}

export class CharacterTimelineRepositoryImpl implements CharacterTimelineRepository {
  constructor(private supabase: SupabaseClient) {}
  async list(characterEntityId: string): Promise<CharacterTimeline[]> {
    const { data, error } = await this.supabase
      .from("character_book_timelines")
      .select("*")
      .eq("character_entity_id", characterEntityId);
    firstErr(error);
    return ((data ?? []) as Row[]).map(toTimeline);
  }
  async create(characterEntityId: string, bookId: string): Promise<CharacterTimeline> {
    const { data, error } = await this.supabase
      .from("character_book_timelines")
      .insert({ character_entity_id: characterEntityId, book_id: bookId })
      .select()
      .single();
    firstErr(error);
    return toTimeline(data as Row);
  }
  async listPoints(timelineId: string): Promise<CharacterTimelinePoint[]> {
    const { data, error } = await this.supabase
      .from("character_timeline_points")
      .select("*")
      .eq("timeline_id", timelineId)
      .order("position", { ascending: true });
    firstErr(error);
    return ((data ?? []) as Row[]).map(toTimelinePoint);
  }
  async addPoint(timelineId: string, content: string, chapterId?: string | null): Promise<CharacterTimelinePoint> {
    const existing = await this.listPoints(timelineId);
    const { data, error } = await this.supabase
      .from("character_timeline_points")
      .insert({ timeline_id: timelineId, content, position: existing.length, chapter_id: chapterId ?? null })
      .select()
      .single();
    firstErr(error);
    return toTimelinePoint(data as Row);
  }
  async removePoint(pointId: string): Promise<void> {
    const { error } = await this.supabase
      .from("character_timeline_points")
      .delete()
      .eq("id", pointId);
    firstErr(error);
  }
}
