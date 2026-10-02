import { NextResponse } from "next/server";
import { errorResponse } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { CharacterTimelineRepositoryImpl } from "@/src/server/repositories/supabase-entities";
import { characterTimelineService } from "@/src/server/services";

type Ctx = { params: Promise<{ entityId: string; timelineId: string; pointId: string }> };

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { pointId } = await ctx.params;
    const c = await getContext(req);
    const svc = characterTimelineService(new CharacterTimelineRepositoryImpl(c.supabase));
    await svc.removePoint(pointId);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
