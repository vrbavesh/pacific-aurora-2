import { NextResponse } from "next/server";
import { errorResponse, ValidationError } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { optionalName, readJson } from "@/src/server/http";
import { ChapterRepositoryImpl } from "@/src/server/repositories/supabase";
import { chapterService } from "@/src/server/services";

type Ctx = { params: Promise<{ bookId: string; chapterId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { chapterId } = await ctx.params;
    const c = await getContext(req);
    const svc = chapterService(new ChapterRepositoryImpl(c.supabase));
    return NextResponse.json({ data: await svc.get(chapterId) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { chapterId } = await ctx.params;
    const c = await getContext(req);
    const body = await readJson(req);
    const name = optionalName(body);
    const content =
      typeof body.content === "object" && body.content !== null
        ? (body.content as object)
        : body.content === undefined
          ? undefined
          : (() => {
              throw new ValidationError("content must be an object");
            })();
    if (name === undefined && content === undefined) {
      throw new ValidationError("Provide name and/or content");
    }
    const svc = chapterService(new ChapterRepositoryImpl(c.supabase));
    return NextResponse.json({ data: await svc.update(chapterId, { name, content }) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { chapterId } = await ctx.params;
    const c = await getContext(req);
    const svc = chapterService(new ChapterRepositoryImpl(c.supabase));
    await svc.remove(chapterId);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
