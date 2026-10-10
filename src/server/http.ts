import { ApiError, ValidationError } from "@/src/lib/api/errors";

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    if (typeof b !== "object" || b === null || Array.isArray(b)) throw new ApiError(400, "bad_request", "Expected a JSON object");
    return b as Record<string, unknown>;
  } catch {
    throw new ApiError(400, "bad_request", "Expected a valid JSON object");
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
): string | null | undefined {
  const v = body[field];
  if (v === undefined || v === null) return v;
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
  if (typeof v !== "number" || !Number.isInteger(v)) {
    throw new ValidationError(`${field} must be an integer`);
  }
  if (min !== undefined && v < min) throw new ValidationError(`${field} must be >= ${min}`);
  if (max !== undefined && v > max) throw new ValidationError(`${field} must be <= ${max}`);
  return v;
}
