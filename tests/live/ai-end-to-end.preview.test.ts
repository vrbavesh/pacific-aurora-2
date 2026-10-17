import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { GET as eligibility } from "@/app/api/books/[bookId]/chapters/[chapterId]/ai-suggestions/eligibility/route";
import { POST as analyze } from "@/app/api/books/[bookId]/chapters/[chapterId]/ai-suggestions/route";
import { POST as apply } from "@/app/api/books/[bookId]/chapters/[chapterId]/ai-suggestions/apply/route";
import type { AiAnalysisResult, AiApplyResult, AiEligibility } from "@/src/lib/api/generated";

const previewDescribe = process.env.RUN_PREVIEW_AI_E2E === "1" ? describe : describe.skip;

previewDescribe("route-to-provider-to-apply on isolated V2 preview", () => {
  let admin: SupabaseClient;
  let userId = "";
  let token = "";
  let bookId = "";
  let chapterId = "";

  beforeAll(async () => {
    const previewUrl = process.env.PA_AI_PREVIEW_URL;
    if (process.env.PA_AI_PREVIEW_CONFIRM !== "ISOLATED_V2_PREVIEW" || !previewUrl ||
        !process.env.PA_AI_DEPLOYED_URL ||
        new URL(previewUrl).origin === new URL(process.env.PA_AI_DEPLOYED_URL).origin ||
        process.env.NEXT_PUBLIC_SUPABASE_URL !== previewUrl || !process.env.PA_AI_PREVIEW_SECRET_KEY ||
        !process.env.PA_AI_PREVIEW_PUBLISHABLE_KEY || process.env.AI_BASE_URL !== "http://localhost:11434/v1") {
      throw new Error("Isolated V2 preview and local Ollama configuration required");
    }
    admin = createClient(previewUrl, process.env.PA_AI_PREVIEW_SECRET_KEY, { auth: { persistSession: false } });
    const email = `pa-ai-e2e-${randomUUID()}@example.com`;
    const password = `Pa!${randomUUID()}9z`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error || !created.data.user) throw created.error ?? new Error("No test user");
    userId = created.data.user.id;
    const client = createClient(previewUrl, process.env.PA_AI_PREVIEW_PUBLISHABLE_KEY, { auth: { persistSession: false } });
    const login = await client.auth.signInWithPassword({ email, password });
    if (login.error || !login.data.session) throw login.error ?? new Error("No test session");
    token = login.data.session.access_token;
    const world = await client.from("worlds").insert({ owner_id: userId, name: "AI smoke world" }).select("id").single();
    if (world.error) throw world.error;
    const book = await client.from("books").insert({ world_id: world.data.id, name: "AI smoke book" }).select("id").single();
    if (book.error) throw book.error;
    bookId = book.data.id;
    const chapter = await client.from("chapters").select("id").eq("book_id", bookId).single();
    if (chapter.error) throw chapter.error;
    chapterId = chapter.data.id;
  }, 30_000);

  afterAll(async () => {
    if (userId) await admin.auth.admin.deleteUser(userId);
  });

  test("analysis checkpoints without saving prose; accepting one card writes once", async () => {
    const params = { params: Promise.resolve({ bookId, chapterId }) };
    const request = (path: string, body?: unknown) => new Request(`http://preview.test${path}`, {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const path = `/api/books/${bookId}/chapters/${chapterId}/ai-suggestions`;
    const first = await eligibility(request(`${path}/eligibility`), params);
    expect(first.status).toBe(200);
    const initial = (await first.json() as { data: AiEligibility }).data;
    const text = Array.from({ length: 500 }, (_, index) =>
      ["Mara", "waited", "beside", "the", "quiet", "harbor"][index % 6]).join(" ");
    const response = await analyze(request(path, { text, wordCount: 500, milestone: 1,
      checkpointVersion: initial.checkpointVersion }), params);
    expect(response.status, await response.clone().text()).toBe(200);
    const result = (await response.json() as { data: AiAnalysisResult }).data;
    expect(result.completedMilestone).toBe(1);
    expect(result.suggestions.length).toBeGreaterThan(0);
    const checkpoint = await eligibility(request(`${path}/eligibility`), params);
    expect((await checkpoint.json() as { data: AiEligibility }).data.completedMilestone).toBe(1);
    const accepted = await apply(request(`${path}/apply`, { suggestion: result.suggestions[0] }), params);
    expect(accepted.status, await accepted.clone().text()).toBe(200);
    const receipt = (await accepted.json() as { data: AiApplyResult }).data;
    expect(receipt.suggestionId).toBe(result.suggestions[0].suggestionId);
    const stored = await admin.from("ai_applied_suggestion_receipts").select("resource_id")
      .eq("suggestion_id", receipt.suggestionId).single();
    expect(stored.error).toBeNull();
    expect(stored.data?.resource_id).toBe(receipt.resourceId);
  }, 90_000);
});
