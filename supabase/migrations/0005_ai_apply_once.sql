-- V2 preview first. This migration depends on 0003_ai_analysis_state.sql.
-- A subtype-only manual edit must invalidate an older AI update card.
create function pa_private.ai_touch_entity_version()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.world_entities set updated_at = pg_catalog.clock_timestamp()
  where id = new.entity_id;
  return new;
end;
$$;
revoke all on function pa_private.ai_touch_entity_version() from public, anon, authenticated;
create trigger ai_character_version after update on public.characters
for each row execute function pa_private.ai_touch_entity_version();
create trigger ai_place_version after update on public.places
for each row execute function pa_private.ai_touch_entity_version();
create trigger ai_item_version after update on public.items
for each row execute function pa_private.ai_touch_entity_version();
create trigger ai_custom_version after update on public.custom_entities
for each row execute function pa_private.ai_touch_entity_version();

-- This RPC is the transaction boundary for entity and chapter-point cards.
-- A user can call it directly, so every path is owner-, kind-, and field-scoped.
create function public.ai_apply_suggestion_once(
  p_book_id uuid, p_chapter_id uuid, p_suggestion_id uuid,
  p_kind text, p_action text, p_entity_type_id uuid,
  p_target_entity_id uuid, p_expected_updated_at timestamptz,
  p_changes jsonb
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_world_id uuid;
  v_existing public.ai_applied_suggestion_receipts%rowtype;
  v_id uuid := gen_random_uuid();
  v_allowed text[];
  v_actual_kind public.entity_kind;
  v_name text;
  v_position integer;
  v_patch jsonb := p_changes;
begin
  if v_owner is null then raise exception 'AI_UNAUTHORIZED' using errcode = 'P0001'; end if;
  select b.world_id into v_world_id
  from public.chapters c join public.books b on b.id = c.book_id
  join public.worlds w on w.id = b.world_id
  where c.id = p_chapter_id and b.id = p_book_id and w.owner_id = v_owner
  for update of c;
  if not found then raise exception 'AI_NOT_FOUND' using errcode = 'P0001'; end if;
  if p_suggestion_id is null or p_changes is null or jsonb_typeof(p_changes) <> 'object'
    or p_changes = '{}'::jsonb or length(p_changes::text) > 4096 then
    raise exception 'AI_INVALID_APPLY' using errcode = 'P0001';
  end if;
  v_allowed := case p_kind
    when 'character' then array['name','age','health','distinctions','traits','mutations','status','notes']
    when 'place' then array['name','status','lastChapterId']
    when 'item' then array['name','status','power','wielderEntityId','manualWielderName']
    when 'custom_entity' then array['name','attributes']
    when 'chapter_point' then array['content']
    else null end;
  if v_allowed is null or exists (
    select 1 from jsonb_object_keys(p_changes) as keys(key)
    where key <> all(v_allowed)
  ) then raise exception 'AI_INVALID_APPLY' using errcode = 'P0001'; end if;

  if p_kind = 'chapter_point' then
    if p_action is null or p_action <> 'add_point' or p_entity_type_id is not null
      or p_target_entity_id is not null or p_expected_updated_at is not null
      or p_changes->'content' is null or jsonb_typeof(p_changes->'content') <> 'string'
      or length(trim(p_changes->>'content')) = 0
      or length(p_changes->>'content') > 2000 then
      raise exception 'AI_INVALID_APPLY' using errcode = 'P0001';
    end if;
  else
    if p_action is null or p_action not in ('create','update') then
      raise exception 'AI_INVALID_APPLY' using errcode = 'P0001';
    end if;
    if p_kind <> 'custom_entity' and p_entity_type_id is not null then
      raise exception 'AI_INVALID_APPLY' using errcode = 'P0001';
    end if;
    if p_changes ? 'name' and (
      jsonb_typeof(p_changes->'name') <> 'string'
      or length(trim(p_changes->>'name')) = 0
      or length(p_changes->>'name') > 120
    ) then raise exception 'AI_INVALID_APPLY' using errcode = 'P0001'; end if;
    if p_action = 'create' then
      if p_target_entity_id is not null or p_expected_updated_at is not null
        or not (p_changes ? 'name') then
        raise exception 'AI_INVALID_APPLY' using errcode = 'P0001';
      end if;
    else
      if p_target_entity_id is null or p_expected_updated_at is null then
        raise exception 'AI_INVALID_APPLY' using errcode = 'P0001';
      end if;
    end if;
  end if;

  insert into public.ai_applied_suggestion_receipts
    (owner_id, suggestion_id, chapter_id, result_kind, resource_id)
  values (v_owner, p_suggestion_id, p_chapter_id, p_kind, v_id)
  on conflict (owner_id, suggestion_id) do nothing;
  if not found then
    select * into v_existing from public.ai_applied_suggestion_receipts
    where owner_id = v_owner and suggestion_id = p_suggestion_id;
    if v_existing.chapter_id <> p_chapter_id or v_existing.result_kind <> p_kind then
      raise exception 'AI_DUPLICATE_SUGGESTION' using errcode = 'P0001';
    end if;
    return v_existing.resource_id;
  end if;

  if p_kind = 'custom_entity' then
    perform 1 from public.custom_entity_types
    where id = p_entity_type_id and world_id = v_world_id;
    if not found then raise exception 'AI_NOT_FOUND' using errcode = 'P0001'; end if;
  end if;
  if p_kind = 'place' and p_changes->>'lastChapterId' is not null then
    perform 1 from public.chapters
    where id = (p_changes->>'lastChapterId')::uuid and book_id = p_book_id;
    if not found then raise exception 'AI_NOT_FOUND' using errcode = 'P0001'; end if;
  end if;
  if p_kind = 'item' and p_changes->>'wielderEntityId' is not null then
    perform 1 from public.world_entities e join public.characters ch on ch.entity_id = e.id
    where e.id = (p_changes->>'wielderEntityId')::uuid and e.world_id = v_world_id;
    if not found then raise exception 'AI_NOT_FOUND' using errcode = 'P0001'; end if;
  end if;

  if p_kind = 'chapter_point' then
    select coalesce(max(position), -1) + 1 into v_position
    from public.chapter_important_points where chapter_id = p_chapter_id;
    insert into public.chapter_important_points(id, chapter_id, content, position)
    values (v_id, p_chapter_id, p_changes->>'content', v_position);
  elsif p_action = 'create' then
    v_name := p_changes->>'name';
    v_id := public.create_world_entity_atomic(
      v_world_id,
      case when p_kind = 'custom_entity' then 'custom'::public.entity_kind
        else p_kind::public.entity_kind end,
      v_name,
      case when p_kind = 'custom_entity'
        then jsonb_build_object('entityTypeId', p_entity_type_id, 'attributes', coalesce(p_changes->'attributes', '{}'::jsonb))
        else p_changes - 'name' end
    );
  else
    v_actual_kind := pa_private.ai_lock_entity_version(v_world_id, p_target_entity_id, p_expected_updated_at);
    if v_actual_kind::text <> (case when p_kind = 'custom_entity' then 'custom' else p_kind end) then
      raise exception 'AI_NOT_FOUND' using errcode = 'P0001';
    end if;
    if p_kind = 'custom_entity' then
      perform 1 from public.custom_entities
      where entity_id = p_target_entity_id and entity_type_id = p_entity_type_id;
      if not found then raise exception 'AI_NOT_FOUND' using errcode = 'P0001'; end if;
      if p_changes ? 'attributes' then
        select jsonb_set(p_changes, '{attributes}', ce.attributes || p_changes->'attributes')
        into v_patch from public.custom_entities ce where ce.entity_id = p_target_entity_id;
      end if;
    end if;
    perform public.update_world_entity_atomic(p_target_entity_id, v_patch);
    v_id := p_target_entity_id;
  end if;
  update public.ai_applied_suggestion_receipts set resource_id = v_id
  where owner_id = v_owner and suggestion_id = p_suggestion_id;
  return v_id;
end;
$$;
revoke all on function public.ai_apply_suggestion_once(uuid,uuid,uuid,text,text,uuid,uuid,timestamptz,jsonb)
from public, anon;
grant execute on function public.ai_apply_suggestion_once(uuid,uuid,uuid,text,text,uuid,uuid,timestamptz,jsonb)
to authenticated;
