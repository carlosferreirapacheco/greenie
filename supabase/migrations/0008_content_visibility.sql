-- Content visibility settings: profile/follow/progress-report/comment
-- privacy controls, each backed by a profiles column and enforced via
-- RLS (not just client-side filtering).

-- 1. New profiles columns, all defaulting to current (fully open) behavior.
alter table public.profiles
  add column profile_visibility text not null default 'public'
    check (profile_visibility in ('public', 'private')),
  add column follow_policy text not null default 'open'
    check (follow_policy in ('open', 'request')),
  add column progress_visibility text not null default 'public'
    check (progress_visibility in ('public', 'private')),
  add column comment_policy text not null default 'public'
    check (comment_policy in ('public', 'followers'));

-- 2. follows gains a status; existing rows are all 'accepted' (created
-- under today's always-instant behavior).
alter table public.follows
  add column status text not null default 'accepted'
    check (status in ('pending', 'accepted'));

-- 3. Server-computed follow status -- always overrides whatever the
-- client sends, so a client can't self-assign 'accepted' to bypass an
-- approval requirement.
create function public.set_follow_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_policy text;
begin
  select follow_policy into target_policy
  from profiles
  where id = new.followee_id;

  if target_policy = 'request' then
    new.status := 'pending';
  else
    new.status := 'accepted';
  end if;

  return new;
end;
$$;

create trigger set_follow_status_trigger
  before insert on public.follows
  for each row execute function public.set_follow_status();

-- 4. Reusable visibility helper, used across the policies below instead
-- of repeating the same subquery everywhere. security definer so it
-- works regardless of the caller's own access to the follows table.
create function public.is_accepted_follower(target uuid, viewer uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from follows
    where follows.followee_id = target
      and follows.follower_id = viewer
      and follows.status = 'accepted'
  );
$$;

-- 5. plants: visible to the owner, or if the owner's profile is public,
-- or to the owner's accepted followers.
drop policy plants_select_all on public.plants;

create policy plants_select_visible on public.plants
  for select
  using (
    owner_id = auth.uid()
    or (select profile_visibility from public.profiles where id = plants.owner_id) = 'public'
    or public.is_accepted_follower(owner_id, auth.uid())
  );

-- 6. plant_progress: same shape, keyed on the report author's
-- progress_visibility.
drop policy plant_progress_select_all on public.plant_progress;

create policy plant_progress_select_visible on public.plant_progress
  for select
  using (
    user_id = auth.uid()
    or (select progress_visibility from public.profiles where id = plant_progress.user_id) = 'public'
    or public.is_accepted_follower(user_id, auth.uid())
  );

-- 7. comments: reading follows the parent report's visibility
-- (regardless of comment_policy -- you can't read comments on a report
-- you can't see); posting additionally requires the author's
-- comment_policy to allow it.
drop policy comments_select_all on public.comments;

create policy comments_select_visible on public.comments
  for select
  using (
    exists (
      select 1 from public.plant_progress pp
      where pp.id = comments.progress_id
        and (
          pp.user_id = auth.uid()
          or (select progress_visibility from public.profiles where id = pp.user_id) = 'public'
          or public.is_accepted_follower(pp.user_id, auth.uid())
        )
    )
  );

drop policy comments_insert_own on public.comments;

create policy comments_insert_allowed on public.comments
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.plant_progress pp
      join public.profiles p on p.id = pp.user_id
      where pp.id = comments.progress_id
        and (
          pp.user_id = auth.uid()
          or (
            (p.progress_visibility = 'public' or public.is_accepted_follower(pp.user_id, auth.uid()))
            and (p.comment_policy = 'public' or public.is_accepted_follower(pp.user_id, auth.uid()))
          )
        )
    )
  );

-- 8. likes: same "visibility follows the parent report" principle, for
-- both reading and inserting -- closes a direct-query gap where likes
-- for a report you can't see would otherwise still be fetchable/insertable.
drop policy likes_select_all on public.likes;

create policy likes_select_visible on public.likes
  for select
  using (
    exists (
      select 1 from public.plant_progress pp
      where pp.id = likes.progress_id
        and (
          pp.user_id = auth.uid()
          or (select progress_visibility from public.profiles where id = pp.user_id) = 'public'
          or public.is_accepted_follower(pp.user_id, auth.uid())
        )
    )
  );

drop policy likes_insert_own on public.likes;

create policy likes_insert_visible on public.likes
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.plant_progress pp
      where pp.id = likes.progress_id
        and (
          pp.user_id = auth.uid()
          or (select progress_visibility from public.profiles where id = pp.user_id) = 'public'
          or public.is_accepted_follower(pp.user_id, auth.uid())
        )
    )
  );

-- 9. follows: only the two parties can see a given row (no public
-- follower/following list exists in this app); the followee can accept
-- (update) or decline/remove (delete) a row targeting them.
drop policy follows_select_all on public.follows;

create policy follows_select_own on public.follows
  for select
  using (auth.uid() = follower_id or auth.uid() = followee_id);

create policy follows_update_by_followee on public.follows
  for update
  using (auth.uid() = followee_id)
  with check (auth.uid() = followee_id and status = 'accepted');

create policy follows_delete_by_followee on public.follows
  for delete
  using (auth.uid() = followee_id);
