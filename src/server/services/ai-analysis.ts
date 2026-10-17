import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type { AiAnalysisRequest, AiAnalysisResult, AiSuggestion, AiWorldContext } from "@/src/lib/api/generated";
import { PostBooksBookIdChaptersChapterIdAiSuggestionsBody, PostBooksBookIdChaptersChapterIdAiSuggestionsResponse } from "@/src/lib/api/schemas";
import { countWords } from "@/src/lib/ai-words";
import { ApiError, ValidationError } from "@/src/lib/api/errors";
import type { AiAnalysisStateRepository, AiContextRepository } from "@/src/server/repositories/types";
import { aiProviderConfig, requestAiSuggestions } from "@/src/server/ai-provider";
import { suggestionFingerprint } from "./ai-decline";

type RequestProvider = typeof requestAiSuggestions;
type Candidate = Record<string, unknown>;
const record = (value: unknown): value is Candidate => !!value && typeof value === "object" && !Array.isArray(value);

function validAttribute(value: unknown, fieldType: string | undefined, options: string[] | null | undefined): boolean {
  if (value === null) return true;
  if (fieldType === "number") return typeof value === "number" && Number.isFinite(value);
  if (fieldType === "boolean") return typeof value === "boolean";
  if (fieldType === "multiselect") return Array.isArray(value) && value.every((item) =>
    typeof item === "string" && (!options || options.includes(item)));
  if (typeof value !== "string") return false;
  return fieldType !== "select" || !options || options.includes(value);
}

export function allowedTarget(card: AiSuggestion, context: AiWorldContext, chapterId: string): boolean {
  if (card.kind === "chapter_point") return card.chapterId === chapterId;
  if (card.kind === "character_timeline_point") {
    return context.characters.some((character) => character.entityId === card.characterEntityId) &&
      (card.chapterId === null || card.chapterId === chapterId);
  }
  const collection = card.kind === "character" ? context.characters
    : card.kind === "place" ? context.places
    : card.kind === "item" ? context.items : context.customEntities;
  if (card.kind === "custom_entity") {
    const type = context.customEntityTypes.find((candidate) => candidate.id === card.entityTypeId);
    if (!type || (card.changes.attributes && Object.entries(card.changes.attributes).some(([id, value]) => {
      const attribute = type.attributes?.find((entry) => entry.id === id);
      return !attribute || !validAttribute(value, attribute.fieldType, attribute.options);
    }))) return false;
    const existing = card.action === "update"
      ? context.customEntities.find((entity) => entity.entityId === card.targetEntityId)
      : null;
    const values = { ...(existing?.attributes ?? {}), ...(card.changes.attributes ?? {}) };
    if (type.attributes?.some((attribute) => {
      const value = values[attribute.id ?? ""];
      return attribute.required && (value === undefined || value === null || value === "" ||
        (Array.isArray(value) && value.length === 0));
    })) return false;
  }
  if (card.kind === "place" && card.changes.lastChapterId != null && card.changes.lastChapterId !== chapterId) return false;
  if (card.kind === "item" && card.changes.wielderEntityId != null && !context.characters.some((character) => character.entityId === card.changes.wielderEntityId)) return false;
  if (card.action === "create") {
    const name = card.changes.name?.trim().toLocaleLowerCase();
    return card.targetEntityId === null && card.expectedTargetUpdatedAt === null && !!name &&
      !collection.some((entity) => entity.name?.trim().toLocaleLowerCase() === name);
  }
  const target = collection.find((item) => item.entityId === card.targetEntityId);
  return !!target && target.updatedAt === card.expectedTargetUpdatedAt &&
    (card.kind !== "custom_entity" || context.customEntities.some((entity) =>
      entity.entityId === card.targetEntityId && entity.entityTypeId === card.entityTypeId));
}

