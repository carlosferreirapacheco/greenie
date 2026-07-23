-- Report review (admin backoffice). Adds resolution tracking to the
-- reports table so the backoffice's open-reports queue only shows
-- what's actually still open, and each row is its own audit trail --
-- who resolved it, when, and how. No RLS change needed: reporters
-- still can't read or write these columns (reports_select_own /
-- reports_insert_own stay exactly as they were), and there's still no
-- client UPDATE policy on reports at all -- only the backoffice's
-- service-role client can ever set these.
alter table public.reports
  add column resolved_at timestamptz,
  add column resolved_by uuid references auth.users(id),
  add column resolution text
    check (resolution in ('deleted_content', 'banned_user', 'dismissed'));
