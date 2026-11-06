import type { Chapter } from "@/src/lib/api/generated";

export type BookFormat = "epub" | "pdf" | "docx";

type Node = { type?: string; text?: string; attrs?: Record<string, unknown>; marks?: { type: string; attrs?: Record<string, unknown> }[]; content?: Node[] };
type Block = { kind: "paragraph" | "heading" | "list" | "code"; text: string; runs: { text: string; bold: boolean; italic: boolean; underline: boolean; strike: boolean }[]; level?: number; ordered?: boolean; index?: number };

const xml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!);
const nodes = (value: unknown): Node[] => Array.isArray(value) ? value as Node[] : [];

function blocks(content: Chapter["content"]): Block[] {
  const result: Block[] = [];
  const visit = (node: Node, list?: "bullet" | "ordered", index = 0) => {
    if (node.type === "doc" || node.type === "blockquote" || node.type === "bulletList" || node.type === "orderedList") {
      const childList = node.type === "bulletList" ? "bullet" : node.type === "orderedList" ? "ordered" : list;
      nodes(node.content).forEach((child, i) => visit(child, childList, i));
      return;
    }
    if (node.type === "listItem") {
      nodes(node.content).forEach((child) => visit(child, list, index));
      return;
    }
    if (!["paragraph", "heading", "codeBlock"].includes(node.type ?? "")) return;
    const runs: Block["runs"] = [];
    const inline = (item: Node) => {
      if (item.type === "hardBreak") { runs.push({ text: "\n", bold: false, italic: false, underline: false, strike: false }); return; }
      if (item.type === "text") {
        const marks = new Set(item.marks?.map((mark) => mark.type));
        runs.push({ text: item.text ?? "", bold: marks.has("bold"), italic: marks.has("italic"), underline: marks.has("underline"), strike: marks.has("strike") });
      } else nodes(item.content).forEach(inline);
    };
    nodes(node.content).forEach(inline);
    const prefix = list === "ordered" ? `${index + 1}. ` : list === "bullet" ? "• " : "";
    result.push({ kind: list ? "list" : node.type === "heading" ? "heading" : node.type === "codeBlock" ? "code" : "paragraph", text: prefix + runs.map((run) => run.text).join(""), runs, level: typeof node.attrs?.level === "number" ? node.attrs.level : 1, ordered: list === "ordered", index });
  };
  nodes((content as Node | undefined)?.content).forEach((node) => visit(node));
  return result;
}

