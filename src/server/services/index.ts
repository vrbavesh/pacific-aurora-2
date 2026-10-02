import type {
  CustomEntityAttribute,
  CustomEntityType,
} from "@/src/lib/api/generated";
import { ownedOr404 } from "../ownership";
import type {
  BookRepository,
  ChapterRepository,
  CharacterRepository,
  CharacterTimelineRepository,
  CustomEntityTypeRepository,
  ItemRepository,
  PlaceRepository,
  ProfileRepository,
  RelationshipRepository,
  WorldRepository,
} from "../repositories/types";

function owned<T>(p: Promise<T | null>): Promise<T> {
  return p.then(ownedOr404);
}

export const worldService = (repo: WorldRepository) => ({
  list: (userId: string) => repo.list(userId),
  get: (id: string) => owned(repo.get(id)),
  create: (userId: string, name: string) => repo.create(userId, name),
  update: async (id: string, patch: { name?: string }) => {
    await owned(repo.get(id));
    return repo.update(id, patch);
  },
  remove: async (id: string) => {
    await owned(repo.get(id));
    return repo.remove(id);
  },
  touchOpened: async (id: string) => {
    await owned(repo.get(id));
    return repo.touchOpened(id);
  },
});

export const bookService = (repo: BookRepository) => ({
  list: (worldId: string) => repo.list(worldId),
  get: (id: string) => owned(repo.get(id)),
  create: (worldId: string, name: string) => repo.create(worldId, name),
  update: async (id: string, patch: { name?: string }) => {
    await owned(repo.get(id));
    return repo.update(id, patch);
  },
  remove: async (id: string) => {
    await owned(repo.get(id));
    return repo.remove(id);
  },
  touchOpened: async (id: string) => {
    await owned(repo.get(id));
    return repo.touchOpened(id);
  },
});

export const chapterService = (repo: ChapterRepository) => ({
  list: (bookId: string) => repo.list(bookId),
  get: (id: string) => owned(repo.get(id)),
  create: (bookId: string, name: string) => repo.create(bookId, name),
  update: async (id: string, patch: { name?: string; content?: object }) => {
    await owned(repo.get(id));
    return repo.update(id, patch as never);
  },
  remove: async (id: string) => {
    await owned(repo.get(id));
    return repo.remove(id);
  },
  move: async (id: string, direction: "up" | "down") => {
    await owned(repo.get(id));
    return repo.move(id, direction);
  },
  listPoints: (chapterId: string) => repo.listPoints(chapterId),
  addPoint: (chapterId: string, content: string) => repo.addPoint(chapterId, content),
  removePoint: (pointId: string) => repo.removePoint(pointId),
});

export const characterService = (repo: CharacterRepository) => ({
  list: (worldId: string) => repo.list(worldId),
  get: (entityId: string) => owned(repo.get(entityId)),
  create: (worldId: string, input: Parameters<CharacterRepository["create"]>[1]) =>
    repo.create(worldId, input),
  update: async (
    entityId: string,
    patch: Parameters<CharacterRepository["update"]>[1],
  ) => {
    await owned(repo.get(entityId));
    return repo.update(entityId, patch);
  },
  remove: async (entityId: string) => {
    await owned(repo.get(entityId));
    return repo.remove(entityId);
  },
});

export const placeService = (repo: PlaceRepository) => ({
  list: (worldId: string) => repo.list(worldId),
  get: (entityId: string) => owned(repo.get(entityId)),
  create: (worldId: string, input: Parameters<PlaceRepository["create"]>[1]) =>
    repo.create(worldId, input),
  update: async (entityId: string, patch: Parameters<PlaceRepository["update"]>[1]) => {
    await owned(repo.get(entityId));
    return repo.update(entityId, patch);
  },
  remove: async (entityId: string) => {
    await owned(repo.get(entityId));
    return repo.remove(entityId);
  },
});

export const itemService = (repo: ItemRepository) => ({
  list: (worldId: string) => repo.list(worldId),
  get: (entityId: string) => owned(repo.get(entityId)),
  create: (worldId: string, input: Parameters<ItemRepository["create"]>[1]) =>
    repo.create(worldId, input),
  update: async (entityId: string, patch: Parameters<ItemRepository["update"]>[1]) => {
    await owned(repo.get(entityId));
    return repo.update(entityId, patch);
  },
  remove: async (entityId: string) => {
    await owned(repo.get(entityId));
    return repo.remove(entityId);
  },
});

export const customEntityTypeService = (repo: CustomEntityTypeRepository) => ({
  list: (worldId: string) => repo.list(worldId),
  get: (id: string) => owned(repo.get(id)),
  create: (worldId: string, name: string, position?: number) =>
    repo.create(worldId, name, position),
  update: async (
    id: string,
    patch: Partial<Pick<CustomEntityType, "name" | "position">>,
  ) => {
    await owned(repo.get(id));
    return repo.update(id, patch);
  },
  remove: async (id: string) => {
    await owned(repo.get(id));
    return repo.remove(id);
  },
  listAttributes: (typeId: string) => repo.listAttributes(typeId),
  addAttribute: (
    typeId: string,
    input: Omit<CustomEntityAttribute, "id" | "entityTypeId">,
  ) => repo.addAttribute(typeId, input),
  listEntities: (worldId: string) => repo.listEntities(worldId),
  createEntity: (
    worldId: string,
    entityTypeId: string,
    name: string,
    attributes?: Record<string, unknown>,
  ) => repo.createEntity(worldId, entityTypeId, name, attributes),
  updateEntity: async (
    entityId: string,
    patch: { name?: string; attributes?: Record<string, unknown> },
  ) => {
    return repo.updateEntity(entityId, patch as never);
  },
  removeEntity: async (entityId: string) => {
    return repo.removeEntity(entityId);
  },
});

export const relationshipService = (repo: RelationshipRepository) => ({
  list: (worldId: string) => repo.list(worldId),
  get: (id: string) => owned(repo.get(id)),
  create: (
    worldId: string,
    input: Parameters<RelationshipRepository["create"]>[1],
  ) => repo.create(worldId, input),
  update: async (
    id: string,
    patch: Parameters<RelationshipRepository["update"]>[1],
  ) => {
    await owned(repo.get(id));
    return repo.update(id, patch);
  },
  remove: async (id: string) => {
    await owned(repo.get(id));
    return repo.remove(id);
  },
});

export const characterTimelineService = (repo: CharacterTimelineRepository) => ({
  list: (characterEntityId: string) => repo.list(characterEntityId),
  create: (characterEntityId: string, bookId: string) =>
    repo.create(characterEntityId, bookId),
  listPoints: (timelineId: string) => repo.listPoints(timelineId),
  addPoint: (timelineId: string, content: string, chapterId?: string | null) =>
    repo.addPoint(timelineId, content, chapterId),
  removePoint: (pointId: string) => repo.removePoint(pointId),
});

export const profileService = (repo: ProfileRepository) => ({
  me: async (userId: string) => ownedOr404(await repo.me(userId)),
  update: (userId: string, patch: Parameters<ProfileRepository["update"]>[1]) =>
    repo.update(userId, patch),
});
