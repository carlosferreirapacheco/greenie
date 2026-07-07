-- Plants become publicly readable, matching every other social table
-- (profiles, plant_progress, follows, likes, comments) -- needed so the
-- feed can show a followed user's plant name/species. Write access stays
-- owner-only.
drop policy if exists "plants_select_own" on plants;

create policy "plants_select_all" on plants
  for select using (true);
