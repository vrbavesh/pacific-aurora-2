import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { InMemoryAiStateStore } from "@/tests/helpers/in-memory";
import { ConflictError, NotFoundError, RateLimitError } from "@/src/lib/api/errors";

const SQL = readFileSync("supabase/migrations/0003_ai_analysis_state.sql", "utf8");
const NEW_CHAPTER_SQL = readFileSync("supabase/migrations/0006_ai_new_chapter_checkpoint.sql", "utf8");
const SLIDING_SQL = readFileSync("supabase/migrations/0007_ai_sliding_review.sql", "utf8");

describe("V2 AI state migration", () => {
  test("sliding review keeps cooldown and remembers declines behind owner-scoped RPCs", () => {
    expect(SLIDING_SQL).toContain("create table public.ai_declined_suggestions");
    expect(SLIDING_SQL).toContain("alter table public.ai_declined_suggestions enable row level security");
    expect(SLIDING_SQL).toContain("revoke all on public.ai_declined_suggestions from public, anon, authenticated");
    expect(SLIDING_SQL).toContain("create function public.ai_declined_fingerprints");
    expect(SLIDING_SQL).toContain("create function public.ai_decline_suggestion");
    expect(SLIDING_SQL).toContain("w.owner_id = v_owner");
    expect(SLIDING_SQL).toContain("p_milestone < 1");
    expect(SLIDING_SQL).toContain("greatest(s.completed_milestone, v_milestone)");
    expect(SLIDING_SQL).toContain("interval '5 minutes'");
  });
  test("new chapters start at milestone zero without exposing checkpoint writes", () => {
    expect(NEW_CHAPTER_SQL).toContain("after insert on public.chapters");
    expect(NEW_CHAPTER_SQL).toContain("select new.id, w.owner_id, 0");
    expect(NEW_CHAPTER_SQL).toContain("security definer");
    expect(NEW_CHAPTER_SQL).toContain("revoke all on function pa_private.ai_initialize_chapter_checkpoint() from public, anon, authenticated");
  });
  test("adds only isolated, cascading RLS state with no client table policies or grants", () => {
    for (const table of [
      "ai_user_dispatch_state", "ai_chapter_checkpoints", "ai_applied_suggestion_receipts",
    ]) {
      expect(SQL).toContain(`create table public.${table}`);
      expect(SQL).toContain(`alter table public.${table} enable row level security;`);
      expect(SQL).toContain(`revoke all on public.${table} from public, anon, authenticated;`);
      expect(SQL).not.toContain(`create policy ${table}`);
    }
    expect(SQL).toContain("references public.profiles(id) on delete cascade");
    expect(SQL).toContain("references public.chapters(id) on delete cascade");
    expect(SQL).not.toContain("suggestion jsonb");
  });

  test("RPCs derive owner and time, serialize dispatch, and do not expose private helpers", () => {
    for (const fn of [
      "ai_analysis_eligibility", "ai_reserve_analysis", "ai_finalize_analysis",
      "ai_add_character_timeline_point_once",
    ]) {
      expect(SQL).toContain(`function public.${fn}`);
      expect(SQL).toContain(`grant execute on function public.${fn}`);
    }
    expect(SQL).toContain("v_owner uuid := auth.uid()");
    expect(SQL).toContain("where d.owner_id = v_owner for update;");
    expect(SQL).toContain("interval '5 minutes'");
    expect(SQL).toContain("clock_timestamp()");
    expect(SQL).toContain("p_milestone <> completed_milestone + 1");
    expect(SQL).toContain("pa_private.ai_saved_word_count(v_content) / 500");
    expect(SQL).toContain("revoke all on function pa_private.ai_lock_entity_version");
    expect(SQL).toContain("grant execute on function public.ai_finalize_analysis(uuid, uuid, uuid, uuid) to service_role;");
    expect(SQL).toContain("revoke all on function public.ai_finalize_analysis(uuid, uuid, uuid, uuid) from public, anon, authenticated;");
    const reserveSignature = SQL.match(/create function public\.ai_reserve_analysis\(([\s\S]*?)\)/)?.[1];
    expect(reserveSignature).toBeDefined();
    expect(reserveSignature).not.toMatch(/p_owner_id|p_dispatched_at|p_now\b/);
  });

  test("receipt and timeline point are written in one routine", () => {
    expect(SQL).toContain("on conflict (owner_id, suggestion_id) do nothing");
    expect(SQL).toContain("insert into public.character_book_timelines");
    expect(SQL).toContain("insert into public.character_timeline_points");
    expect(SQL).toContain("resource_id uuid not null");
    expect(SQL).toContain("values (v_owner, p_suggestion_id, p_chapter_id, 'character_timeline_point', v_point_id)");
    expect(SQL).toContain("v_updated_at <> p_expected_updated_at");
    expect((SQL.match(/\$\$/g) ?? []).length % 2).toBe(0);
  });
});

