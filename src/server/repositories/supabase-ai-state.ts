import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ConflictError,
  ApiError,
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
  ValidationError,
} from "@/src/lib/api/errors";
import type {
  AiAnalysisEligibility,
  AiAnalysisReservation,
  AiAnalysisStateRepository,
} from "./types";

type RpcError = { message: string } | null;
type Row = Record<string, unknown>;

function unwrap(data: unknown, error: RpcError): Row {
  check(error);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") throw new Error("AI state RPC returned no row");
  return row as Row;
}

function check(error: RpcError): void {
  if (error) {
    if (error.message.includes("AI_NOT_FOUND")) throw new NotFoundError();
    if (error.message.includes("AI_UNAUTHORIZED")) throw new UnauthorizedError();
    if (error.message.includes("AI_COOLDOWN")) {
      const seconds = Number(error.message.match(/AI_COOLDOWN:(\d+)/)?.[1] ?? "300");
      throw new RateLimitError("AI analysis is cooling down", Math.min(300, Math.max(1, seconds)));
    }
    if (error.message.includes("AI_STALE_")) throw new ConflictError("AI checkpoint changed. Refresh eligibility and try again.");
    if (error.message.includes("AI_INVALID_FINGERPRINT")) throw new ValidationError("Invalid declined suggestion");
    throw new Error(error.message);
  }
}

function eligibility(row: Row): AiAnalysisEligibility {
  if (
    typeof row.completed_milestone !== "number" ||
    typeof row.checkpoint_version !== "number" ||
    !(row.next_eligible_at === null || typeof row.next_eligible_at === "string")
  ) {
    throw new Error("AI state RPC returned an invalid row");
  }
  return {
    completedMilestone: row.completed_milestone,
    nextEligibleAt: row.next_eligible_at,
    checkpointVersion: row.checkpoint_version,
  };
}

export class SupabaseAiAnalysisStateRepository implements AiAnalysisStateRepository {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly admin: SupabaseClient | null,
    private readonly authenticatedUserId: string,
  ) {}

  async eligibility(bookId: string, chapterId: string): Promise<AiAnalysisEligibility> {
    const { data, error } = await this.supabase.rpc("ai_analysis_eligibility", {
      p_book_id: bookId,
      p_chapter_id: chapterId,
    });
    return eligibility(unwrap(data, error));
  }

  async declined(bookId: string, chapterId: string): Promise<string[]> {
    const { data, error } = await this.supabase.rpc("ai_declined_fingerprints", {
      p_book_id: bookId, p_chapter_id: chapterId,
    });
    check(error);
    if (!Array.isArray(data) || !data.every((row) => typeof row?.fingerprint === "string")) {
      throw new Error("AI decline RPC returned invalid rows");
    }
    return data.map((row) => row.fingerprint as string);
  }

  async decline(bookId: string, chapterId: string, fingerprint: string): Promise<void> {
    const { error } = await this.supabase.rpc("ai_decline_suggestion", {
      p_book_id: bookId, p_chapter_id: chapterId, p_fingerprint: fingerprint,
    });
    check(error);
  }

  async reserve(
    bookId: string,
    chapterId: string,
    milestone: number,
    checkpointVersion: number,
  ): Promise<AiAnalysisReservation> {
    const { data, error } = await this.supabase.rpc("ai_reserve_analysis", {
      p_book_id: bookId,
      p_chapter_id: chapterId,
      p_milestone: milestone,
      p_checkpoint_version: checkpointVersion,
    });
    const row = unwrap(data, error);
    if (typeof row.lease_token !== "string") throw new Error("AI reservation has no lease token");
    return { ...eligibility(row), leaseToken: row.lease_token };
  }

  async finalize(bookId: string, chapterId: string, leaseToken: string): Promise<AiAnalysisEligibility> {
    if (!this.admin) throw new ApiError(503, "ai_unavailable", "AI analysis is unavailable");
    const { data, error } = await this.admin.rpc("ai_finalize_analysis", {
      p_owner_id: this.authenticatedUserId,
      p_book_id: bookId,
      p_chapter_id: chapterId,
      p_lease_token: leaseToken,
    });
    return eligibility(unwrap(data, error));
  }
}
