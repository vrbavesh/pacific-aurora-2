import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import {
  PostBooksBookIdChaptersChapterIdAiSuggestionsBody,
  PostBooksBookIdChaptersChapterIdAiSuggestionsApplyBody,
} from "@/src/lib/api/schemas";
import {
  ApiContractError,
  validateSuccessResponse,
} from "@/src/lib/api/response-validation";

const root = "/api/books/book-1/chapters/chapter-1/ai-suggestions";
const eligibility = {
  data: {
    completedMilestone: 0,
    nextEligibleAt: null,
    checkpointVersion: 0,
  },
};
const chapterPoint = {
  suggestionId: "746e064e-2731-45e6-8786-158d5a62d3da",
  kind: "chapter_point",
  action: "add_point",
  chapterId: "chapter-1",
  changes: { content: "The north gate opens at dawn." },
  summary: "Add a chapter timeline point",
  sourceExcerpt: "The north gate opened at dawn.",
};
const context = {
  world: { id: "world-1", name: "North Reach" },
  characters: [],
  places: [],
  items: [],
  customEntityTypes: [],
  customEntities: [],
  relationships: [],
  chapterPoints: [],
  characterTimelinePoints: [],
};

test("AI eligibility and empty results validate against generated response schemas", () => {
  expect(
    validateSuccessResponse(`${root}/eligibility`, "GET", eligibility),
  ).toEqual(eligibility);
  expect(
    validateSuccessResponse(root, "POST", {
      data: { suggestions: [], ...eligibility.data },
    }),
  ).toEqual({ data: { suggestions: [], ...eligibility.data } });
});

test("AI analysis request requires a 500-word milestone without trusting browser context", () => {
  const request = {
    text: "An excerpt from the current manuscript.",
    wordCount: 500,
    milestone: 1,
    checkpointVersion: 0,
  };
  expect(
    PostBooksBookIdChaptersChapterIdAiSuggestionsBody.safeParse(request).success,
  ).toBe(true);
  expect(
    PostBooksBookIdChaptersChapterIdAiSuggestionsBody.safeParse({
      ...request,
      wordCount: 499,
    }).success,
  ).toBe(false);
  expect(
    PostBooksBookIdChaptersChapterIdAiSuggestionsBody.safeParse({
      ...request,
      context,
    }).success,
  ).toBe(true);
});

test("AI suggestion cards and apply receipts use typed generated schemas", () => {
  const result = {
    data: {
      suggestions: [chapterPoint],
      completedMilestone: 1,
      nextEligibleAt: "2026-10-13T12:05:00.000Z",
      checkpointVersion: 1,
    },
  };
  expect(validateSuccessResponse(root, "POST", result)).toEqual(result);
  expect(
    PostBooksBookIdChaptersChapterIdAiSuggestionsApplyBody.safeParse({
      suggestion: chapterPoint,
    }).success,
  ).toBe(true);
  expect(
    validateSuccessResponse(`${root}/apply`, "POST", {
      data: {
        suggestionId: chapterPoint.suggestionId,
        kind: "chapter_point",
        resourceId: "point-1",
      },
    }),
  ).toMatchObject({ data: { resourceId: "point-1" } });
  expect(validateSuccessResponse(`${root}/decline`, "POST", { data: { declined: true } }))
    .toEqual({ data: { declined: true } });
});

test("malformed model-shaped suggestions fail closed at the response boundary", () => {
  for (const malformed of [
    { ...chapterPoint, kind: "unknown" },
    { ...chapterPoint, suggestionId: "not-a-uuid" },
    { ...chapterPoint, changes: {} },
  ]) {
    expect(() =>
      validateSuccessResponse(root, "POST", {
        data: {
          suggestions: [malformed],
          ...eligibility.data,
        },
      }),
    ).toThrow(ApiContractError);
  }
  expect(() =>
    validateSuccessResponse(root, "POST", {
      data: {
        suggestions: Array.from({ length: 9 }, () => chapterPoint),
        ...eligibility.data,
      },
    }),
  ).toThrow(ApiContractError);
});

test("AI operations declare auth, ownership, stale, cooldown, and provider failures", () => {
  const contract = readFileSync("contracts/pacific-aurora.openapi.yaml", "utf8");
  expect(contract).toContain("/ai-suggestions/eligibility:");
  expect(contract).toContain("/ai-suggestions/apply:");
  expect(contract).toContain("/ai-suggestions/decline:");
  expect(contract).toContain("'404': { $ref: '#/components/responses/NotFound' }");
  expect(contract).toContain("'409': { $ref: '#/components/responses/Conflict' }");
  expect(contract).toContain("'429': { $ref: '#/components/responses/AiRateLimited' }");
  expect(contract).toContain("'503': { $ref: '#/components/responses/AiProviderUnavailable' }");
  expect(contract).toContain("One provider dispatch per user per five minutes");
});
