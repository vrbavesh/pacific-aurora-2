import { NextResponse } from "next/server";
import { errorResponse } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { readJson, requireString } from "@/src/server/http";
import { CharacterTimelineRepositoryImpl } from "@/src/server/repositories/supabase-entities";
import { characterTimelineService } from "@/src/server/services";

type Ctx = { params: Promise<{ entityId: string; timelineId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { timelineId } = await ctx.params;
    const c = await getContext(req);
    const svc = characterTimelineService(new CharacterTimelineRepositoryImpl(c.supabase));
    return NextResponse.json({ data: await svc.listPoints(timelineId) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { timelineId } = await ctx.params;
    const c = await getContext(req);
    const body = await readJson(req);
    const content = requireString(body, "content");
    const chapterId =
      body.chapterId === null || body.chapterId === undefined
        ? null
        : requireString(body, "chapterId");
    const svc = characterTimelineService(new CharacterTimelineRepositoryImpl(c.supabase));
    return NextResponse.json(
      { data: await svc.addPoint(timelineId, content, chapterId) },
      { status: 201 },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
