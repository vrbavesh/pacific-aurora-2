-- V2 AI analysis state. Apply only with the V2 release, never to the live V1 app.
-- Rollback, before any V2 traffic: drop the public.ai_* functions declared here,
-- then these three tables and pa_private functions/schema in reverse dependency order.
-- After V2 traffic, use a new forward migration and preserve receipt/checkpoint data.

create schema if not exists pa_private;
revoke all on schema pa_private from public, anon, authenticated;

create table public.ai_user_dispatch_state (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  last_dispatched_at timestamptz
);

create table public.ai_chapter_checkpoints (
  chapter_id uuid primary key references public.chapters(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  completed_milestone integer not null default 0 check (completed_milestone >= 0),
  checkpoint_version integer not null default 0 check (checkpoint_version >= 0),
  lease_token uuid,
  reserved_milestone integer,
  lease_expires_at timestamptz,
  constraint ai_lease_all_or_none check (
    (lease_token is null and reserved_milestone is null and lease_expires_at is null)
    or (lease_token is not null and reserved_milestone is not null and lease_expires_at is not null)
  )
);
create index ai_chapter_checkpoints_owner_idx on public.ai_chapter_checkpoints(owner_id);

-- No suggestion text or model output is persisted, only an idempotency receipt.
create table public.ai_applied_suggestion_receipts (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  suggestion_id uuid not null,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  result_kind text not null,
  resource_id uuid not null,
  applied_at timestamptz not null default now(),
  primary key (owner_id, suggestion_id)
);
create index ai_receipts_chapter_idx on public.ai_applied_suggestion_receipts(chapter_id);

alter table public.ai_user_dispatch_state enable row level security;
alter table public.ai_chapter_checkpoints enable row level security;
alter table public.ai_applied_suggestion_receipts enable row level security;
-- No client policies: even an owner cannot read or mutate raw quota/receipt rows.
revoke all on public.ai_user_dispatch_state from public, anon, authenticated;
revoke all on public.ai_chapter_checkpoints from public, anon, authenticated;
revoke all on public.ai_applied_suggestion_receipts from public, anon, authenticated;

-- Text nodes split by marks are concatenated; block nodes and hard breaks separate
-- words. The Step 5 browser/server counter must use this same whitespace policy.
create function pa_private.ai_document_text(node jsonb)
returns text
language plpgsql immutable
set search_path = ''
as $$
declare
  child jsonb;
  result text := '';
begin
  if node is null then return ''; end if;
  if node->>'type' = 'text' then return coalesce(node->>'text', ''); end if;
  if node->>'type' = 'hardBreak' then return ' '; end if;
  if jsonb_typeof(node->'content') <> 'array' then return ''; end if;
  for child in select value from jsonb_array_elements(node->'content') loop
    if child->>'type' in ('text', 'hardBreak') then
      result := result || pa_private.ai_document_text(child);
    else
      result := result || ' ' || pa_private.ai_document_text(child) || ' ';
    end if;
  end loop;
  return result;
end;
$$;

create function pa_private.ai_saved_word_count(document jsonb)
returns integer
language sql immutable
set search_path = ''
as $$
  select count(*)::integer
  from regexp_matches(
    pa_private.ai_document_text(document), '[^[:space:]]+', 'g'
  );
$$;

-- A read does not initialize a row. Existing saved manuscripts start at their
-- completed 500-word baseline; a restored unsaved draft may cross the next one.
create function public.ai_analysis_eligibility(p_book_id uuid, p_chapter_id uuid)
returns table(completed_milestone integer, next_eligible_at timestamptz, checkpoint_version integer)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_content jsonb;
  v_last timestamptz;
begin
  if v_owner is null then raise exception 'AI_UNAUTHORIZED' using errcode = 'P0001'; end if;
  select c.content into v_content
  from public.chapters c
  join public.books b on b.id = c.book_id
  join public.worlds w on w.id = b.world_id
  where c.id = p_chapter_id and b.id = p_book_id and w.owner_id = v_owner;
  if not found then raise exception 'AI_NOT_FOUND' using errcode = 'P0001'; end if;

  select s.completed_milestone, s.checkpoint_version
  into completed_milestone, checkpoint_version
  from public.ai_chapter_checkpoints s
  where s.chapter_id = p_chapter_id and s.owner_id = v_owner;
  if not found then
    completed_milestone := pa_private.ai_saved_word_count(v_content) / 500;
    checkpoint_version := 0;
  end if;
  select d.last_dispatched_at into v_last
  from public.ai_user_dispatch_state d where d.owner_id = v_owner;
  next_eligible_at := case
    when v_last + interval '5 minutes' > clock_timestamp()
    then v_last + interval '5 minutes' else null end;
  return next;
end;
$$;

-- Reserve immediately before provider dispatch, after validation and context
-- size checks. This transaction uses database time and locks the per-user row
-- first, then the chapter row, so tabs/books/serverless instances serialize.
create function public.ai_reserve_analysis(
  p_book_id uuid, p_chapter_id uuid, p_milestone integer, p_checkpoint_version integer
)
returns table(lease_token uuid, completed_milestone integer, next_eligible_at timestamptz, checkpoint_version integer)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_content jsonb;
  v_last timestamptz;
  v_now timestamptz;
  v_lease_expires timestamptz;
  v_token uuid;
begin
  if v_owner is null then raise exception 'AI_UNAUTHORIZED' using errcode = 'P0001'; end if;
  select c.content into v_content
  from public.chapters c
  join public.books b on b.id = c.book_id
  join public.worlds w on w.id = b.world_id
  where c.id = p_chapter_id and b.id = p_book_id and w.owner_id = v_owner;
  if not found then raise exception 'AI_NOT_FOUND' using errcode = 'P0001'; end if;

  insert into public.ai_user_dispatch_state(owner_id) values (v_owner)
  on conflict (owner_id) do nothing;
  select d.last_dispatched_at into v_last
  from public.ai_user_dispatch_state d where d.owner_id = v_owner for update;
  v_now := clock_timestamp();
  if v_last is not null and v_last + interval '5 minutes' > v_now then
    raise exception 'AI_COOLDOWN:%',
      greatest(1, ceil(extract(epoch from (v_last + interval '5 minutes' - v_now)))::integer)
      using errcode = 'P0001';
  end if;

  insert into public.ai_chapter_checkpoints(chapter_id, owner_id, completed_milestone)
  values (p_chapter_id, v_owner, pa_private.ai_saved_word_count(v_content) / 500)
  on conflict (chapter_id) do nothing;
  select s.completed_milestone, s.checkpoint_version, s.lease_expires_at
  into completed_milestone, checkpoint_version, v_lease_expires
  from public.ai_chapter_checkpoints s
  where s.chapter_id = p_chapter_id and s.owner_id = v_owner for update;
  if not found then raise exception 'AI_NOT_FOUND' using errcode = 'P0001'; end if;
  if p_checkpoint_version is distinct from checkpoint_version
    or p_milestone is null or p_milestone <> completed_milestone + 1
    or (v_lease_expires is not null and v_lease_expires > v_now) then
    raise exception 'AI_STALE_CHECKPOINT' using errcode = 'P0001';
  end if;

  v_token := gen_random_uuid();
  lease_token := v_token;
  update public.ai_user_dispatch_state
  set last_dispatched_at = v_now where owner_id = v_owner;
  update public.ai_chapter_checkpoints
  set lease_token = v_token,
      reserved_milestone = p_milestone,
      lease_expires_at = v_now + interval '2 minutes'
  where chapter_id = p_chapter_id and owner_id = v_owner;
  next_eligible_at := v_now + interval '5 minutes';
  return next;
end;
$$;

-- Call only after a valid provider response (an empty suggestions list is valid).
-- A failed/timeout/malformed dispatch leaves the five-minute user cooldown intact.
-- Finalization is service-role only. A user may reserve and consume their own
-- cooldown directly, but cannot mark a milestone complete without the server
-- validating a provider response. The server supplies the already-authenticated
-- owner ID; the lease token still gates the exact pending reservation.
create function public.ai_finalize_analysis(
  p_owner_id uuid, p_book_id uuid, p_chapter_id uuid, p_lease_token uuid
)
returns table(completed_milestone integer, next_eligible_at timestamptz, checkpoint_version integer)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_token uuid;
  v_milestone integer;
  v_last timestamptz;
begin
  if auth.role() is distinct from 'service_role' or p_owner_id is null then
    raise exception 'AI_UNAUTHORIZED' using errcode = 'P0001';
  end if;
  perform 1 from public.chapters c
  join public.books b on b.id = c.book_id
  join public.worlds w on w.id = b.world_id
  where c.id = p_chapter_id and b.id = p_book_id and w.owner_id = p_owner_id;
  if not found then raise exception 'AI_NOT_FOUND' using errcode = 'P0001'; end if;
  select s.lease_token, s.reserved_milestone into v_token, v_milestone
  from public.ai_chapter_checkpoints s
  where s.chapter_id = p_chapter_id and s.owner_id = p_owner_id for update;
  if p_lease_token is null or v_token is distinct from p_lease_token then
    raise exception 'AI_STALE_LEASE' using errcode = 'P0001';
  end if;
  update public.ai_chapter_checkpoints s
  set completed_milestone = v_milestone,
      checkpoint_version = s.checkpoint_version + 1,
      lease_token = null, reserved_milestone = null, lease_expires_at = null
  where s.chapter_id = p_chapter_id and s.owner_id = p_owner_id
  returning s.completed_milestone, s.checkpoint_version
  into completed_milestone, checkpoint_version;
  select d.last_dispatched_at into v_last
  from public.ai_user_dispatch_state d where d.owner_id = p_owner_id;
  next_eligible_at := case
    when v_last + interval '5 minutes' > clock_timestamp()
    then v_last + interval '5 minutes' else null end;
  return next;
end;
$$;

-- Step 6 apply routines use this locked compare-and-set precondition before
-- updating a world entity. No authenticated role can invoke it directly.
create function pa_private.ai_lock_entity_version(
  p_world_id uuid, p_entity_id uuid, p_expected_updated_at timestamptz
)
returns public.entity_kind
language plpgsql security invoker
set search_path = ''
as $$
declare
  v_kind public.entity_kind;
  v_updated_at timestamptz;
begin
  select e.kind, e.updated_at into v_kind, v_updated_at
  from public.world_entities e
  where e.id = p_entity_id and e.world_id = p_world_id for update;
  if not found then raise exception 'AI_NOT_FOUND' using errcode = 'P0001'; end if;
  if p_expected_updated_at is null or v_updated_at <> p_expected_updated_at then
    raise exception 'AI_STALE_TARGET' using errcode = 'P0001';
  end if;
  return v_kind;
end;
$$;

-- One atomic receipt-backed operation needed by Step 6. The receipt insert
-- serializes duplicate suggestion IDs; timeline creation and point creation
-- commit with it or all roll back together. Character/world/book ownership is
-- derived in the database, never supplied as an owner parameter.
create function public.ai_add_character_timeline_point_once(
  p_book_id uuid, p_chapter_id uuid, p_suggestion_id uuid,
  p_character_entity_id uuid, p_point_chapter_id uuid, p_content text
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_world_id uuid;
  v_existing public.ai_applied_suggestion_receipts%rowtype;
  v_timeline_id uuid;
  v_position integer;
  v_point_id uuid;
begin
  if v_owner is null then raise exception 'AI_UNAUTHORIZED' using errcode = 'P0001'; end if;
  if p_suggestion_id is null or p_content is null or length(trim(p_content)) = 0
    or length(p_content) > 2000 then
    raise exception 'AI_INVALID_POINT' using errcode = 'P0001';
  end if;
  select b.world_id into v_world_id
  from public.chapters c join public.books b on b.id = c.book_id
  join public.worlds w on w.id = b.world_id
  where c.id = p_chapter_id and b.id = p_book_id and w.owner_id = v_owner;
  if not found then raise exception 'AI_NOT_FOUND' using errcode = 'P0001'; end if;
  perform 1 from public.world_entities e
  join public.characters ch on ch.entity_id = e.id
  where e.id = p_character_entity_id and e.world_id = v_world_id;
  if not found then raise exception 'AI_NOT_FOUND' using errcode = 'P0001'; end if;
  if p_point_chapter_id is not null then
    perform 1 from public.chapters c
    where c.id = p_point_chapter_id and c.book_id = p_book_id;
    if not found then raise exception 'AI_NOT_FOUND' using errcode = 'P0001'; end if;
  end if;

  v_point_id := gen_random_uuid();
  insert into public.ai_applied_suggestion_receipts
    (owner_id, suggestion_id, chapter_id, result_kind, resource_id)
  values (v_owner, p_suggestion_id, p_chapter_id, 'character_timeline_point', v_point_id)
  on conflict (owner_id, suggestion_id) do nothing;
  if not found then
    select * into v_existing from public.ai_applied_suggestion_receipts
    where owner_id = v_owner and suggestion_id = p_suggestion_id;
    if v_existing.chapter_id <> p_chapter_id
      or v_existing.result_kind <> 'character_timeline_point' then
      raise exception 'AI_DUPLICATE_SUGGESTION' using errcode = 'P0001';
    end if;
    return v_existing.resource_id;
  end if;

  insert into public.character_book_timelines(character_entity_id, book_id)
  values (p_character_entity_id, p_book_id)
  on conflict (character_entity_id, book_id) do nothing;
  select id into v_timeline_id from public.character_book_timelines
  where character_entity_id = p_character_entity_id and book_id = p_book_id for update;
  select coalesce(max(position), -1) + 1 into v_position
  from public.character_timeline_points where timeline_id = v_timeline_id;
  insert into public.character_timeline_points(id, timeline_id, content, position, chapter_id)
  values (v_point_id, v_timeline_id, p_content, v_position, p_point_chapter_id);
  return v_point_id;
end;
$$;

-- PostgreSQL grants EXECUTE to PUBLIC on new functions by default. Explicitly
-- remove it, including from anonymous users, then expose only narrow RPCs.
revoke all on function pa_private.ai_document_text(jsonb) from public, anon, authenticated;
revoke all on function pa_private.ai_saved_word_count(jsonb) from public, anon, authenticated;
revoke all on function pa_private.ai_lock_entity_version(uuid, uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.ai_analysis_eligibility(uuid, uuid) from public, anon;
revoke all on function public.ai_reserve_analysis(uuid, uuid, integer, integer) from public, anon;
revoke all on function public.ai_finalize_analysis(uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.ai_add_character_timeline_point_once(uuid, uuid, uuid, uuid, uuid, text) from public, anon;
grant execute on function public.ai_analysis_eligibility(uuid, uuid) to authenticated;
grant execute on function public.ai_reserve_analysis(uuid, uuid, integer, integer) to authenticated;
grant execute on function public.ai_finalize_analysis(uuid, uuid, uuid, uuid) to service_role;
grant execute on function public.ai_add_character_timeline_point_once(uuid, uuid, uuid, uuid, uuid, text) to authenticated;
