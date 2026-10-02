import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { UnauthorizedError } from "./errors";

export function supabaseForRequest(req: Request): SupabaseClient {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    },
  );
}

export interface SessionUser {
  id: string;
}

export async function requireUser(req: Request): Promise<SessionUser> {
  const supabase = supabaseForRequest(req);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new UnauthorizedError();
  return { id: user.id };
}
