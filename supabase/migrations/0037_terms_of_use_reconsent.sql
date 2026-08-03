-- Bumps the effective date app_config.privacy_policy_updated_at (the
-- same re-consent trigger migrations 0013 and 0034 already use) after
-- introducing a Terms of Use for the first time. app/sign-up.tsx and
-- app/welcome.tsx's single consent checkbox now covers both the
-- Privacy Policy and the new Terms of Use, and this is treated as a
-- material change to what's being agreed to -- every existing user is
-- re-prompted once on their next visit via app/welcome.tsx's
-- re-consent mode, per this project's own documented process (see
-- migration 0013's comment for the full mechanism).
update public.app_config
set value = '2026-08-03T00:00:00Z'
where key = 'privacy_policy_updated_at';
