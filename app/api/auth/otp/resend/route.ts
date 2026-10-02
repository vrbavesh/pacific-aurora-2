import { NextResponse } from "next/server";
import {
  ApiError,
  errorResponse,
  RateLimitError,
} from "@/src/lib/api/errors";
import { anonClient } from "@/src/lib/api/session";
import { readJson, requireString } from "@/src/server/http";
import { checkResendCooldown } from "@/src/server/auth/resend-cooldown";

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const email = requireString(body, "email");
    const type = body.type === "recovery" ? "recovery" : "signup";
    checkResendCooldown(`${type}:${email}`);
    const client = anonClient();
    if (type === "recovery") {
      const { error } = await client.auth.resetPasswordForEmail(email);
      if (error) throw new ApiError((error.status ?? 500) as number, "resend_failed", error.message);
    } else {
      const { error } = await client.auth.resend({ type: "signup", email });
      if (error) {
        if (/rate limit/i.test(error.message)) throw new RateLimitError(error.message);
        throw new ApiError((error.status ?? 500) as number, "resend_failed", error.message);
      }
    }
    return NextResponse.json({ data: { message: "Code resent" } });
  } catch (e) {
    return errorResponse(e);
  }
}
