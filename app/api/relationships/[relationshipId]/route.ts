import { NextResponse } from "next/server";
import { errorResponse, ValidationError } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { optionalInt, readJson, requireString } from "@/src/server/http";
import { RelationshipRepositoryImpl } from "@/src/server/repositories/supabase-entities";
import { relationshipService } from "@/src/server/services";

type Ctx = { params: Promise<{ relationshipId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { relationshipId } = await ctx.params;
    const c = await getContext(req);
    const body = await readJson(req);
    const patch: Record<string, unknown> = {};
    if (body.relationshipType !== undefined) {
      patch.relationshipType = requireString(body, "relationshipType");
    }
    if (body.sentiment !== undefined) {
      const s = optionalInt(body, "sentiment", 0, 100);
      if (s !== undefined) patch.sentiment = s;
    }
    if (Object.keys(patch).length === 0) {
      throw new ValidationError("Provide relationshipType and/or sentiment");
    }
    const svc = relationshipService(new RelationshipRepositoryImpl(c.supabase));
    return NextResponse.json({ data: await svc.update(relationshipId, patch as never) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { relationshipId } = await ctx.params;
    const c = await getContext(req);
    const svc = relationshipService(new RelationshipRepositoryImpl(c.supabase));
    await svc.remove(relationshipId);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
