import { isDeepStrictEqual } from "node:util";
import type { AiApplyResult, AiSuggestion, AiWorldContext } from "@/src/lib/api/generated";
import { PostBooksBookIdChaptersChapterIdAiSuggestionsApplyBody } from "@/src/lib/api/schemas";
import { ConflictError, NotFoundError, ValidationError } from "@/src/lib/api/errors";
import type { AiApplyRepository, AiContextRepository } from "@/src/server/repositories/types";
import { allowedTarget } from "./ai-analysis";

function target(card: AiSuggestion, context: AiWorldContext) {
  if (!("targetEntityId" in card)) return null;
  const collection = card.kind === "character" ? context.characters
    : card.kind === "place" ? context.places
    : card.kind === "item" ? context.items : context.customEntities;
  return collection.find((entity) => entity.entityId === card.targetEntityId) ?? null;
}

export async function applySuggestion(
  bookId: string,
  chapterId: string,
  body: unknown,
  contextRepository: AiContextRepository,
  applyRepository: AiApplyRepository,
): Promise<AiApplyResult> {
  const parsed = PostBooksBookIdChaptersChapterIdAiSuggestionsApplyBody.safeParse(body);
  if (!parsed.success || !isDeepStrictEqual(parsed.data, body)) throw new ValidationError("Invalid suggestion");
  const suggestion = parsed.data.suggestion as AiSuggestion;
  if (JSON.stringify(suggestion.changes).length > 4096 || Object.keys(suggestion.changes).length === 0 ||
      ("name" in suggestion.changes && (typeof suggestion.changes.name !== "string" ||
        suggestion.changes.name.trim().length === 0 || suggestion.changes.name.length > 120))) {
    throw new ValidationError("Invalid suggestion changes");
  }
  const context = await contextRepository.snapshot(bookId, chapterId);
  if (!allowedTarget(suggestion, context, chapterId)) {
    if ("action" in suggestion && suggestion.action === "create") throw new ValidationError("Invalid suggestion target");
    const existing = target(suggestion, context);
    if (existing && "expectedTargetUpdatedAt" in suggestion && existing.updatedAt !== suggestion.expectedTargetUpdatedAt) {
      throw new ConflictError("This suggestion is stale. Review the current entity before applying it.");
    }
    if (suggestion.kind === "custom_entity" && context.customEntityTypes.some((type) => type.id === suggestion.entityTypeId)) {
      throw new ValidationError("Custom attributes do not match this section");
    }
    throw new NotFoundError();
  }
  const resourceId = await applyRepository.apply(bookId, chapterId, suggestion);
  return { suggestionId: suggestion.suggestionId, kind: suggestion.kind, resourceId };
}
