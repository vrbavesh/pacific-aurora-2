import { expect, test } from "vitest";
import { aiProviderConfig, requestAiSuggestions } from "@/src/server/ai-provider";
import { safeSuggestions } from "@/src/server/services/ai-analysis";
import type { AiWorldContext } from "@/src/lib/api/generated";

test.skipIf(process.env.RUN_LOCAL_OLLAMA_SMOKE !== "1")("local Ollama accepts the bounded production prompt", async () => {
  const context: AiWorldContext = {
    world: { id: "world-1", name: "The Tide Isles" },
    characters: [], places: [], items: [], customEntityTypes: [], customEntities: [],
    relationships: [], chapterPoints: [], characterTimelinePoints: [],
  };
  const text = Array.from({ length: 500 }, (_, index) =>
    ["Mara", "waited", "beside", "the", "quiet", "harbor"][index % 6]).join(" ");
  const config = aiProviderConfig();
  expect(config.endpoint).toBe(`${process.env.AI_BASE_URL?.replace(/\/$/, "")}/chat/completions`);
  let promptBytes = 0;
  const measuredFetch: typeof fetch = async (input, init) => {
    promptBytes = Buffer.byteLength(String(init?.body ?? ""));
    return fetch(input, init);
  };
  const started = performance.now();
  const result = await requestAiSuggestions(config, text, context, "chapter-1", measuredFetch);
  const durationMs = Math.round(performance.now() - started);
  const cards = safeSuggestions(result, context, "chapter-1", text);
  expect(cards).toBeInstanceOf(Array);
  expect(promptBytes).toBeLessThan(128 * 1024);
  console.info(`Ollama smoke: ${promptBytes} prompt bytes, ${durationMs} ms, ${cards.length} usable cards`);
}, 135_000);

test.skipIf(process.env.RUN_LOCAL_OLLAMA_SMOKE !== "1")("local Ollama classifies a named sword as an item", async () => {
  const context: AiWorldContext = {
    world: { id: "w1", name: "Aetheria" },
    characters: [{ entityId: "c1", name: "Kael", updatedAt: "2026-10-01T10:00:00Z" }],
    places: [], items: [], customEntityTypes: [], customEntities: [],
    relationships: [], chapterPoints: [], characterTimelinePoints: [],
  };
  const passage = "Kael reached the ruined Temple of Dawn, where a sword stood embedded in stone. When Kael touched the hilt, golden light filled the chamber. The blade spoke a single name: Dawnbringer.";
  const result = await requestAiSuggestions(aiProviderConfig(), passage, context, "chapter-1");
  const cards = safeSuggestions(result, context, "chapter-1", passage);
  expect(cards.some((card) => card.kind === "character" && card.changes.name === "Dawnbringer")).toBe(false);
  expect(cards.some((card) => card.kind === "character" && card.changes.name === "Kael")).toBe(false);
  expect(cards.some((card) => card.kind === "item" && card.changes.name === "Dawnbringer")).toBe(true);
  expect(cards.filter((card) => card.action === "create" || card.action === "update")
    .every((card) => card.sourceExcerpt && passage.includes(card.sourceExcerpt))).toBe(true);
}, 135_000);
