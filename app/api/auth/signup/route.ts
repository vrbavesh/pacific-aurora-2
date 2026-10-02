import { NextResponse } from "next/server";
import {
  ApiError,
  ConflictError,
  errorResponse,
  RateLimitError,
  ValidationError,
} from "@/src/lib/api/errors";
import { anonClient } from "@/src/lib/api/session";
import { readJson, requireString } from "@/src/server/http";

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const email = requireString(body, "email");
    const password = requireString(body, "password");
    const client = anonClient();
    const { error } = await client.auth.signUp({ email, password });
    if (error) {
      const m = error.message;
      if (/already registered|already exists|duplicate/i.test(m)) {
        throw new ConflictError("An account with this email already exists");
      }
      if (/rate limit/i.test(m)) throw new RateLimitError(m);
      if (error.status === 422) throw new ValidationError(m);
      throw new ApiError((error.status ?? 500) as number, "signup_failed", m);
    }
    return NextResponse.json(
      { data: { message: "Verification code sent to your email" } },
      { status: 201 },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
