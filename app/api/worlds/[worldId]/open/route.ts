import { NextResponse } from "next/server";
import { errorResponse } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { WorldRepositoryImpl } from "@/src/server/repositories/supabase";
import { worldService } from "@/src/server/services";

type Ctx = { params: Promise<{ worldId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { worldId } = await ctx.params;
    const c = await getContext(req);
    const svc = worldService(new WorldRepositoryImpl(c.supabase));
    return NextResponse.json({ data: await svc.touchOpened(worldId) });
  } catch (e) {
    return errorResponse(e);
  }
}
