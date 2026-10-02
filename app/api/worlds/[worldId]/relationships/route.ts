import { NextResponse } from "next/server";
import { errorResponse, ValidationError } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { optionalInt, readJson, requireString } from "@/src/server/http";
import { RelationshipRepositoryImpl } from "@/src/server/repositories/supabase-entities";
import { relationshipService } from "@/src/server/services";

type Ctx = { params: Promise<{ worldId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { worldId } = await ctx.params;
    const c = await getContext(req);
    const svc = relationshipService(new RelationshipRepositoryImpl(c.supabase));
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
    const entityAId = requireString(body, "entityAId");
    const entityBId = requireString(body, "entityBId");
    const relationshipType = requireString(body, "relationshipType");
    if (entityAId === entityBId) {
      throw new ValidationError("entityAId and entityBId must differ");
    }
    const sentiment = optionalInt(body, "sentiment", 0, 100) ?? 50;
    const svc = relationshipService(new RelationshipRepositoryImpl(c.supabase));
    const rel = await svc.create(worldId, { entityAId, entityBId, relationshipType, sentiment });
    return NextResponse.json(
      { data: rel },
      { status: 201, headers: { Location: `/api/relationships/${rel.id}` } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
