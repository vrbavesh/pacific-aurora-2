import { requireUser, supabaseForRequest } from "@/src/lib/api/session";

export async function getContext(req: Request) {
  const user = await requireUser(req);
  const supabase = supabaseForRequest(req);
  return { userId: user.id, supabase };
}
