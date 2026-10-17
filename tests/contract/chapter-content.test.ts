import { expect, test } from "vitest";
import { optionalChapterContent } from "@/src/server/chapter-content";

test("accepts existing TipTap text and V2 formatting marks", () => {
  const document = {
    type: "doc",
    content: [{ type: "paragraph", attrs: { textAlign: "center" }, content: [
      { type: "text", text: "Chapter", marks: [
        { type: "textStyle", attrs: { fontFamily: "Georgia, serif", fontSize: "18px" } },
      ] },
    ] }],
  };
  expect(optionalChapterContent(document)).toBe(document);
});

test("rejects invalid and excessively deep manuscript trees", () => {
  expect(() => optionalChapterContent({ nope: true })).toThrow("TipTap document");
  expect(() => optionalChapterContent({ type: "doc", content: [{ type: "script" }] }))
    .toThrow("unsupported");
  let child: object = { type: "text", text: "deep" };
  for (let i = 0; i < 34; i++) child = { type: "blockquote", content: [child] };
  expect(() => optionalChapterContent({ type: "doc", content: [child] }))
    .toThrow("oversized");
});

test("rejects executable links in manuscript JSON", () => {
  expect(() => optionalChapterContent({
    type: "doc", content: [{ type: "paragraph", content: [{
      type: "text", text: "bad", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }],
    }] }],
  })).toThrow("unsupported mark");
});
