import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""} https://accounts.google.com`,
  "style-src 'self' 'unsafe-inline' https://accounts.google.com",
  "img-src 'self' data: blob: https://*.googleusercontent.com",
  "font-src 'self' data:",
  `connect-src 'self'${supabaseOrigin ? ` ${supabaseOrigin} ${supabaseOrigin.replace("https://", "wss://")}` : ""} https://accounts.google.com`,
  "frame-src https://accounts.google.com",
  "worker-src 'self' blob:",
  ...(isDevelopment ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
