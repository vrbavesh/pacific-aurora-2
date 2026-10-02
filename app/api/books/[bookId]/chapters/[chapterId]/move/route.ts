import { NextResponse } from "next/server";
import { errorResponse, ValidationError } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { readJson } from "@/src/server/http";
import { ChapterRepositoryImpl } from "@/src/server/repositories/supabase";
import { chapterService } from "@/src/server/services";

type Ctx = { params: Promise<{ bookId: string; chapterId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { chapterId } = await ctx.params;
    const c = await getContext(req);
    const body = await readJson(req);
    const direction = body.direction as "up" | "down" | undefined;
    if (direction !== "up" && direction !== "down") {
      throw new ValidationError("direction must be 'up' or 'down'");
    }
    const svc = chapterService(new ChapterRepositoryImpl(c.supabase));
    return NextResponse.json({ data: await svc.move(chapterId, direction) });
  } catch (e) {
    return errorResponse(e);
  }
}
