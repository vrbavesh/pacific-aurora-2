import { readFileSync } from "node:fs";
import { afterEach, expect, test, vi } from "vitest";
import { adminClient } from "@/src/lib/api/admin";
import { checkResendCooldown } from "@/src/server/auth/resend-cooldown";

vi.mock("@/src/lib/api/admin", () => ({ adminClient: vi.fn() }));
afterEach(() => vi.restoreAllMocks());

test("resend state is private, shared, expiring, and restricted to service role", () => {
  const sql = readFileSync("supabase/migrations/0004_auth_resend_limits.sql", "utf8");
  expect(sql).toContain("enable row level security");
  expect(sql).toContain("auth.role() is distinct from 'service_role'");
  expect(sql).toContain("pg_advisory_xact_lock");
  expect(sql).toContain("interval '2 minutes'");
  expect(sql).toContain("window_end <= v_now");
  expect(sql).toContain("grant execute on function public.claim_auth_resend(text, text) to service_role");
});

test("resend claim hashes the address and returns the database cooldown", async () => {
  const rpc = vi.fn().mockResolvedValue({ data: 73, error: null });
  vi.mocked(adminClient).mockReturnValue({ rpc } as never);
  await expect(checkResendCooldown(new Request("http://localhost"), " Name@Example.com ", "signup"))
    .rejects.toMatchObject({ status: 429, retryAfterSeconds: 73 });
  expect(rpc).toHaveBeenCalledWith("claim_auth_resend", {
    p_email_key: expect.stringMatching(/^[0-9a-f]{64}$/),
    p_ip_key: null,
  });
});
