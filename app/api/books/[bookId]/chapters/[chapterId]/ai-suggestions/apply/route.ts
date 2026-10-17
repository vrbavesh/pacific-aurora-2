import { NextResponse } from "next/server";
import { errorResponse } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { readJson } from "@/src/server/http";
import { SupabaseAiContextRepository } from "@/src/server/repositories/supabase-ai-context";
import { SupabaseAiApplyRepository } from "@/src/server/repositories/supabase-ai-apply";
import { applySuggestion } from "@/src/server/services/ai-apply";

type Ctx = { params: Promise<{ bookId: string; chapterId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { bookId, chapterId } = await ctx.params;
    const c = await getContext(req);
    const body = await readJson(req);
    const context = new SupabaseAiContextRepository(c.supabase);
    const writes = new SupabaseAiApplyRepository(c.supabase);
    return NextResponse.json({ data: await applySuggestion(bookId, chapterId, body, context, writes) });
  } catch (error) {
    return errorResponse(error);
  }
}
