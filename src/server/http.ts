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

export function requireString(body: Record<string, unknown>, field: string): string {
  const v = body[field];
  if (typeof v !== "string" || v.trim().length === 0) {
    throw new ValidationError(`${field} is required`);
  }
  return v;
}

export function optionalString(
  body: Record<string, unknown>,
  field: string,
): string | undefined {
  const v = body[field];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string") throw new ValidationError(`${field} must be a string`);
  return v;
}

export function optionalInt(
  body: Record<string, unknown>,
  field: string,
  min?: number,
  max?: number,
): number | undefined {
  const v = body[field];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new ValidationError(`${field} must be a number`);
  }
  if (min !== undefined && v < min) throw new ValidationError(`${field} must be >= ${min}`);
  if (max !== undefined && v > max) throw new ValidationError(`${field} must be <= ${max}`);
  return Math.trunc(v);
}
