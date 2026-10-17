import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const TOKEN_KEY = "pacific_aurora_token";
const SESSION_KEY = "pacific_aurora_session";
let browserClient: SupabaseClient | null = null;

function authClient(): SupabaseClient {
  browserClient ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    { auth: { storageKey: SESSION_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } },
  );
  return browserClient;
}

export async function setSession(session: { access_token?: string; refresh_token?: string } | null): Promise<void> {
  if (!session?.access_token || !session.refresh_token) throw new Error("Sign-in returned an incomplete session");
  const { error } = await authClient().auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error) throw error;
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function clearSession(): Promise<void> {
  try {
    if (browserClient) await browserClient.auth.signOut({ scope: "local" });
  } catch {
    // The account may already be deleted; local credentials still must be removed.
  } finally {
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

async function getToken(): Promise<string | null> {
  if (window.localStorage.getItem(SESSION_KEY)) {
    const { data, error } = await authClient().auth.getSession();
    if (error) throw error;
    return data.session?.access_token ?? null;
  }
  // shortcut: access-only V1 sessions work until expiry; users then sign in once to upgrade.
  return window.localStorage.getItem(TOKEN_KEY);
}

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<{ data: T }> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...init, headers });
  const text = await res.text();
  let parsedBody: unknown = undefined;
  let json:
    | { data?: T; error?: { code?: string; message?: string } }
    | null = null;
  try {
    const parsed = text ? JSON.parse(text) : undefined;
    parsedBody = parsed;
    if (
      parsed &&
      typeof parsed === "object" &&
      ("data" in parsed || "error" in parsed)
    ) {
      json = parsed as { data?: T; error?: { code?: string; message?: string } };
    }
  } catch {
    json = null;
  }

  if (!res.ok) {
    const errMsg = json && typeof json === "object" && "error" in json && json.error && typeof json.error === "object" && "message" in json.error
      ? (json.error.message as string)
      : `Request failed (${res.status})`;
    const errCode = json && typeof json === "object" && "error" in json && json.error && typeof json.error === "object" && "code" in json.error
      ? (json.error.code as string)
      : undefined;
    throw new ApiRequestError(res.status, errMsg, errCode);
  }
  const { validateSuccessResponse } = await import("./response-validation");
  const validated = validateSuccessResponse(
    path,
    init.method ?? "GET",
    parsedBody,
  );
  json =
    validated && typeof validated === "object"
      ? (validated as typeof json)
      : null;
  const data = json && typeof json === "object" && "data" in json ? (json.data as T) : ({} as T);
  return { data };
}

export interface SessionProfile {
  id?: string;
  username?: string | null;
  userId?: string | null;
  onboardingComplete?: boolean;
}

export async function redirectAfterAuth(next: (path: string) => void): Promise<void> {
  try {
    const res = await apiFetch<{ user: { id: string }; profile: SessionProfile | null }>(
      "/api/auth/session",
    );
    if (!res.data.profile?.onboardingComplete || !res.data.profile.userId) {
      next("/onboarding");
    } else {
      next("/home");
    }
  } catch {
    next("/signin");
  }
}
