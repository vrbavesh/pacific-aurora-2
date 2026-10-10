import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { DELETE as deleteAccount } from "@/app/api/auth/account/route";

const RUN_LIVE = process.env.RUN_LIVE_ACCOUNT_DELETE === "1";

function loadLocalEnvironment(): void {
  if (!RUN_LIVE) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const split = trimmed.indexOf("=");
    if (split < 1) continue;
    const name = trimmed.slice(0, split).trim();
    let value = trimmed.slice(split + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[name] ??= value;
  }
}

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for the live account deletion suite`);
  return value;
}

loadLocalEnvironment();

const liveDescribe = RUN_LIVE ? describe : describe.skip;

liveDescribe("live account deletion", () => {
  let admin: SupabaseClient;
  let user: SupabaseClient;
  let userId = "";
  let accessToken = "";
  let worldId = "";
  let deleted = false;

  beforeAll(async () => {
    const url = requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL");
    const anonKey = requiredEnvironment("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const serviceKey = requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY");
    const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const email = `pa-delete-${runId}@example.com`;
    const password = `Pa!${randomUUID()}9z`;

    admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "Deletion Test Owner" },
    });
    if (created.error || !created.data.user) {
      throw new Error(`Could not create deletion test user: ${created.error?.message}`);
    }
    userId = created.data.user.id;

    user = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const session = await user.auth.signInWithPassword({ email, password });
    if (session.error || !session.data.session) {
      throw new Error(`Could not create deletion test session: ${session.error?.message}`);
    }
    accessToken = session.data.session.access_token;

    const world = await user
      .from("worlds")
      .insert({ owner_id: userId, name: `Deletion World ${runId}` })
      .select("id")
      .single();
    if (world.error) throw world.error;
    worldId = world.data.id as string;
  }, 60_000);

  afterAll(async () => {
    if (!userId || deleted) return;
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw new Error(`Account deletion cleanup failed: ${error.message}`);
  });

  test("requires confirmation, deletes only the caller, and cascades user data", async () => {
    const invalid = await deleteAccount(
      new Request("http://localhost/api/auth/account", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ confirmation: "delete" }),
      }),
    );
    expect(invalid.status).toBe(422);

    const existingWorld = await admin.from("worlds").select("id").eq("id", worldId);
    if (existingWorld.error) throw existingWorld.error;
    expect(existingWorld.data).toHaveLength(1);

    const response = await deleteAccount(
      new Request("http://localhost/api/auth/account", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ confirmation: "DELETE" }),
      }),
    );
    expect(response.status).toBe(204);
    deleted = true;

    const [authUser, profile, world] = await Promise.all([
      admin.auth.admin.getUserById(userId),
      admin.from("profiles").select("id").eq("id", userId),
      admin.from("worlds").select("id").eq("id", worldId),
    ]);
    expect(authUser.data.user).toBeNull();
    expect(profile.data).toEqual([]);
    expect(world.data).toEqual([]);
  });
});
