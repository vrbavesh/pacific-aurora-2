-- V2 sliding AI review and durable declines. Apply only to the isolated V2
-- preview until the V2 production rollout is explicitly approved.
-- Preserve existing dispatch, checkpoint, and apply-receipt rows.

create table public.ai_declined_suggestions (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  fingerprint text not null check (fingerprint ~ '^[0-9a-f]{64}$'),
  declined_at timestamptz not null default now(),
  primary key (owner_id, chapter_id, fingerprint)
);
alter table public.ai_declined_suggestions enable row level security;
revoke all on public.ai_declined_suggestions from public, anon, authenticated;

create function public.ai_declined_fingerprints(p_book_id uuid, p_chapter_id uuid)
returns table(fingerprint text)
language plpgsql security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
begin
  if v_owner is null then raise exception 'AI_UNAUTHORIZED' using errcode = 'P0001'; end if;
  perform 1 from public.chapters c
  join public.books b on b.id = c.book_id
  join public.worlds w on w.id = b.world_id
  where c.id = p_chapter_id and b.id = p_book_id and w.owner_id = v_owner;
  if not found then raise exception 'AI_NOT_FOUND' using errcode = 'P0001'; end if;
  return query select d.fingerprint from public.ai_declined_suggestions d
  where d.owner_id = v_owner and d.chapter_id = p_chapter_id;
end;
$$;

create function public.ai_decline_suggestion(
  p_book_id uuid, p_chapter_id uuid, p_fingerprint text
)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
begin
  if v_owner is null then raise exception 'AI_UNAUTHORIZED' using errcode = 'P0001'; end if;
  perform 1 from public.chapters c
  join public.books b on b.id = c.book_id
  join public.worlds w on w.id = b.world_id
  where c.id = p_chapter_id and b.id = p_book_id and w.owner_id = v_owner;
  if not found then raise exception 'AI_NOT_FOUND' using errcode = 'P0001'; end if;
  if p_fingerprint is null or p_fingerprint !~ '^[0-9a-f]{64}$' then
    raise exception 'AI_INVALID_FINGERPRINT' using errcode = 'P0001';
  end if;
  insert into public.ai_declined_suggestions(owner_id, chapter_id, fingerprint)
  values (v_owner, p_chapter_id, p_fingerprint)
  on conflict (owner_id, chapter_id, fingerprint) do nothing;
end;
$$;

-- The five-minute per-user cooldown, not a new 500-word threshold, now gates
-- a repeated look at the latest 500 words. Keep version/lease serialization.
create or replace function public.ai_reserve_analysis(
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
    or p_milestone is null or p_milestone < 1
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

create or replace function public.ai_finalize_analysis(
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
  set completed_milestone = greatest(s.completed_milestone, v_milestone),
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

revoke all on function public.ai_declined_fingerprints(uuid, uuid) from public, anon;
revoke all on function public.ai_decline_suggestion(uuid, uuid, text) from public, anon;
grant execute on function public.ai_declined_fingerprints(uuid, uuid) to authenticated;
grant execute on function public.ai_decline_suggestion(uuid, uuid, text) to authenticated;
revoke all on function public.ai_reserve_analysis(uuid, uuid, integer, integer) from public, anon;
revoke all on function public.ai_finalize_analysis(uuid, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.ai_reserve_analysis(uuid, uuid, integer, integer) to authenticated;
grant execute on function public.ai_finalize_analysis(uuid, uuid, uuid, uuid) to service_role;
