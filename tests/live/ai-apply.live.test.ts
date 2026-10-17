import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { liveAiEnvironment } from "@/tests/helpers/live-ai-environment";

const liveDescribe = process.env.RUN_LIVE_AI_APPLY === "1" ? describe : describe.skip;

liveDescribe("V2 accepted suggestions on the live database", () => {
  let admin: SupabaseClient;
  let owner: SupabaseClient;
  let stranger: SupabaseClient;
  const users: string[] = [];
  let bookId = "";
  let chapterId = "";
  let worldId = "";

  beforeAll(async () => {
    const { url, anonKey, serviceKey } = liveAiEnvironment();
    admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const createUser = async (label: string) => {
      const email = `pa-apply-${label}-${randomUUID()}@example.com`;
      const password = `Pa!${randomUUID()}9z`;
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (created.error || !created.data.user) throw created.error ?? new Error("No test user");
      users.push(created.data.user.id);
      const client = createClient(url, anonKey, { auth: { persistSession: false } });
      const login = await client.auth.signInWithPassword({ email, password });
      if (login.error) throw login.error;
      return { id: created.data.user.id, client };
    };
    const first = await createUser("owner");
    owner = first.client;
    stranger = (await createUser("stranger")).client;
    const world = await owner.from("worlds").insert({ owner_id: first.id, name: "Apply Live Test" }).select("id").single();
    if (world.error) throw world.error;
    worldId = world.data.id;
    const book = await owner.from("books").insert({ world_id: worldId, name: "Apply Live Test Book" }).select("id").single();
    if (book.error) throw book.error;
    bookId = book.data.id;
    const chapter = await owner.from("chapters").select("id").eq("book_id", bookId).single();
    if (chapter.error) throw chapter.error;
    chapterId = chapter.data.id;
  }, 60_000);

  afterAll(async () => {
    if (!admin) return;
    for (const id of users) await admin.auth.admin.deleteUser(id);
  }, 60_000);

  test("one accepted chapter point is atomic, replay-safe, and hidden from another user", async () => {
    const suggestionId = randomUUID();
    const args = {
      p_book_id: bookId, p_chapter_id: chapterId, p_suggestion_id: suggestionId,
      p_kind: "chapter_point", p_action: "add_point", p_entity_type_id: null,
      p_target_entity_id: null, p_expected_updated_at: null,
      p_changes: { content: "One accepted point" },
    };
    const [first, replay] = await Promise.all([
      owner.rpc("ai_apply_suggestion_once", args), owner.rpc("ai_apply_suggestion_once", args),
    ]);
    if (first.error) throw first.error;
    if (replay.error) throw replay.error;
    expect(replay.data).toBe(first.data);
    const points = await owner.from("chapter_important_points").select("id").eq("chapter_id", chapterId);
    expect(points.data?.filter((point) => point.id === first.data)).toHaveLength(1);
    const foreign = await stranger.rpc("ai_apply_suggestion_once", { ...args, p_suggestion_id: randomUUID() });
    expect(foreign.error?.message).toContain("AI_NOT_FOUND");
    const direct = await owner.from("ai_applied_suggestion_receipts").insert({
      owner_id: users[0], suggestion_id: randomUUID(), chapter_id: chapterId,
      result_kind: "chapter_point", resource_id: randomUUID(),
    });
    expect(direct.error).not.toBeNull();
  });

  test("subtype edits invalidate stale cards; failed apply writes no receipt", async () => {
    const created = await owner.rpc("create_world_entity_atomic", {
      target_world_id: worldId, target_kind: "character", target_name: "Mara", subtype_data: { status: "alive" },
    });
    if (created.error) throw created.error;
    const entityId = created.data as string;
    const before = await owner.from("world_entities").select("updated_at").eq("id", entityId).single();
    if (before.error) throw before.error;
    const manual = await owner.rpc("update_world_entity_atomic", { target_entity_id: entityId, patch: { notes: "Manual edit" } });
    if (manual.error) throw manual.error;
    const after = await owner.from("world_entities").select("updated_at").eq("id", entityId).single();
    if (after.error) throw after.error;
    expect(after.data.updated_at).not.toBe(before.data.updated_at);
    const staleId = randomUUID();
    const stale = await owner.rpc("ai_apply_suggestion_once", {
      p_book_id: bookId, p_chapter_id: chapterId, p_suggestion_id: staleId,
      p_kind: "character", p_action: "update", p_entity_type_id: null,
      p_target_entity_id: entityId, p_expected_updated_at: before.data.updated_at,
      p_changes: { notes: "Stale AI edit" },
    });
    expect(stale.error?.message).toContain("AI_STALE_TARGET");
    const receipt = await admin.from("ai_applied_suggestion_receipts")
      .select("suggestion_id").eq("suggestion_id", staleId);
    expect(receipt.data).toEqual([]);
  });
});
