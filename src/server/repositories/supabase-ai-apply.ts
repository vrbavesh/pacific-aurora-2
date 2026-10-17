import type { SupabaseClient } from "@supabase/supabase-js";
import type { AiSuggestion } from "@/src/lib/api/generated";
import { ConflictError, NotFoundError, ValidationError } from "@/src/lib/api/errors";
import type { AiApplyRepository } from "./types";

export class SupabaseAiApplyRepository implements AiApplyRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async apply(bookId: string, chapterId: string, suggestion: AiSuggestion): Promise<string> {
    const { data, error } = suggestion.kind === "character_timeline_point"
      ? await this.supabase.rpc("ai_add_character_timeline_point_once", {
        p_book_id: bookId,
        p_chapter_id: chapterId,
        p_suggestion_id: suggestion.suggestionId,
        p_character_entity_id: suggestion.characterEntityId,
        p_point_chapter_id: suggestion.chapterId,
        p_content: suggestion.changes.content,
      })
      : await this.supabase.rpc("ai_apply_suggestion_once", {
        p_book_id: bookId,
        p_chapter_id: chapterId,
        p_suggestion_id: suggestion.suggestionId,
        p_kind: suggestion.kind,
        p_action: suggestion.action,
        p_entity_type_id: suggestion.kind === "custom_entity" ? suggestion.entityTypeId : null,
        p_target_entity_id: "targetEntityId" in suggestion ? suggestion.targetEntityId : null,
        p_expected_updated_at: "expectedTargetUpdatedAt" in suggestion ? suggestion.expectedTargetUpdatedAt : null,
        p_changes: suggestion.changes,
      });
    if (error) {
      if (error.message.includes("AI_NOT_FOUND")) throw new NotFoundError();
      if (error.message.includes("AI_STALE_TARGET") || error.message.includes("AI_DUPLICATE_SUGGESTION")) throw new ConflictError("This suggestion is stale or already applied");
      if (error.message.includes("AI_INVALID_") || error.message.includes("Custom attribute") || error.message.includes("Required custom attribute") || ["22P02", "23503", "23514"].includes(error.code)) throw new ValidationError("This suggestion cannot be applied");
      throw new Error("AI apply database operation failed");
    }
    if (typeof data !== "string") throw new Error("AI apply returned no resource ID");
    return data;
  }
}
