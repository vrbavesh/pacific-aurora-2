-- =========================================================
-- PACIFIC AURORA
-- PostgreSQL / Supabase Database Schema
-- FINAL VERSION
-- =========================================================
create extension if not exists "pgcrypto";
-- =========================================================
-- ENUMS
-- =========================================================
create type public.entity_kind as enum (
'character',
'place',
'item',
'custom'
);
create type public.character_status as enum (
'alive',
'dead'
);
create type public.custom_field_type as enum (
'text',
'number',
'boolean',
'date',
'select',
'multiselect'
);
-- =========================================================
-- PROFILES
--
-- One profile per Supabase Auth user.
-- profiles.id = auth.users.id
--
-- username and user_id may be NULL during onboarding.
-- =========================================================
create table public.profiles (
id uuid primary key
references auth.users(id)
on delete cascade,
username text,
user_id text,
onboarding_complete boolean not null default false,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
constraint username_not_empty
check (
username is null
or length(trim(username)) > 0
)
);
create index profiles_user_id_idx
on public.profiles(user_id);
create unique index profiles_user_id_unique_idx
on public.profiles(user_id)
where user_id is not null;
-- =========================================================
-- WORLDS
-- =========================================================
create table public.worlds (
id uuid primary key default gen_random_uuid(),
owner_id uuid not null
references public.profiles(id)
on delete cascade,
name text not null,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
last_opened_at timestamptz,
constraint world_name_not_empty
check (length(trim(name)) > 0),
-- Allows composite foreign keys to verify world ownership
unique(id, owner_id)
);
create index worlds_owner_idx
on public.worlds(owner_id);
create index worlds_owner_last_opened_idx
on public.worlds(owner_id, last_opened_at desc);
-- =========================================================
-- BOOKS
-- =========================================================
create table public.books (
id uuid primary key default gen_random_uuid(),
world_id uuid not null
references public.worlds(id)
on delete cascade,
name text not null,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
last_opened_at timestamptz,
-- AI throttling/state.
-- This is NOT AI history.
ai_last_requested_at timestamptz,
-- Number of words already analyzed.
ai_last_analyzed_word_count integer not null default 0,
constraint book_name_not_empty
check (length(trim(name)) > 0),
constraint ai_word_count_non_negative
check (ai_last_analyzed_word_count >= 0),
unique(id, world_id)
);
create index books_world_idx
on public.books(world_id);
create index books_world_last_opened_idx
on public.books(world_id, last_opened_at desc);
-- =========================================================
-- CHAPTERS
-- =========================================================
create table public.chapters (
id uuid primary key default gen_random_uuid(),
book_id uuid not null
references public.books(id)
on delete cascade,
name text not null,
position integer not null,
content jsonb not null default
'{"type":"doc","content":[]}'::jsonb,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
constraint chapter_name_not_empty
check (length(trim(name)) > 0),
constraint chapter_position_non_negative
check (position >= 0),
unique(book_id, position),
unique(id, book_id)
);
create index chapters_book_idx
on public.chapters(book_id);
create index chapters_book_position_idx
on public.chapters(book_id, position);
-- =========================================================
-- CHAPTER IMPORTANT POINTS
-- =========================================================
create table public.chapter_important_points (
id uuid primary key default gen_random_uuid(),
chapter_id uuid not null
references public.chapters(id)
on delete cascade,
content text not null,
position integer not null default 0,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
constraint chapter_point_not_empty
check (length(trim(content)) > 0),
constraint chapter_point_position_non_negative
check (position >= 0)
);
create index chapter_points_chapter_idx
on public.chapter_important_points(chapter_id);
create index chapter_points_chapter_position_idx
on public.chapter_important_points(chapter_id, position);
-- =========================================================
-- WORLD ENTITIES
-- =========================================================
create table public.world_entities (
id uuid primary key default gen_random_uuid(),
world_id uuid not null
references public.worlds(id)
on delete cascade,
kind public.entity_kind not null,
name text not null,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
constraint entity_name_not_empty
check (length(trim(name)) > 0),
unique(id, world_id)
);
create index world_entities_world_idx
on public.world_entities(world_id);
create index world_entities_world_kind_idx
on public.world_entities(world_id, kind);
-- =========================================================
-- CHARACTERS
-- =========================================================
create table public.characters (
entity_id uuid primary key
references public.world_entities(id)
on delete cascade,
age integer,
health text,
distinctions text,
traits text,
mutations text,
status public.character_status not null default 'alive',
notes text,
constraint character_age_non_negative
check (age is null or age >= 0)
);
-- =========================================================
-- PLACES
-- =========================================================
create table public.places (
entity_id uuid primary key
references public.world_entities(id)
on delete cascade,
status text,
last_chapter_id uuid
references public.chapters(id)
on delete set null
);
create index places_last_chapter_idx
on public.places(last_chapter_id);
-- =========================================================
-- ITEMS
-- =========================================================
create table public.items (
entity_id uuid primary key
references public.world_entities(id)
on delete cascade,
status text,
power text,
-- Existing character wielding the item.
wielder_entity_id uuid
references public.characters(entity_id)
on delete set null,
-- Used when the wielder is not an existing character.
manual_wielder_name text,
constraint item_wielder_one_source
check (
not (
wielder_entity_id is not null
and manual_wielder_name is not null
and length(trim(manual_wielder_name)) > 0
)
)
);
create index items_wielder_idx
on public.items(wielder_entity_id);
-- =========================================================
-- CUSTOM ENTITY TYPES
-- =========================================================
create table public.custom_entity_types (
id uuid primary key default gen_random_uuid(),
world_id uuid not null
references public.worlds(id)
on delete cascade,
name text not null,
position integer not null default 0,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
constraint custom_type_name_not_empty
check (length(trim(name)) > 0),
constraint custom_type_position_non_negative
check (position >= 0),
unique(world_id, name),
unique(id, world_id)
);
create index custom_entity_types_world_idx
on public.custom_entity_types(world_id);
-- =========================================================
-- CUSTOM ENTITY ATTRIBUTE DEFINITIONS
-- =========================================================
create table public.custom_entity_attributes (
id uuid primary key default gen_random_uuid(),
entity_type_id uuid not null
references public.custom_entity_types(id)
on delete cascade,
name text not null,
field_type public.custom_field_type not null,
required boolean not null default false,
position integer not null default 0,
options jsonb,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
constraint attribute_name_not_empty
check (length(trim(name)) > 0),
constraint attribute_position_non_negative
check (position >= 0),
unique(entity_type_id, name)
);
create index custom_attributes_type_idx
on public.custom_entity_attributes(entity_type_id);
-- =========================================================
-- CUSTOM ENTITIES
-- =========================================================
create table public.custom_entities (
entity_id uuid primary key
references public.world_entities(id)
on delete cascade,
entity_type_id uuid not null
references public.custom_entity_types(id)
on delete cascade,
attributes jsonb not null default '{}'::jsonb
);
create index custom_entities_type_idx
on public.custom_entities(entity_type_id);
create index custom_entities_attributes_idx
on public.custom_entities
using gin(attributes);
-- =========================================================
-- CHARACTER BOOK TIMELINES
--
-- Created only when a character appears/is relevant
-- to a specific book.
-- =========================================================
create table public.character_book_timelines (
id uuid primary key default gen_random_uuid(),
character_entity_id uuid not null
references public.characters(entity_id)
on delete cascade,
book_id uuid not null
references public.books(id)
on delete cascade,
created_at timestamptz not null default now(),
unique(character_entity_id, book_id),
unique(id, book_id)
);
create index character_timelines_character_idx
on public.character_book_timelines(character_entity_id);
create index character_timelines_book_idx
on public.character_book_timelines(book_id);
-- =========================================================
-- CHARACTER TIMELINE IMPORTANT POINTS
-- =========================================================
create table public.character_timeline_points (
id uuid primary key default gen_random_uuid(),
timeline_id uuid not null
references public.character_book_timelines(id)
on delete cascade,
content text not null,
position integer not null default 0,
chapter_id uuid
references public.chapters(id)
on delete set null,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
constraint character_timeline_point_not_empty
check (length(trim(content)) > 0),
constraint character_timeline_position_non_negative
check (position >= 0)
);
create index character_timeline_points_timeline_idx
on public.character_timeline_points(timeline_id);
create index character_timeline_points_chapter_idx
on public.character_timeline_points(chapter_id);
-- =========================================================
-- ENTITY RELATIONSHIPS
-- =========================================================
create table public.entity_relationships (
id uuid primary key default gen_random_uuid(),
world_id uuid not null
references public.worlds(id)
on delete cascade,
entity_a_id uuid not null
references public.world_entities(id)
on delete cascade,
entity_b_id uuid not null
references public.world_entities(id)
on delete cascade,
relationship_type text not null,
-- 0 = hate
-- 50 = neutral
-- 100 = love
sentiment integer not null default 50,
created_at timestamptz not null default now(),
updated_at timestamptz not null default now(),
constraint relationship_type_not_empty
check (length(trim(relationship_type)) > 0),
constraint relationship_sentiment_range
check (sentiment between 0 and 100),
constraint relationship_entities_different
check (entity_a_id <> entity_b_id),
-- Prevents Alice -> Bob and Bob -> Alice
-- from being separate relationships.
constraint enforce_entity_order
check (entity_a_id < entity_b_id)
);
create unique index entity_relationship_unique_pair_idx
on public.entity_relationships(
world_id,
entity_a_id,
entity_b_id
);
create index entity_relationships_world_idx
on public.entity_relationships(world_id);
create index entity_relationships_entity_a_idx
on public.entity_relationships(entity_a_id);
create index entity_relationships_entity_b_idx
on public.entity_relationships(entity_b_id);
-- =========================================================
-- UPDATED_AT FUNCTION
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
new.updated_at = now();
return new;
end;
$$;
-- =========================================================
-- UPDATED_AT TRIGGERS
-- =========================================================
create trigger profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();
create trigger worlds_updated_at
before update on public.worlds
for each row
execute function public.set_updated_at();
create trigger books_updated_at
before update on public.books
for each row
execute function public.set_updated_at();
create trigger chapters_updated_at
before update on public.chapters
for each row
execute function public.set_updated_at();
create trigger chapter_points_updated_at
before update on public.chapter_important_points
for each row
execute function public.set_updated_at();
create trigger world_entities_updated_at
before update on public.world_entities
for each row
execute function public.set_updated_at();
create trigger custom_entity_types_updated_at
before update on public.custom_entity_types
for each row
execute function public.set_updated_at();
create trigger custom_attributes_updated_at
before update on public.custom_entity_attributes
for each row
execute function public.set_updated_at();
create trigger entity_relationships_updated_at
before update on public.entity_relationships
for each row
execute function public.set_updated_at();
create trigger character_timeline_points_updated_at
before update on public.character_timeline_points
for each row
execute function public.set_updated_at();
-- =========================================================
-- AUTHORIZATION HELPER FUNCTIONS
-- =========================================================
create or replace function public.is_world_owner(
target_world_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
select exists (
select 1
from public.worlds w
where w.id = target_world_id
and w.owner_id = auth.uid()
);
$$;
create or replace function public.is_book_owner(
target_book_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
select exists (
select 1
from public.books b
join public.worlds w
on w.id = b.world_id
where b.id = target_book_id
and w.owner_id = auth.uid()
);
$$;
create or replace function public.is_entity_owner(
target_entity_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
select exists (
select 1
from public.world_entities e
join public.worlds w
on w.id = e.world_id
where e.id = target_entity_id
and w.owner_id = auth.uid()
);
$$;
-- =========================================================
-- BUSINESS LOGIC:
-- AUTOMATIC INTRODUCTION CHAPTER
-- =========================================================
create or replace function public.create_intro_chapter()
returns trigger
language plpgsql
as $$
begin
insert into public.chapters (
book_id,
name,
position
)
values (
new.id,
'Introduction',
0
);
return new;
end;
$$;
create trigger on_book_created
after insert on public.books
for each row
execute function public.create_intro_chapter();
-- =========================================================
-- PROFILE AUTO-CREATION
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
insert into public.profiles (
id,
username,
user_id,
onboarding_complete
)
values (
new.id,
nullif(
trim(new.raw_user_meta_data ->> 'name'),
''
),
null,
false
);
return new;
end;
$$;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
-- =========================================================
-- DATA INTEGRITY FUNCTIONS
-- =========================================================
-- =========================================================
-- ENSURE SUBTYPE MATCHES WORLD ENTITY KIND
-- =========================================================
create or replace function public.validate_entity_subtype()
returns trigger
language plpgsql
as $$
declare
expected_kind public.entity_kind;
actual_kind public.entity_kind;
begin
if tg_table_name = 'characters' then
expected_kind := 'character';
elsif tg_table_name = 'places' then
expected_kind := 'place';
elsif tg_table_name = 'items' then
expected_kind := 'item';
elsif tg_table_name = 'custom_entities' then
expected_kind := 'custom';
else
raise exception 'Unsupported entity subtype table: %', tg_table_name;
end if;
select kind
into actual_kind
from public.world_entities
where id = new.entity_id;
if actual_kind is null then
raise exception
'World entity % does not exist',
new.entity_id;
end if;
if actual_kind <> expected_kind then
raise exception
'Entity % has kind %, but % requires kind %',
new.entity_id,
actual_kind,
tg_table_name,
expected_kind;
end if;
return new;
end;
$$;
create trigger validate_character_entity_kind
before insert or update on public.characters
for each row
execute function public.validate_entity_subtype();
create trigger validate_place_entity_kind
before insert or update on public.places
for each row
execute function public.validate_entity_subtype();
create trigger validate_item_entity_kind
before insert or update on public.items
for each row
execute function public.validate_entity_subtype();
create trigger validate_custom_entity_kind
before insert or update on public.custom_entities
for each row
execute function public.validate_entity_subtype();
-- =========================================================
-- CUSTOM ENTITY MUST USE A TYPE FROM SAME WORLD
-- =========================================================
create or replace function public.validate_custom_entity_world()
returns trigger
language plpgsql
as $$
declare
entity_world_id uuid;
type_world_id uuid;
begin
select world_id
into entity_world_id
from public.world_entities
where id = new.entity_id;
select world_id
into type_world_id
from public.custom_entity_types
where id = new.entity_type_id;
if entity_world_id is null then
raise exception
'Custom entity % does not exist',
new.entity_id;
end if;
if type_world_id is null then
raise exception
'Custom entity type % does not exist',
new.entity_type_id;
end if;
if entity_world_id <> type_world_id then
raise exception
'Custom entity and custom entity type must belong to the same world';
end if;
return new;
end;
$$;
create trigger validate_custom_entity_world
before insert or update on public.custom_entities
for each row
execute function public.validate_custom_entity_world();
-- =========================================================
-- ITEM WIELDER MUST BE CHARACTER IN SAME WORLD
-- =========================================================
create or replace function public.validate_item_wielder()
returns trigger
language plpgsql
as $$
declare
item_world_id uuid;
wielder_world_id uuid;
begin
if new.wielder_entity_id is null then
return new;
end if;
select e.world_id
into item_world_id
from public.world_entities e
where e.id = new.entity_id;
select e.world_id
into wielder_world_id
from public.world_entities e
join public.characters c
on c.entity_id = e.id
where e.id = new.wielder_entity_id;
if item_world_id is null then
raise exception
'Item entity % does not exist',
new.entity_id;
end if;
if wielder_world_id is null then
raise exception
'Wielder % must be an existing character',
new.wielder_entity_id;
end if;
if item_world_id <> wielder_world_id then
raise exception
'Item and wielder must belong to the same world';
end if;
return new;
end;
$$;
create trigger validate_item_wielder
before insert or update on public.items
for each row
execute function public.validate_item_wielder();
-- =========================================================
-- PLACE LAST CHAPTER MUST BELONG TO SAME WORLD
-- =========================================================
create or replace function public.validate_place_last_chapter()
returns trigger
language plpgsql
as $$
declare
place_world_id uuid;
chapter_world_id uuid;
begin
if new.last_chapter_id is null then
return new;
end if;
select e.world_id
into place_world_id
from public.world_entities e
where e.id = new.entity_id;
select b.world_id
into chapter_world_id
from public.chapters c
join public.books b
on b.id = c.book_id
where c.id = new.last_chapter_id;
if chapter_world_id is null then
raise exception
'Chapter % does not exist',
new.last_chapter_id;
end if;
if place_world_id <> chapter_world_id then
raise exception
'Place and last chapter must belong to the same world';
end if;
return new;
end;
$$;
create trigger validate_place_last_chapter
before insert or update on public.places
for each row
execute function public.validate_place_last_chapter();
-- =========================================================
-- CHARACTER TIMELINE MUST CONNECT SAME WORLD
-- =========================================================
create or replace function public.validate_character_timeline()
returns trigger
language plpgsql
as $$
declare
character_world_id uuid;
book_world_id uuid;
begin
select e.world_id
into character_world_id
from public.world_entities e
join public.characters c
on c.entity_id = e.id
where e.id = new.character_entity_id;
select world_id
into book_world_id
from public.books
where id = new.book_id;
if character_world_id is null then
raise exception
'Character % does not exist',
new.character_entity_id;
end if;
if book_world_id is null then
raise exception
'Book % does not exist',
new.book_id;
end if;
if character_world_id <> book_world_id then
raise exception
'Character timeline character and book must belong to the same world';
end if;
return new;
end;
$$;
create trigger validate_character_timeline
before insert or update on public.character_book_timelines
for each row
execute function public.validate_character_timeline();
-- =========================================================
-- TIMELINE POINT CHAPTER MUST BELONG TO TIMELINE BOOK
-- =========================================================
create or replace function public.validate_timeline_point_chapter()
returns trigger
language plpgsql
as $$
declare
timeline_book_id uuid;
chapter_book_id uuid;
begin
if new.chapter_id is null then
return new;
end if;
select book_id
into timeline_book_id
from public.character_book_timelines
where id = new.timeline_id;
select book_id
into chapter_book_id
from public.chapters
where id = new.chapter_id;
if timeline_book_id is null then
raise exception
'Timeline % does not exist',
new.timeline_id;
end if;
if chapter_book_id is null then
raise exception
'Chapter % does not exist',
new.chapter_id;
end if;
if timeline_book_id <> chapter_book_id then
raise exception
'Timeline point chapter must belong to the timeline book';
end if;
return new;
end;
$$;
create trigger validate_timeline_point_chapter
before insert or update on public.character_timeline_points
for each row
execute function public.validate_timeline_point_chapter();
-- =========================================================
-- RELATIONSHIP ENTITIES MUST BELONG TO RELATIONSHIP WORLD
-- =========================================================
create or replace function public.validate_relationship_world()
returns trigger
language plpgsql
as $$
declare
entity_a_world_id uuid;
entity_b_world_id uuid;
begin
select world_id
into entity_a_world_id
from public.world_entities
where id = new.entity_a_id;
select world_id
into entity_b_world_id
from public.world_entities
where id = new.entity_b_id;
if entity_a_world_id is null then
raise exception
'Entity A % does not exist',
new.entity_a_id;
end if;
if entity_b_world_id is null then
raise exception
'Entity B % does not exist',
new.entity_b_id;
end if;
if entity_a_world_id <> new.world_id then
raise exception
'Entity A must belong to the relationship world';
end if;
if entity_b_world_id <> new.world_id then
raise exception
'Entity B must belong to the relationship world';
end if;
if entity_a_world_id <> entity_b_world_id then
raise exception
'Relationship entities must belong to the same world';
end if;
return new;
end;
$$;
create trigger validate_relationship_world
before insert or update on public.entity_relationships
for each row
execute function public.validate_relationship_world();
-- =========================================================
-- RLS
-- =========================================================
alter table public.profiles enable row level security;
alter table public.worlds enable row level security;
alter table public.books enable row level security;
alter table public.chapters enable row level security;
alter table public.chapter_important_points enable row level security;
alter table public.world_entities enable row level security;
alter table public.characters enable row level security;
alter table public.places enable row level security;
alter table public.items enable row level security;
alter table public.custom_entity_types enable row level security;
alter table public.custom_entity_attributes enable row level security;
alter table public.custom_entities enable row level security;
alter table public.character_book_timelines enable row level security;
alter table public.character_timeline_points enable row level security;
alter table public.entity_relationships enable row level security;
-- =========================================================
-- PROFILES RLS
-- =========================================================
create policy profiles_select_own
on public.profiles
for select
using (id = auth.uid());
create policy profiles_insert_own
on public.profiles
for insert
with check (id = auth.uid());
create policy profiles_update_own
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());
-- =========================================================
-- WORLDS RLS
-- =========================================================
create policy worlds_select_own
on public.worlds
for select
using (owner_id = auth.uid());
create policy worlds_insert_own
on public.worlds
for insert
with check (owner_id = auth.uid());
create policy worlds_update_own
on public.worlds
for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());
create policy worlds_delete_own
on public.worlds
for delete
using (owner_id = auth.uid());
-- =========================================================
-- BOOKS RLS
-- =========================================================
create policy books_select_own
on public.books
for select
using (public.is_world_owner(world_id));
create policy books_insert_own
on public.books
for insert
with check (public.is_world_owner(world_id));
create policy books_update_own
on public.books
for update
using (public.is_world_owner(world_id))
with check (public.is_world_owner(world_id));
create policy books_delete_own
on public.books
for delete
using (public.is_world_owner(world_id));
-- =========================================================
-- CHAPTERS RLS
-- =========================================================
create policy chapters_select_own
on public.chapters
for select
using (public.is_book_owner(book_id));
create policy chapters_insert_own
on public.chapters
for insert
with check (public.is_book_owner(book_id));
create policy chapters_update_own
on public.chapters
for update
using (public.is_book_owner(book_id))
with check (public.is_book_owner(book_id));
create policy chapters_delete_own
on public.chapters
for delete
using (public.is_book_owner(book_id));
-- =========================================================
-- CHAPTER IMPORTANT POINTS RLS
-- =========================================================
create policy chapter_points_select_own
on public.chapter_important_points
for select
using (
exists (
select 1
from public.chapters c
where c.id = chapter_id
and public.is_book_owner(c.book_id)
)
);
create policy chapter_points_insert_own
on public.chapter_important_points
for insert
with check (
exists (
select 1
from public.chapters c
where c.id = chapter_id
and public.is_book_owner(c.book_id)
)
);
create policy chapter_points_update_own
on public.chapter_important_points
for update
using (
exists (
select 1
from public.chapters c
where c.id = chapter_id
and public.is_book_owner(c.book_id)
)
)
with check (
exists (
select 1
from public.chapters c
where c.id = chapter_id
and public.is_book_owner(c.book_id)
)
);
create policy chapter_points_delete_own
on public.chapter_important_points
for delete
using (
exists (
select 1
from public.chapters c
where c.id = chapter_id
and public.is_book_owner(c.book_id)
)
);
-- =========================================================
-- WORLD ENTITIES RLS
-- =========================================================
create policy world_entities_select_own
on public.world_entities
for select
using (public.is_world_owner(world_id));
create policy world_entities_insert_own
on public.world_entities
for insert
with check (public.is_world_owner(world_id));
create policy world_entities_update_own
on public.world_entities
for update
using (public.is_world_owner(world_id))
with check (public.is_world_owner(world_id));
create policy world_entities_delete_own
on public.world_entities
for delete
using (public.is_world_owner(world_id));
-- =========================================================
-- CHARACTERS RLS
-- =========================================================
create policy characters_select_own
on public.characters
for select
using (public.is_entity_owner(entity_id));
create policy characters_insert_own
on public.characters
for insert
with check (public.is_entity_owner(entity_id));
create policy characters_update_own
on public.characters
for update
using (public.is_entity_owner(entity_id))
with check (public.is_entity_owner(entity_id));
create policy characters_delete_own
on public.characters
for delete
using (public.is_entity_owner(entity_id));
-- =========================================================
-- PLACES RLS
-- =========================================================
create policy places_select_own
on public.places
for select
using (public.is_entity_owner(entity_id));
create policy places_insert_own
on public.places
for insert
with check (public.is_entity_owner(entity_id));
create policy places_update_own
on public.places
for update
using (public.is_entity_owner(entity_id))
with check (public.is_entity_owner(entity_id));
create policy places_delete_own
on public.places
for delete
using (public.is_entity_owner(entity_id));
-- =========================================================
-- ITEMS RLS
-- =========================================================
create policy items_select_own
on public.items
for select
using (public.is_entity_owner(entity_id));
create policy items_insert_own
on public.items
for insert
with check (public.is_entity_owner(entity_id));
create policy items_update_own
on public.items
for update
using (public.is_entity_owner(entity_id))
with check (public.is_entity_owner(entity_id));
create policy items_delete_own
on public.items
for delete
using (public.is_entity_owner(entity_id));
-- =========================================================
-- CUSTOM ENTITY TYPES RLS
-- =========================================================
create policy custom_entity_types_select_own
on public.custom_entity_types
for select
using (public.is_world_owner(world_id));
create policy custom_entity_types_insert_own
on public.custom_entity_types
for insert
with check (public.is_world_owner(world_id));
create policy custom_entity_types_update_own
on public.custom_entity_types
for update
using (public.is_world_owner(world_id))
with check (public.is_world_owner(world_id));
create policy custom_entity_types_delete_own
on public.custom_entity_types
for delete
using (public.is_world_owner(world_id));
-- =========================================================
-- CUSTOM ENTITY ATTRIBUTES RLS
-- =========================================================
create policy custom_attributes_select_own
on public.custom_entity_attributes
for select
using (
exists (
select 1
from public.custom_entity_types t
where t.id = entity_type_id
and public.is_world_owner(t.world_id)
)
);
create policy custom_attributes_insert_own
on public.custom_entity_attributes
for insert
with check (
exists (
select 1
from public.custom_entity_types t
where t.id = entity_type_id
and public.is_world_owner(t.world_id)
)
);
create policy custom_attributes_update_own
on public.custom_entity_attributes
for update
using (
exists (
select 1
from public.custom_entity_types t
where t.id = entity_type_id
and public.is_world_owner(t.world_id)
)
)
with check (
exists (
select 1
from public.custom_entity_types t
where t.id = entity_type_id
and public.is_world_owner(t.world_id)
)
);
create policy custom_attributes_delete_own
on public.custom_entity_attributes
for delete
using (
exists (
select 1
from public.custom_entity_types t
where t.id = entity_type_id
and public.is_world_owner(t.world_id)
)
);
-- =========================================================
-- CUSTOM ENTITIES RLS
-- =========================================================
create policy custom_entities_select_own
on public.custom_entities
for select
using (public.is_entity_owner(entity_id));
create policy custom_entities_insert_own
on public.custom_entities
for insert
with check (public.is_entity_owner(entity_id));
create policy custom_entities_update_own
on public.custom_entities
for update
using (public.is_entity_owner(entity_id))
with check (public.is_entity_owner(entity_id));
create policy custom_entities_delete_own
on public.custom_entities
for delete
using (public.is_entity_owner(entity_id));
-- =========================================================
-- CHARACTER BOOK TIMELINES RLS
-- =========================================================
create policy character_timelines_select_own
on public.character_book_timelines
for select
using (public.is_book_owner(book_id));
create policy character_timelines_insert_own
on public.character_book_timelines
for insert
with check (
public.is_book_owner(book_id)
and public.is_entity_owner(character_entity_id)
);
create policy character_timelines_update_own
on public.character_book_timelines
for update
using (public.is_book_owner(book_id))
with check (
public.is_book_owner(book_id)
and public.is_entity_owner(character_entity_id)
);
create policy character_timelines_delete_own
on public.character_book_timelines
for delete
using (public.is_book_owner(book_id));
-- =========================================================
-- CHARACTER TIMELINE POINTS RLS
-- =========================================================
create policy character_timeline_points_select_own
on public.character_timeline_points
for select
using (
exists (
select 1
from public.character_book_timelines t
where t.id = timeline_id
and public.is_book_owner(t.book_id)
)
);
create policy character_timeline_points_insert_own
on public.character_timeline_points
for insert
with check (
exists (
select 1
from public.character_book_timelines t
where t.id = timeline_id
and public.is_book_owner(t.book_id)
)
);
create policy character_timeline_points_update_own
on public.character_timeline_points
for update
using (
exists (
select 1
from public.character_book_timelines t
where t.id = timeline_id
and public.is_book_owner(t.book_id)
)
)
with check (
exists (
select 1
from public.character_book_timelines t
where t.id = timeline_id
and public.is_book_owner(t.book_id)
)
);
create policy character_timeline_points_delete_own
on public.character_timeline_points
for delete
using (
exists (
select 1
from public.character_book_timelines t
where t.id = timeline_id
and public.is_book_owner(t.book_id)
)
);
-- =========================================================
-- ENTITY RELATIONSHIPS RLS
-- =========================================================
create policy entity_relationships_select_own
on public.entity_relationships
for select
using (public.is_world_owner(world_id));
create policy entity_relationships_insert_own
on public.entity_relationships
for insert
with check (
public.is_world_owner(world_id)
and public.is_entity_owner(entity_a_id)
and public.is_entity_owner(entity_b_id)
);
create policy entity_relationships_update_own
on public.entity_relationships
for update
using (public.is_world_owner(world_id))
with check (
public.is_world_owner(world_id)
and public.is_entity_owner(entity_a_id)
and public.is_entity_owner(entity_b_id)
);
create policy entity_relationships_delete_own
on public.entity_relationships
for delete
using (public.is_world_owner(world_id));
