-- Running total driving supporter tier (derived client-side, not
-- stored here -- see the deferred badge-display plan). No separate
-- tier column so there's never a second source of truth.
alter table public.profiles
  add column total_donated numeric(10,2) not null default 0;

-- Durable log of every Buy Me a Coffee webhook event, doubling as the
-- backoffice's reconciliation queue for donations that couldn't be
-- auto-matched to a Greenie account. Mirrors ai_lookup_error_logs /
-- app_error_logs's existing shape: no client RLS policies at all,
-- service-role/backoffice only.
create table public.bmc_donations (
  id uuid primary key default gen_random_uuid(),
  bmc_event_id text not null unique,
  event_type text not null,
  supporter_email text,
  supporter_name text,
  message text,
  amount numeric(10,2) not null,
  currency text not null default 'EUR',
  matched_user_id uuid references auth.users(id) on delete set null,
  match_method text check (match_method in ('email', 'username_mention', 'manual')),
  created_at timestamptz not null default now()
);

alter table public.bmc_donations enable row level security;
-- Deliberately no client policies at all.

-- Durable fix for the Auth Admin API's documented intermittent
-- "unrecognized JWT kid" bad_jwt flakiness (see
-- docs/admin-dashboard-backlog.md's "Manual GDPR data subject
-- requests" entry) -- reads auth.users directly via SQL instead of
-- going through the Admin REST API. Restricted to service_role only;
-- never exposed to anon/authenticated (this would otherwise be a
-- lightweight email-enumeration oracle).
create function public.find_user_id_by_email(lookup_email text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from auth.users where lower(email) = lower(lookup_email) limit 1;
$$;

revoke all on function public.find_user_id_by_email(text) from public;
revoke all on function public.find_user_id_by_email(text) from anon;
revoke all on function public.find_user_id_by_email(text) from authenticated;
grant execute on function public.find_user_id_by_email(text) to service_role;
