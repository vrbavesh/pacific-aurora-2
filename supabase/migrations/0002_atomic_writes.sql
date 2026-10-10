-- Atomic service boundaries for writes that span multiple statements.
-- SECURITY INVOKER preserves the caller's RLS session.

create or replace function public.move_chapter_atomic(
  target_chapter_id uuid,
  move_direction text
)
returns setof public.chapters
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_book_id uuid;
  target_position integer;
  swap_id uuid;
  swap_position integer;
  temporary_position integer;
begin
  if move_direction not in ('up', 'down') then
    raise exception 'direction must be up or down';
  end if;

  select book_id
  into target_book_id
  from public.chapters
  where id = target_chapter_id;

  if not found then
    return;
  end if;

  -- Serialize all ordering changes for one book before locking chapter rows.
  -- Taking the parent lock first avoids deadlocks between concurrent moves.
  perform 1
  from public.books
  where id = target_book_id
  for update;

  select position
  into target_position
  from public.chapters
  where id = target_chapter_id
    and book_id = target_book_id
  for update;

  if move_direction = 'up' then
    select id, position
    into swap_id, swap_position
    from public.chapters
    where book_id = target_book_id
      and position < target_position
    order by position desc
    limit 1
    for update;
  else
    select id, position
    into swap_id, swap_position
    from public.chapters
    where book_id = target_book_id
      and position > target_position
    order by position asc
    limit 1
    for update;
  end if;

  if swap_id is not null then
    select coalesce(max(position), 0) + 1
    into temporary_position
    from public.chapters
    where book_id = target_book_id;

    update public.chapters
    set position = temporary_position
    where id = target_chapter_id;

    update public.chapters
    set position = target_position
    where id = swap_id;

    update public.chapters
    set position = swap_position
    where id = target_chapter_id;
  end if;

  return query
  select c.*
  from public.chapters c
  where c.book_id = target_book_id
  order by c.position;
end;
$$;

