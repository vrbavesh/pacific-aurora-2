import { NextResponse } from "next/server";
import { errorResponse } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { optionalName, readJson } from "@/src/server/http";
import { BookRepositoryImpl } from "@/src/server/repositories/supabase";
import { bookService } from "@/src/server/services";

type Ctx = { params: Promise<{ bookId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { bookId } = await ctx.params;
    const c = await getContext(req);
    const svc = bookService(new BookRepositoryImpl(c.supabase));
    return NextResponse.json({ data: await svc.get(bookId) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { bookId } = await ctx.params;
    const c = await getContext(req);
    const name = optionalName(await readJson(req));
    const svc = bookService(new BookRepositoryImpl(c.supabase));
    return NextResponse.json({ data: await svc.update(bookId, { name }) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const { bookId } = await ctx.params;
    const c = await getContext(req);
    const svc = bookService(new BookRepositoryImpl(c.supabase));
    await svc.remove(bookId);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return errorResponse(e);
  }
}
