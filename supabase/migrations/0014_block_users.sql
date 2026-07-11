-- Blocking. Two asymmetries to keep straight:
--
-- IDENTITY (profiles row) is asymmetric: a blocked party can't see the
-- blocker's profile at all, but the blocker CAN still see the blocked
-- party's bare profile -- needed to render a Blocked-users list and
-- know who they're unblocking.
--
-- CONTENT (plants, plant_progress, comments, likes) and the ability to
-- follow are symmetric: hidden/prevented both ways regardless of who
-- blocked whom, via is_blocked() below.

-- 1. blocks table -- only the blocker can see or manage their own
-- outgoing blocks; the blocked party never gets row-level visibility
-- into who's blocked them.
create table public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.blocks enable row level security;

create policy blocks_select_own on public.blocks
  for select
  using (auth.uid() = blocker_id);

create policy blocks_insert_own on public.blocks
  for insert
  with check (auth.uid() = blocker_id);

create policy blocks_delete_own on public.blocks
  for delete
  using (auth.uid() = blocker_id);

-- 2. Helpers, mirroring is_accepted_follower()'s existing pattern.
create function public.blocked(blocker uuid, blockee uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from blocks
    where blocks.blocker_id = blocker
      and blocks.blocked_id = blockee
  );
$$;

create function public.is_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.blocked(a, b) or public.blocked(b, a);
$$;

-- 3. Blocking auto-removes any existing follow between the pair, in
-- either direction, regardless of status (pending or accepted).
create function public.remove_follows_on_block()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and followee_id = new.blocked_id)
     or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  return new;
end;
$$;

create trigger remove_follows_on_block_trigger
  after insert on public.blocks
  for each row execute function public.remove_follows_on_block();

-- 4. profiles: identity hides only in the blocked-party -> blocker
-- direction (asymmetric -- see header comment).
drop policy profiles_select_all on public.profiles;

create policy profiles_select_visible on public.profiles
  for select
  using (
    auth.uid() = id
    or not public.blocked(id, auth.uid())
  );

-- 5. plants / plant_progress: block check added to the non-owner
-- branch, symmetric. The owner_id/user_id = auth.uid() self-clause
-- stays unconditional.
drop policy plants_select_visible on public.plants;

create policy plants_select_visible on public.plants
  for select
  using (
    owner_id = auth.uid()
    or (
      not public.is_blocked(owner_id, auth.uid())
      and (
        (select profile_visibility from public.profiles where id = plants.owner_id) = 'public'
        or public.is_accepted_follower(owner_id, auth.uid())
      )
    )
  );

drop policy plant_progress_select_visible on public.plant_progress;

create policy plant_progress_select_visible on public.plant_progress
  for select
  using (
    user_id = auth.uid()
    or (
      not public.is_blocked(user_id, auth.uid())
      and (
        (select progress_visibility from public.profiles where id = plant_progress.user_id) = 'public'
        or public.is_accepted_follower(user_id, auth.uid())
      )
    )
  );

-- 6. comments: current definitions are from migration 0012.
drop policy comments_select_visible on public.comments;

create policy comments_select_visible on public.comments
  for select
  using (
    exists (
      select 1 from public.plant_progress pp
      where pp.id = comments.progress_id
        and pp.comment_policy <> 'disabled'
        and not public.is_blocked(pp.user_id, auth.uid())
        and (
          pp.user_id = auth.uid()
          or (select progress_visibility from public.profiles where id = pp.user_id) = 'public'
          or public.is_accepted_follower(pp.user_id, auth.uid())
        )
    )
  );

drop policy comments_insert_allowed on public.comments;

create policy comments_insert_allowed on public.comments
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.plant_progress pp
      where pp.id = comments.progress_id
        and pp.comment_policy <> 'disabled'
        and not public.is_blocked(pp.user_id, auth.uid())
        and (
          pp.user_id = auth.uid()
          or (
            (
              (select progress_visibility from public.profiles where id = pp.user_id) = 'public'
              or public.is_accepted_follower(pp.user_id, auth.uid())
            )
            and (
              pp.comment_policy = 'public'
              or public.is_accepted_follower(pp.user_id, auth.uid())
            )
          )
        )
    )
  );

-- 7. likes.
drop policy likes_select_visible on public.likes;

create policy likes_select_visible on public.likes
  for select
  using (
    exists (
      select 1 from public.plant_progress pp
      where pp.id = likes.progress_id
        and not public.is_blocked(pp.user_id, auth.uid())
        and (
          pp.user_id = auth.uid()
          or (select progress_visibility from public.profiles where id = pp.user_id) = 'public'
          or public.is_accepted_follower(pp.user_id, auth.uid())
        )
    )
  );

drop policy likes_insert_visible on public.likes;

create policy likes_insert_visible on public.likes
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.plant_progress pp
      where pp.id = likes.progress_id
        and not public.is_blocked(pp.user_id, auth.uid())
        and (
          pp.user_id = auth.uid()
          or (select progress_visibility from public.profiles where id = pp.user_id) = 'public'
          or public.is_accepted_follower(pp.user_id, auth.uid())
        )
    )
  );

-- 8. follows: block a new follow row between a blocked pair, either
-- direction. follows_insert_own hasn't changed since migration 0001.
drop policy follows_insert_own on public.follows;

create policy follows_insert_own on public.follows
  for insert
  with check (
    auth.uid() = follower_id
    and not public.is_blocked(follower_id, followee_id)
  );
