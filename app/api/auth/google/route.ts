import { NextResponse } from "next/server";
import { ConflictError, errorResponse, UnauthorizedError } from "@/src/lib/api/errors";
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
    const user = data.user;
    const providers = (user.identities ?? []).map((i) => i.provider);
    if (providers.includes("email")) {
      throw new ConflictError("An account with this email already exists");
    }
    return NextResponse.json({ data: { session: data.session, user } });
  } catch (e) {
    return errorResponse(e);
  }
}
