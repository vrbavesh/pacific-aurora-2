import { NextResponse } from "next/server";
import { errorResponse, ValidationError } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { readJson, requireName } from "@/src/server/http";
import { CustomEntityTypeRepositoryImpl } from "@/src/server/repositories/supabase-entities";
import { customEntityTypeService } from "@/src/server/services";

type Ctx = { params: Promise<{ worldId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { worldId } = await ctx.params;
    const c = await getContext(req);
    const svc = customEntityTypeService(new CustomEntityTypeRepositoryImpl(c.supabase));
    return NextResponse.json({ data: await svc.listEntities(worldId) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { worldId } = await ctx.params;
    const c = await getContext(req);
    const body = await readJson(req);
    const entityTypeId = body.entityTypeId;
    if (typeof entityTypeId !== "string" || !entityTypeId) {
      throw new ValidationError("entityTypeId is required");
    }
    const name = requireName(body);
    const attributes =
      typeof body.attributes === "object" && body.attributes !== null
        ? (body.attributes as Record<string, unknown>)
        : undefined;
    const svc = customEntityTypeService(new CustomEntityTypeRepositoryImpl(c.supabase));
    const created = await svc.createEntity(worldId, entityTypeId, name, attributes);
    return NextResponse.json(
      { data: created },
      { status: 201, headers: { Location: `/api/custom-entities/${created.entityId}` } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
