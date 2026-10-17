import { readFileSync } from "node:fs";

export function liveAiEnvironment() {
  if (process.env.PA_AI_LIVE_CONFIRM !== "MAIN_PROJECT_DISPOSABLE_USERS") {
    throw new Error("Set PA_AI_LIVE_CONFIRM=MAIN_PROJECT_DISPOSABLE_USERS before running data-creating AI suites");
  }

  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const split = trimmed.indexOf("=");
    if (split < 1) continue;
    const name = trimmed.slice(0, split).trim();
    let value = trimmed.slice(split + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[name] ??= value;
  }

  const required = (name: string) => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required for the live AI suites`);
    return value;
  };
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    serviceKey: required("SUPABASE_SERVICE_ROLE_KEY"),
  };
}
