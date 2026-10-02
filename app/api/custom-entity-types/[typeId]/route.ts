import { NextResponse } from "next/server";
import { errorResponse, ValidationError } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { optionalInt, optionalName, readJson } from "@/src/server/http";
import { CustomEntityTypeRepositoryImpl } from "@/src/server/repositories/supabase-entities";
import { customEntityTypeService } from "@/src/server/services";

type Ctx = { params: Promise<{ typeId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { typeId } = await ctx.params;
    const c = await getContext(req);
    const repo = new CustomEntityTypeRepositoryImpl(c.supabase);
    const svc = customEntityTypeService(repo);
    const type = await svc.get(typeId);
    const attributes = await repo.listAttributes(typeId);
    return NextResponse.json({ data: { ...type, attributes } });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { typeId } = await ctx.params;
    const c = await getContext(req);
    const body = await readJson(req);
    const patch: Record<string, unknown> = {};
    const name = optionalName(body);
    if (name !== undefined) patch.name = name;
    if (body.position !== undefined) patch.position = optionalInt(body, "position", 0);
    if (Object.keys(patch).length === 0) {
      throw new ValidationError("Provide at least one field to update");
    }
    const svc = customEntityTypeService(new CustomEntityTypeRepositoryImpl(c.supabase));
    return NextResponse.json({ data: await svc.update(typeId, patch as never) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { typeId } = await ctx.params;
    const c = await getContext(req);
    const svc = customEntityTypeService(new CustomEntityTypeRepositoryImpl(c.supabase));
    await svc.remove(typeId);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
