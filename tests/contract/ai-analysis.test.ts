import { afterEach, expect, test, vi } from "vitest";
import { InMemoryAiStateStore } from "@/tests/helpers/in-memory";
import { analyzeChapter, safeSuggestions } from "@/src/server/services/ai-analysis";
import { aiProviderConfig, requestAiSuggestions } from "@/src/server/ai-provider";
import type { AiWorldContext } from "@/src/lib/api/generated";
import { validateSuccessResponse } from "@/src/lib/api/response-validation";
import { declineSuggestion, suggestionFingerprint } from "@/src/server/services/ai-decline";

const text = Array.from({ length: 500 }, (_, index) => `word${index}`).join(" ");
const context: AiWorldContext = {
  world: { id: "world-1", name: "Canonical" },
  characters: [{ entityId: "character-1", name: "Mara", updatedAt: "2026-10-15T00:00:00Z" }],
  places: [], items: [], customEntityTypes: [], customEntities: [], relationships: [],
  chapterPoints: [], characterTimelinePoints: [],
};
const request = { text, wordCount: 500, milestone: 1, checkpointVersion: 0, context: { ...context, world: { id: "foreign", name: "Forged" } } };
const point = { kind: "chapter_point", action: "add_point", chapterId: "chapter-1", changes: { content: "A new clue" }, summary: "Remember the clue", sourceExcerpt: "word10" };

afterEach(() => vi.unstubAllEnvs());

function setup() {
  vi.stubEnv("AI_BASE_URL", "http://localhost:11434/v1");
  vi.stubEnv("AI_MODEL", "test-model");
  const store = new InMemoryAiStateStore(() => Date.parse("2026-10-15T00:00:00Z"));
  store.registerChapter("owner-1", "book-1", "chapter-1", 0);
  return { state: store.forUser("owner-1"), snapshot: async () => context };
}

test("analysis uses canonical context, returns a typed card, and advances one milestone", async () => {
  const { state, snapshot } = setup();
  const provider = vi.fn().mockResolvedValue({ suggestions: [point] });
  const result = await analyzeChapter("book-1", "chapter-1", request, state, { snapshot }, provider);
  expect(provider.mock.calls[0][2].world.id).toBe("world-1");
  expect(result.completedMilestone).toBe(1);
  expect(result.suggestions[0]).toMatchObject({ kind: "chapter_point", chapterId: "chapter-1" });
  expect(result.suggestions[0].suggestionId).toMatch(/^[0-9a-f-]{36}$/);
  expect(validateSuccessResponse("/api/books/book-1/chapters/chapter-1/ai-suggestions", "POST", { data: result }))
    .toMatchObject({ data: { completedMilestone: 1 } });
  await expect(analyzeChapter("book-1", "chapter-1", request, state, { snapshot }, provider))
    .rejects.toMatchObject({ status: 429 });
});

test("invalid input never consumes a dispatch, provider failure does", async () => {
  const { state, snapshot } = setup();
  const provider = vi.fn().mockRejectedValue(new Error("timeout"));
  await expect(analyzeChapter("book-1", "chapter-1", { ...request, text: text.split(" ").slice(0, 499).join(" ") }, state, { snapshot }, provider))
    .rejects.toMatchObject({ status: 422 });
  expect(provider).not.toHaveBeenCalled();
  await expect(analyzeChapter("book-1", "chapter-1", request, state, { snapshot }, provider)).rejects.toThrow("timeout");
  await expect(analyzeChapter("book-1", "chapter-1", request, state, { snapshot }, provider))
    .rejects.toMatchObject({ status: 429 });
});

test("foreign targets are omitted and malformed envelopes fail closed", () => {
  expect(safeSuggestions({ suggestions: [
    { ...point, chapterId: "foreign-chapter" },
    { kind: "character", action: "update", targetEntityId: "foreign", expectedTargetUpdatedAt: "2026-10-15T00:00:00Z", changes: { name: "Other" }, summary: "Change name", sourceExcerpt: null },
    { ...point, changes: { content: "A new clue", hiddenCommand: "delete" } },
    point,
  ] }, context, "chapter-1", text)).toHaveLength(1);
  expect(() => safeSuggestions({ suggestions: "broken" }, context, "chapter-1", text)).toThrow();
  expect(() => safeSuggestions({ suggestions: [], extra: "untrusted" }, context, "chapter-1", text)).toThrow();
  expect(safeSuggestions({ suggestions: Array(9).fill(point) }, context, "chapter-1", text)).toHaveLength(1);
});

test("model cannot propose creating an existing character again", () => {
  const duplicate = {
    kind: "character", action: "create", targetEntityId: null, expectedTargetUpdatedAt: null,
    changes: { name: " mara " }, summary: "Add Mara again", sourceExcerpt: "Mara",
  };
  expect(safeSuggestions({ suggestions: [duplicate] }, context, "chapter-1", "Mara returned.")).toHaveLength(0);
});

test("saved world facts are omitted, but a missing character remains actionable", () => {
  const kael = { kind: "character", action: "create", targetEntityId: null, expectedTargetUpdatedAt: null,
    changes: { name: "Kael" }, summary: "Add Kael", sourceExcerpt: "Kael" };
  expect(safeSuggestions({ suggestions: [kael] }, context, "chapter-1", "Kael returned.")).toHaveLength(1);
  const populated = { ...context, characters: [...context.characters,
    { entityId: "character-2", name: "Kael", updatedAt: "2026-10-15T00:00:00Z" }],
    chapterPoints: [{ chapterId: "chapter-1", chapterName: "Intro", point: { id: "point-1", chapterId: "chapter-1", content: "A new clue", position: 0 } }],
  };
  expect(safeSuggestions({ suggestions: [kael, point] }, populated, "chapter-1", "Kael found a new clue.")).toHaveLength(0);
});

