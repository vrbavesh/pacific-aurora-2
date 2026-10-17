import { readFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "vitest";
import { SupabaseAiApplyRepository } from "@/src/server/repositories/supabase-ai-apply";

const sql = readFileSync("supabase/migrations/0005_ai_apply_once.sql", "utf8");

test("apply migration scopes direct RPC callers and couples receipt with write", () => {
  expect(sql).toContain("v_owner uuid := auth.uid()");
  expect(sql).toContain("w.owner_id = v_owner");
  expect(sql).toContain("pa_private.ai_lock_entity_version");
  expect(sql).toContain("<> (case when p_kind = 'custom_entity' then 'custom' else p_kind end)");
  expect(sql).toContain("on conflict (owner_id, suggestion_id) do nothing");
  expect(sql).toContain("public.create_world_entity_atomic");
  expect(sql).toContain("public.update_world_entity_atomic");
  expect(sql).toContain("insert into public.chapter_important_points");
  expect(sql).toContain("ce.attributes || p_changes->'attributes'");
  expect(sql).toContain("revoke all on function public.ai_apply_suggestion_once");
  for (const table of ["characters", "places", "items", "custom_entities"]) {
    expect(sql).toContain(`after update on public.${table}`);
  }
  expect((sql.match(/\$\$/g) ?? []).length % 2).toBe(0);
});

test("repository uses narrow RPC inputs and maps stale and missing targets", async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const client = { rpc: async (name: string, args: Record<string, unknown>) => {
    calls.push({ name, args });
    return { data: "resource-1", error: null };
  } } as unknown as SupabaseClient;
  const repo = new SupabaseAiApplyRepository(client);
  await repo.apply("book-1", "chapter-1", {
    suggestionId: "suggestion-1", kind: "chapter_point", action: "add_point",
    chapterId: "chapter-1", changes: { content: "A point" }, summary: "Point", sourceExcerpt: null,
  });
  expect(calls[0].name).toBe("ai_apply_suggestion_once");
  expect(calls[0].args).toMatchObject({ p_kind: "chapter_point", p_action: "add_point", p_changes: { content: "A point" } });
  const stale = { rpc: async () => ({ data: null, error: { code: "P0001", message: "AI_STALE_TARGET" } }) } as unknown as SupabaseClient;
  await expect(new SupabaseAiApplyRepository(stale).apply("book-1", "chapter-1", {
    suggestionId: "suggestion-1", kind: "chapter_point", action: "add_point",
    chapterId: "chapter-1", changes: { content: "A point" }, summary: "Point", sourceExcerpt: null,
  })).rejects.toMatchObject({ status: 409 });
});
