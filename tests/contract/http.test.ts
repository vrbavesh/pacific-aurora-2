import { expect, test } from "vitest";
import { optionalInt, optionalString, readJson, requireName } from "@/src/server/http";

test("explicit null clears an optional field while omission leaves it unchanged", () => {
  expect(
    optionalString({ wielderEntityId: null }, "wielderEntityId"),
  ).toBeNull();
  expect(optionalString({}, "wielderEntityId")).toBeUndefined();
});

test("integer fields reject fractions instead of silently truncating", () => {
  expect(() => optionalInt({ age: 12.5 }, "age", 0)).toThrow("integer");
  expect(optionalInt({ age: 12 }, "age", 0)).toBe(12);
});

test.each(["{", "[]", "null", '"text"'])(
  "malformed or non-object JSON returns 400: %s",
  async (body) => {
    await expect(
      readJson(new Request("http://localhost", { method: "POST", body })),
    ).rejects.toMatchObject({ status: 400 });
  },
);

test("limits streamed JSON even without a trustworthy content-length", async () => {
  const request = new Request("http://localhost", {
    method: "POST",
    body: JSON.stringify({ content: "x".repeat(2 * 1024 * 1024) }),
  });
  await expect(readJson(request)).rejects.toMatchObject({ status: 413 });
});

test("rejects names too long to store and render safely", () => {
  expect(() => requireName({ name: "x".repeat(121) })).toThrow("1-120");
});
