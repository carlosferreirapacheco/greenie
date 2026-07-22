-- User/content reporting -- required for Google Play's User Generated
-- Content policy (apps with publicly-visible UGC must let users report
-- content/users, not just block). Append-only log: a reporter can
-- insert and see their own submissions, mirroring blocks_select_own's
-- privacy shape (0014_block_users.sql). No update/delete policy and no
-- select access for anyone else -- review happens out-of-band via
-- Supabase Studio/SQL by the app owner (no admin dashboard yet, see
-- CLAUDE.md's Later backlog).
--
-- target_id is a soft reference (no FK): it points at whichever of
-- plant_progress/comments/profiles target_type names, and a report
-- should survive the target later being deleted, not cascade away.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('progress_report', 'comment', 'user')),
  target_id uuid not null,
  reason text not null check (reason in ('spam', 'harassment', 'inappropriate_content', 'other')),
  details text,
  created_at timestamptz not null default now()
);

alter table public.reports enable row level security;

create policy reports_select_own on public.reports
  for select
  to authenticated
  using (auth.uid() = reporter_id);

create policy reports_insert_own on public.reports
  for insert
  to authenticated
  with check (auth.uid() = reporter_id);
