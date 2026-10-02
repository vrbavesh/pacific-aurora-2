import { NextResponse } from "next/server";
import { errorResponse } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { BookRepositoryImpl } from "@/src/server/repositories/supabase";
import { bookService } from "@/src/server/services";

type Ctx = { params: Promise<{ bookId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { bookId } = await ctx.params;
    const c = await getContext(req);
    const svc = bookService(new BookRepositoryImpl(c.supabase));
    return NextResponse.json({ data: await svc.touchOpened(bookId) });
  } catch (e) {
    return errorResponse(e);
  }
}
