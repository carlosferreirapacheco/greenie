-- Bumps the privacy policy's effective date after a content-accuracy
-- pass on app/privacy-policy.tsx (paired with this migration in the
-- same PR): the "What Greenie stores"/"What leaves the app" sections
-- now disclose data categories and third-party flows that existed in
-- the product before this update but weren't previously described
-- (blocks, plant-sitting, notifications, content reports, supporter/
-- donation data, Google Sign-In, Buy Me a Coffee), and "Your rights"
-- erasure wording now matches the Storage cleanup fix shipped in the
-- same PR. Per this project's own documented process (see migration
-- 0013), bumping this value re-prompts every existing user to review
-- and accept the policy once on their next visit -- treated as a
-- material change here since users are being told about data
-- categories their original consent never covered.
update public.app_config
set value = '2026-08-01T00:00:00Z'
where key = 'privacy_policy_updated_at';
