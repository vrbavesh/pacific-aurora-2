import { NextResponse } from "next/server";
import { errorResponse } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { readJson, requireName } from "@/src/server/http";
import { ChapterRepositoryImpl } from "@/src/server/repositories/supabase";
import { chapterService } from "@/src/server/services";

type Ctx = { params: Promise<{ bookId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { bookId } = await ctx.params;
    const c = await getContext(req);
    const svc = chapterService(new ChapterRepositoryImpl(c.supabase));
    return NextResponse.json({ data: await svc.list(bookId) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { bookId } = await ctx.params;
    const c = await getContext(req);
    const name = requireName(await readJson(req));
    const svc = chapterService(new ChapterRepositoryImpl(c.supabase));
    const chapter = await svc.create(bookId, name);
    return NextResponse.json(
      { data: chapter },
      { status: 201, headers: { Location: `/api/books/${bookId}/chapters/${chapter.id}` } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
