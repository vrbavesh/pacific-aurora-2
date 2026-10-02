import { NextResponse } from "next/server";
import { ApiError, errorResponse, UnauthorizedError } from "@/src/lib/api/errors";
import { anonClient } from "@/src/lib/api/session";
import { readJson, requireString } from "@/src/server/http";

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const email = requireString(body, "email");
    const otp = requireString(body, "otp");
    const newPassword = requireString(body, "newPassword");

    const client = anonClient();
    const { data, error } = await client.auth.verifyOtp({
      type: "recovery",
      email,
      token: otp,
    });
    if (error) {
      const m = error.message;
      if (/expired|expires/i.test(m)) {
        throw new ApiError(410, "otp_expired", "The code has expired. Request a new one.");
      }
      if (/invalid|token not found/i.test(m)) {
        throw new UnauthorizedError(m);
      }
      throw new ApiError((error.status ?? 500) as number, "reset_failed", m);
    }
    const { error: upErr } = await client.auth.updateUser({ password: newPassword });
    if (upErr) {
      throw new ApiError((upErr.status ?? 500) as number, "update_failed", upErr.message);
    }
    return NextResponse.json({
      data: { message: "Password updated. You are signed in.", session: data.session, user: data.user },
    });
  } catch (e) {
    return errorResponse(e);
  }
}
