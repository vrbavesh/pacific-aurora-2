import { NextResponse } from "next/server";
import { errorResponse, RateLimitError } from "@/src/lib/api/errors";
import { anonClient } from "@/src/lib/api/session";
import { readJson, requireString } from "@/src/server/http";

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const email = requireString(body, "email");
    const client = anonClient();
    const { error } = await client.auth.resetPasswordForEmail(email);
    if (error && /rate limit/i.test(error.message)) {
      throw new RateLimitError(error.message);
    }
    // uniform response: never reveal whether the account exists
    return NextResponse.json({
      data: { message: "If an account exists, a reset code was sent" },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
