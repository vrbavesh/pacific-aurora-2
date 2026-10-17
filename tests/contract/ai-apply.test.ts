import { randomUUID } from "node:crypto";
import { expect, test, vi } from "vitest";
import type { AiSuggestion, AiWorldContext } from "@/src/lib/api/generated";
import { applySuggestion } from "@/src/server/services/ai-apply";
import { validateSuccessResponse } from "@/src/lib/api/response-validation";
import { InMemoryAiStateStore } from "@/tests/helpers/in-memory";

const version = "2026-10-15T00:00:00Z";
const context: AiWorldContext = {
  world: { id: "world-1", name: "North" },
  characters: [{ entityId: "character-1", name: "Mara", updatedAt: version }],
  places: [{ entityId: "place-1", name: "Gate", updatedAt: version }],
  items: [{ entityId: "item-1", name: "Key", updatedAt: version }],
  customEntityTypes: [{ id: "type-1", name: "Factions", attributes: [
    { id: "attribute-1", name: "Motto", fieldType: "text", required: true },
  ] }],
  customEntities: [{ entityId: "custom-1", name: "Guard", entityTypeId: "type-1", attributes: { "attribute-1": "Old" }, updatedAt: version }],
  relationships: [], chapterPoints: [], characterTimelinePoints: [],
};
const snapshot = async () => context;
const base = { suggestionId: randomUUID(), summary: "Review this", sourceExcerpt: null };
const cards: AiSuggestion[] = [
  { ...base, kind: "character", action: "create", targetEntityId: null, expectedTargetUpdatedAt: null, changes: { name: "New character" } },
  { ...base, kind: "character", action: "update", targetEntityId: "character-1", expectedTargetUpdatedAt: version, changes: { notes: "A secret" } },
  { ...base, kind: "place", action: "create", targetEntityId: null, expectedTargetUpdatedAt: null, changes: { name: "New place", lastChapterId: "chapter-1" } },
  { ...base, kind: "place", action: "update", targetEntityId: "place-1", expectedTargetUpdatedAt: version, changes: { status: "Closed" } },
  { ...base, kind: "item", action: "create", targetEntityId: null, expectedTargetUpdatedAt: null, changes: { name: "New item", wielderEntityId: "character-1" } },
  { ...base, kind: "item", action: "update", targetEntityId: "item-1", expectedTargetUpdatedAt: version, changes: { power: "Light" } },
  { ...base, kind: "custom_entity", action: "create", entityTypeId: "type-1", targetEntityId: null, expectedTargetUpdatedAt: null, changes: { name: "New faction", attributes: { "attribute-1": "Dawn" } } },
  { ...base, kind: "custom_entity", action: "update", entityTypeId: "type-1", targetEntityId: "custom-1", expectedTargetUpdatedAt: version, changes: { attributes: { "attribute-1": "New" } } },
  { ...base, kind: "chapter_point", action: "add_point", chapterId: "chapter-1", changes: { content: "A point" } },
  { ...base, kind: "character_timeline_point", action: "add_point", characterEntityId: "character-1", chapterId: "chapter-1", changes: { content: "A memory" } },
];

test("every supported card kind produces one typed apply result", async () => {
  const write = vi.fn().mockResolvedValue("resource-1");
  for (const card of cards) {
    const result = await applySuggestion("book-1", "chapter-1", { suggestion: card }, { snapshot }, { apply: write });
    expect(result).toEqual({ suggestionId: card.suggestionId, kind: card.kind, resourceId: "resource-1" });
    expect(validateSuccessResponse("/api/books/book-1/chapters/chapter-1/ai-suggestions/apply", "POST", { data: result }))
      .toMatchObject({ data: { kind: card.kind } });
  }
  expect(write).toHaveBeenCalledTimes(cards.length);
});

test("foreign, stale, unknown-field, and invalid custom-attribute cards never reach the write", async () => {
  const write = vi.fn();
  const attempt = (card: unknown) => applySuggestion("book-1", "chapter-1", { suggestion: card }, { snapshot }, { apply: write });
  await expect(attempt({ ...cards[1], targetEntityId: "foreign" })).rejects.toMatchObject({ status: 404 });
  await expect(attempt({ ...cards[1], expectedTargetUpdatedAt: "2026-10-14T00:00:00Z" })).rejects.toMatchObject({ status: 409 });
  await expect(attempt({ ...cards[6], changes: { name: "Bad", attributes: { foreign: "value" } } })).rejects.toMatchObject({ status: 422 });
  await expect(attempt({ ...cards[8], changes: { content: "A point", sql: "drop table" } })).rejects.toMatchObject({ status: 422 });
  await expect(attempt({ ...cards[9], characterEntityId: "foreign" })).rejects.toMatchObject({ status: 404 });
  expect(write).not.toHaveBeenCalled();
});

test("receipt-backed replay returns the original resource and failed writes leave no receipt", async () => {
  const store = new InMemoryAiStateStore();
  store.registerChapter("owner", "book-1", "chapter-1", 0);
  let writes = 0;
  const repository = { apply: (_book: string, chapter: string, card: AiSuggestion) =>
    store.applyOnce("owner", chapter, card.suggestionId, card.kind, async () => {
      writes += 1;
      return "resource-1";
    }) };
  const card = { ...cards[8], suggestionId: randomUUID() } as AiSuggestion;
  await applySuggestion("book-1", "chapter-1", { suggestion: card }, { snapshot }, repository);
  await applySuggestion("book-1", "chapter-1", { suggestion: card }, { snapshot }, repository);
  expect(writes).toBe(1);
  const failure = { apply: (_book: string, chapter: string, next: AiSuggestion) =>
    store.applyOnce("owner", chapter, next.suggestionId, next.kind, async () => { throw new Error("write failed"); }) };
  await expect(applySuggestion("book-1", "chapter-1", { suggestion: { ...card, suggestionId: randomUUID() } }, { snapshot }, failure))
    .rejects.toThrow("write failed");
  expect(store.receipts.size).toBe(1);
});
