import { NextResponse } from "next/server";
import { errorResponse, ValidationError } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { readJson } from "@/src/server/http";
import { ChapterRepositoryImpl } from "@/src/server/repositories/supabase";
import { chapterService } from "@/src/server/services";

type Ctx = { params: Promise<{ bookId: string; chapterId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { chapterId } = await ctx.params;
    const c = await getContext(req);
    const svc = chapterService(new ChapterRepositoryImpl(c.supabase));
    return NextResponse.json({ data: await svc.listPoints(chapterId) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { chapterId } = await ctx.params;
    const c = await getContext(req);
    const body = await readJson(req);
    const content = body.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      throw new ValidationError("content is required");
    }
    const svc = chapterService(new ChapterRepositoryImpl(c.supabase));
    return NextResponse.json(
      { data: await svc.addPoint(chapterId, content) },
      { status: 201 },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
