import { NextResponse } from "next/server";
import { errorResponse } from "@/src/lib/api/errors";
import { adminClient } from "@/src/lib/api/admin";
import { getContext } from "@/src/server/context";
import { SupabaseAiAnalysisStateRepository } from "@/src/server/repositories/supabase-ai-state";

type Ctx = { params: Promise<{ bookId: string; chapterId: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { bookId, chapterId } = await ctx.params;
    const c = await getContext(req);
    const state = new SupabaseAiAnalysisStateRepository(c.supabase, adminClient(), c.userId);
    return NextResponse.json({ data: await state.eligibility(bookId, chapterId) });
  } catch (error) {
    return errorResponse(error);
  }
}
