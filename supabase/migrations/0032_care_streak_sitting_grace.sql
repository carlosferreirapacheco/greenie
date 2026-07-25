-- Care streaks (PR2: plant-sitting grace day). Builds on
-- 0031_care_streaks.sql's core mechanic. Per the user's decided
-- mechanic: a late/missed task on a plant the caller only SITS for no
-- longer has any immediate effect on their streak (0031 already left
-- that branch as a no-op). Instead, an hourly cron scan detects the
-- overdue moment, opens a 1-day "Plant sitters grace day" window, and
-- notifies the sitter; completing the task during the window clears it
-- with no penalty, letting it expire resets the sitter's streak (with
-- its own notification). The sitter's OWN plants are unaffected --
-- those still reset immediately on lateness, per 0031.

alter table public.care_tasks
  add column grace_deadline timestamptz,
  add column grace_sitter_id uuid references public.profiles(id) on delete cascade;

alter table public.profiles
  add column notify_sitting_grace_day boolean not null default true;

-- Same extension pattern 0020_push_notifications.sql used to add
-- care_due.
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in (
    'comment', 'like', 'follow_request', 'new_follower',
    'follow_accepted', 'sitting_request', 'sitting_accepted', 'sitting_declined',
    'care_due', 'sitting_grace_day', 'sitting_grace_expired'
  ));

-- Re-create record_care_completion() (0031) grace-aware:
-- (1) completing a task -- even late -- always resolves any pending
--     grace on it, since the thing the grace was waiting on is now done;
-- (2) a task currently in an active (non-expired) grace no longer blocks
--     that day's unrelated +1 credit for the caller's other tasks --
--     per the user's explicit "promote sitting, don't penalize it"
--     framing, a pending grace on a sat plant shouldn't hold the
--     sitter's own streak credit hostage while the grace window is
--     still open.
-- Everything else is byte-for-byte identical to 0031's version.
create or replace function public.record_care_completion(
  p_task_id uuid,
  p_next_due_anchor timestamptz,
  p_client_timezone text
) returns care_tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task care_tasks;
  v_completed_at timestamptz := now();
  v_was_on_time boolean;
  v_today date;
  v_is_owner boolean;
  v_is_sitter boolean;
  v_own_plant_ids uuid[];
  v_sat_plant_ids uuid[];
  v_all_plant_ids uuid[];
  v_still_outstanding boolean;
  v_any_late_today boolean;
  v_profile profiles;
begin
  -- Defensive fallback if the client sends a bogus zone string.
  begin
    perform (v_completed_at AT TIME ZONE p_client_timezone);
  exception when others then
    p_client_timezone := 'UTC';
  end;
  v_today := (v_completed_at AT TIME ZONE p_client_timezone)::date;

  select * into v_task from public.care_tasks where id = p_task_id;
  if v_task is null then
    raise exception 'Task not found';
  end if;

  select (plants.owner_id = auth.uid()), public.is_active_plant_sitter(plants.owner_id, auth.uid())
    into v_is_owner, v_is_sitter
    from public.plants where plants.id = v_task.plant_id;
  if not (v_is_owner or v_is_sitter) then
    raise exception 'Not authorized to complete this task';
  end if;

  v_was_on_time := v_task.next_due is null or v_completed_at <= v_task.next_due;

  update public.care_tasks
  set last_done = v_completed_at,
      last_completed_on_time = v_was_on_time,
      next_due = coalesce(p_next_due_anchor, v_completed_at) + (v_task.frequency_days || ' days')::interval,
      grace_deadline = null,
      grace_sitter_id = null
  where id = p_task_id
  returning * into v_task;

  select array_agg(p.id) into v_own_plant_ids
  from public.plants p
  where p.archived_at is null
    and p.owner_id = auth.uid()
    and not exists (
      select 1 from public.plant_sitting_assignments psa
      where psa.owner_id = p.owner_id and psa.status = 'accepted'
        and (psa.starts_at is null or now() >= psa.starts_at)
        and (psa.ends_at is null or now() <= psa.ends_at));

  select array_agg(p.id) into v_sat_plant_ids
  from public.plants p
  where p.archived_at is null
    and public.is_active_plant_sitter(p.owner_id, auth.uid());

  v_all_plant_ids := coalesce(v_own_plant_ids, '{}') || coalesce(v_sat_plant_ids, '{}');

  if not (v_task.plant_id = any(v_all_plant_ids)) then
    return v_task; -- not this caller's responsibility right now -- no streak effect
  end if;

  if not v_was_on_time then
    if v_task.plant_id = any(v_own_plant_ids) then
      update public.profiles set care_streak_current = 0 where id = auth.uid();
    end if;
    -- sat-plant lateness: no action here -- the grace-day cron owns
    -- detection + eventual consequence entirely (see the
    -- care-sitting-grace-scan job below).
    return v_task;
  end if;

  select exists (
    select 1 from public.care_tasks
    where plant_id = any(v_all_plant_ids)
      and next_due is not null
      and (next_due AT TIME ZONE p_client_timezone)::date <= v_today
      and grace_deadline is null -- a pending grace doesn't block credit
  ) into v_still_outstanding;

  -- Scoped to OWN plants only, unlike v_still_outstanding above -- a sat
  -- plant's late completion already has its own consequence path (no
  -- effect if resolved within grace, a reset + notification if the
  -- grace expires) and must not additionally cost the sitter today's
  -- unrelated credit too. An own-plant late completion never actually
  -- reaches this point today (the early-return branch above resets the
  -- streak and returns immediately), so this only fires for an EARLIER
  -- same-day late own-plant catchup blocking a LATER same-day on-time
  -- completion -- deliberately still blocking, since the streak was
  -- already broken that day.
  select exists (
    select 1 from public.care_tasks
    where plant_id = any(coalesce(v_own_plant_ids, '{}'))
      and last_done is not null
      and (last_done AT TIME ZONE p_client_timezone)::date = v_today
      and last_completed_on_time = false
  ) into v_any_late_today;

  if v_still_outstanding or v_any_late_today then
    return v_task;
  end if;

  select * into v_profile from public.profiles where id = auth.uid();
  if v_profile.care_streak_last_credited_date is distinct from v_today then
    update public.profiles
    set care_streak_current = v_profile.care_streak_current + 1,
        care_streak_longest = greatest(v_profile.care_streak_longest, v_profile.care_streak_current + 1),
        care_streak_last_credited_date = v_today
    where id = auth.uid();
  end if;

  return v_task;
