-- Care streaks (PR1: core mechanic). Consecutive on-time care-task
-- days, single account-wide number. Capped at +1 per calendar day,
-- and only once every task due that day (across every plant the
-- caller is currently responsible for) has been completed on time --
-- this is what prevents gaming the count via many fake plants with
-- 1-day-frequency tasks, since no matter how many tasks exist, a
-- single day can only ever contribute +1. care_tasks has no history
-- of its own -- markCareTaskDone() only ever overwrote last_done/
-- next_due in place -- so this needs new columns and event-driven
-- logic tracked going forward, not back-computed.
--
-- Sitting-aware behavior (grace days, freezing an owner's streak
-- while a sitter covers) is deliberately NOT in this migration -- see
-- the follow-up "care streaks: sitting grace day" migration. This one
-- only needs to know "is this plant currently mine to worry about"
-- (owned-and-not-handed-to-a-sitter, or actively sat by me), which
-- already falls out of is_active_plant_sitter() (0015_plant_sitting.sql)
-- without any new sitting-specific columns.

alter table public.care_tasks
  add column last_completed_on_time boolean;

alter table public.profiles
  add column care_streak_current integer not null default 0,
  add column care_streak_longest integer not null default 0,
  add column care_streak_last_credited_date date;

-- Guard, mirroring guard_is_admin (0025_admin_access.sql) exactly.
-- Unlike most self-editable profile columns, these are shown on
-- PUBLIC profiles (bragging rights) -- direct client tampering has to
-- be blocked, not just discouraged. Only record_care_completion()
-- below (SECURITY DEFINER, so current_user inside it is the
-- function's owner, not 'authenticated') can change them.
create or replace function public.guard_care_streak_columns()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.care_streak_current := old.care_streak_current;
    new.care_streak_longest := old.care_streak_longest;
    new.care_streak_last_credited_date := old.care_streak_last_credited_date;
  end if;
  return new;
end;
$$;

create trigger guard_care_streak_columns_before_update
  before update on public.profiles
  for each row
  execute function public.guard_care_streak_columns();

-- Replaces markCareTaskDone()'s plain client-side UPDATE. SECURITY
-- DEFINER is deliberate (mirrors is_active_plant_sitter()'s own
-- precedent): it must write the now-guarded profiles columns above,
-- and must read across plants/tasks the caller doesn't own (to check
-- "anything else outstanding today") without RLS narrowing that to
-- just their own rows. Re-implements the care_tasks
-- owner-or-active-sitter authorization check explicitly, per this
-- project's SECURITY DEFINER checklist, since RLS is bypassed here.
--
-- "Today" is the CLIENT's local calendar day, not the database's --
-- passed in as an IANA timezone name and applied via AT TIME ZONE on
-- every date comparison, so the cutoff lands at the user's own
-- midnight, not UTC's.
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
      next_due = coalesce(p_next_due_anchor, v_completed_at) + (v_task.frequency_days || ' days')::interval
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
    -- A late/missed completion on a plant I'm only sitting for has no
    -- immediate effect here -- see the follow-up grace-day migration.
    return v_task;
  end if;

  select exists (
    select 1 from public.care_tasks
    where plant_id = any(v_all_plant_ids)
      and next_due is not null
      and (next_due AT TIME ZONE p_client_timezone)::date <= v_today
  ) into v_still_outstanding;

  select exists (
    select 1 from public.care_tasks
    where plant_id = any(v_all_plant_ids)
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
