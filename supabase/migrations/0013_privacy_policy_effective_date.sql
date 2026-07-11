-- The privacy policy's effective date, used by the client's consent
-- gate: consent counts only while profiles.accepted_privacy_at is on or
-- after this date, so bumping it re-prompts every user to read and
-- accept the policy once on their next visit.
--
-- Publishing a material policy change = one PR that updates the policy
-- text (app/privacy-policy.tsx, incl. its "Last updated" line) and adds
-- a migration bumping this value.
--
-- Seeded to the date the current policy text shipped (migration 0010,
-- 2026-07-09) -- earlier than every existing accepted_privacy_at, so
-- this migration itself re-prompts nobody.
insert into public.app_config (key, value)
values ('privacy_policy_updated_at', '2026-07-09T00:00:00Z');
