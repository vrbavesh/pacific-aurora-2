import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import * as worldRoute from "@/app/api/worlds/[worldId]/route";
import * as worldBooksRoute from "@/app/api/worlds/[worldId]/books/route";
import * as worldCharactersRoute from "@/app/api/worlds/[worldId]/characters/route";
import * as worldPlacesRoute from "@/app/api/worlds/[worldId]/places/route";
import * as worldItemsRoute from "@/app/api/worlds/[worldId]/items/route";
import * as worldTypesRoute from "@/app/api/worlds/[worldId]/custom-entity-types/route";
import * as worldCustomEntitiesRoute from "@/app/api/worlds/[worldId]/custom-entities/route";
import * as worldRelationshipsRoute from "@/app/api/worlds/[worldId]/relationships/route";
import * as worldOpenRoute from "@/app/api/worlds/[worldId]/open/route";
import * as bookRoute from "@/app/api/books/[bookId]/route";
import * as chaptersRoute from "@/app/api/books/[bookId]/chapters/route";
import * as chapterRoute from "@/app/api/books/[bookId]/chapters/[chapterId]/route";
import * as chapterPointsRoute from "@/app/api/books/[bookId]/chapters/[chapterId]/important-points/route";
import * as chapterPointRoute from "@/app/api/books/[bookId]/chapters/[chapterId]/important-points/[pointId]/route";
import * as chapterMoveRoute from "@/app/api/books/[bookId]/chapters/[chapterId]/move/route";
import * as bookOpenRoute from "@/app/api/books/[bookId]/open/route";
import * as characterRoute from "@/app/api/characters/[entityId]/route";
import * as timelinesRoute from "@/app/api/characters/[entityId]/timelines/route";
import * as timelinePointsRoute from "@/app/api/characters/[entityId]/timelines/[timelineId]/points/route";
import * as timelinePointRoute from "@/app/api/characters/[entityId]/timelines/[timelineId]/points/[pointId]/route";
import * as placeRoute from "@/app/api/places/[entityId]/route";
import * as itemRoute from "@/app/api/items/[entityId]/route";
import * as customTypeRoute from "@/app/api/custom-entity-types/[typeId]/route";
import * as attributesRoute from "@/app/api/custom-entity-types/[typeId]/attributes/route";
import * as customEntityRoute from "@/app/api/custom-entities/[entityId]/route";
import * as relationshipRoute from "@/app/api/relationships/[relationshipId]/route";

const RUN_LIVE = process.env.RUN_LIVE_RLS === "1";

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

type RowRef = {
  table: string;
  primaryKey: string;
  id: string;
  update: Record<string, unknown>;
};

type Fixture = {
  worldId: string;
  bookId: string;
  chapterId: string;
  chapterPointId: string;
  characterId: string;
  characterTwoId: string;
  placeId: string;
  itemId: string;
  customEntityId: string;
  customTypeId: string;
  customAttributeId: string;
  timelineId: string;
  timelinePointId: string;
  relationshipId: string;
  characterProbeId: string;
  placeProbeId: string;
  itemProbeId: string;
  customProbeId: string;
};

type RouteContext = { params: Promise<Record<string, string>> };
type RouteHandler = unknown;
type CallableRouteHandler = (
  request: Request,
  context: RouteContext,
) => Promise<Response>;

let admin: SupabaseClient;
let owner: SupabaseClient;
let outsider: SupabaseClient;
let ownerId = "";
let outsiderId = "";
let outsiderToken = "";
let fixture: Fixture;
let rows: RowRef[] = [];

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for the live RLS suite`);
  return value;
}

async function insertAdmin(
  table: string,
  values: Record<string, unknown> | Record<string, unknown>[],
): Promise<void> {
  const { error } = await admin.from(table).insert(values);
  if (error) throw new Error(`Fixture insert failed for ${table}: ${error.message}`);
}

async function createSession(
  url: string,
  anonKey: string,
  email: string,
  password: string,
): Promise<{ client: SupabaseClient; token: string }> {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Could not create live test session: ${error?.message ?? "no session"}`);
  }
  return { client, token: data.session.access_token };
}

