import { ValidationError } from "@/src/lib/api/errors";

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    return typeof b === "object" && b !== null ? (b as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function requireName(body: Record<string, unknown>): string {
  const n = body.name;
  if (typeof n !== "string" || n.trim().length === 0) {
    throw new ValidationError("name is required");
  }
  return n;
}

export function optionalName(body: Record<string, unknown>): string | undefined {
  const n = body.name;
  if (n === undefined) return undefined;
  if (typeof n !== "string" || n.trim().length === 0) {
    throw new ValidationError("name must be a non-empty string");
  }
  return n;
}
