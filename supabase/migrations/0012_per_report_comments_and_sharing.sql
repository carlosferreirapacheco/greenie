-- Comments and feed-sharing become per-report settings on
-- plant_progress, replacing the account-wide profiles.comment_policy
-- (column dropped at the end, after the policies that referenced it
-- are recreated).
--
-- comment_policy semantics: 'public' (anyone who can see the report),
-- 'followers' (the author's accepted followers), 'disabled' (nobody --
-- including the owner -- and existing comments are HIDDEN while off,
-- not deleted: re-enabling brings them back).
--
-- shared_to_feed semantics: unlisted, not private. false only keeps
-- the report out of feeds (a getFeed() query filter); anyone who could
-- already see the report can still open it directly, and the future
-- plant-history section will list it. No SELECT policy change.

-- 1. New plant_progress columns.
alter table public.plant_progress
  add column comment_policy text not null default 'public'
    check (comment_policy in ('public', 'followers', 'disabled')),
  add column shared_to_feed boolean not null default true;

-- 2. Existing reports keep behaving exactly as they did: seed each one
-- from its author's account-wide setting being retired below.
update public.plant_progress
set comment_policy = (
  select comment_policy from public.profiles
  where profiles.id = plant_progress.user_id
);

-- 3. Reading comments: parent-visibility check unchanged (0008), plus
-- the report's comments must not be disabled -- hidden for everyone,
-- owner included, so turning comments back on restores them intact.
drop policy comments_select_visible on public.comments;

create policy comments_select_visible on public.comments
  for select
  using (
    exists (
      select 1 from public.plant_progress pp
      where pp.id = comments.progress_id
        and pp.comment_policy <> 'disabled'
        and (
          pp.user_id = auth.uid()
          or (select progress_visibility from public.profiles where id = pp.user_id) = 'public'
          or public.is_accepted_follower(pp.user_id, auth.uid())
        )
    )
  );

-- 4. Posting comments: the comment-policy check moves from the
-- author's profile to the report itself. 'disabled' blocks everyone
-- (even the owner); otherwise the owner can always comment, and others
-- need the report visible to them plus 'public' or follower status.
drop policy comments_insert_allowed on public.comments;

create policy comments_insert_allowed on public.comments
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.plant_progress pp
      where pp.id = comments.progress_id
        and pp.comment_policy <> 'disabled'
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

-- 5. The account-wide setting is gone -- nothing references the column
-- anymore (the two policies above were its only server-side readers).
alter table public.profiles drop column comment_policy;
