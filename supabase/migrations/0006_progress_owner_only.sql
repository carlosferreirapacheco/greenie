-- Progress reports could previously be logged by any signed-in user on
-- any plant, not just their own. Restrict to owner-only; delegated
-- (sitter) logging is deferred to the future plant-sitting feature.
drop policy if exists plant_progress_insert_own on public.plant_progress;

create policy plant_progress_insert_own
  on public.plant_progress
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.plants
      where plants.id = plant_progress.plant_id
        and plants.owner_id = auth.uid()
    )
  );
