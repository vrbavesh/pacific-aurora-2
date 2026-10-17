-- Shared OTP resend limits. Apply to the V2 test project before testing this branch.
create table public.auth_resend_limits (
  key_hash text primary key,
  window_end timestamptz not null,
  requests integer not null check (requests > 0)
);
create index auth_resend_limits_expiry_idx on public.auth_resend_limits(window_end);
alter table public.auth_resend_limits enable row level security;
revoke all on public.auth_resend_limits from public, anon, authenticated;

create function public.claim_auth_resend(p_email_key text, p_ip_key text)
returns integer
language plpgsql security definer
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_key text;
  v_end timestamptz;
  v_count integer;
  v_retry integer := 0;
begin
  if auth.role() is distinct from 'service_role'
    or p_email_key !~ '^[0-9a-f]{64}$'
    or (p_ip_key is not null and p_ip_key !~ '^[0-9a-f]{64}$') then
    raise exception 'AUTH_RESEND_UNAUTHORIZED' using errcode = 'P0001';
  end if;

  -- Sorted transaction locks make the two-key check and write atomic across instances.
  for v_key in select distinct key_hash from unnest(array[p_email_key, p_ip_key]) as keys(key_hash)
    where key_hash is not null order by key_hash loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_key, 0));
  end loop;

  select window_end, requests into v_end, v_count
  from public.auth_resend_limits where key_hash = p_email_key;
  if v_end > v_now then v_retry := greatest(v_retry, ceil(extract(epoch from v_end - v_now))::integer); end if;
  if p_ip_key is not null then
    select window_end, requests into v_end, v_count
    from public.auth_resend_limits where key_hash = p_ip_key;
    if v_end > v_now and v_count >= 10 then
      v_retry := greatest(v_retry, ceil(extract(epoch from v_end - v_now))::integer);
    end if;
  end if;
  if v_retry > 0 then return v_retry; end if;

  insert into public.auth_resend_limits(key_hash, window_end, requests)
  values (p_email_key, v_now + interval '2 minutes', 1)
  on conflict (key_hash) do update
  set window_end = excluded.window_end, requests = 1;
  if p_ip_key is not null then
    insert into public.auth_resend_limits(key_hash, window_end, requests)
    values (p_ip_key, v_now + interval '5 minutes', 1)
    on conflict (key_hash) do update
    set window_end = case when public.auth_resend_limits.window_end > v_now
      then public.auth_resend_limits.window_end else excluded.window_end end,
      requests = case when public.auth_resend_limits.window_end > v_now
      then public.auth_resend_limits.requests + 1 else 1 end;
  end if;
  delete from public.auth_resend_limits where window_end <= v_now;
  return 0;
end;
$$;

revoke all on function public.claim_auth_resend(text, text) from public, anon, authenticated;
grant execute on function public.claim_auth_resend(text, text) to service_role;