describe("AI state behaviour model", () => {
  const setup = () => {
    let time = Date.parse("2026-10-15T00:00:00Z");
    const store = new InMemoryAiStateStore(() => time);
    store.registerChapter("owner", "book", "chapter", 1_200);
    store.registerChapter("owner", "other-book", "other-chapter", 0);
    return { store, user: store.forUser("owner"), advance: (ms: number) => { time += ms; } };
  };

  test("existing saved chapters start at the completed 500-word baseline without a write", async () => {
    const { store, user } = setup();
    expect(await user.eligibility("book", "chapter")).toEqual({
      completedMilestone: 2, checkpointVersion: 0, nextEligibleAt: null,
    });
    expect(store.checkpoints.size).toBe(0);
    await expect(store.forUser("stranger").eligibility("book", "chapter")).rejects.toBeInstanceOf(NotFoundError);
    await expect(user.eligibility("other-book", "chapter")).rejects.toBeInstanceOf(NotFoundError);
  });

  test("simultaneous tabs and different books share one user cooldown", async () => {
    const { user, advance } = setup();
    const outcomes = await Promise.allSettled([
      user.reserve("book", "chapter", 3, 0),
      user.reserve("other-book", "other-chapter", 1, 0),
    ]);
    expect(outcomes.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.filter((result) => result.status === "rejected")).toHaveLength(1);
    const winner = outcomes[0].status === "fulfilled" ? outcomes[0].value : null;
    if (winner) {
      expect(winner.completedMilestone).toBe(2);
      await user.finalize("book", "chapter", winner.leaseToken);
      await expect(user.reserve("book", "chapter", 4, 1)).rejects.toBeInstanceOf(RateLimitError);
      advance(300_000);
      expect((await user.reserve("book", "chapter", 4, 1)).completedMilestone).toBe(3);
    }
  });

  test("failed dispatch keeps cooldown but does not advance milestone", async () => {
    const { user, advance } = setup();
    const first = await user.reserve("book", "chapter", 3, 0);
    expect((await user.eligibility("book", "chapter")).completedMilestone).toBe(2);
    await expect(user.reserve("book", "chapter", 3, 0)).rejects.toMatchObject({
      retryAfterSeconds: 300,
    });
    advance(120_000);
    await expect(user.reserve("book", "chapter", 3, 0)).rejects.toMatchObject({
      retryAfterSeconds: 180,
    });
    advance(180_000);
    const second = await user.reserve("book", "chapter", 3, 0);
    await expect(user.finalize("book", "chapter", first.leaseToken)).rejects.toBeInstanceOf(ConflictError);
    expect(await user.finalize("book", "chapter", second.leaseToken)).toMatchObject({
      completedMilestone: 3, checkpointVersion: 1,
    });
    await expect(user.reserve("book", "chapter", 3, 1)).rejects.toBeInstanceOf(RateLimitError);
  });

  test("the same 500-word window can be checked again after five minutes", async () => {
    const { user, advance } = setup();
    const first = await user.reserve("book", "chapter", 2, 0);
    expect(await user.finalize("book", "chapter", first.leaseToken)).toMatchObject({
      completedMilestone: 2, checkpointVersion: 1,
    });
    advance(300_000);
    const second = await user.reserve("book", "chapter", 2, 1);
    expect(await user.finalize("book", "chapter", second.leaseToken)).toMatchObject({
      completedMilestone: 2, checkpointVersion: 2,
    });
  });

  test("receipt is idempotent, rolls back failures, and cascades with chapter/account", async () => {
    const { store } = setup();
    let writes = 0;
    const write = async () => { writes += 1; return "point-1"; };
    const results = await Promise.all([
      store.applyOnce("owner", "chapter", "suggestion", "point", write),
      store.applyOnce("owner", "chapter", "suggestion", "point", write),
    ]);
    expect(results).toEqual(["point-1", "point-1"]);
    expect(writes).toBe(1);
    await expect(store.applyOnce("owner", "other-chapter", "suggestion", "point", write))
      .rejects.toBeInstanceOf(ConflictError);
    await expect(store.applyOnce("owner", "chapter", "failed", "point", async () => {
      throw new Error("write failed");
    })).rejects.toThrow("write failed");
    expect(store.receipts.size).toBe(1);
    store.deleteChapter("chapter");
    expect(store.receipts.size).toBe(0);
    store.deleteOwner("owner");
    expect(store.chapters.size).toBe(0);
    expect(store.dispatches.size).toBe(0);
  });
});
