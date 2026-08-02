-- Feedback review workflow (admin backoffice). Adds status tracking to
-- app_feedback (migration 0035) so an admin can triage submissions:
-- needs_review (the implicit starting state) / reviewed / working /
-- closed. Per explicit product decision this is NOT a linear flow --
-- states are interchangeable, any status can be set from any other at
-- any time (e.g. closed -> working is valid, not just forward
-- progress) -- so there's no state-machine trigger enforcing
-- transitions here, only the message requirement below.
--
-- Flat columns on the row itself, mirroring migration
-- 0026_report_resolution.sql's precedent (resolution columns added
-- directly to reports rather than a separate history table) --
-- there's exactly one admin-facing status per row, not a need to
-- review a full change history. Re-setting any status (including
-- re-confirming the current one) overwrites status_message /
-- status_updated_by / status_updated_at -- only the latest message per
-- row is kept, a deliberate simplicity choice.
--
-- No RLS change needed: app_feedback still has no client UPDATE policy
-- at all (only app_feedback_insert_own from migration 0035), so these
-- columns are service-role-only, set exclusively by the backoffice's
-- Server Actions -- same shape as reports.resolved_by/resolution.
alter table public.app_feedback
  add column status text not null default 'needs_review'
    check (status in ('needs_review', 'reviewed', 'working', 'closed')),
  add column status_message text,
  add column status_updated_by uuid references auth.users(id) on delete set null,
  add column status_updated_by_email text,
  add column status_updated_at timestamptz,
  add constraint app_feedback_status_message_required
    check (status not in ('reviewed', 'closed') or (status_message is not null and length(trim(status_message)) > 0));
