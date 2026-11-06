import { readFile } from "node:fs/promises";
import { expect, test, vi } from "vitest";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import type { Chapter } from "@/src/lib/api/generated";
import { createBookExport } from "@/src/lib/book-export";

const chapters: Chapter[] = [
  { name: "Second & Beyond", position: 1, content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "The end." }] }] } },
  { name: "First <Light>", position: 0, content: { type: "doc", content: [
    { type: "paragraph", content: [{ type: "text", text: "A quiet beginning.", marks: [{ type: "bold" }] }] },
    { type: "orderedList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "One step" }] }] }] },
  ] } },
];

test("EPUB contains ordered chapters, escaped titles, and manuscript text", async () => {
  const bytes = new Uint8Array(await (await createBookExport("A & B", chapters, "epub")).arrayBuffer());
  expect(new TextDecoder().decode(bytes.slice(30, 38))).toBe("mimetype");
  expect(new DataView(bytes.buffer).getUint16(8, true)).toBe(0);
  const zip = await JSZip.loadAsync(bytes);
  expect(await zip.file("mimetype")?.async("string")).toBe("application/epub+zip");
  expect(await zip.file("OEBPS/content.opf")?.async("string")).toContain("A &amp; B");
  const first = await zip.file("OEBPS/chapter-1.xhtml")?.async("string");
  expect(first).toContain("First &lt;Light&gt;");
  expect(first).toContain("<strong>A quiet beginning.</strong>");
  expect(first).toContain("1. One step");
  expect(await zip.file("OEBPS/chapter-2.xhtml")?.async("string")).toContain("The end.");
});

test("DOCX contains every chapter and its text", async () => {
  const zip = await JSZip.loadAsync(await (await createBookExport("A & B", chapters, "docx")).arrayBuffer());
  const xml = await zip.file("word/document.xml")?.async("string");
  expect(xml).toContain("First &lt;Light&gt;");
  expect(xml).toContain("A quiet beginning.");
  expect(xml).toContain("Second &amp; Beyond");
  expect(xml).toContain("The end.");
  expect(xml!.indexOf("First &lt;Light&gt;")).toBeLessThan(xml!.indexOf("Second &amp; Beyond"));
});

test("PDF creates a readable page per chapter", async () => {
  const font = await readFile("public/fonts/noto-sans-latin-400-normal.woff");
  vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array(font))));
  try {
    const blob = await createBookExport("A & B", chapters, "pdf");
    expect(blob.type).toBe("application/pdf");
    expect((await PDFDocument.load(await blob.arrayBuffer())).getPageCount()).toBe(2);
    await expect(createBookExport("A & B", [{ ...chapters[0], name: "Unsupported 😀" }], "pdf"))
      .rejects.toThrow("PDF cannot represent some characters");
  } finally {
    vi.unstubAllGlobals();
  }
});
