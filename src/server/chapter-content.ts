import { ValidationError } from "@/src/lib/api/errors";

const NODE_TYPES = new Set([
  "doc", "paragraph", "text", "heading", "bulletList", "orderedList",
  "listItem", "blockquote", "codeBlock", "hardBreak", "horizontalRule",
]);
const MARK_TYPES = new Set(["bold", "italic", "underline", "strike", "code", "link", "textStyle"]);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function attributes(value: unknown): boolean {
  return value === undefined || (record(value) && Object.values(value).every(
    (item) => item === null || typeof item === "boolean" ||
      (typeof item === "number" && Number.isFinite(item)) ||
      (typeof item === "string" && item.length <= 256),
  ));
}

function validMark(mark: unknown): boolean {
  if (!record(mark) || !MARK_TYPES.has(String(mark.type)) || !attributes(mark.attrs)) return false;
  if (mark.type !== "link") return true;
  const href = record(mark.attrs) ? mark.attrs.href : undefined;
  if (typeof href !== "string") return false;
  try {
    const url = new URL(href);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function optionalChapterContent(value: unknown): object | undefined {
  if (value === undefined) return undefined;
  if (!record(value) || value.type !== "doc" || !Array.isArray(value.content)) {
    throw new ValidationError("content must be a TipTap document");
  }
  const pending: Array<{ node: unknown; depth: number }> = [{ node: value, depth: 0 }];
  let count = 0;
  while (pending.length) {
    const { node, depth } = pending.pop()!;
    if (++count > 20_000 || depth > 32 || !record(node) || !NODE_TYPES.has(String(node.type)) || !attributes(node.attrs)) {
      throw new ValidationError("content contains an unsupported or oversized node");
    }
    if (node.marks !== undefined && (!Array.isArray(node.marks) || !node.marks.every(validMark))) {
      throw new ValidationError("content contains an unsupported mark");
    }
    if (node.type === "text") {
      if (typeof node.text !== "string" || node.content !== undefined) {
        throw new ValidationError("content contains invalid text");
      }
    } else if (node.content !== undefined) {
      if (!Array.isArray(node.content)) throw new ValidationError("content contains invalid children");
      for (const child of node.content) pending.push({ node: child, depth: depth + 1 });
    }
  }
  return value;
}
