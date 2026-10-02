import { RateLimitError } from "@/src/lib/api/errors";

const lastResend = new Map<string, number>();
const COOLDOWN_MS = 120_000;

export function checkResendCooldown(key: string): void {
  const now = Date.now();
  const last = lastResend.get(key);
  if (last !== undefined && now - last < COOLDOWN_MS) {
    const retry = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
    throw new RateLimitError(`Please wait ${retry}s before resending`);
  }
  lastResend.set(key, now);
}
