import { describe, expect, test } from "vitest";
import { selectVisibleSections } from "@/src/lib/sectionRecency";

describe("section recency", () => {
  test("orders timestamped sections newest-first and keeps empty sections stable", () => {
    const sections = [
      { key: "characters", updatedAt: "2026-01-02T00:00:00.000Z" },
      { key: "places", updatedAt: undefined },
      { key: "items", updatedAt: "2026-01-04T00:00:00.000Z" },
      { key: "custom:a", updatedAt: undefined },
      { key: "custom:b", updatedAt: "2026-01-03T00:00:00.000Z" },
    ];

    expect(
      selectVisibleSections(sections, (section) => section.updatedAt).map(
        (section) => section.key,
      ),
    ).toEqual(["items", "custom:b", "characters", "places"]);
  });

  test("invalid timestamps behave like empty sections", () => {
    const sections = [
      { key: "characters", updatedAt: "invalid" },
      { key: "places", updatedAt: undefined },
    ];
    expect(selectVisibleSections(sections, (section) => section.updatedAt)).toEqual(
      sections,
    );
  });
});
