import { NextResponse } from "next/server";
import { ApiError, errorResponse } from "@/src/lib/api/errors";
import { adminClient } from "@/src/lib/api/admin";
import { getContext } from "@/src/server/context";
import { readJson } from "@/src/server/http";
import { SupabaseAiAnalysisStateRepository } from "@/src/server/repositories/supabase-ai-state";
import { SupabaseAiContextRepository } from "@/src/server/repositories/supabase-ai-context";
import { analyzeChapter } from "@/src/server/services/ai-analysis";

type Ctx = { params: Promise<{ bookId: string; chapterId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  try {
    const { bookId, chapterId } = await ctx.params;
    const c = await getContext(req);
    const body = await readJson(req);
    const admin = adminClient();
    if (!admin) throw new ApiError(503, "ai_unavailable", "AI analysis is unavailable");
    const state = new SupabaseAiAnalysisStateRepository(c.supabase, admin, c.userId);
    const context = new SupabaseAiContextRepository(c.supabase);
    return NextResponse.json({ data: await analyzeChapter(bookId, chapterId, body, state, context) });
  } catch (error) {
    return errorResponse(error);
  }
}
