import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

// Run only against a V2 preview Supabase project with migration 0003 applied.
// Intentionally does not read .env.local or use the deployed project's keys.
const RUN_PREVIEW = process.env.RUN_PREVIEW_AI_STATE === "1";
const previewDescribe = RUN_PREVIEW ? describe : describe.skip;

function previewVariable(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for the V2 preview test`);
  return value;
}

previewDescribe("V2 AI state on an isolated preview database", () => {
  let admin: SupabaseClient;
  let owner: SupabaseClient;
  let stranger: SupabaseClient;
  const userIds: string[] = [];
  let ownerId = "";
  let bookId = "";
  let chapterId = "";
  let otherBookId = "";
  let otherChapterId = "";
  let worldId = "";

  beforeAll(async () => {
    if (process.env.PA_AI_PREVIEW_CONFIRM !== "ISOLATED_V2_PREVIEW") {
      throw new Error("Set PA_AI_PREVIEW_CONFIRM=ISOLATED_V2_PREVIEW for this data-creating suite");
    }
    const url = previewVariable("PA_AI_PREVIEW_URL");
    const deployedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (deployedUrl && new URL(url).origin === new URL(deployedUrl).origin) {
      throw new Error("Preview URL matches the deployed project; refusing destructive test data");
    }
    const anonKey = previewVariable("PA_AI_PREVIEW_PUBLISHABLE_KEY");
    const serviceKey = previewVariable("PA_AI_PREVIEW_SECRET_KEY");
    admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const runId = randomUUID();
    const createUser = async (label: string) => {
      const email = `pa-ai-${label}-${runId}@example.com`;
      const password = `Pa!${randomUUID()}9z`;
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (created.error || !created.data.user) throw created.error ?? new Error("No test user");
      userIds.push(created.data.user.id);
      const client = createClient(url, anonKey, { auth: { persistSession: false } });
      const login = await client.auth.signInWithPassword({ email, password });
      if (login.error) throw login.error;
      return { client, id: created.data.user.id };
    };
    const first = await createUser("owner");
    owner = first.client;
    ownerId = first.id;
    stranger = (await createUser("stranger")).client;

    const world = await owner.from("worlds").insert({ owner_id: ownerId, name: "AI Preview" }).select("id").single();
    if (world.error) throw world.error;
    worldId = world.data.id;
    const book = await owner.from("books").insert({ world_id: worldId, name: "AI Preview Book" }).select("id").single();
    if (book.error) throw book.error;
    bookId = book.data.id;
    const intro = await owner.from("chapters").select("id").eq("book_id", bookId).single();
    if (intro.error) throw intro.error;
    chapterId = intro.data.id;
    const content = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: Array(1000).fill("word").join(" ") }] }] };
    const saved = await owner.from("chapters").update({ content }).eq("id", chapterId);
    if (saved.error) throw saved.error;
    // Simulate a manuscript saved before AI checkpoints existed.
    const legacy = await admin.from("ai_chapter_checkpoints").delete().eq("chapter_id", chapterId);
    if (legacy.error) throw legacy.error;
    const otherBook = await owner.from("books").insert({ world_id: worldId, name: "Other AI Book" }).select("id").single();
    if (otherBook.error) throw otherBook.error;
    otherBookId = otherBook.data.id;
    const otherIntro = await owner.from("chapters").select("id").eq("book_id", otherBookId).single();
    if (otherIntro.error) throw otherIntro.error;
    otherChapterId = otherIntro.data.id;
  }, 60_000);

  afterAll(async () => {
    if (!admin) return;
    for (const id of userIds) await admin.auth.admin.deleteUser(id);
  }, 60_000);

  test("direct state writes and forged RPC arguments fail, and foreign paths stay hidden", async () => {
    const direct = await owner.from("ai_user_dispatch_state").insert({ owner_id: ownerId });
    expect(direct.error).not.toBeNull();
    const directRead = await owner.from("ai_chapter_checkpoints").select("chapter_id");
    expect(directRead.error).not.toBeNull();
    const receipt = await owner.from("ai_applied_suggestion_receipts").insert({
      owner_id: ownerId, suggestion_id: randomUUID(), chapter_id: chapterId,
      result_kind: "character_timeline_point", resource_id: randomUUID(),
    });
    expect(receipt.error).not.toBeNull();
    const forged = await owner.rpc("ai_reserve_analysis", {
      p_book_id: bookId, p_chapter_id: chapterId, p_milestone: 3,
      p_checkpoint_version: 0, p_owner_id: ownerId,
      p_now: "2000-01-01T00:00:00Z",
    });
    expect(forged.error).not.toBeNull();
    const foreign = await stranger.rpc("ai_analysis_eligibility", {
      p_book_id: bookId, p_chapter_id: chapterId,
    });
    expect(foreign.error?.message).toContain("AI_NOT_FOUND");
    const forgedFinish = await owner.rpc("ai_finalize_analysis", {
      p_owner_id: ownerId, p_book_id: bookId, p_chapter_id: chapterId,
      p_lease_token: randomUUID(),
    });
    expect(forgedFinish.error).not.toBeNull();
  });

  test("a newly saved 550-word chapter is eligible for its first analysis", async () => {
    const content = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: Array(550).fill("word").join(" ") }] }] };
    const saved = await owner.from("chapters").update({ content }).eq("id", otherChapterId);
    if (saved.error) throw saved.error;
    const eligibility = await owner.rpc("ai_analysis_eligibility", {
      p_book_id: otherBookId, p_chapter_id: otherChapterId,
    });
    if (eligibility.error) throw eligibility.error;
    expect(eligibility.data[0]).toMatchObject({ completed_milestone: 0, checkpoint_version: 0 });
  });

  test("saved baseline, concurrent reservation, global cooldown, and token finalization", async () => {
    const initial = await owner.rpc("ai_analysis_eligibility", { p_book_id: bookId, p_chapter_id: chapterId });
    if (initial.error) throw initial.error;
    expect(initial.data[0]).toMatchObject({ completed_milestone: 2, checkpoint_version: 0 });
    const args = { p_book_id: bookId, p_chapter_id: chapterId, p_milestone: 3, p_checkpoint_version: 0 };
    const attempts = await Promise.all([
      owner.rpc("ai_reserve_analysis", args), owner.rpc("ai_reserve_analysis", args),
    ]);
    const successes = attempts.filter((result) => !result.error);
    expect(successes).toHaveLength(1);
    expect(attempts.filter((result) => result.error)).toHaveLength(1);
    const token = successes[0].data[0].lease_token as string;
    const premature = await owner.rpc("ai_reserve_analysis", args);
    expect(premature.error?.message).toContain("AI_COOLDOWN");
    const otherBookAttempt = await owner.rpc("ai_reserve_analysis", {
      p_book_id: otherBookId, p_chapter_id: otherChapterId,
      p_milestone: 1, p_checkpoint_version: 0,
    });
    expect(otherBookAttempt.error?.message).toContain("AI_COOLDOWN");
    const badFinish = await admin.rpc("ai_finalize_analysis", {
      p_owner_id: ownerId, p_book_id: bookId, p_chapter_id: chapterId,
      p_lease_token: randomUUID(),
    });
    expect(badFinish.error?.message).toContain("AI_STALE_LEASE");
    const finished = await admin.rpc("ai_finalize_analysis", {
      p_owner_id: ownerId, p_book_id: bookId, p_chapter_id: chapterId,
      p_lease_token: token,
    });
    if (finished.error) throw finished.error;
    expect(finished.data[0]).toMatchObject({ completed_milestone: 3, checkpoint_version: 1 });
  });

  test("declines are chapter-scoped, private, and survive a new authenticated request", async () => {
    const fingerprint = "a".repeat(64);
    const direct = await owner.from("ai_declined_suggestions").select("fingerprint");
    expect(direct.error).not.toBeNull();
    const foreign = await stranger.rpc("ai_decline_suggestion", {
      p_book_id: bookId, p_chapter_id: chapterId, p_fingerprint: fingerprint,
    });
    expect(foreign.error?.message).toContain("AI_NOT_FOUND");
    const saved = await owner.rpc("ai_decline_suggestion", {
      p_book_id: bookId, p_chapter_id: chapterId, p_fingerprint: fingerprint,
    });
    if (saved.error) throw saved.error;
    const loaded = await owner.rpc("ai_declined_fingerprints", {
      p_book_id: bookId, p_chapter_id: chapterId,
    });
    if (loaded.error) throw loaded.error;
    expect(loaded.data).toContainEqual({ fingerprint });
    const other = await owner.rpc("ai_declined_fingerprints", {
      p_book_id: otherBookId, p_chapter_id: otherChapterId,
    });
    if (other.error) throw other.error;
    expect(other.data).toEqual([]);
  });

  test("timeline creation and receipt are one idempotent write; account deletion cascades", async () => {
    const character = await owner.rpc("create_world_entity_atomic", {
      target_world_id: worldId, target_kind: "character", target_name: "Preview Character",
      subtype_data: { status: "alive" },
    });
    if (character.error) throw character.error;
    const suggestionId = randomUUID();
    const args = {
      p_book_id: bookId, p_chapter_id: chapterId, p_suggestion_id: suggestionId,
      p_character_entity_id: character.data as string,
      p_point_chapter_id: chapterId, p_content: "A single durable point",
    };
    const first = await owner.rpc("ai_add_character_timeline_point_once", args);
    if (first.error) throw first.error;
    const again = await owner.rpc("ai_add_character_timeline_point_once", args);
    expect(again.error).toBeNull();
    expect(again.data).toBe(first.data);
    const receipt = await admin.from("ai_applied_suggestion_receipts")
      .select("resource_id").eq("owner_id", ownerId).eq("suggestion_id", suggestionId).single();
    expect(receipt.data?.resource_id).toBe(first.data);
    const deleted = await admin.auth.admin.deleteUser(ownerId);
    if (deleted.error) throw deleted.error;
    userIds.splice(userIds.indexOf(ownerId), 1);
    const quota = await admin.from("ai_user_dispatch_state").select("owner_id").eq("owner_id", ownerId);
    const checkpoint = await admin.from("ai_chapter_checkpoints").select("chapter_id").eq("chapter_id", chapterId);
    const receipts = await admin.from("ai_applied_suggestion_receipts").select("suggestion_id").eq("owner_id", ownerId);
    const declines = await admin.from("ai_declined_suggestions").select("fingerprint").eq("owner_id", ownerId);
    expect(quota.data).toEqual([]);
    expect(checkpoint.data).toEqual([]);
    expect(receipts.data).toEqual([]);
    expect(declines.data).toEqual([]);
  });
});
