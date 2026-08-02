-- User-submitted suggestions/bug reports/feedback about the app itself
-- (distinct from public.reports, which reports another user's content
-- for moderation). Insert-only from the client's point of view -- no
-- select policy, since regular users don't read this back in-app; the
-- admin backoffice reviews it via the service-role client, the same
-- shape as bmc_donations.
--
-- username/email are snapshots taken at submission time (mirrors
-- bmc_donations.supporter_name/supporter_email and admin_audit_log's
-- denormalized email columns) so a submission stays fully readable
-- even after a later username change or the reporter's account being
-- deleted. Per explicit decision, deleting the account does NOT delete
-- the feedback -- user_id goes to null instead of cascading, since a
-- still-useful bug report/suggestion shouldn't vanish just because the
-- reporter's account later gets deleted.
create table public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  username text not null,
  email text not null,
  type text not null check (type in ('suggestion', 'bug', 'feedback', 'other')),
  description text not null check (char_length(trim(description)) > 0),
  photo_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.app_feedback enable row level security;

create policy app_feedback_insert_own on public.app_feedback
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Server-side anti-spam: at most one submission per user per 60
-- seconds. SECURITY DEFINER (mirrors cancel_sitting_on_unfollow's
-- pattern) is required here specifically because there's no select
-- policy on this table -- a plain invoker-rights trigger wouldn't be
-- able to see the caller's own prior rows to check timing. NEW.user_id
-- still has to pass app_feedback_insert_own's own auth.uid() = user_id
-- check afterward, so a spoofed user_id can't be used to probe or
-- bypass another user's rate-limit state -- the insert is rejected
-- either way.
create function public.enforce_feedback_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last_submitted_at timestamptz;
begin
  select max(created_at) into v_last_submitted_at
  from public.app_feedback
  where user_id = new.user_id;

  if v_last_submitted_at is not null and v_last_submitted_at > now() - interval '60 seconds' then
    raise exception 'Please wait a minute before submitting again.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger enforce_feedback_rate_limit_trigger
  before insert on public.app_feedback
  for each row execute function public.enforce_feedback_rate_limit();
