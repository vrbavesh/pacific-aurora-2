import { expect, test, vi } from "vitest";
import { anonClient } from "@/src/lib/api/session";
import { POST } from "@/app/api/auth/google/route";

vi.mock("@/src/lib/api/session", () => ({ anonClient: vi.fn() }));

test("verified-email Google linking is not rejected after Supabase signs in", async () => {
  vi.mocked(anonClient).mockReturnValue({ auth: { signInWithIdToken: async () => ({
    data: { session: { access_token: "access", refresh_token: "refresh" }, user: {
      id: "user", email_confirmed_at: "2026-10-15T00:00:00Z",
      identities: [{ provider: "email" }, { provider: "google" }],
    } }, error: null,
  }) } } as never);
  const response = await POST(new Request("http://localhost/api/auth/google", {
    method: "POST", body: JSON.stringify({ credential: "google-id-token" }),
  }));
  expect(response.status).toBe(200);
  expect((await response.json()).data.user.id).toBe("user");
});
