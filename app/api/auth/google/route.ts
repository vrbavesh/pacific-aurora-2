import { NextResponse } from "next/server";
import { errorResponse, UnauthorizedError } from "@/src/lib/api/errors";
import { anonClient } from "@/src/lib/api/session";
import { readJson, requireString } from "@/src/server/http";

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const credential = requireString(body, "credential");
    const client = anonClient();
    const { data, error } = await client.auth.signInWithIdToken({
      provider: "google",
      token: credential,
    });
    if (error) throw new UnauthorizedError("Google sign-in failed");
    return NextResponse.json({ data: { session: data.session, user: data.user } });
  } catch (e) {
    return errorResponse(e);
  }
}
