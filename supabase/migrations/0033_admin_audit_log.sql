-- Durable audit trail for backoffice admin actions that have no other
-- record of who performed them and when. Report-driven moderation
-- (delete content / ban / dismiss) already has its own audit trail via
-- reports.resolved_at/resolved_by/resolution (migration 0026) and is
-- deliberately NOT duplicated here -- this table exists specifically to
-- cover the actions that don't go through the reports table at all:
-- account deletion, unban, beta-tester grant/revoke, a manual supporter
-- total correction, and manual donation matching.
create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  admin_id uuid references auth.users(id) on delete set null,
  admin_email text,
  action text not null check (action in (
    'delete_account',
    'unban_user',
    'set_beta_tester',
    'adjust_supporter_total',
    'match_donation'
  )),
  target_user_id uuid references auth.users(id) on delete set null,
  target_email text,
  detail jsonb
);

-- admin_email/target_email are denormalized snapshots taken at insert
-- time, not left to the FK alone -- critical for delete_account
-- specifically, since target_user_id goes null the moment the account is
-- actually deleted, and without the snapshot that row would become
-- unreadable right after the one event it exists to record.

alter table public.admin_audit_log enable row level security;

-- Deliberately no client policies at all, matching app_error_logs/
-- bmc_donations -- every writer holds a service-role client (the
-- backoffice's createAdminClient()), which bypasses RLS regardless.
-- Reads are backoffice-only via its own service-role client.
