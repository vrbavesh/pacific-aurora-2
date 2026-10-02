import { NextResponse } from "next/server";
import { errorResponse } from "@/src/lib/api/errors";
import { supabaseForRequest } from "@/src/lib/api/session";

export async function POST(req: Request) {
  try {
    const client = supabaseForRequest(req);
    await client.auth.signOut().catch(() => undefined);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
