import type { SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "vitest";
import { SupabaseAiAnalysisStateRepository } from "@/src/server/repositories/supabase-ai-state";
import { RateLimitError } from "@/src/lib/api/errors";

const row = {
  completed_milestone: 2,
  checkpoint_version: 0,
  next_eligible_at: null,
  lease_token: "lease",
};

test("AI state reads and reserves with the user JWT, but finalizes only with the server client", async () => {
  const userCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const adminCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  const client = (calls: typeof userCalls) => ({
    rpc: async (fn: string, args: Record<string, unknown>) => {
      calls.push({ fn, args });
      return { data: [row], error: null };
    },
  }) as unknown as SupabaseClient;
  const repo = new SupabaseAiAnalysisStateRepository(client(userCalls), client(adminCalls), "owner-id");

  await repo.eligibility("book", "chapter");
  await repo.reserve("book", "chapter", 3, 0);
  await repo.finalize("book", "chapter", "lease");

  expect(userCalls.map((call) => call.fn)).toEqual(["ai_analysis_eligibility", "ai_reserve_analysis"]);
  expect(userCalls[1].args).toEqual({
    p_book_id: "book", p_chapter_id: "chapter", p_milestone: 3, p_checkpoint_version: 0,
  });
  expect(adminCalls).toEqual([{ fn: "ai_finalize_analysis", args: {
    p_owner_id: "owner-id", p_book_id: "book", p_chapter_id: "chapter", p_lease_token: "lease",
  } }]);
});

test("AI cooldown error carries the remaining Retry-After seconds", async () => {
  const user = { rpc: async () => ({ data: null, error: { message: "AI_COOLDOWN:173" } }) } as unknown as SupabaseClient;
  const admin = {} as SupabaseClient;
  const repo = new SupabaseAiAnalysisStateRepository(user, admin, "owner-id");
  await expect(repo.reserve("book", "chapter", 1, 0)).rejects.toMatchObject({
    status: 429, retryAfterSeconds: 173,
  } satisfies Partial<RateLimitError>);
});
