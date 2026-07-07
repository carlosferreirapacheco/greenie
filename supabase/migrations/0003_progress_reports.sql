-- Track when a plant was acquired, so age can be computed rather than
-- re-entered on every progress report
alter table plants add column if not exists acquired_at date;

-- Reshape "posts" into plant progress reports: a structured per-plant
-- growth log entry (height, notes) instead of a generic photo+caption
-- post. Table has 0 rows, so this is a free rename+reshape.
alter table posts rename to plant_progress;
alter table plant_progress rename column caption to notes;
alter table plant_progress alter column photo_url drop not null;
alter table plant_progress add column if not exists height_cm numeric;

alter index posts_plant_id_idx rename to plant_progress_plant_id_idx;
alter index posts_user_id_idx rename to plant_progress_user_id_idx;

drop policy if exists "posts_select_all" on plant_progress;
drop policy if exists "posts_insert_own" on plant_progress;
drop policy if exists "posts_update_own" on plant_progress;
drop policy if exists "posts_delete_own" on plant_progress;

create policy "plant_progress_select_all" on plant_progress
  for select using (true);
create policy "plant_progress_insert_own" on plant_progress
  for insert with check (auth.uid() = user_id);
create policy "plant_progress_update_own" on plant_progress
  for update using (auth.uid() = user_id);
create policy "plant_progress_delete_own" on plant_progress
  for delete using (auth.uid() = user_id);

-- Keep likes/comments naming consistent now that "posts" no longer exists
-- as a concept. Column renames carry the existing FK/PK constraints
-- through automatically.
alter table likes rename column post_id to progress_id;
alter table comments rename column post_id to progress_id;
alter index comments_post_id_idx rename to comments_progress_id_idx;
