-- plant_sitter_attribution (migration 0015) was built to control
-- whether a sitter's shared progress report credits the owner by name,
-- but nothing ever actually read it -- the attribution sentence always
-- rendered regardless. Redefined here: it now gates whether a sitter's
-- report on the owner's plant may be shared to the sitter's own feed
-- at all. Disabled: the report must stay unlisted (shared_to_feed =
-- false), reachable only via the plant's own history or a direct link,
-- same as any other unlisted report. The owner's own reports on their
-- own plants are never restricted by their own setting.

create function public.can_share_progress_to_feed(plant uuid, logger uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from plants
    left join profiles on profiles.id = plants.owner_id
    where plants.id = plant
      and (
        plants.owner_id = logger
        or coalesce(profiles.plant_sitter_attribution, 'allowed') = 'allowed'
      )
  );
$$;

drop policy plant_progress_insert_own on public.plant_progress;

create policy plant_progress_insert_own
  on public.plant_progress
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.plants
      where plants.id = plant_progress.plant_id
        and (
          plants.owner_id = auth.uid()
          or public.is_active_plant_sitter(plants.owner_id, auth.uid())
        )
    )
    and (not shared_to_feed or public.can_share_progress_to_feed(plant_progress.plant_id, auth.uid()))
  );

-- Previously using-only (no explicit with check, so UPDATE fell back
-- to using()). An explicit with check is needed now so a sitter can't
-- log unlisted then flip shared_to_feed on afterward via
-- updateProgressReportSettings(), bypassing the insert-time gate.
drop policy plant_progress_update_own on public.plant_progress;

create policy plant_progress_update_own on public.plant_progress
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and (not shared_to_feed or public.can_share_progress_to_feed(plant_progress.plant_id, auth.uid()))
  );
