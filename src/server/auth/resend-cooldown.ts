import { createHash } from "node:crypto";
import { adminClient } from "@/src/lib/api/admin";
import { ApiError, RateLimitError } from "@/src/lib/api/errors";

const key = (value: string) => createHash("sha256").update(value).digest("hex");

export async function checkResendCooldown(req: Request, email: string, type: string): Promise<void> {
  const admin = adminClient();
  if (!admin) throw new ApiError(503, "service_unavailable", "Code resend is temporarily unavailable");
  // shortcut: IP limiting trusts Vercel's forwarded header; revisit for another host.
  const ip = process.env.VERCEL === "1" ? req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() : null;
  const { data, error } = await admin.rpc("claim_auth_resend", {
    p_email_key: key(`email:${type}:${email.trim().toLowerCase()}`),
    p_ip_key: ip ? key(`ip:${ip}`) : null,
  });
  if (error || typeof data !== "number") throw new Error(error?.message ?? "Resend limiter returned no result");
  if (data > 0) throw new RateLimitError(`Please wait ${data}s before resending`, data);
}
