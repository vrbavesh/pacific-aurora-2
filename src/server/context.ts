import { requireUser, supabaseForRequest } from "@/src/lib/api/session";
import { authorizeResourcePath } from "./resource-scope";

export async function getContext(req: Request) {
  const user = await requireUser(req);
  const supabase = supabaseForRequest(req);
  await authorizeResourcePath(req, supabase);
  return { userId: user.id, supabase };
}