create or replace function public.create_world_entity_atomic(
  target_world_id uuid,
  target_kind public.entity_kind,
  target_name text,
  subtype_data jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_entity_id uuid;
begin
  insert into public.world_entities (world_id, kind, name)
  values (target_world_id, target_kind, target_name)
  returning id into new_entity_id;

  case target_kind
    when 'character' then
      insert into public.characters (
        entity_id, age, health, distinctions, traits, mutations, status, notes
      ) values (
        new_entity_id,
        nullif(subtype_data ->> 'age', '')::integer,
        subtype_data ->> 'health',
        subtype_data ->> 'distinctions',
        subtype_data ->> 'traits',
        subtype_data ->> 'mutations',
        coalesce(
          (subtype_data ->> 'status')::public.character_status,
          'alive'::public.character_status
        ),
        subtype_data ->> 'notes'
      );
    when 'place' then
      insert into public.places (entity_id, status, last_chapter_id)
      values (
        new_entity_id,
        subtype_data ->> 'status',
        nullif(subtype_data ->> 'lastChapterId', '')::uuid
      );
    when 'item' then
      insert into public.items (
        entity_id, status, power, wielder_entity_id, manual_wielder_name
      ) values (
        new_entity_id,
        subtype_data ->> 'status',
        subtype_data ->> 'power',
        nullif(subtype_data ->> 'wielderEntityId', '')::uuid,
        nullif(trim(subtype_data ->> 'manualWielderName'), '')
      );
    when 'custom' then
      insert into public.custom_entities (entity_id, entity_type_id, attributes)
      values (
        new_entity_id,
        (subtype_data ->> 'entityTypeId')::uuid,
        coalesce(subtype_data -> 'attributes', '{}'::jsonb)
      );
  end case;

  return new_entity_id;
end;
$$;

create or replace function public.update_world_entity_atomic(
  target_entity_id uuid,
  patch jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_kind public.entity_kind;
begin
  select kind
  into target_kind
  from public.world_entities
  where id = target_entity_id
  for update;

  if not found then
    return null;
  end if;

  if patch ? 'name' then
    update public.world_entities
    set name = patch ->> 'name'
    where id = target_entity_id;
  end if;

  case target_kind
    when 'character' then
      update public.characters
      set
        age = case when patch ? 'age' then nullif(patch ->> 'age', '')::integer else age end,
        health = case when patch ? 'health' then patch ->> 'health' else health end,
        distinctions = case when patch ? 'distinctions' then patch ->> 'distinctions' else distinctions end,
        traits = case when patch ? 'traits' then patch ->> 'traits' else traits end,
        mutations = case when patch ? 'mutations' then patch ->> 'mutations' else mutations end,
        status = case when patch ? 'status' then (patch ->> 'status')::public.character_status else status end,
        notes = case when patch ? 'notes' then patch ->> 'notes' else notes end
      where entity_id = target_entity_id;
    when 'place' then
      update public.places
      set
        status = case when patch ? 'status' then patch ->> 'status' else status end,
        last_chapter_id = case
          when patch ? 'lastChapterId' then nullif(patch ->> 'lastChapterId', '')::uuid
          else last_chapter_id
        end
      where entity_id = target_entity_id;
    when 'item' then
      update public.items
      set
        status = case when patch ? 'status' then patch ->> 'status' else status end,
        power = case when patch ? 'power' then patch ->> 'power' else power end,
        wielder_entity_id = case
          when patch ? 'wielderEntityId' then nullif(patch ->> 'wielderEntityId', '')::uuid
          else wielder_entity_id
        end,
        manual_wielder_name = case
          when patch ? 'manualWielderName' then nullif(trim(patch ->> 'manualWielderName'), '')
          else manual_wielder_name
        end
      where entity_id = target_entity_id;
    when 'custom' then
      update public.custom_entities
      set attributes = case
        when patch ? 'attributes' then patch -> 'attributes'
        else attributes
      end
      where entity_id = target_entity_id;
  end case;

  return target_entity_id;
end;
$$;

create or replace function public.validate_custom_entity_attribute_values()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  definition record;
  attribute_key text;
  attribute_value jsonb;
begin
  if jsonb_typeof(new.attributes) <> 'object' then
    raise exception 'Custom entity attributes must be a JSON object';
  end if;

  for attribute_key in select jsonb_object_keys(new.attributes)
  loop
    if not exists (
      select 1
      from public.custom_entity_attributes a
      where a.entity_type_id = new.entity_type_id
        and a.id::text = attribute_key
    ) then
      raise exception 'Unknown custom attribute %', attribute_key;
    end if;
  end loop;

  for definition in
    select id, name, field_type, required, options
    from public.custom_entity_attributes
    where entity_type_id = new.entity_type_id
  loop
    attribute_value := new.attributes -> definition.id::text;

    if definition.required and (
      not (new.attributes ? definition.id::text)
      or attribute_value is null
      or attribute_value = 'null'::jsonb
      or attribute_value = '""'::jsonb
      or attribute_value = '[]'::jsonb
    ) then
      raise exception 'Required custom attribute % is missing', definition.name;
    end if;

    if not (new.attributes ? definition.id::text)
      or attribute_value is null
      or attribute_value = 'null'::jsonb then
      continue;
    end if;

    if definition.field_type in ('text', 'date', 'select')
      and jsonb_typeof(attribute_value) <> 'string' then
      raise exception 'Custom attribute % must be a string', definition.name;
    elsif definition.field_type = 'number'
      and jsonb_typeof(attribute_value) <> 'number' then
      raise exception 'Custom attribute % must be a number', definition.name;
    elsif definition.field_type = 'boolean'
      and jsonb_typeof(attribute_value) <> 'boolean' then
      raise exception 'Custom attribute % must be a boolean', definition.name;
    elsif definition.field_type = 'multiselect' then
      if jsonb_typeof(attribute_value) <> 'array' or exists (
        select 1
        from jsonb_array_elements(attribute_value) entry
        where jsonb_typeof(entry) <> 'string'
      ) then
        raise exception 'Custom attribute % must be an array of strings', definition.name;
      end if;
    end if;

    if definition.field_type = 'select'
      and definition.options is not null
      and not (definition.options ? (attribute_value #>> '{}')) then
      raise exception 'Custom attribute % contains an invalid option', definition.name;
    elsif definition.field_type = 'multiselect'
      and definition.options is not null
      and exists (
        select 1
        from jsonb_array_elements_text(attribute_value) selected(value)
        where not (definition.options ? selected.value)
      ) then
      raise exception 'Custom attribute % contains an invalid option', definition.name;
    end if;
  end loop;

  return new;
end;
$$;

create trigger validate_custom_entity_attribute_values
before insert or update of entity_type_id, attributes
on public.custom_entities
for each row
execute function public.validate_custom_entity_attribute_values();

revoke all on function public.move_chapter_atomic(uuid, text) from public;
revoke all on function public.create_world_entity_atomic(uuid, public.entity_kind, text, jsonb) from public;
revoke all on function public.update_world_entity_atomic(uuid, jsonb) from public;

grant execute on function public.move_chapter_atomic(uuid, text) to authenticated;
grant execute on function public.create_world_entity_atomic(uuid, public.entity_kind, text, jsonb) to authenticated;
grant execute on function public.update_world_entity_atomic(uuid, jsonb) to authenticated;
