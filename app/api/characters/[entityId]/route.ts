import { NextResponse } from "next/server";
import { errorResponse, ValidationError } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { optionalInt, optionalName, optionalString, readJson } from "@/src/server/http";
import { CharacterRepositoryImpl } from "@/src/server/repositories/supabase-entities";
import { characterService } from "@/src/server/services";

type Ctx = { params: Promise<{ entityId: string }> };

function status(v: unknown): "alive" | "dead" | undefined {
  if (v === undefined || v === null) return undefined;
  if (v !== "alive" && v !== "dead") throw new ValidationError("status must be alive or dead");
  return v;
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { entityId } = await ctx.params;
    const c = await getContext(req);
    const body = await readJson(req);
    const patch: Record<string, unknown> = {};
    const name = optionalName(body);
    if (name !== undefined) patch.name = name;
    if (body.age !== undefined) patch.age = optionalInt(body, "age", 0);
    if (body.health !== undefined) patch.health = optionalString(body, "health");
    if (body.distinctions !== undefined) patch.distinctions = optionalString(body, "distinctions");
    if (body.traits !== undefined) patch.traits = optionalString(body, "traits");
    if (body.mutations !== undefined) patch.mutations = optionalString(body, "mutations");
    if (body.notes !== undefined) patch.notes = optionalString(body, "notes");
    if (body.status !== undefined) {
      const st = status(body.status);
      if (st !== undefined) patch.status = st;
    }
    if (Object.keys(patch).length === 0) {
      throw new ValidationError("Provide at least one field to update");
    }
    const svc = characterService(new CharacterRepositoryImpl(c.supabase));
    return NextResponse.json({ data: await svc.update(entityId, patch as never) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { entityId } = await ctx.params;
    const c = await getContext(req);
    const svc = characterService(new CharacterRepositoryImpl(c.supabase));
    await svc.remove(entityId);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
