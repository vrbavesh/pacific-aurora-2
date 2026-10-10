import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const RUN_LIVE = process.env.RUN_LIVE_ATOMIC === "1";

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

loadLocalEnvironment();

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for the live atomic suite`);
  return value;
}

function rpcId(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error(`Expected an RPC UUID result, received ${JSON.stringify(value)}`);
  }
  return value;
}

const liveDescribe = RUN_LIVE ? describe : describe.skip;

liveDescribe("live atomic database writes", () => {
  let admin: SupabaseClient;
  let owner: SupabaseClient;
  let ownerId = "";
  let worldId = "";
  let bookId = "";
  let characterId = "";
  let itemId = "";
  let customTypeId = "";
  let requiredAttributeId = "";
  let selectAttributeId = "";
  const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`;

  beforeAll(async () => {
    const url = requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL");
    const anonKey = requiredEnvironment("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const serviceKey = requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY");
    const email = `pa-atomic-${runId}@example.com`;
    const password = `Pa!${randomUUID()}9z`;

    admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const createdUser = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: "Atomic Test Owner" },
    });
    if (createdUser.error || !createdUser.data.user) {
      throw new Error(`Could not create test user: ${createdUser.error?.message}`);
    }
    ownerId = createdUser.data.user.id;

    owner = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const session = await owner.auth.signInWithPassword({ email, password });
    if (session.error || !session.data.session) {
      throw new Error(`Could not create test session: ${session.error?.message}`);
    }

    const world = await owner
      .from("worlds")
      .insert({ owner_id: ownerId, name: `Atomic World ${runId}` })
      .select("id")
      .single();
    if (world.error) throw world.error;
    worldId = world.data.id as string;

    const book = await owner
      .from("books")
      .insert({ world_id: worldId, name: "Atomic Book" })
      .select("id")
      .single();
    if (book.error) throw book.error;
    bookId = book.data.id as string;

    const chapters = await owner.from("chapters").insert([
      { book_id: bookId, name: "Middle", position: 1 },
      { book_id: bookId, name: "End", position: 2 },
    ]);
    if (chapters.error) throw chapters.error;

    const character = await owner.rpc("create_world_entity_atomic", {
      target_world_id: worldId,
      target_kind: "character",
      target_name: "Atomic Character",
      subtype_data: { status: "alive" },
    });
    if (character.error) throw character.error;
    characterId = rpcId(character.data);

    const item = await owner.rpc("create_world_entity_atomic", {
      target_world_id: worldId,
      target_kind: "item",
      target_name: "Atomic Item",
      subtype_data: { power: "Test power" },
    });
    if (item.error) throw item.error;
    itemId = rpcId(item.data);

    const customType = await owner
      .from("custom_entity_types")
      .insert({ world_id: worldId, name: `Atomic Type ${runId}` })
      .select("id")
      .single();
    if (customType.error) throw customType.error;
    customTypeId = customType.data.id as string;

    const attributes = await owner
      .from("custom_entity_attributes")
      .insert([
        {
          entity_type_id: customTypeId,
          name: "Required text",
          field_type: "text",
          required: true,
          position: 0,
        },
        {
          entity_type_id: customTypeId,
          name: "Choice",
          field_type: "select",
          required: false,
          options: ["one", "two"],
          position: 1,
        },
      ])
      .select("id, name");
    if (attributes.error) throw attributes.error;
    requiredAttributeId = String(
      attributes.data.find((row) => row.name === "Required text")?.id,
    );
    selectAttributeId = String(
      attributes.data.find((row) => row.name === "Choice")?.id,
    );
  }, 120_000);

  afterAll(async () => {
    if (!ownerId || !admin) return;
    const { error } = await admin.auth.admin.deleteUser(ownerId);
    if (error) throw new Error(`Live atomic cleanup failed: ${error.message}`);
  }, 60_000);

  test("failed multi-table creates roll back the base entity", async () => {
    const name = `Invalid Character ${runId}`;
    const result = await owner.rpc("create_world_entity_atomic", {
      target_world_id: worldId,
      target_kind: "character",
      target_name: name,
      subtype_data: { age: -1 },
    });
    expect(result.error).not.toBeNull();

    const orphan = await admin
      .from("world_entities")
      .select("id")
      .eq("world_id", worldId)
      .eq("name", name);
    if (orphan.error) throw orphan.error;
    expect(orphan.data).toEqual([]);
  });

  test("failed multi-table updates roll back the base name", async () => {
    const result = await owner.rpc("update_world_entity_atomic", {
      target_entity_id: itemId,
      patch: {
        name: "Must Roll Back",
        wielderEntityId: characterId,
        manualWielderName: "Conflicting wielder",
      },
    });
    expect(result.error).not.toBeNull();

    const entity = await owner
      .from("world_entities")
      .select("name")
      .eq("id", itemId)
      .single();
    if (entity.error) throw entity.error;
    expect(entity.data.name).toBe("Atomic Item");
  });

  test("custom attributes reject missing, unknown, and invalid values", async () => {
    for (const [label, attributes] of [
      ["missing", {}],
      ["unknown", { [requiredAttributeId]: "ok", unknown: true }],
      [
        "invalid option",
        { [requiredAttributeId]: "ok", [selectAttributeId]: "three" },
      ],
    ] as const) {
      const result = await owner.rpc("create_world_entity_atomic", {
        target_world_id: worldId,
        target_kind: "custom",
        target_name: `Invalid Custom ${label} ${runId}`,
        subtype_data: { entityTypeId: customTypeId, attributes },
      });
      expect(result.error, label).not.toBeNull();
    }

    const valid = await owner.rpc("create_world_entity_atomic", {
      target_world_id: worldId,
      target_kind: "custom",
      target_name: `Valid Custom ${runId}`,
      subtype_data: {
        entityTypeId: customTypeId,
        attributes: {
          [requiredAttributeId]: "present",
          [selectAttributeId]: "one",
        },
      },
    });
    expect(valid.error).toBeNull();
    expect(typeof valid.data).toBe("string");
  });

  test("concurrent chapter moves preserve a unique contiguous order", async () => {
    const chapters = await owner
      .from("chapters")
      .select("id, position")
      .eq("book_id", bookId)
      .order("position");
    if (chapters.error) throw chapters.error;
    expect(chapters.data).toHaveLength(3);

    const [first, last] = [chapters.data[0], chapters.data[2]];
    const results = await Promise.all([
      owner.rpc("move_chapter_atomic", {
        target_chapter_id: first.id,
        move_direction: "down",
      }),
      owner.rpc("move_chapter_atomic", {
        target_chapter_id: last.id,
        move_direction: "up",
      }),
    ]);
    expect(results.map((result) => result.error)).toEqual([null, null]);

    const reordered = await owner
      .from("chapters")
      .select("id, position")
      .eq("book_id", bookId)
      .order("position");
    if (reordered.error) throw reordered.error;
    expect(reordered.data.map((chapter) => chapter.position)).toEqual([0, 1, 2]);
    expect(new Set(reordered.data.map((chapter) => chapter.id)).size).toBe(3);
  });
});
