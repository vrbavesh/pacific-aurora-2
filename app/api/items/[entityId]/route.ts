import { NextResponse } from "next/server";
import { errorResponse, ValidationError } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { optionalName, optionalString, readJson } from "@/src/server/http";
import { ItemRepositoryImpl } from "@/src/server/repositories/supabase-entities";
import { itemService } from "@/src/server/services";

type Ctx = { params: Promise<{ entityId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { entityId } = await ctx.params;
    const c = await getContext(req);
    const body = await readJson(req);
    const patch: Record<string, unknown> = {};
    const name = optionalName(body);
    if (name !== undefined) patch.name = name;
    if (body.status !== undefined) patch.status = optionalString(body, "status");
    if (body.power !== undefined) patch.power = optionalString(body, "power");
    if (body.wielderEntityId !== undefined) patch.wielderEntityId = optionalString(body, "wielderEntityId");
    if (body.manualWielderName !== undefined) patch.manualWielderName = optionalString(body, "manualWielderName");
    if (patch.wielderEntityId && patch.manualWielderName) {
      throw new ValidationError("wielderEntityId and manualWielderName are mutually exclusive");
    }
    if (Object.keys(patch).length === 0) {
      throw new ValidationError("Provide at least one field to update");
    }
    const svc = itemService(new ItemRepositoryImpl(c.supabase));
    return NextResponse.json({ data: await svc.update(entityId, patch as never) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { entityId } = await ctx.params;
    const c = await getContext(req);
    const svc = itemService(new ItemRepositoryImpl(c.supabase));
    await svc.remove(entityId);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
