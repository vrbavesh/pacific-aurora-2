import { NextResponse } from "next/server";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Resource not found") {
    super(404, "not_found", message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends ApiError {
  constructor(message = "Conflict", details?: unknown) {
    super(409, "conflict", message, details);
    this.name = "ConflictError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Authentication required") {
    super(401, "unauthorized", message);
    this.name = "UnauthorizedError";
  }
}

export class ValidationError extends ApiError {
  constructor(message = "Request validation failed", details?: unknown) {
    super(422, "validation_error", message, details);
    this.name = "ValidationError";
  }
}

export class RateLimitError extends ApiError {
  constructor(message = "Too many requests") {
    super(429, "rate_limited", message);
    this.name = "RateLimitError";
  }
}

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    const headers: Record<string, string> = {};
    if (err instanceof RateLimitError) headers["Retry-After"] = "120";
    return NextResponse.json(
      {
        error: {
          code: err.code,
          message: err.message,
          details: (err as ApiError).details ?? null,
        },
      },
      { status: err.status, headers },
    );
  }
  console.error("Unhandled error", err);
  return NextResponse.json(
    { error: { code: "internal_error", message: "Internal server error" } },
    { status: 500 },
  );
}