end;
$$;

grant execute on function public.record_care_completion(uuid, timestamptz, text) to authenticated;

-- New hourly cron job, deliberately SEPARATE from care-due-scan so that
-- job (already verified, still owns the plain care_due reminder) stays
-- untouched. Same 1-hour detection window trick care-due-scan already
-- uses. Two independent halves in one job body:
--   (1) start: a task on an actively-sat plant just went overdue in the
--       last hour -> open a 1-day grace window + notify the sitter.
--   (2) enforce: a grace window that has already passed its deadline ->
--       notify + reset the sitter's streak, then clear the grace fields
--       last so both queries above still see it while running.
select cron.schedule(
  'care-sitting-grace-scan',
  '0 * * * *',
  $job$
  do $$
  begin
    with newly_graced as (
      update public.care_tasks ct
      set grace_deadline = ct.next_due + interval '1 day',
          grace_sitter_id = psa.sitter_id
      from public.plants p
      join public.plant_sitting_assignments psa
        on psa.owner_id = p.owner_id and psa.status = 'accepted'
        and (psa.starts_at is null or now() >= psa.starts_at)
        and (psa.ends_at is null or now() <= psa.ends_at)
      where ct.plant_id = p.id and p.archived_at is null
        and ct.next_due <= now() and ct.next_due > now() - interval '1 hour'
        and ct.grace_deadline is null
      returning ct.id, ct.plant_id, ct.type, psa.sitter_id
    )
    insert into public.notifications (recipient_id, type, plant_id, care_task_type)
    select ng.sitter_id, 'sitting_grace_day', ng.plant_id, ng.type
    from newly_graced ng
    join public.profiles pr on pr.id = ng.sitter_id
    where pr.notify_sitting_grace_day;

    insert into public.notifications (recipient_id, type, plant_id, care_task_type)
    select ct.grace_sitter_id, 'sitting_grace_expired', ct.plant_id, ct.type
    from public.care_tasks ct
    join public.profiles pr on pr.id = ct.grace_sitter_id
    where ct.grace_deadline is not null and ct.grace_deadline < now()
      and pr.notify_sitting_grace_day;

    update public.profiles pr
    set care_streak_current = 0
    from public.care_tasks ct
    where ct.grace_sitter_id = pr.id
      and ct.grace_deadline is not null and ct.grace_deadline < now();

    update public.care_tasks
    set grace_deadline = null, grace_sitter_id = null
    where grace_deadline is not null and grace_deadline < now();
  end;
  $$;
  $job$
);
