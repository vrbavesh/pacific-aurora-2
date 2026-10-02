import { NextResponse } from "next/server";
import { errorResponse } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { optionalString, readJson, requireName } from "@/src/server/http";
import { PlaceRepositoryImpl } from "@/src/server/repositories/supabase-entities";
import { placeService } from "@/src/server/services";

type Ctx = { params: Promise<{ worldId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { worldId } = await ctx.params;
    const c = await getContext(req);
    const svc = placeService(new PlaceRepositoryImpl(c.supabase));
    return NextResponse.json({ data: await svc.list(worldId) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { worldId } = await ctx.params;
    const c = await getContext(req);
    const body = await readJson(req);
    const name = requireName(body);
    const input = {
      name,
      status: optionalString(body, "status"),
      lastChapterId: optionalString(body, "lastChapterId"),
    };
    const svc = placeService(new PlaceRepositoryImpl(c.supabase));
    const place = await svc.create(worldId, input);
    return NextResponse.json(
      { data: place },
      { status: 201, headers: { Location: `/api/places/${place.entityId}` } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
