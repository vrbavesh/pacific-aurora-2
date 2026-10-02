import { NextResponse } from "next/server";
import { errorResponse } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { readJson, requireName } from "@/src/server/http";
import { BookRepositoryImpl } from "@/src/server/repositories/supabase";
import { bookService } from "@/src/server/services";

type Ctx = { params: Promise<{ worldId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { worldId } = await ctx.params;
    const c = await getContext(req);
    const svc = bookService(new BookRepositoryImpl(c.supabase));
    return NextResponse.json({ data: await svc.list(worldId) });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { worldId } = await ctx.params;
    const c = await getContext(req);
    const name = requireName(await readJson(req));
    const svc = bookService(new BookRepositoryImpl(c.supabase));
    const book = await svc.create(worldId, name);
    return NextResponse.json(
      { data: book },
      { status: 201, headers: { Location: `/api/books/${book.id}` } },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
