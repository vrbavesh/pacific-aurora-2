import { NextResponse } from "next/server";
import { errorResponse } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { readJson, requireName } from "@/src/server/http";
import { WorldRepositoryImpl } from "@/src/server/repositories/supabase";
import { worldService } from "@/src/server/services";

export async function GET(req: Request) {
  try {
    const c = await getContext(req);
    const svc = worldService(new WorldRepositoryImpl(c.supabase));
    return NextResponse.json({ data: await svc.list(c.userId) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const c = await getContext(req);
    const name = requireName(await readJson(req));
    const svc = worldService(new WorldRepositoryImpl(c.supabase));
    const world = await svc.create(c.userId, name);
    return NextResponse.json(
      { data: world },
      { status: 201, headers: { Location: `/api/worlds/${world.id}` } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
