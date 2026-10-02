import { NextResponse } from "next/server";
import { errorResponse, ValidationError } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { optionalName, readJson } from "@/src/server/http";
import { CustomEntityTypeRepositoryImpl } from "@/src/server/repositories/supabase-entities";
import { customEntityTypeService } from "@/src/server/services";

type Ctx = { params: Promise<{ entityId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { entityId } = await ctx.params;
    const c = await getContext(req);
    const body = await readJson(req);
    const patch: Record<string, unknown> = {};
    const name = optionalName(body);
    if (name !== undefined) patch.name = name;
    if (body.attributes !== undefined) {
      if (typeof body.attributes !== "object" || body.attributes === null) {
        throw new ValidationError("attributes must be an object");
      }
      patch.attributes = body.attributes as Record<string, unknown>;
    }
    if (Object.keys(patch).length === 0) {
      throw new ValidationError("Provide at least one field to update");
    }
    const svc = customEntityTypeService(new CustomEntityTypeRepositoryImpl(c.supabase));
    return NextResponse.json({ data: await svc.updateEntity(entityId, patch as never) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { entityId } = await ctx.params;
    const c = await getContext(req);
    const svc = customEntityTypeService(new CustomEntityTypeRepositoryImpl(c.supabase));
    await svc.removeEntity(entityId);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