function missingFromWorld(card: AiSuggestion, context: AiWorldContext): boolean {
  const normalized = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
  if (card.kind === "chapter_point") return !context.chapterPoints.some((entry) =>
    entry.chapterId === card.chapterId && normalized(entry.point.content ?? "") === normalized(card.changes.content ?? ""));
  if (card.kind === "character_timeline_point") return !context.characterTimelinePoints.some((entry) =>
    entry.characterEntityId === card.characterEntityId && normalized(entry.point.content ?? "") === normalized(card.changes.content ?? ""));
  if (card.action === "create") return true;
  const collection = card.kind === "character" ? context.characters : card.kind === "place" ? context.places
    : card.kind === "item" ? context.items : context.customEntities;
  const target = collection.find((entity) => entity.entityId === card.targetEntityId) as Record<string, unknown> | undefined;
  return Object.entries(card.changes).some(([key, value]) => key === "attributes"
    ? Object.entries(value as Record<string, unknown>).some(([id, attribute]) => !isDeepStrictEqual((target?.attributes as Record<string, unknown> | undefined)?.[id], attribute))
    : !isDeepStrictEqual(target?.[key], value));
}

export function safeSuggestions(value: unknown, context: AiWorldContext, chapterId: string, text: string): AiSuggestion[] {
  if (!record(value) || Object.keys(value).some((key) => key !== "suggestions") || !Array.isArray(value.suggestions)) {
    throw new ApiError(502, "ai_provider_unavailable", "AI suggestions are unavailable right now");
  }
  const cards: AiSuggestion[] = [];
  const seen = new Set<string>();
  for (const raw of value.suggestions) {
    if (!record(raw) || Buffer.byteLength(JSON.stringify(raw)) > 4096 || !record(raw.changes) || Object.keys(raw.changes).length === 0 ||
        Object.keys(raw).some((key) => !["kind", "action", "targetEntityId", "expectedTargetUpdatedAt", "entityTypeId", "chapterId", "characterEntityId", "changes", "summary", "sourceExcerpt"].includes(key)) ||
        (typeof raw.changes.name === "string" && raw.changes.name.length > 120)) continue;
    const sourceExcerpt = typeof raw.sourceExcerpt === "string" && text.includes(raw.sourceExcerpt) ? raw.sourceExcerpt : null;
    const card = { ...raw, suggestionId: randomUUID(), sourceExcerpt };
    const parsed = PostBooksBookIdChaptersChapterIdAiSuggestionsResponse.safeParse({
      data: { suggestions: [card], completedMilestone: 0, nextEligibleAt: null, checkpointVersion: 0 },
    });
    if (!parsed.success) continue;
    const suggestion = parsed.data.data.suggestions[0] as AiSuggestion;
    if (Object.keys(raw.changes).some((key) => !(key in suggestion.changes))) continue;
    const fingerprint = suggestionFingerprint(suggestion);
    if (allowedTarget(suggestion, context, chapterId) && missingFromWorld(suggestion, context) && !seen.has(fingerprint)) {
      cards.push(suggestion);
      seen.add(fingerprint);
    }
    if (cards.length === 8) break;
  }
  return cards;
}

export async function analyzeChapter(
  bookId: string,
  chapterId: string,
  input: unknown,
  state: AiAnalysisStateRepository,
  contextRepository: AiContextRepository,
  provider: RequestProvider = requestAiSuggestions,
): Promise<AiAnalysisResult> {
  const parsed = PostBooksBookIdChaptersChapterIdAiSuggestionsBody.safeParse(input);
  if (!parsed.success) throw new ValidationError("Invalid AI analysis request");
  const request = parsed.data as AiAnalysisRequest;
  if (request.wordCount < 500 || countWords(request.text) !== 500 ||
      Math.floor(request.wordCount / 500) < request.milestone) {
    throw new ValidationError("A complete 500-word window is required");
  }
  const context = await contextRepository.snapshot(bookId, chapterId);
  const config = aiProviderConfig();
  // The reservation is the last step before outbound dispatch; all local failures stay free.
  const reservation = await state.reserve(bookId, chapterId, request.milestone, request.checkpointVersion);
  const model = await provider(config, request.text, context, chapterId);
  const declines = new Set(await state.declined(bookId, chapterId));
  const suggestions = safeSuggestions(model, context, chapterId, request.text)
    .filter((card) => !declines.has(suggestionFingerprint(card)));
  const eligibility = await state.finalize(bookId, chapterId, reservation.leaseToken);
  return { suggestions, ...eligibility };
}