test("declines survive a new request session and suppress the next review", async () => {
  vi.stubEnv("AI_BASE_URL", "http://localhost:11434/v1");
  vi.stubEnv("AI_MODEL", "test-model");
  let now = Date.parse("2026-10-15T00:00:00Z");
  const store = new InMemoryAiStateStore(() => now);
  store.registerChapter("owner-1", "book-1", "chapter-1", 0);
  const first = await analyzeChapter("book-1", "chapter-1", request, store.forUser("owner-1"),
    { snapshot: async () => context }, vi.fn().mockResolvedValue({ suggestions: [point] }));
  const card = first.suggestions[0];
  expect(suggestionFingerprint(card)).toMatch(/^[0-9a-f]{64}$/);
  await expect(declineSuggestion("book-1", "chapter-1", { suggestion: card }, store.forUser("owner-1")))
    .resolves.toEqual({ declined: true });
  expect(await store.forUser("owner-1").declined("book-1", "chapter-1")).toContain(suggestionFingerprint(card));
  now += 300_001;
  const second = await analyzeChapter("book-1", "chapter-1", { ...request, checkpointVersion: 1 },
    store.forUser("owner-1"), { snapshot: async () => context },
    vi.fn().mockResolvedValue({ suggestions: [point] }));
  expect(second.suggestions).toEqual([]);
  await expect(declineSuggestion("book-1", "chapter-1", { suggestion: card }, store.forUser("other")))
    .rejects.toMatchObject({ status: 404 });
});

test("repeated model cards collapse to one actionable suggestion", async () => {
  const { state, snapshot } = setup();
  const result = await analyzeChapter("book-1", "chapter-1", request, state, { snapshot },
    vi.fn().mockResolvedValue({ suggestions: Array(9).fill(point) }));
  expect(result.completedMilestone).toBe(1);
  expect(result.suggestions).toHaveLength(1);
});

test("one adapter accepts Ollama and Groq chat-completion envelopes", async () => {
  const payload = JSON.stringify({ choices: [{ message: { content: JSON.stringify({ suggestions: [point] }) } }] });
  for (const base of ["http://localhost:11434/v1", "https://api.groq.com/openai/v1"]) {
    vi.stubEnv("AI_BASE_URL", base);
    vi.stubEnv("AI_MODEL", "test-model");
    vi.stubEnv("AI_API_KEY", "test-secret");
    const config = aiProviderConfig();
    const fetcher = vi.fn().mockResolvedValue(new Response(payload));
    expect(await requestAiSuggestions(config, text, context, "chapter-1", fetcher)).toMatchObject({ suggestions: [point] });
    expect(fetcher.mock.calls[0][0]).toBe(`${base}/chat/completions`);
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe(base.includes("groq") ? "Bearer test-secret" : undefined);
  }
});

test("provider prompt classifies named swords as items and uses real entity fields", async () => {
  const { snapshot } = setup();
  const payload = JSON.stringify({ choices: [{ message: { content: JSON.stringify({ suggestions: [] }) } }] });
  const fetcher = vi.fn().mockResolvedValue(new Response(payload));
  await requestAiSuggestions(aiProviderConfig(), text, await snapshot(), "chapter-1", fetcher);
  const body = JSON.parse(fetcher.mock.calls[0][1].body) as { messages: Array<{ content: string }> };
  const prompt = body.messages[0].content;
  expect(prompt).toContain("A sword, ring, letter or ship is an item, never a character");
  expect(prompt).toContain("character: name, age, health, distinctions, traits, mutations, status");
  expect(prompt).toContain("item: name, status, power, wielderEntityId");
  expect(prompt).toContain("manualWielderName");
  expect(prompt).toContain("Kael drew Dawnbreaker from its sheath");
});

test("Ollama endpoint uses the loopback URL and port configured in AI_BASE_URL", () => {
  vi.stubEnv("AI_BASE_URL", "http://127.0.0.1:11435/v1");
  vi.stubEnv("AI_MODEL", "test-model");
  expect(aiProviderConfig().endpoint).toBe("http://127.0.0.1:11435/v1/chat/completions");
  for (const base of ["http://127.0.0.1:11435/private", "http://user@127.0.0.1:11435/v1", "http://169.254.169.254:11435/v1"]) {
    vi.stubEnv("AI_BASE_URL", base);
    expect(() => aiProviderConfig()).toThrow();
  }
});

test("provider rejects malformed, oversized, timed-out output and arbitrary destinations", async () => {
  vi.stubEnv("AI_BASE_URL", "http://169.254.169.254/v1");
  vi.stubEnv("AI_MODEL", "test-model");
  expect(() => aiProviderConfig()).toThrow();
  vi.stubEnv("AI_BASE_URL", "http://localhost:11434/v1");
  const config = aiProviderConfig();
  for (const result of [
    new Response("truncated"),
    new Response("x".repeat(129 * 1024)),
  ]) {
    await expect(requestAiSuggestions(config, text, context, "chapter-1", vi.fn().mockResolvedValue(result)))
      .rejects.toMatchObject({ status: 502 });
  }
  await expect(requestAiSuggestions(config, text, context, "chapter-1", vi.fn().mockRejectedValue(new Error("timeout"))))
    .rejects.toMatchObject({ status: 502 });
});
