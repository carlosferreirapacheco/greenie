-- In-app notifications inbox. Rows are created exclusively by the
-- security definer triggers below (no client INSERT policy exists);
-- each trigger first checks the recipient's per-kind preference on
-- profiles, so a disabled kind never even creates a row.

-- 1. Per-kind notification preferences, one column per kind (matching
-- the Settings toggles). notify_sitting_responses covers both
-- sitting_accepted and sitting_declined -- one kind, "your sitting
-- request was answered".
alter table public.profiles
  add column notify_comments boolean not null default true,
  add column notify_likes boolean not null default true,
  add column notify_follow_requests boolean not null default true,
  add column notify_new_followers boolean not null default true,
  add column notify_follow_accepted boolean not null default true,
  add column notify_sitting_requests boolean not null default true,
  add column notify_sitting_responses boolean not null default true;

-- 2. The notifications table.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in (
    'comment', 'like', 'follow_request', 'new_follower',
    'follow_accepted', 'sitting_request', 'sitting_accepted', 'sitting_declined'
  )),
  progress_id uuid references public.plant_progress(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;

-- Recipient-only visibility; UPDATE exists so the recipient can mark
-- rows read. No INSERT/DELETE policies -- writes happen only through
-- the security definer triggers below.
create policy notifications_select_own on public.notifications
  for select
  using (auth.uid() = recipient_id);

create policy notifications_update_own on public.notifications
  for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

-- 3. Comments: notify the report's author, unless they commented on
-- their own report or turned comment notifications off.
create function public.notify_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  report_author uuid;
begin
  select user_id into report_author from plant_progress where id = new.progress_id;
  if report_author is not null
     and report_author <> new.user_id
     and (select notify_comments from profiles where id = report_author) then
    insert into notifications (recipient_id, actor_id, type, progress_id)
    values (report_author, new.user_id, 'comment', new.progress_id);
  end if;
  return new;
end;
$$;

create trigger notify_on_comment_trigger
after insert on public.comments
for each row execute function public.notify_on_comment();

-- 4. Likes: same shape as comments; the delete trigger removes the
-- matching notification so like/unlike toggling doesn't leave stale
-- entries behind.
create function public.notify_on_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  report_author uuid;
begin
  select user_id into report_author from plant_progress where id = new.progress_id;
  if report_author is not null
     and report_author <> new.user_id
     and (select notify_likes from profiles where id = report_author) then
    insert into notifications (recipient_id, actor_id, type, progress_id)
    values (report_author, new.user_id, 'like', new.progress_id);
  end if;
  return new;
end;
$$;

create trigger notify_on_like_trigger
after insert on public.likes
for each row execute function public.notify_on_like();

create function public.remove_like_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from notifications
  where type = 'like'
    and actor_id = old.user_id
    and progress_id = old.progress_id;
  return old;
end;
$$;

create trigger remove_like_notification_trigger
after delete on public.likes
for each row execute function public.remove_like_notification();

-- 5. Follows: an insert lands as 'pending' (private account, a
-- follow request) or 'accepted' (public account, an instant new
-- follower) -- set_follow_status (migration 0008) has already
-- computed new.status by the time this after-insert trigger runs.
create function public.notify_on_follow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending' then
    if (select notify_follow_requests from profiles where id = new.followee_id) then
      insert into notifications (recipient_id, actor_id, type)
      values (new.followee_id, new.follower_id, 'follow_request');
    end if;
  elsif new.status = 'accepted' then
    if (select notify_new_followers from profiles where id = new.followee_id) then
      insert into notifications (recipient_id, actor_id, type)
      values (new.followee_id, new.follower_id, 'new_follower');
    end if;
  end if;
  return new;
end;
$$;

create trigger notify_on_follow_trigger
after insert on public.follows
for each row execute function public.notify_on_follow();

-- 6. Follow request accepted: notify the requester.
create function public.notify_on_follow_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'pending' and new.status = 'accepted'
     and (select notify_follow_accepted from profiles where id = new.follower_id) then
    insert into notifications (recipient_id, actor_id, type)
    values (new.follower_id, new.followee_id, 'follow_accepted');
  end if;
  return new;
end;
$$;

create trigger notify_on_follow_accepted_trigger
after update on public.follows
for each row execute function public.notify_on_follow_accepted();

-- 7. Plant-sitting: request -> notify the sitter; accept/decline ->
-- notify the owner. Deliberately nothing on 'cancelled' -- it can be
-- a side effect of unfollow/block (cancel_sitting_on_unfollow), where
-- a notification would be wrong.
create function public.notify_on_sitting_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'pending'
     and (select notify_sitting_requests from profiles where id = new.sitter_id) then
    insert into notifications (recipient_id, actor_id, type)
    values (new.sitter_id, new.owner_id, 'sitting_request');
  end if;
  return new;
end;
$$;

create trigger notify_on_sitting_request_trigger
after insert on public.plant_sitting_assignments
for each row execute function public.notify_on_sitting_request();

create function public.notify_on_sitting_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'pending' and new.status in ('accepted', 'declined')
     and (select notify_sitting_responses from profiles where id = new.owner_id) then
    insert into notifications (recipient_id, actor_id, type)
    values (
      new.owner_id,
      new.sitter_id,
      case when new.status = 'accepted' then 'sitting_accepted' else 'sitting_declined' end
    );
  end if;
  return new;
end;
$$;

create trigger notify_on_sitting_response_trigger
after update on public.plant_sitting_assignments
for each row execute function public.notify_on_sitting_response();
