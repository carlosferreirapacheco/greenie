-- Photo capture (plants, avatars, progress reports) -- one shared
-- public bucket, not three, since all three contexts need the same
-- public-read/owner-write shape. Path convention is
-- <uploader_auth_uid>/<context>/<filename>, so a single RLS policy set
-- (keyed on the first path segment) covers plants/avatars/progress
-- alike -- context is just a folder, not a schema/security distinction.
-- Keying by the *uploader's* id (not e.g. a plant's owner) matters once
-- a plant-sitter uploads a progress photo on someone else's plant: they
-- own that file under their own folder, same as they already own the
-- plant_progress row itself (user_id, not the plant's owner_id).

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

create policy "photos_select_all"
  on storage.objects for select
  using (bucket_id = 'photos');

create policy "photos_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "photos_update_own"
  on storage.objects for update
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "photos_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
