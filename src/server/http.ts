import { ApiError, ValidationError } from "@/src/lib/api/errors";

const MAX_JSON_BYTES = 2 * 1024 * 1024;
const MAX_NAME_LENGTH = 120;

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  const length = Number(req.headers.get("content-length"));
  if (length > MAX_JSON_BYTES) throw new ApiError(413, "payload_too_large", "Request is too large");
  try {
    const reader = req.body?.getReader();
    if (!reader) throw new Error("Missing request body");
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_JSON_BYTES) {
        await reader.cancel();
        throw new ApiError(413, "payload_too_large", "Request is too large");
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const b = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    if (typeof b !== "object" || b === null || Array.isArray(b)) throw new ApiError(400, "bad_request", "Expected a JSON object");
    return b as Record<string, unknown>;
  } catch (error) {
    if (error instanceof ApiError && error.status === 413) throw error;
    throw new ApiError(400, "bad_request", "Expected a valid JSON object");
  }
}

export function requireName(body: Record<string, unknown>): string {
  const n = body.name;
  if (typeof n !== "string" || n.trim().length === 0 || n.length > MAX_NAME_LENGTH) {
    throw new ValidationError("name must be 1-120 characters");
  }
  return n;
}

export function optionalName(body: Record<string, unknown>): string | undefined {
  const n = body.name;
  if (n === undefined) return undefined;
  if (typeof n !== "string" || n.trim().length === 0 || n.length > MAX_NAME_LENGTH) {
    throw new ValidationError("name must be 1-120 characters");
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
