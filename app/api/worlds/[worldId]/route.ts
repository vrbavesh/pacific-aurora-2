import { NextResponse } from "next/server";
import { errorResponse } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { optionalName, readJson } from "@/src/server/http";
import { WorldRepositoryImpl } from "@/src/server/repositories/supabase";
import { worldService } from "@/src/server/services";

type Ctx = { params: Promise<{ worldId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { worldId } = await ctx.params;
    const c = await getContext(_req);
    const svc = worldService(new WorldRepositoryImpl(c.supabase));
    return NextResponse.json({ data: await svc.get(worldId) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { worldId } = await ctx.params;
    const c = await getContext(req);
    const name = optionalName(await readJson(req));
    const svc = worldService(new WorldRepositoryImpl(c.supabase));
    return NextResponse.json({ data: await svc.update(worldId, { name }) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { worldId } = await ctx.params;
    const c = await getContext(req);
    const svc = worldService(new WorldRepositoryImpl(c.supabase));
    await svc.remove(worldId);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
