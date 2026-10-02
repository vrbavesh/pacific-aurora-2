import { NextResponse } from "next/server";
import { errorResponse, ValidationError } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { optionalInt, optionalString, readJson, requireName } from "@/src/server/http";
import { CharacterRepositoryImpl } from "@/src/server/repositories/supabase-entities";
import { characterService } from "@/src/server/services";

type Ctx = { params: Promise<{ worldId: string }> };

function status(v: unknown): "alive" | "dead" | undefined {
  if (v === undefined || v === null) return undefined;
  if (v !== "alive" && v !== "dead") throw new ValidationError("status must be alive or dead");
  return v;
}

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { worldId } = await ctx.params;
    const c = await getContext(req);
    const svc = characterService(new CharacterRepositoryImpl(c.supabase));
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
      age: optionalInt(body, "age", 0),
      health: optionalString(body, "health"),
      distinctions: optionalString(body, "distinctions"),
      traits: optionalString(body, "traits"),
      mutations: optionalString(body, "mutations"),
      status: status(body.status) ?? "alive",
      notes: optionalString(body, "notes"),
    };
    const svc = characterService(new CharacterRepositoryImpl(c.supabase));
    const ch = await svc.create(worldId, input);
    return NextResponse.json(
      { data: ch },
      { status: 201, headers: { Location: `/api/characters/${ch.entityId}` } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
