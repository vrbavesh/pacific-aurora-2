const TOKEN_KEY = "pacific_aurora_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
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
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...init, headers });
  const text = await res.text();
  let json:
    | { data?: T; error?: { code?: string; message?: string } }
    | null = null;
  try {
    const parsed = text ? JSON.parse(text) : null;
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
    if (res.data.profile && res.data.profile.onboardingComplete === false) {
      next("/onboarding");
    } else {
      next("/home");
    }
  } catch {
    next("/home");
  }
}
