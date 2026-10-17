-- New chapters begin before the first 500-word milestone. Existing chapters
-- without a checkpoint retain the saved-word baseline from migration 0003.
create function pa_private.ai_initialize_chapter_checkpoint()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.ai_chapter_checkpoints (chapter_id, owner_id, completed_milestone)
  select new.id, w.owner_id, 0
  from public.books b
  join public.worlds w on w.id = b.world_id
  where b.id = new.book_id;
  return new;
end;
$$;

create trigger ai_new_chapter_checkpoint
after insert on public.chapters
for each row execute function pa_private.ai_initialize_chapter_checkpoint();

revoke all on function pa_private.ai_initialize_chapter_checkpoint() from public, anon, authenticated;
