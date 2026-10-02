import { NextResponse } from "next/server";
import { errorResponse, ValidationError } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { optionalString, readJson, requireName } from "@/src/server/http";
import { ItemRepositoryImpl } from "@/src/server/repositories/supabase-entities";
import { itemService } from "@/src/server/services";

type Ctx = { params: Promise<{ worldId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { worldId } = await ctx.params;
    const c = await getContext(req);
    const svc = itemService(new ItemRepositoryImpl(c.supabase));
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
    const wielderEntityId = optionalString(body, "wielderEntityId");
    const manualWielderName = optionalString(body, "manualWielderName");
    if (wielderEntityId && manualWielderName) {
      throw new ValidationError("wielderEntityId and manualWielderName are mutually exclusive");
    }
    const input = {
      name,
      status: optionalString(body, "status"),
      power: optionalString(body, "power"),
      wielderEntityId,
      manualWielderName,
    };
    const svc = itemService(new ItemRepositoryImpl(c.supabase));
    const item = await svc.create(worldId, input);
    return NextResponse.json(
      { data: item },
      { status: 201, headers: { Location: `/api/items/${item.entityId}` } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
