import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type { AiSuggestion } from "@/src/lib/api/generated";
import { PostBooksBookIdChaptersChapterIdAiSuggestionsDeclineBody } from "@/src/lib/api/schemas";
import { ValidationError } from "@/src/lib/api/errors";
import type { AiAnalysisStateRepository } from "@/src/server/repositories/types";

const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();

export function suggestionFingerprint(card: AiSuggestion): string {
  let fact: unknown;
  if (card.kind === "chapter_point") fact = [card.chapterId, normalize(card.sourceExcerpt || card.changes.content)];
  else if (card.kind === "character_timeline_point") fact = [card.characterEntityId, normalize(card.sourceExcerpt || card.changes.content)];
  else if (card.action === "create") fact = [card.kind === "custom_entity" ? card.entityTypeId : null, normalize(card.changes.name ?? "")];
  else fact = [card.targetEntityId, Object.entries(card.changes).sort(([a], [b]) => a.localeCompare(b))];
  return createHash("sha256").update(JSON.stringify([card.kind, card.action, fact])).digest("hex");
}

export async function declineSuggestion(
  bookId: string, chapterId: string, body: unknown, state: AiAnalysisStateRepository,
): Promise<{ declined: true }> {
  const parsed = PostBooksBookIdChaptersChapterIdAiSuggestionsDeclineBody.safeParse(body);
  if (!parsed.success || !isDeepStrictEqual(parsed.data, body)) throw new ValidationError("Invalid suggestion");
  await state.decline(bookId, chapterId, suggestionFingerprint(parsed.data.suggestion as AiSuggestion));
  return { declined: true };
}
