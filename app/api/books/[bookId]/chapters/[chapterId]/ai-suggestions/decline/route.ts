import { NextResponse } from "next/server";
import { errorResponse } from "@/src/lib/api/errors";
import { getContext } from "@/src/server/context";
import { readJson } from "@/src/server/http";
import { SupabaseAiAnalysisStateRepository } from "@/src/server/repositories/supabase-ai-state";
import { declineSuggestion } from "@/src/server/services/ai-decline";

type Ctx = { params: Promise<{ bookId: string; chapterId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { bookId, chapterId } = await ctx.params;
    const c = await getContext(req);
    const body = await readJson(req);
    const state = new SupabaseAiAnalysisStateRepository(c.supabase, null, c.userId);
    return NextResponse.json({ data: await declineSuggestion(bookId, chapterId, body, state) });
  } catch (error) {
    return errorResponse(error);
  }
}
