import { NextResponse } from "next/server";
import { errorResponse, ValidationError } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { optionalInt, readJson, requireName } from "@/src/server/http";
import { CustomEntityTypeRepositoryImpl } from "@/src/server/repositories/supabase-entities";
import { customEntityTypeService } from "@/src/server/services";

type Ctx = { params: Promise<{ typeId: string }> };

const FIELD_TYPES = ["text", "number", "boolean", "date", "select", "multiselect"] as const;

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { typeId } = await ctx.params;
    const c = await getContext(req);
    const repo = new CustomEntityTypeRepositoryImpl(c.supabase);
    const svc = customEntityTypeService(repo);
    await svc.get(typeId); // ensures presence -> 404 if missing
    return NextResponse.json({ data: await repo.listAttributes(typeId) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { typeId } = await ctx.params;
    const c = await getContext(req);
    const body = await readJson(req);
    const name = requireName(body);
    const fieldType = body.fieldType;
    if (typeof fieldType !== "string" || !FIELD_TYPES.includes(fieldType as (typeof FIELD_TYPES)[number])) {
      throw new ValidationError(`fieldType must be one of: ${FIELD_TYPES.join(", ")}`);
    }
    const required = body.required;
    const position = optionalInt(body, "position", 0) ?? 0;
    const optionsRaw = body.options;
    const options = Array.isArray(optionsRaw) && optionsRaw.every((o) => typeof o === "string")
      ? (optionsRaw as string[])
      : optionsRaw === null || optionsRaw === undefined
        ? null
        : (() => {
            throw new ValidationError("options must be an array of strings or null");
          })();
    const repo = new CustomEntityTypeRepositoryImpl(c.supabase);
    const svc = customEntityTypeService(repo);
    await svc.get(typeId); // ensure the type exists
    const attr = await repo.addAttribute(typeId, {
      name,
      fieldType: fieldType as (typeof FIELD_TYPES)[number],
      required: typeof required === "boolean" ? required : false,
      position,
      options,
    });
    return NextResponse.json(
      { data: attr },
      { status: 201, headers: { Location: `/api/custom-entity-types/${typeId}/attributes` } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
