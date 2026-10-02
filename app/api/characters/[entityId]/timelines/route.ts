import { NextResponse } from "next/server";
import { errorResponse } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { readJson, requireString } from "@/src/server/http";
import { CharacterTimelineRepositoryImpl } from "@/src/server/repositories/supabase-entities";
import { characterTimelineService } from "@/src/server/services";

type Ctx = { params: Promise<{ entityId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { entityId } = await ctx.params;
    const c = await getContext(req);
    const svc = characterTimelineService(new CharacterTimelineRepositoryImpl(c.supabase));
    return NextResponse.json({ data: await svc.list(entityId) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { entityId } = await ctx.params;
    const c = await getContext(req);
    const body = await readJson(req);
    const bookId = requireString(body, "bookId");
    const svc = characterTimelineService(new CharacterTimelineRepositoryImpl(c.supabase));
    const timeline = await svc.create(entityId, bookId);
    return NextResponse.json({ data: timeline }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
