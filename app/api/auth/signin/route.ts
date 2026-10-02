import { NextResponse } from "next/server";
import { errorResponse, UnauthorizedError } from "@/src/lib/api/errors";
import { adminClient } from "@/src/lib/api/admin";
import { anonClient } from "@/src/lib/api/session";
import { readJson, requireString } from "@/src/server/http";

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const identifier = requireString(body, "identifier");
    const password = requireString(body, "password");

    let email: string | null = null;
    if (identifier.includes("@")) {
      email = identifier;
    } else {
      const admin = adminClient();
      if (admin) {
        const { data: prof } = await admin
          .from("profiles")
          .select("id")
          .eq("user_id", identifier)
          .maybeSingle();
        if (prof?.id) {
          const { data: u } = await admin.auth.admin.getUserById(prof.id as string);
          email = u?.user?.email ?? null;
        }
      }
    }
    if (!email) throw new UnauthorizedError("Invalid credentials");

    const client = anonClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new UnauthorizedError("Invalid credentials");
    return NextResponse.json({ data: { session: data.session, user: data.user } });
  } catch (e) {
    return errorResponse(e);
  }
}
