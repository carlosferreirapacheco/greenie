-- Plant-sitting: mutual-follow-gated delegated access to another
-- user's care tasks (view + mark done) and progress-report logging,
-- for a bounded or indefinite period. The sitter views the owner's
-- plants via the existing app/user/[id].tsx profile screen (already
-- RLS-visible once mutual-follow exists) -- no new "session" concept
-- at the schema level, just an assignment record gating access.

-- 1. plant_sitting_assignments.
create table public.plant_sitting_assignments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  sitter_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  cancelled_at timestamptz,
  check (owner_id <> sitter_id)
);

create index plant_sitting_assignments_owner_id_idx on public.plant_sitting_assignments(owner_id);
create index plant_sitting_assignments_sitter_id_idx on public.plant_sitting_assignments(sitter_id);

-- At most one live (pending or accepted) assignment per owner/sitter
-- pair at a time -- guards against duplicate concurrent requests.
create unique index plant_sitting_assignments_live_pair_idx
  on public.plant_sitting_assignments(owner_id, sitter_id)
  where status in ('pending', 'accepted');

alter table public.plant_sitting_assignments enable row level security;

create policy plant_sitting_select_own on public.plant_sitting_assignments
  for select
  using (auth.uid() = owner_id or auth.uid() = sitter_id);

-- Mutual follow required -- reuses is_accepted_follower() (migration
-- 0008) in both directions rather than a new helper.
create policy plant_sitting_insert_own on public.plant_sitting_assignments
  for insert
  with check (
    auth.uid() = owner_id
    and public.is_accepted_follower(owner_id, sitter_id)
    and public.is_accepted_follower(sitter_id, owner_id)
  );

-- The sitter can only respond (accept/decline) to a pending request;
-- the owner can cancel a pending or accepted one at any time. Two
-- separate policies (one per acting party), matching
-- follows_update_by_followee's precedent -- Postgres ORs multiple
-- permissive policies together for both USING and WITH CHECK.
create policy plant_sitting_update_by_sitter on public.plant_sitting_assignments
  for update
  using (auth.uid() = sitter_id and status = 'pending')
  with check (auth.uid() = sitter_id and status in ('accepted', 'declined'));

create policy plant_sitting_update_by_owner on public.plant_sitting_assignments
  for update
  using (auth.uid() = owner_id and status in ('pending', 'accepted'))
  with check (auth.uid() = owner_id and status = 'cancelled');

-- 2. Helper: is there a currently-active accepted assignment letting
-- sitter act on owner's plants right now? Mirrors is_accepted_follower()
-- / is_blocked()'s pattern -- reused by the care_tasks and
-- plant_progress policies below.
create function public.is_active_plant_sitter(owner uuid, sitter uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from plant_sitting_assignments
    where plant_sitting_assignments.owner_id = owner
      and plant_sitting_assignments.sitter_id = sitter
      and plant_sitting_assignments.status = 'accepted'
      and (plant_sitting_assignments.starts_at is null or now() >= plant_sitting_assignments.starts_at)
      and (plant_sitting_assignments.ends_at is null or now() <= plant_sitting_assignments.ends_at)
  );
$$;

-- 3. care_tasks: a sitter with an active assignment can view AND mark
-- tasks done on the owner's plants. UPDATE is intentionally as broad
-- as the owner's own care_tasks_update_own policy (matching
-- plant_progress_update_own's precedent of RLS being broader than what
-- the UI exposes) -- the app UI is what actually limits a sitter to
-- "mark done" only, not a column-level RLS trick. INSERT/DELETE stay
-- owner-only, untouched.
create policy care_tasks_select_sitter on public.care_tasks
  for select
  using (
    exists (
      select 1 from public.plants
      where plants.id = care_tasks.plant_id
        and public.is_active_plant_sitter(plants.owner_id, auth.uid())
    )
  );

create policy care_tasks_update_sitter on public.care_tasks
  for update
  using (
    exists (
      select 1 from public.plants
      where plants.id = care_tasks.plant_id
        and public.is_active_plant_sitter(plants.owner_id, auth.uid())
    )
  );

-- 4. plant_progress: a sitter can insert a report on the owner's plant
-- under an active assignment -- the report's user_id is the sitter
-- (the author), the plant's owner_id is unchanged.
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
  );

-- The plant owner can always see reports logged on their own plant,
-- regardless of who logged it or the logger's own visibility settings
-- -- explicit and unconditional rather than relying on the mutual-follow
-- prerequisite making this true implicitly (which it already does, but
-- an explicit clause doesn't silently break if the follow relationship
-- changes later -- same reasoning as the Block-users migration).
drop policy plant_progress_select_visible on public.plant_progress;

create policy plant_progress_select_visible on public.plant_progress
  for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.plants
      where plants.id = plant_progress.plant_id
        and plants.owner_id = auth.uid()
    )
    or (
      not public.is_blocked(user_id, auth.uid())
      and (
        (select progress_visibility from public.profiles where id = plant_progress.user_id) = 'public'
        or public.is_accepted_follower(user_id, auth.uid())
      )
    )
  );

-- 5. Losing mutual-follow status for any reason -- unfollow, follower
-- removal, a declined re-request, or a block (remove_follows_on_block,
-- migration 0014, already deletes the follows rows) -- immediately
-- cancels any live assignment between the pair. One trigger point
-- covers every path since they all end in a follows row being deleted.
create function public.cancel_sitting_on_unfollow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.plant_sitting_assignments
  set status = 'cancelled', cancelled_at = now()
  where status in ('pending', 'accepted')
    and (
      (owner_id = old.follower_id and sitter_id = old.followee_id)
      or (owner_id = old.followee_id and sitter_id = old.follower_id)
    );
  return old;
end;
$$;

create trigger cancel_sitting_on_unfollow_trigger
  after delete on public.follows
  for each row execute function public.cancel_sitting_on_unfollow();

-- 6. Account-wide opt-out: does this owner allow a sitter to credit
-- them ("Owner's Plant") when sharing a logged report to the sitter's
-- own feed? Matches the existing three privacy columns' text-enum
-- shape and open-by-default stance.
alter table public.profiles
  add column plant_sitter_attribution text not null default 'allowed'
    check (plant_sitter_attribution in ('allowed', 'disabled'));