function chapterMarkup(chapter: Chapter): string {
  const body = blocks(chapter.content).map((block) => {
    const tag = block.kind === "heading" ? `h${Math.min(3, Math.max(1, block.level ?? 1))}` : "p";
    const content = block.runs.map((run) => {
      let text = xml(run.text).replace(/\n/g, "<br/>");
      if (run.bold) text = `<strong>${text}</strong>`;
      if (run.italic) text = `<em>${text}</em>`;
      if (run.underline) text = `<u>${text}</u>`;
      if (run.strike) text = `<s>${text}</s>`;
      return text;
    }).join("");
    return `<${tag}>${block.kind === "list" ? (block.ordered ? `${(block.index ?? 0) + 1}. ` : "• ") : ""}${content}</${tag}>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${xml(chapter.name ?? "Chapter")}</title><link rel="stylesheet" href="style.css"/></head><body><h1>${xml(chapter.name ?? "Chapter")}</h1>${body}</body></html>`;
}

async function epub(name: string, chapters: Chapter[]): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file("META-INF/container.xml", `<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
  zip.file("OEBPS/style.css", "body{font-family:serif;line-height:1.6;margin:5%}h1{page-break-before:always}p{margin:0 0 1em}");
  zip.file("OEBPS/nav.xhtml", `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>${xml(name)}</title></head><body><nav epub:type="toc"><h1>Contents</h1><ol>${chapters.map((chapter, i) => `<li><a href="chapter-${i + 1}.xhtml">${xml(chapter.name ?? `Chapter ${i + 1}`)}</a></li>`).join("")}</ol></nav></body></html>`);
  chapters.forEach((chapter, i) => zip.file(`OEBPS/chapter-${i + 1}.xhtml`, chapterMarkup(chapter)));
  const manifest = chapters.map((_, i) => `<item id="chapter-${i + 1}" href="chapter-${i + 1}.xhtml" media-type="application/xhtml+xml"/>`).join("");
  const spine = chapters.map((_, i) => `<itemref idref="chapter-${i + 1}"/>`).join("");
  zip.file("OEBPS/content.opf", `<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="id">urn:uuid:${crypto.randomUUID()}</dc:identifier><dc:title>${xml(name)}</dc:title><dc:language>en</dc:language><meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, "Z")}</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="style" href="style.css" media-type="text/css"/>${manifest}</manifest><spine>${spine}</spine></package>`);
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", mimeType: "application/epub+zip" });
}

async function docx(name: string, chapters: Chapter[]): Promise<Blob> {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");
  const children = chapters.flatMap((chapter, index) => [
    new Paragraph({ text: chapter.name ?? `Chapter ${index + 1}`, heading: HeadingLevel.HEADING_1, pageBreakBefore: index > 0 }),
    ...blocks(chapter.content).map((block) => new Paragraph({
      heading: block.kind === "heading" ? HeadingLevel.HEADING_2 : undefined,
      children: block.runs.length ? [...(block.kind === "list" && block.ordered ? [new TextRun(`${(block.index ?? 0) + 1}. `)] : []), ...block.runs.map((run) => new TextRun({ text: run.text, bold: run.bold, italics: run.italic, underline: run.underline ? {} : undefined, strike: run.strike }))] : [new TextRun("")],
      bullet: block.kind === "list" && !block.ordered ? { level: 0 } : undefined,
    })),
  ]);
  return Packer.toBlob(new Document({ title: name, sections: [{ children }] }));
}

async function pdf(name: string, chapters: Chapter[]): Promise<Blob> {
  // shortcut: PDF exports readable text and chapter breaks; add styled runs when print fidelity is required.
  const [{ PDFDocument, rgb }, fontkit] = await Promise.all([import("pdf-lib"), import("@pdf-lib/fontkit")]);
  const fontResponse = await fetch("/fonts/noto-sans-latin-400-normal.woff");
  if (!fontResponse.ok) throw new Error("The PDF font is unavailable.");
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit.default);
  const font = await document.embedFont(await fontResponse.arrayBuffer());
  const supported = new Set(font.getCharacterSet());
  document.setTitle(name);
  const width = 595.28, height = 841.89, margin = 52, leading = 17;
  let page = document.addPage([width, height]), y = height - margin;
  const line = (value: string, size = 11) => {
    if ([...value].some((char) => !supported.has(char.codePointAt(0)!))) {
      throw new Error("PDF cannot represent some characters in this book. Try EPUB or DOCX.");
    }
    if (y < margin + leading) { page = document.addPage([width, height]); y = height - margin; }
    page.drawText(value, { x: margin, y, font, size, color: rgb(0.12, 0.14, 0.16) });
    y -= size === 18 ? 28 : leading;
  };
  const paragraph = (value: string, size = 11) => {
    let current = "";
    const maxWidth = width - 2 * margin;
    for (const word of value.split(/\s+/)) {
      let remainder = word;
      while (remainder) {
        const next = current ? `${current} ${remainder}` : remainder;
        if (font.widthOfTextAtSize(next, size) <= maxWidth) { current = next; break; }
        if (current) { line(current, size); current = ""; continue; }
        let end = 1;
        while (end < remainder.length && font.widthOfTextAtSize(remainder.slice(0, end + 1), size) <= maxWidth) end++;
        line(remainder.slice(0, end), size);
        remainder = remainder.slice(end);
      }
    }
    if (current) line(current, size);
    y -= 8;
  };
  chapters.forEach((chapter, index) => {
    if (index) { page = document.addPage([width, height]); y = height - margin; }
    paragraph(chapter.name ?? `Chapter ${index + 1}`, 18);
    blocks(chapter.content).forEach((block) => paragraph(block.text, block.kind === "heading" ? 14 : 11));
  });
  return new Blob([new Uint8Array(await document.save())], { type: "application/pdf" });
}

export async function createBookExport(name: string, chapters: Chapter[], format: BookFormat): Promise<Blob> {
  // shortcut: browser memory holds the whole export, use streaming for very large books.
  const ordered = [...chapters].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  if (format === "epub") return epub(name, ordered);
  if (format === "docx") return docx(name, ordered);
  return pdf(name, ordered);
}
