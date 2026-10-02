import type {
  Book,
  Chapter,
  ChapterImportantPoint,
  Character,
  CharacterTimeline,
  CharacterTimelinePoint,
  CustomEntity,
  CustomEntityAttribute,
  CustomEntityType,
  Item,
  Place,
  Profile,
  Relationship,
  World,
} from "@/src/lib/api/generated";

export interface WorldRepository {
  list(userId: string): Promise<World[]>;
  get(id: string): Promise<World | null>;
  create(userId: string, name: string): Promise<World>;
  update(id: string, patch: Partial<Pick<World, "name">>): Promise<World>;
  remove(id: string): Promise<void>;
  touchOpened(id: string): Promise<World>;
}

export interface BookRepository {
  list(worldId: string): Promise<Book[]>;
  get(id: string): Promise<Book | null>;
  create(worldId: string, name: string): Promise<Book>;
  update(id: string, patch: Partial<Pick<Book, "name">>): Promise<Book>;
  remove(id: string): Promise<void>;
  touchOpened(id: string): Promise<Book>;
}

export interface ChapterRepository {
  list(bookId: string): Promise<Chapter[]>;
  get(id: string): Promise<Chapter | null>;
  create(bookId: string, name: string): Promise<Chapter>;
  update(
    id: string,
    patch: Partial<Pick<Chapter, "name" | "content">>,
  ): Promise<Chapter>;
  remove(id: string): Promise<void>;
  move(id: string, direction: "up" | "down"): Promise<Chapter[]>;
  listPoints(chapterId: string): Promise<ChapterImportantPoint[]>;
  addPoint(chapterId: string, content: string): Promise<ChapterImportantPoint>;
  removePoint(pointId: string): Promise<void>;
}

export interface CharacterRepository {
  list(worldId: string): Promise<Character[]>;
  get(entityId: string): Promise<Character | null>;
  create(worldId: string, input: Omit<Character, "entityId">): Promise<Character>;
  update(
    entityId: string,
    patch: Partial<Omit<Character, "entityId">>,
  ): Promise<Character>;
  remove(entityId: string): Promise<void>;
}

export interface PlaceRepository {
  list(worldId: string): Promise<Place[]>;
  get(entityId: string): Promise<Place | null>;
  create(worldId: string, input: Omit<Place, "entityId">): Promise<Place>;
  update(
    entityId: string,
    patch: Partial<Omit<Place, "entityId">>,
  ): Promise<Place>;
  remove(entityId: string): Promise<void>;
}

export interface ItemRepository {
  list(worldId: string): Promise<Item[]>;
  get(entityId: string): Promise<Item | null>;
  create(worldId: string, input: Omit<Item, "entityId">): Promise<Item>;
  update(
    entityId: string,
    patch: Partial<Omit<Item, "entityId">>,
  ): Promise<Item>;
  remove(entityId: string): Promise<void>;
}

export interface CustomEntityTypeRepository {
  list(worldId: string): Promise<CustomEntityType[]>;
  get(id: string): Promise<CustomEntityType | null>;
  create(worldId: string, name: string, position?: number): Promise<CustomEntityType>;
  update(
    id: string,
    patch: Partial<Pick<CustomEntityType, "name" | "position">>,
  ): Promise<CustomEntityType>;
  remove(id: string): Promise<void>;
  listAttributes(typeId: string): Promise<CustomEntityAttribute[]>;
  addAttribute(
    typeId: string,
    input: Omit<CustomEntityAttribute, "id" | "entityTypeId">,
  ): Promise<CustomEntityAttribute>;
  listEntities(worldId: string): Promise<CustomEntity[]>;
  createEntity(
    worldId: string,
    entityTypeId: string,
    name: string,
    attributes?: Record<string, unknown>,
  ): Promise<CustomEntity>;
  updateEntity(
    entityId: string,
    patch: Partial<Pick<CustomEntity, "name" | "attributes">>,
  ): Promise<CustomEntity>;
  removeEntity(entityId: string): Promise<void>;
}

export interface RelationshipRepository {
  list(worldId: string): Promise<Relationship[]>;
  get(id: string): Promise<Relationship | null>;
  create(
    worldId: string,
    input: { entityAId: string; entityBId: string; relationshipType: string; sentiment?: number },
  ): Promise<Relationship>;
  update(
    id: string,
    patch: Partial<Pick<Relationship, "relationshipType" | "sentiment">>,
  ): Promise<Relationship>;
  remove(id: string): Promise<void>;
}

export interface CharacterTimelineRepository {
  list(characterEntityId: string): Promise<CharacterTimeline[]>;
  create(characterEntityId: string, bookId: string): Promise<CharacterTimeline>;
  listPoints(timelineId: string): Promise<CharacterTimelinePoint[]>;
  addPoint(
    timelineId: string,
    content: string,
    chapterId?: string | null,
  ): Promise<CharacterTimelinePoint>;
  removePoint(pointId: string): Promise<void>;
}

export interface ProfileRepository {
  me(userId: string): Promise<Profile | null>;
  update(
    userId: string,
    patch: Partial<Pick<Profile, "username" | "userId">>,
  ): Promise<Profile>;
}