function request(path: string, method: string, token?: string): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return new Request(`http://authorization.test${path}`, {
    method,
    headers,
    ...(method === "GET" || method === "HEAD"
      ? {}
      : { body: JSON.stringify({ name: "unauthorized", direction: "up" }) }),
  });
}

function context(params: Record<string, string>): RouteContext {
  return { params: Promise.resolve(params) };
}

async function expectNotFound(
  handler: RouteHandler,
  path: string,
  method: string,
  params: Record<string, string>,
): Promise<void> {
  const response = await (handler as CallableRouteHandler)(
    request(path, method, outsiderToken),
    context(params),
  );
  expect(response.status, `${method} ${path}`).toBe(404);
  const body = (await response.json()) as { error?: { code?: string } };
  expect(body.error?.code, `${method} ${path}`).toBe("not_found");
}

const liveDescribe = RUN_LIVE ? describe : describe.skip;

liveDescribe("live two-user authorization and RLS", () => {
  beforeAll(async () => {
    const url = requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL");
    const anonKey = requiredEnvironment("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    const serviceKey = requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY");
    admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const runId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const ownerEmail = `pa-rls-owner-${runId}@example.com`;
    const outsiderEmail = `pa-rls-outsider-${runId}@example.com`;
    const password = `Pa!${randomUUID()}9z`;

    const ownerResult = await admin.auth.admin.createUser({
      email: ownerEmail,
      password,
      email_confirm: true,
      user_metadata: { name: "RLS Owner" },
    });
    if (ownerResult.error || !ownerResult.data.user) {
      throw new Error(`Could not create owner test user: ${ownerResult.error?.message}`);
    }
    ownerId = ownerResult.data.user.id;

    const outsiderResult = await admin.auth.admin.createUser({
      email: outsiderEmail,
      password,
      email_confirm: true,
      user_metadata: { name: "RLS Outsider" },
    });
    if (outsiderResult.error || !outsiderResult.data.user) {
      throw new Error(`Could not create outsider test user: ${outsiderResult.error?.message}`);
    }
    outsiderId = outsiderResult.data.user.id;

    ({ client: owner } = await createSession(url, anonKey, ownerEmail, password));
    ({ client: outsider, token: outsiderToken } = await createSession(
      url,
      anonKey,
      outsiderEmail,
      password,
    ));

    // Prove profile INSERT is owner-scoped using two real auth identities.
    const { error: removeOwnerProfileError } = await admin
      .from("profiles")
      .delete()
      .eq("id", ownerId);
    if (removeOwnerProfileError) throw removeOwnerProfileError;
    const { error: crossProfileInsert } = await outsider.from("profiles").insert({
      id: ownerId,
      username: "must-not-exist",
      user_id: `must-not-exist-${runId}`,
      onboarding_complete: true,
    });
    expect(crossProfileInsert).not.toBeNull();
    const { error: ownProfileInsert } = await owner.from("profiles").insert({
      id: ownerId,
      username: "RLS Owner",
      user_id: `rls-owner-${runId}`,
      onboarding_complete: true,
    });
    if (ownProfileInsert) throw ownProfileInsert;

    fixture = {
      worldId: randomUUID(),
      bookId: randomUUID(),
      chapterId: "",
      chapterPointId: randomUUID(),
      characterId: randomUUID(),
      characterTwoId: randomUUID(),
      placeId: randomUUID(),
      itemId: randomUUID(),
      customEntityId: randomUUID(),
      customTypeId: randomUUID(),
      customAttributeId: randomUUID(),
      timelineId: randomUUID(),
      timelinePointId: randomUUID(),
      relationshipId: randomUUID(),
      characterProbeId: randomUUID(),
      placeProbeId: randomUUID(),
      itemProbeId: randomUUID(),
      customProbeId: randomUUID(),
    };

    await insertAdmin("worlds", {
      id: fixture.worldId,
      owner_id: ownerId,
      name: "RLS Test World",
    });
    await insertAdmin("books", {
      id: fixture.bookId,
      world_id: fixture.worldId,
      name: "RLS Test Book",
    });
    const chapterResult = await admin
      .from("chapters")
      .select("id")
      .eq("book_id", fixture.bookId)
      .eq("position", 0)
      .single();
    if (chapterResult.error || !chapterResult.data) {
      throw new Error(`Introduction chapter fixture missing: ${chapterResult.error?.message}`);
    }
    fixture.chapterId = chapterResult.data.id as string;
    await insertAdmin("chapter_important_points", {
      id: fixture.chapterPointId,
      chapter_id: fixture.chapterId,
      content: "Owner-only chapter point",
      position: 0,
    });
    await insertAdmin("world_entities", [
      { id: fixture.characterId, world_id: fixture.worldId, kind: "character", name: "Owner Character A" },
      { id: fixture.characterTwoId, world_id: fixture.worldId, kind: "character", name: "Owner Character B" },
      { id: fixture.placeId, world_id: fixture.worldId, kind: "place", name: "Owner Place" },
      { id: fixture.itemId, world_id: fixture.worldId, kind: "item", name: "Owner Item" },
      { id: fixture.customEntityId, world_id: fixture.worldId, kind: "custom", name: "Owner Custom Entity" },
      { id: fixture.characterProbeId, world_id: fixture.worldId, kind: "character", name: "Character Insert Probe" },
      { id: fixture.placeProbeId, world_id: fixture.worldId, kind: "place", name: "Place Insert Probe" },
      { id: fixture.itemProbeId, world_id: fixture.worldId, kind: "item", name: "Item Insert Probe" },
      { id: fixture.customProbeId, world_id: fixture.worldId, kind: "custom", name: "Custom Insert Probe" },
    ]);
    await insertAdmin("characters", [
      { entity_id: fixture.characterId, notes: "Owner only" },
      { entity_id: fixture.characterTwoId, notes: "Owner only" },
    ]);
    await insertAdmin("places", {
      entity_id: fixture.placeId,
      status: "Owner only",
      last_chapter_id: fixture.chapterId,
    });
    await insertAdmin("items", {
      entity_id: fixture.itemId,
      status: "Owner only",
      power: "Owner only",
      wielder_entity_id: fixture.characterId,
    });
    await insertAdmin("custom_entity_types", {
      id: fixture.customTypeId,
      world_id: fixture.worldId,
      name: "Owner Type",
      position: 0,
    });
    await insertAdmin("custom_entity_attributes", {
      id: fixture.customAttributeId,
      entity_type_id: fixture.customTypeId,
      name: "Owner Attribute",
      field_type: "text",
      position: 0,
    });
    await insertAdmin("custom_entities", {
      entity_id: fixture.customEntityId,
      entity_type_id: fixture.customTypeId,
      attributes: { [fixture.customAttributeId]: "owner" },
    });
    await insertAdmin("character_book_timelines", {
      id: fixture.timelineId,
      character_entity_id: fixture.characterId,
      book_id: fixture.bookId,
    });
    await insertAdmin("character_timeline_points", {
      id: fixture.timelinePointId,
      timeline_id: fixture.timelineId,
      content: "Owner-only timeline point",
      position: 0,
      chapter_id: fixture.chapterId,
    });
    const [entityA, entityB] = [fixture.characterId, fixture.characterTwoId].sort();
    await insertAdmin("entity_relationships", {
      id: fixture.relationshipId,
      world_id: fixture.worldId,
      entity_a_id: entityA,
      entity_b_id: entityB,
      relationship_type: "Owner only",
      sentiment: 50,
    });

    rows = [
      { table: "profiles", primaryKey: "id", id: ownerId, update: { username: "unauthorized" } },
      { table: "worlds", primaryKey: "id", id: fixture.worldId, update: { name: "unauthorized" } },
      { table: "books", primaryKey: "id", id: fixture.bookId, update: { name: "unauthorized" } },
      { table: "chapters", primaryKey: "id", id: fixture.chapterId, update: { name: "unauthorized" } },
      { table: "chapter_important_points", primaryKey: "id", id: fixture.chapterPointId, update: { content: "unauthorized" } },
      { table: "world_entities", primaryKey: "id", id: fixture.characterId, update: { name: "unauthorized" } },
      { table: "characters", primaryKey: "entity_id", id: fixture.characterId, update: { notes: "unauthorized" } },
      { table: "places", primaryKey: "entity_id", id: fixture.placeId, update: { status: "unauthorized" } },
      { table: "items", primaryKey: "entity_id", id: fixture.itemId, update: { power: "unauthorized" } },
      { table: "custom_entity_types", primaryKey: "id", id: fixture.customTypeId, update: { name: "unauthorized" } },
      { table: "custom_entity_attributes", primaryKey: "id", id: fixture.customAttributeId, update: { name: "unauthorized" } },
      { table: "custom_entities", primaryKey: "entity_id", id: fixture.customEntityId, update: { attributes: { unauthorized: true } } },
      { table: "character_book_timelines", primaryKey: "id", id: fixture.timelineId, update: { book_id: fixture.bookId } },
      { table: "character_timeline_points", primaryKey: "id", id: fixture.timelinePointId, update: { content: "unauthorized" } },
      { table: "entity_relationships", primaryKey: "id", id: fixture.relationshipId, update: { relationship_type: "unauthorized" } },
    ];
  }, 120_000);

  afterAll(async () => {
    const errors: string[] = [];
    for (const id of [outsiderId, ownerId]) {
      if (!id || !admin) continue;
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) errors.push(error.message);
    }
    if (errors.length) throw new Error(`Live RLS cleanup failed: ${errors.join("; ")}`);
  }, 60_000);

  test("control: each user can access their own rows", async () => {
    for (const row of rows) {
      const { data, error } = await owner
        .from(row.table)
        .select(row.primaryKey)
        .eq(row.primaryKey, row.id);
      expect(error, row.table).toBeNull();
      expect(data, row.table).toHaveLength(1);
    }

    const ownWorldId = randomUUID();
    const { error: insertError } = await outsider.from("worlds").insert({
      id: ownWorldId,
      owner_id: outsiderId,
      name: "Outsider control world",
    });
    expect(insertError).toBeNull();
    const { data: ownWorld } = await outsider
      .from("worlds")
      .select("id")
      .eq("id", ownWorldId);
    expect(ownWorld).toHaveLength(1);
    const { error: deleteError } = await outsider
      .from("worlds")
      .delete()
      .eq("id", ownWorldId);
    expect(deleteError).toBeNull();
  }, 60_000);

  test("all 15 tables hide owner rows from the second user", async () => {
    for (const row of rows) {
      const { data, error } = await outsider
        .from(row.table)
        .select(row.primaryKey)
        .eq(row.primaryKey, row.id);
      expect(error, row.table).toBeNull();
      expect(data, row.table).toEqual([]);
    }
  }, 60_000);

  test("all 15 tables reject cross-user updates and deletes", async () => {
    for (const row of rows) {
      const updateResult = await outsider
        .from(row.table)
        .update(row.update)
        .eq(row.primaryKey, row.id)
        .select(row.primaryKey);
      expect(updateResult.error, `${row.table} update`).toBeNull();
      expect(updateResult.data, `${row.table} update`).toEqual([]);

      const deleteResult = await outsider
        .from(row.table)
        .delete()
        .eq(row.primaryKey, row.id)
        .select(row.primaryKey);
      expect(deleteResult.error, `${row.table} delete`).toBeNull();
      expect(deleteResult.data, `${row.table} delete`).toEqual([]);
    }

    for (const row of rows) {
      const { data, error } = await admin
        .from(row.table)
        .select(row.primaryKey)
        .eq(row.primaryKey, row.id);
      expect(error, `${row.table} admin verification`).toBeNull();
      expect(data, `${row.table} was changed or deleted`).toHaveLength(1);
    }
  }, 120_000);

  test("cross-user inserts targeting owner aggregates are rejected", async () => {
    const probes: { table: string; primaryKey: string; id: string; value: Record<string, unknown> }[] = [
      { table: "worlds", primaryKey: "id", id: randomUUID(), value: { id: randomUUID(), owner_id: ownerId, name: "denied" } },
      { table: "books", primaryKey: "id", id: randomUUID(), value: { id: randomUUID(), world_id: fixture.worldId, name: "denied" } },
      { table: "chapters", primaryKey: "id", id: randomUUID(), value: { id: randomUUID(), book_id: fixture.bookId, name: "denied", position: 99 } },
      { table: "chapter_important_points", primaryKey: "id", id: randomUUID(), value: { id: randomUUID(), chapter_id: fixture.chapterId, content: "denied", position: 99 } },
      { table: "world_entities", primaryKey: "id", id: randomUUID(), value: { id: randomUUID(), world_id: fixture.worldId, kind: "character", name: "denied" } },
      { table: "characters", primaryKey: "entity_id", id: fixture.characterProbeId, value: { entity_id: fixture.characterProbeId, notes: "denied" } },
      { table: "places", primaryKey: "entity_id", id: fixture.placeProbeId, value: { entity_id: fixture.placeProbeId, status: "denied" } },
      { table: "items", primaryKey: "entity_id", id: fixture.itemProbeId, value: { entity_id: fixture.itemProbeId, status: "denied" } },
      { table: "custom_entity_types", primaryKey: "id", id: randomUUID(), value: { id: randomUUID(), world_id: fixture.worldId, name: `denied-${randomUUID()}`, position: 99 } },
      { table: "custom_entity_attributes", primaryKey: "id", id: randomUUID(), value: { id: randomUUID(), entity_type_id: fixture.customTypeId, name: `denied-${randomUUID()}`, field_type: "text", position: 99 } },
      { table: "custom_entities", primaryKey: "entity_id", id: fixture.customProbeId, value: { entity_id: fixture.customProbeId, entity_type_id: fixture.customTypeId, attributes: {} } },
      { table: "character_book_timelines", primaryKey: "id", id: randomUUID(), value: { id: randomUUID(), character_entity_id: fixture.characterTwoId, book_id: fixture.bookId } },
      { table: "character_timeline_points", primaryKey: "id", id: randomUUID(), value: { id: randomUUID(), timeline_id: fixture.timelineId, content: "denied", position: 99 } },
    ];
    const relationId = randomUUID();
    const [entityA, entityB] = [fixture.characterId, fixture.itemId].sort();
    probes.push({
      table: "entity_relationships",
      primaryKey: "id",
      id: relationId,
      value: {
        id: relationId,
        world_id: fixture.worldId,
        entity_a_id: entityA,
        entity_b_id: entityB,
        relationship_type: "denied",
        sentiment: 50,
      },
    });

    // Keep each generated primary key aligned with the row being verified.
    for (const probe of probes) {
      probe.id = String(probe.value[probe.primaryKey]);
      const { error } = await outsider.from(probe.table).insert(probe.value);
      expect(error, `${probe.table} insert unexpectedly succeeded`).not.toBeNull();
      const adminCheck = await admin
        .from(probe.table)
        .select(probe.primaryKey)
        .eq(probe.primaryKey, probe.id);
      expect(adminCheck.data, `${probe.table} unauthorized row persisted`).toEqual([]);
    }
  }, 120_000);

  test("missing and invalid sessions return 401", async () => {
    const params = { worldId: fixture.worldId };
    const noSession = await worldRoute.GET(
      request(`/api/worlds/${fixture.worldId}`, "GET"),
      context(params) as never,
    );
    expect(noSession.status).toBe(401);
    const invalidSession = await worldRoute.GET(
      request(`/api/worlds/${fixture.worldId}`, "GET", "not-a-jwt"),
      context(params) as never,
    );
    expect(invalidSession.status).toBe(401);
  }, 30_000);

  test("every dynamic API handler returns indistinguishable 404 for cross-user resources", async () => {
    const w = fixture.worldId;
    const b = fixture.bookId;
    const c = fixture.chapterId;
    const cp = fixture.chapterPointId;
    const ch = fixture.characterId;
    const t = fixture.timelineId;
    const tp = fixture.timelinePointId;
    const type = fixture.customTypeId;
    const ce = fixture.customEntityId;
    const rel = fixture.relationshipId;
    const p = fixture.placeId;
    const i = fixture.itemId;

    const cases: [RouteHandler, string, string, Record<string, string>][] = [
      [worldRoute.GET as RouteHandler, `/api/worlds/${w}`, "GET", { worldId: w }],
      [worldRoute.PATCH as RouteHandler, `/api/worlds/${w}`, "PATCH", { worldId: w }],
      [worldRoute.DELETE as RouteHandler, `/api/worlds/${w}`, "DELETE", { worldId: w }],
      [worldBooksRoute.GET as RouteHandler, `/api/worlds/${w}/books`, "GET", { worldId: w }],
      [worldBooksRoute.POST as RouteHandler, `/api/worlds/${w}/books`, "POST", { worldId: w }],
      [worldCharactersRoute.GET as RouteHandler, `/api/worlds/${w}/characters`, "GET", { worldId: w }],
      [worldCharactersRoute.POST as RouteHandler, `/api/worlds/${w}/characters`, "POST", { worldId: w }],
      [worldPlacesRoute.GET as RouteHandler, `/api/worlds/${w}/places`, "GET", { worldId: w }],
      [worldPlacesRoute.POST as RouteHandler, `/api/worlds/${w}/places`, "POST", { worldId: w }],
      [worldItemsRoute.GET as RouteHandler, `/api/worlds/${w}/items`, "GET", { worldId: w }],
      [worldItemsRoute.POST as RouteHandler, `/api/worlds/${w}/items`, "POST", { worldId: w }],
      [worldTypesRoute.GET as RouteHandler, `/api/worlds/${w}/custom-entity-types`, "GET", { worldId: w }],
      [worldTypesRoute.POST as RouteHandler, `/api/worlds/${w}/custom-entity-types`, "POST", { worldId: w }],
      [worldCustomEntitiesRoute.GET as RouteHandler, `/api/worlds/${w}/custom-entities`, "GET", { worldId: w }],
      [worldCustomEntitiesRoute.POST as RouteHandler, `/api/worlds/${w}/custom-entities`, "POST", { worldId: w }],
      [worldRelationshipsRoute.GET as RouteHandler, `/api/worlds/${w}/relationships`, "GET", { worldId: w }],
      [worldRelationshipsRoute.POST as RouteHandler, `/api/worlds/${w}/relationships`, "POST", { worldId: w }],
      [worldOpenRoute.POST as RouteHandler, `/api/worlds/${w}/open`, "POST", { worldId: w }],
      [bookRoute.GET as RouteHandler, `/api/books/${b}`, "GET", { bookId: b }],
      [bookRoute.PATCH as RouteHandler, `/api/books/${b}`, "PATCH", { bookId: b }],
      [bookRoute.DELETE as RouteHandler, `/api/books/${b}`, "DELETE", { bookId: b }],
      [chaptersRoute.GET as RouteHandler, `/api/books/${b}/chapters`, "GET", { bookId: b }],
      [chaptersRoute.POST as RouteHandler, `/api/books/${b}/chapters`, "POST", { bookId: b }],
      [chapterRoute.GET as RouteHandler, `/api/books/${b}/chapters/${c}`, "GET", { bookId: b, chapterId: c }],
      [chapterRoute.PATCH as RouteHandler, `/api/books/${b}/chapters/${c}`, "PATCH", { bookId: b, chapterId: c }],
      [chapterRoute.DELETE as RouteHandler, `/api/books/${b}/chapters/${c}`, "DELETE", { bookId: b, chapterId: c }],
      [chapterPointsRoute.GET as RouteHandler, `/api/books/${b}/chapters/${c}/important-points`, "GET", { bookId: b, chapterId: c }],
      [chapterPointsRoute.POST as RouteHandler, `/api/books/${b}/chapters/${c}/important-points`, "POST", { bookId: b, chapterId: c }],
      [chapterPointRoute.DELETE as RouteHandler, `/api/books/${b}/chapters/${c}/important-points/${cp}`, "DELETE", { bookId: b, chapterId: c, pointId: cp }],
      [chapterMoveRoute.POST as RouteHandler, `/api/books/${b}/chapters/${c}/move`, "POST", { bookId: b, chapterId: c }],
      [bookOpenRoute.POST as RouteHandler, `/api/books/${b}/open`, "POST", { bookId: b }],
      [characterRoute.PATCH as RouteHandler, `/api/characters/${ch}`, "PATCH", { entityId: ch }],
      [characterRoute.DELETE as RouteHandler, `/api/characters/${ch}`, "DELETE", { entityId: ch }],
      [timelinesRoute.GET as RouteHandler, `/api/characters/${ch}/timelines`, "GET", { entityId: ch }],
      [timelinesRoute.POST as RouteHandler, `/api/characters/${ch}/timelines`, "POST", { entityId: ch }],
      [timelinePointsRoute.GET as RouteHandler, `/api/characters/${ch}/timelines/${t}/points`, "GET", { entityId: ch, timelineId: t }],
      [timelinePointsRoute.POST as RouteHandler, `/api/characters/${ch}/timelines/${t}/points`, "POST", { entityId: ch, timelineId: t }],
      [timelinePointRoute.DELETE as RouteHandler, `/api/characters/${ch}/timelines/${t}/points/${tp}`, "DELETE", { entityId: ch, timelineId: t, pointId: tp }],
      [placeRoute.PATCH as RouteHandler, `/api/places/${p}`, "PATCH", { entityId: p }],
      [placeRoute.DELETE as RouteHandler, `/api/places/${p}`, "DELETE", { entityId: p }],
      [itemRoute.PATCH as RouteHandler, `/api/items/${i}`, "PATCH", { entityId: i }],
      [itemRoute.DELETE as RouteHandler, `/api/items/${i}`, "DELETE", { entityId: i }],
      [customTypeRoute.GET as RouteHandler, `/api/custom-entity-types/${type}`, "GET", { typeId: type }],
      [customTypeRoute.PATCH as RouteHandler, `/api/custom-entity-types/${type}`, "PATCH", { typeId: type }],
      [customTypeRoute.DELETE as RouteHandler, `/api/custom-entity-types/${type}`, "DELETE", { typeId: type }],
      [attributesRoute.GET as RouteHandler, `/api/custom-entity-types/${type}/attributes`, "GET", { typeId: type }],
      [attributesRoute.POST as RouteHandler, `/api/custom-entity-types/${type}/attributes`, "POST", { typeId: type }],
      [customEntityRoute.PATCH as RouteHandler, `/api/custom-entities/${ce}`, "PATCH", { entityId: ce }],
      [customEntityRoute.DELETE as RouteHandler, `/api/custom-entities/${ce}`, "DELETE", { entityId: ce }],
      [relationshipRoute.PATCH as RouteHandler, `/api/relationships/${rel}`, "PATCH", { relationshipId: rel }],
      [relationshipRoute.DELETE as RouteHandler, `/api/relationships/${rel}`, "DELETE", { relationshipId: rel }],
    ];

    for (const routeCase of cases) await expectNotFound(...routeCase);
    expect(cases).toHaveLength(51);
  }, 180_000);
});
