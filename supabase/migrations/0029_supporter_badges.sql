-- Beta-tester recognition flag -- independent of total_donated, set
-- manually via SQL for now. No admin UI in this pass (same
-- "act with existing tools" precedent as the recent Report content/
-- users feature); a real backoffice toggle is a natural future item.
alter table public.profiles
  add column is_beta_tester boolean not null default false;

-- Per-badge-kind visibility (not one master switch): each badge kind
-- a user currently qualifies for gets its own opt-out, default true
-- matching every other notify_*-style toggle already on profiles. A
-- future 3rd badge kind adds one more column here, not a rework.
alter table public.profiles
  add column show_supporter_badge boolean not null default true;

alter table public.profiles
  add column show_beta_tester_badge boolean not null default true;
