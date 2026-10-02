import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";

test("contract artifact exists and declares OpenAPI", () => {
  const path = "contracts/pacific-aurora.openapi.yaml";
  expect(existsSync(path)).toBe(true);
  const text = readFileSync(path, "utf8");
  expect(text).toContain("openapi: 3.1.0");
  expect(text).toContain("/auth/signup");
  expect(text).toContain("/worlds/{worldId}/relationships");
});
