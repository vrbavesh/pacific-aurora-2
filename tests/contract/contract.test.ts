import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";
import {
  ApiContractError,
  validateSuccessResponse,
} from "@/src/lib/api/response-validation";

test("contract artifact exists and declares OpenAPI", () => {
  const path = "contracts/pacific-aurora.openapi.yaml";
  expect(existsSync(path)).toBe(true);
  const text = readFileSync(path, "utf8");
  expect(text).toContain("openapi: 3.1.0");
  expect(text).toContain("/auth/signup");
  expect(text).toContain("/worlds/{worldId}/relationships");
});

test("runtime validation uses the generated operation response schemas", () => {
  expect(
    validateSuccessResponse("/api/worlds", "GET", {
      data: [
        {
          id: "world",
          name: "Aurora",
          updatedAt: "2026-10-10T00:00:00.000Z",
        },
      ],
    }),
  ).toMatchObject({ data: [{ id: "world" }] });

  expect(() =>
    validateSuccessResponse("/api/worlds", "GET", {
      data: [{ updatedAt: "not-a-timestamp" }],
    }),
  ).toThrow(ApiContractError);
});

test("runtime validation covers dynamic routes and empty 204 responses", () => {
  expect(
    validateSuccessResponse(
      "/api/books/book/chapters/chapter/important-points",
      "GET",
      { data: [] },
    ),
  ).toEqual({ data: [] });
  expect(validateSuccessResponse("/api/books/book", "DELETE", undefined)).toBe(
    undefined,
  );
});

test("unregistered API operations fail closed", () => {
  expect(() =>
    validateSuccessResponse("/api/not-in-the-contract", "GET", { data: [] }),
  ).toThrow("No generated response schema");
});
