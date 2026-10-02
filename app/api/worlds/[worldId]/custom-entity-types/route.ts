import { NextResponse } from "next/server";
import { errorResponse } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { optionalInt, readJson, requireName } from "@/src/server/http";
import { CustomEntityTypeRepositoryImpl } from "@/src/server/repositories/supabase-entities";
import { customEntityTypeService } from "@/src/server/services";

type Ctx = { params: Promise<{ worldId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { worldId } = await ctx.params;
    const c = await getContext(req);
    const svc = customEntityTypeService(new CustomEntityTypeRepositoryImpl(c.supabase));
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
    const position = optionalInt(body, "position", 0);
    const svc = customEntityTypeService(new CustomEntityTypeRepositoryImpl(c.supabase));
    const type = await svc.create(worldId, name, position);
    return NextResponse.json(
      { data: type },
      { status: 201, headers: { Location: `/api/custom-entity-types/${type.id}` } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
