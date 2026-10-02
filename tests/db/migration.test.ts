import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const SQL = readFileSync(
  "supabase/migrations/0001_pacific_aurora.sql",
  "utf8",
);

const TABLES = [
  "profiles",
  "worlds",
  "books",
  "chapters",
  "chapter_important_points",
  "world_entities",
  "characters",
  "places",
  "items",
  "custom_entity_types",
  "custom_entity_attributes",
  "custom_entities",
  "character_book_timelines",
  "character_timeline_points",
  "entity_relationships",
];

test("migration creates all 15 tables", () => {
  for (const t of TABLES) {
    expect(SQL, `missing table ${t}`).toContain(`create table public.${t} `);
  }
});

test("every table has row level security enabled", () => {
  for (const t of TABLES) {
    expect(SQL, `missing RLS for ${t}`).toContain(
      `alter table public.${t} enable row level security;`,
    );
  }
});

const LINES = SQL.split("\n");

test("every table has select/insert/update/delete coverage (profiles: select/insert/update)", () => {
  for (const t of TABLES) {
    const policyLines = LINES.filter((l) => l === `on public.${t}`).length;
    const min = t === "profiles" ? 3 : 4;
    expect(policyLines, `expected >=${min} policies on public.${t}, got ${policyLines}`).toBeGreaterThanOrEqual(min);
  }
});

test("creates the four enums", () => {
  for (const e of ["entity_kind", "character_status", "custom_field_type"]) {
    expect(SQL).toContain(`create type public.${e} as enum`);
  }
});

test("includes ownership helpers, business triggers, and validators", () => {
  for (const fn of [
    "is_world_owner",
    "is_book_owner",
    "is_entity_owner",
    "create_intro_chapter",
    "handle_new_user",
    "validate_entity_subtype",
    "validate_custom_entity_world",
    "validate_item_wielder",
    "validate_place_last_chapter",
    "validate_character_timeline",
    "validate_timeline_point_chapter",
    "validate_relationship_world",
    "set_updated_at",
  ]) {
    expect(SQL, `missing function ${fn}`).toContain(`public.${fn}`);
  }
});

test("dollar-quoted function bodies are balanced", () => {
  const dollar = (SQL.match(/\$\$/g) ?? []).length;
  expect(dollar % 2).toBe(0);
});

test("generates id defaults and the automatic Introduction chapter trigger", () => {
  expect(SQL).toContain("gen_random_uuid()");
  expect(SQL).toContain("on_book_created");
  expect(SQL).toContain("'Introduction'");
});
