import { afterEach, expect, test, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { apiFetch, clearSession, setSession } from "@/src/lib/api/client";

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));
vi.mock("@/src/lib/api/response-validation", () => ({ validateSuccessResponse: (_path: string, _method: string, value: unknown) => value }));
afterEach(() => vi.unstubAllGlobals());

test("browser API uses the refreshed Supabase session and clears it on logout", async () => {
  const items = new Map<string, string>();
  const localStorage = {
    getItem: (name: string) => items.get(name) ?? null,
    setItem: (name: string, value: string) => items.set(name, value),
    removeItem: (name: string) => items.delete(name),
  };
  vi.stubGlobal("window", { localStorage });
  const signOut = vi.fn().mockResolvedValue({ error: null });
  vi.mocked(createClient).mockReturnValue({ auth: {
    setSession: async () => { items.set("pacific_aurora_session", "stored"); return { error: null }; },
    getSession: async () => ({ data: { session: { access_token: "rotated-token" } }, error: null }),
    signOut,
  } } as never);
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { ok: true } }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);

  await setSession({ access_token: "first-token", refresh_token: "refresh-token" });
  await apiFetch("/api/auth/session");
  expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer rotated-token");
  await clearSession();
  expect(signOut).toHaveBeenCalledWith({ scope: "local" });
  expect(localStorage.getItem("pacific_aurora_session")).toBeNull();
});
