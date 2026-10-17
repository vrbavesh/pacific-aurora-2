import { expect, test, vi } from "vitest";
import { contentSecurityPolicy } from "@/src/lib/security/csp";

test("production scripts require a per-request nonce", () => {
  vi.stubEnv("NODE_ENV", "production");
  try {
    const policy = contentSecurityPolicy("nonce-value");
    expect(policy).toContain("script-src 'self' 'nonce-nonce-value' 'strict-dynamic'");
    const scriptDirective = policy.split("; ").find((part) => part.startsWith("script-src"));
    expect(scriptDirective).not.toContain("'unsafe-inline'");
    expect(scriptDirective).not.toContain("'unsafe-eval'");
  } finally {
    vi.unstubAllEnvs();
  }
});
