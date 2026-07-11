# Plant Care App

## What this is
A mobile app for photographing plants, tracking their care schedules, and
sharing them socially with other users.

## Stack
- **Frontend:** Expo (React Native), TypeScript
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions)
- **AI:** Anthropic API (Claude vision) for plant identification and care
  suggestions from photos
- **Notifications:** expo-notifications (local first, Supabase Edge Function
  + push later for server-scheduled reminders)

## Conventions
- TypeScript everywhere, strict mode on
- Functional components + hooks, no class components
- File-based routing via `expo-router`
- Keep Supabase calls in a `lib/supabase/` folder behind typed functions —
  don't call `supabase.from(...)` directly inside components
- **Testing:** Jest + the `jest-expo` preset (`jest.config.js`). Tests are
  colocated as `*.test.ts` next to the file they cover. Coverage today is
  the `lib/` layer — pure logic (e.g. `care_tasks.ts`'s status/summary
  math) tested directly, and the Supabase call layer
  (`lib/supabase/*.ts`) tested with `./client` mocked via the shared
  `lib/supabase/testUtils/mockClient.ts` helper (asserts our query
  construction/error handling, not Supabase's own behavior). Screens
  aren't covered yet — see Backlog.
- One feature per branch, small commits with descriptive messages
- No direct pushes to `master` — every change goes through a feature branch
  and a pull request
- Delete the feature branch (local and remote) once its PR is merged and
  closed — merged branches don't linger
- Write a quick test or manual verification step for each feature before
  moving to the next one

## Data model (Supabase tables)
- `profiles` (id [= auth.users id], username [mandatory + unique, chosen
  at signup, changeable on a cooldown], username_changed_at,
  accepted_privacy_at [GDPR consent stamp], display_name, bio,
  avatar_url, created_at, plus three account-wide privacy columns from
  migration 0008: profile_visibility, follow_policy,
  progress_visibility — the fourth, comment_policy, moved to
  plant_progress as a per-report setting in migration 0012)
- `app_config` (key, value) — app-level settings readable by signed-in
  users, written only via migrations; currently
  `username_change_cooldown_days` and `privacy_policy_updated_at` (the
  policy's effective date, see Re-consent under GDPR)
- `plants` (id, owner_id, name, species, photo_urls[], location, acquired_at,
  created_at) — publicly readable (like every other social table below),
  write access owner-only
- `care_tasks` (id, plant_id, type [water/fertilize/repot], frequency_days,
  last_done, next_due)
- `plant_progress` (id, plant_id, user_id, height_cm, notes, photo_url,
  created_at, comment_policy [public/followers/disabled, per-report],
  shared_to_feed [boolean; false = unlisted, kept out of feeds but
  reachable by direct link and the future plant history]) — structured
  per-plant growth log entries ("progress reports"), not generic posts;
  `photo_url` is nullable until photo capture is built (see Backlog)
- `follows` (follower_id, followee_id, status [pending/accepted,
  server-computed from the target's follow_policy])
- `likes` (progress_id, user_id)
- `comments` (id, progress_id, user_id, content, created_at)

## Working style
- Work in small, verifiable steps. After scaffolding or adding a feature,
  run the app (`npx expo start`) and confirm it works before moving on.
- Always present a plan before editing files — explain the approach
  (what files change, what's added/removed, any schema or dependency
  impact) and get it confirmed before making changes, no matter the
  size of the change.
- Run `npm test` alongside `tsc --noEmit` before finishing or opening a
  PR for any feature — same habit already applied to type-checking, now
  covering test regressions too. CI (`.github/workflows/ci.yml`) runs
  both automatically on every push/PR as a backstop.
- Every new feature must add/extend `*.test.ts` coverage for any
  testable logic it introduces (`lib/` — pure logic and the Supabase
  call layer), not just retroactively — so coverage keeps pace with new
  code instead of drifting back out of date the moment the next feature
  ships.
- Don't install new dependencies without saying which one and why.
- Ask before making changes to the Supabase schema once it's been created —
  schema changes should be deliberate, not incidental to a feature.

## Backlog

### Product features
- Plant-sitting instructions — generate a shareable instructions file
  (per-plant care summary: watering schedule, light, notes) that a user can
  send to a friend/contact watching their plants while away. Now that
  progress-report logging is owner-only (see Plant list on user profiles
  below), this is also where a future delegated logging capability
  should live — letting a sitter log progress on a plant they don't own
  while it's explicitly shared with them, rather than reopening logging
  to everyone
- Plant nicknames — done. Owners can set a personal `nickname` on a
  plant (new nullable column on `plants`, no RLS change needed), separate
  from its common name (`plants.name`, e.g. "Pothos") and Latin species.
  Wherever a plant's name is shown, the nickname takes the primary slot
  (falling back to the common name if unset); the common name only shows
  as a secondary, smaller-font line when a nickname is actually set
  (never duplicated). Species stays exactly as it always has, unchanged.
  Two shared helpers in `lib/supabase/plants.ts` — `plantPrimaryName()`
  and `plantCommonNameSubtitle()` — drive this everywhere: Add Plant's
  new "Nickname (optional)" field, the plant profile screen's inline
  nickname editor (owner-only, same pattern as Acquired date), the
  Plants list and user-profile plant list rows, and the feed row /
  progress detail screen's "Logged progress on ..." sentence
- Social features — `plant_progress`, `follows`, `likes`, `comments`
  already have schema and RLS policies (see Data model above).
  Progress-report creation (`app/log-progress.tsx`), a Friends list with
  in-list search (`app/friends.tsx`), search for any user by name
  (`app/search-users.tsx`), follow/unfollow (on `app/user/[id].tsx`), a
  feed of progress reports from people you follow (`app/feed.tsx`), and
  likes/comments (inline on feed rows + `app/progress/[id].tsx`) are all
  built. Social features are now feature-complete against the original
  backlog scope.
- Account settings and configuration — scoped and split into slices.
  Slice 1 (change password) is done: `app/settings.tsx` (new screen,
  linked from a "Settings" link in `app/profile.tsx`'s header) lets a
  signed-in user change their password, re-authenticating with their
  current password first via `updatePasswordWithReauth()` in
  `lib/supabase/auth.ts` before calling `supabase.auth.updateUser()` —
  deliberate, since `updateUser()` alone never asks for the current
  password and would let anyone with an unlocked session change it with
  no verification. Sign out stays on Profile, unmoved.
  - Notification preferences — deferred. No notification system exists
    in the app yet (`expo-notifications` is only listed as future stack
    work); nothing for a toggle to control until that's built.
  - Account deletion — done (see the GDPR item below for the full
    slice). A `delete-account` Edge Function holds the service-role
    key and deletes only the authenticated caller; every user-owned
    table cascades from `auth.users`, so one delete erases the whole
    account. Confirming a deletion requires BOTH the current password
    and a one-time code emailed to the account address (password alone
    is not enough if credentials are compromised) — Settings' "Danger
    zone" drives the two-step flow behind an inline confirm.
    - OAuth-user deletion re-auth — done. `accountHasPassword()` in
      `lib/supabase/auth.ts` (via `getUserIdentities()`: password
      accounts have an `email` identity) drives Settings for
      passwordless (Google-only) accounts: the Change password form is
      replaced by a "You sign in with Google" note, and the Danger
      zone's password field becomes a "Type @username to confirm"
      input (deliberateness check; leading `@`/case/whitespace
      tolerated) — the emailed code stays the real security factor,
      verified by `confirmPasswordlessAccountDeletion()`. A fresh
      Google redirect was deliberately rejected as a second factor:
      it proves control of the same Google account the emailed code
      already proves. Linked accounts (Google + password) keep the
      password flow. Per user decision, no "set a password" option
      for OAuth users.
    - Owner dashboard TODO: the default Magic Link email template only
      contains a link — add `{{ .Token }}` to it (Auth → Email
      Templates → Magic Link) so real deletion emails carry the
      6-digit code. Pairs with the SMTP setup item under Real
      authentication.
- Usernames — done. Every profile has a mandatory, unique `username`
  (migration `0009_usernames.sql`): lowercase letters/digits/dot/
  underscore, starts with a letter, ends with a letter or digit, 3–20
  chars, separators never doubled or adjacent (`..`/`__`/`._`/`_.` all
  rejected) — enforced by a DB check constraint mirrored by
  `validateUsername()` in `lib/supabase/usernames.ts`. Chosen on the
  sign-up form (never inferred from email; availability pre-checked via
  a `security definer` RPC `username_available()` since the anon role
  can't read profiles) and editable on the Profile page behind an
  inline confirm, with a change cooldown (one change per N days, N in
  `app_config.username_change_cooldown_days` — currently 5, one source
  of truth) enforced by a `before update` trigger that also stamps
  `username_changed_at`; the first customization is always free.
  `handle_new_user()` falls back to a generated `user_<id-prefix>`
  username when signup metadata is missing/invalid/taken, so signup
  never fails over a username and future OAuth signups (no username
  field) keep working. Shown as `@username` under the display name on
  user profiles (visible in both public and private modes — it's
  identity, like display name), as a second line in Search Users rows,
  and User search matches username as well as display name. Also
  replaced every "No display name yet" fallback app-wide with
  `@username`.
- Add EU GDPR mandatory settings — done (first pass covering the three
  core rights; migration `0010_gdpr_consent.sql`). **Erasure**: account
  deletion, see Account settings above. **Portability**: Settings →
  "Your data" downloads everything the app stores about the user
  (account, plants, care schedules, progress reports, comments, likes,
  follows) as JSON via `collectMyData()` in `lib/supabase/gdpr.ts` —
  web-only download for now. **Transparency/consent**:
  `app/privacy-policy.tsx` is a plain-English draft policy (marked
  "requires review before public launch"), linked from sign-up and
  Settings; sign-up requires a consent checkbox and the acceptance time
  is stamped to `profiles.accepted_privacy_at` by `handle_new_user()`
  (3rd revision) via signup metadata.
  - Consent for pre-existing users — done via the welcome screen from
    the Google OAuth slice (`app/welcome.tsx`): any account with a null
    consent stamp is routed there once to review profile basics and
    accept the policy.
  - Re-consent on material policy changes — done (migration 0013).
    The policy has an effective date in
    `app_config.privacy_policy_updated_at`; consent counts only while
    `accepted_privacy_at` is on/after it (`isConsentCurrent()` in
    `lib/supabase/consent.ts`, fails open if the config row is
    missing so a hiccup can't lock everyone out). The root layout's
    gate routes stale-consent accounts to `app/welcome.tsx`, which now
    has a second, slim "Privacy Policy update" mode (checkbox +
    Accept, no profile fields) for accounts whose stamp exists but
    predates the policy; acceptance overwrites the stamp (no audit
    trail, per user decision). **Publishing a policy change** = one PR
    that updates the policy text in `app/privacy-policy.tsx` AND its
    hardcoded "Last updated" line (the screen is public/pre-auth, so
    it can't read app_config) AND ships a migration bumping
    `privacy_policy_updated_at` — every user is then re-prompted once
    on their next visit.
  - Native data export — the JSON download uses a web Blob + anchor;
    native needs `expo-file-system`/share-sheet wiring (fold into the
    photo-capture/native pass).
  - Legal review of the privacy policy draft before any public launch.
- Manage plant care tasks — done. The plant profile screen
  (`app/plant/[id].tsx`, owner-only) now has a Care tasks section: mark a
  task done (advances `last_done`/`next_due`), edit its frequency, delete
  it, and add a task for any of the three types (water/fertilize/repot)
  not yet present on that plant. `lib/supabase/care_tasks.ts` gained
  `markCareTaskDone`, `updateCareTaskFrequency`, `deleteCareTask`
  alongside the existing `createCareTask`; no schema/RLS change was
  needed since `care_tasks` already had owner-scoped INSERT/UPDATE/DELETE
  policies via the `plants.owner_id` join. Marking done on or before the
  due date always counts the new `next_due` from the moment marked done;
  marking an overdue task done prompts the owner to choose whether
  `next_due` should count from the original due date (task was actually
  done on time, just logged late) or from today (task was genuinely done
  late) — `markCareTaskDone`'s optional `nextDueAnchor` param drives this.
  - Update care task badges on the Plants screen — done as part of the
    above. Status pills update instantly from local state on mark-done
    (no refetch needed), and the Plants list picks up the change on
    return via its existing `useFocusEffect` refetch.
- Content visibility scoping — done. Settings gained a "Privacy"
  section with four account-wide controls, each a new `profiles` column
  enforced at the RLS level (not just client filtering):
  `profile_visibility` (private hides your plant list from
  non-followers; name/avatar/bio stay visible), `follow_policy`
  (`request` makes new follows land as pending requests — a `before
  insert` trigger on `follows` server-computes the new `status` column
  from the target's policy, so clients can't self-assign accepted),
  `progress_visibility` (private = followers only, closing the old
  fetch-any-report-by-id gap), and `comment_policy`
  (public/followers-only; the composer on `app/progress/[id].tsx` is
  hidden client-side too). Likes/comments SELECT + INSERT policies
  follow the parent report's visibility, `follows` rows are only
  visible to the two parties, and a reusable `security definer` helper
  `is_accepted_follower()` drives all follower checks (migration
  `0008_content_visibility.sql`). New follower-request flow:
  `app/follow-requests.tsx` (Accept/Decline, linked from a "Requests"
  header link on Friends), tri-state Follow/Requested/Unfollow button
  on `app/user/[id].tsx` (tapping Requested cancels), a "This account
  is private" state on private profiles, and a red-dot badge on the
  Plants screen's Friends link and the Friends screen's Requests link
  while requests are pending. Known coherent side effect: a *public*
  progress report by a *private* profile shows "Unknown plant" to
  non-followers, since the plant row itself is profile content.
  - Disable comments entirely — done, as part of the per-report
    comments slice (migration 0012): `comment_policy` moved from
    `profiles` to `plant_progress` (`public`/`followers`/`disabled`,
    chosen on Log Progress, default `public`, editable afterwards by
    the owner on the report's detail screen; the Settings Comments
    section was removed and the profiles column dropped). `disabled`
    blocks new comments for everyone including the owner AND hides
    existing ones (RLS-enforced) without deleting them — re-enabling
    restores them. The same slice added `shared_to_feed`: logging a
    report with "Don't share" keeps it out of every feed
    (`getFeed()` filters it) but it stays *unlisted*, not private —
    direct links work for anyone who could already see it, and the
    future plant-history section will list it.
  - Remove follower UI — the `follows_delete_by_followee` RLS policy
    already lets a user delete a follow row targeting them (that's how
    Decline works); no screen exposes removing an *accepted* follower
    yet.
  - Per-item visibility overrides — partially delivered since:
    comments and feed-sharing are now per-report (see Disable comments
    entirely above). Overriding a single report's *visibility*
    (public/followers) independent of the account-wide
    progress_visibility remains a future enhancement.
  - Review interactions between visibility settings — some settings
    depend on each other, so combinations can produce surprising (if
    coherent) results: e.g. a *public* progress report from a *private*
    profile shows "Unknown plant" to non-followers, because the plant
    row is hidden profile content even though the report itself is
    visible. Audit the setting combinations, decide the intended
    behavior for each, and apply the same review to any future
    visibility setting so similar cases are caught at design time.
- Plant profile screen — a per-plant detail view (`app/plant/[id].tsx`)
  is built: name/species/location, per-task care status pills, a Log
  Progress link, and the originally-scoped first job — editing
  `acquired_at` after the fact — all done.
  - Progress history/chrono — a timeline/graph of a plant's progress
    reports, on its profile screen. Further down the line. Must include
    unlisted (`shared_to_feed = false`) reports — that's the one place
    they surface besides direct links.
  - Adding a new photo — ties into the consolidated Photo capture item
    below; the plant profile screen is one of the places that'll need it
  - Replace a plant's photo from Log Progress — once photo capture
    exists, let a new photo taken while logging progress optionally
    become the plant's new main photo, not just attach to that report
- Plant list on user profiles — done. `app/user/[id].tsx` now fetches
  and lists that user's plants (via new `getPlantsForUser()` in
  `lib/supabase/plants.ts`), with the same status-pill treatment as the
  main Plants screen; tapping a row opens `/plant/[id]` read-only. While
  building this, found and fixed a real gap: `plant_progress`'s INSERT
  RLS policy only checked `auth.uid() = user_id`, letting any signed-in
  user log progress on *any* plant, not just their own. Progress logging
  is now owner-only — the policy also requires plant ownership, and
  `app/plant/[id].tsx`'s "Log progress" button is now gated behind its
  existing `isOwner` check (`app/index.tsx`'s own Log progress link was
  already implicitly owner-only, since that screen only ever lists the
  signed-in user's own plants). Delegated non-owner logging is deferred
  to Plant-sitting instructions above.
- Review feed behavior on multiple progress reports — audit how the feed
  reads when a plant has several reports (ordering, whether they should
  ever be grouped/collapsed under one plant); not a concrete feature yet
- Online demo (gated) — done and live at https://greenie-cwb.pages.dev.
  `.github/workflows/deploy.yml` exports the Expo web bundle
  (`app.json` `web.output: "single"`, SPA) and deploys it to Cloudflare
  Pages on every push to `master`; access is gated by Cloudflare Access
  (free ≤50 users): only allowlisted email addresses can load the site
  at all (one-time PIN by email). Owner setup (Cloudflare account, API
  token, GitHub secrets/variables, Access policy incl. adding the bare
  production domain alongside the wildcard) is complete and the gate is
  verified — unauthenticated requests 302 to the Access login; the
  post-merge pipeline ran green end-to-end. Full runbook in
  `docs/demo-hosting.md`, including the fonts gotcha: wrangler skips
  `node_modules` dirs, so `scripts/patch-dist-for-pages.js` rewrites
  Expo's font asset paths after export (a deploy that uploads ~4 files
  instead of ~45 means the patch didn't run). Inviting someone = adding
  their email to the Access policy. A future mobile release does NOT
  depend on this hosting (native builds talk straight to Supabase) —
  it's a demo vehicle that can later graduate to a production web app.
  - Custom domain — later, free on Cloudflare Pages.
  - Access seat count — the free Zero Trust plan covers 50 users;
    revisit if the invite list approaches that.
  - Store-required public pages — when a mobile release happens, the
    privacy-policy URL (and Google Play's required account-deletion
    web link) must be *publicly* reachable, i.e. carved out of the
    Access policy or hosted as a separate public project.

### Technical follow-ups
- Screen/component-level tests — unit testing (Jest + `jest-expo`) now
  covers the `lib/` layer (pure logic + Supabase call layer, see
  Conventions), but no screens under `app/` are tested yet. Deferred
  given the setup cost of mocking `expo-router`/`expo-font`/native
  modules for ~20 screens; CI already runs `npm test` so it'll pick up
  new component tests automatically once this is built, no workflow
  changes needed.
- Lazy-load feed items — `getFeed()` (`lib/supabase/plant_progress.ts`)
  fetches a flat `.limit(50)` with no pagination/infinite scroll; fine at
  current data volumes, worth revisiting once feeds get long
- Show email (or future username) for authors without a display name —
  done, resolved by the Usernames feature (see Product features):
  every former "No display name yet" fallback now shows `@username`
  instead (feed rows, comment previews, progress detail, friends list,
  follow requests, user search, user profiles)
- Photo capture — add-plant, the profile avatar, and progress reports have
  each separately deferred real photo capture so far (all currently show
  flat-color placeholders instead). One consolidated item: needs
  `expo-image-picker` (or `expo-camera`) plus a Supabase Storage bucket and
  upload wiring, picked once and reused everywhere a photo is needed,
  rather than each feature re-deciding it ad hoc
- Date picker UI — change all date-related inputs from plain text boxes
  to a real calendar/date picker component. Currently a plain
  `YYYY-MM-DD` text input on both `app/add-plant.tsx` and the acquired-date
  editor on `app/plant/[id].tsx`; apply to any future date field too, not
  just these two
- Dark mode — `lib/theme.ts` already has `palettes.dark` fully populated;
  just needs `useColorScheme()` wired up to switch which palette is active
  (deliberately deferred when the design system was first applied, to keep
  that change scoped to light mode only)
- Real authentication — email/password sign-up (`app/sign-up.tsx`),
  sign-in (`app/sign-in.tsx`), and sign-out (on `app/profile.tsx`) are
  built, replacing the old hardcoded dev-user auto-login. A
  `handle_new_user()` trigger on `auth.users` now auto-creates a blank
  `profiles` row for every new signup, so this is no longer a gap.
  "Confirm email" was temporarily disabled in the Supabase Auth dashboard
  during development (built-in email sender's rate limit is a couple
  sends/hour, too low to test signup repeatedly) — needs to be revisited
  before real users sign up, since a permanently-disabled confirmation
  step lets anyone sign up with an email they don't own.
  - Lookup free SMTP services — the built-in Supabase email sender's rate
    limit is too low for real usage. Research free/cheap SMTP providers
    (Resend, Postmark, SendGrid free tiers, etc.) usable via Supabase's
    custom SMTP setting.
  - Re-enable "Confirm email" in the Supabase Auth dashboard once a real
    SMTP provider is set up (see above) — it's off right now purely as a
    development workaround for the built-in sender's rate limit, and
    leaving it off lets anyone sign up with an email they don't own.
  - Google OAuth — done for web (the platform the app is developed,
    verified, and demoed on). "Continue with Google" on sign-in/sign-up
    uses `signInWithOAuth` (full-page redirect through Supabase to
    Google and back); `lib/supabase/client.ts` enables
    `detectSessionInUrl` on web only so the returning session is picked
    up. `handle_new_user()` (4th revision, migration
    `0011_oauth_display_name.sql`) seeds `display_name` from Google's
    `full_name` metadata. Owner runbook in `docs/google-oauth.md`
    (Google Cloud OAuth client + Supabase provider + redirect URL
    allowlist) — setup pending; until then the button bounces back with
    Supabase's "provider is not enabled" (verified wiring). Google
    sign-in with an email belonging to an existing account links up
    rather than duplicating (Supabase automatic identity linking;
    requires the existing email to be verified — always true while
    auto-confirm is on; see docs/google-oauth.md).
    - Native OAuth — needs `expo-web-browser`/`expo-auth-session` + a
      custom URL scheme; deferred until the app targets devices.
    - Other social providers (Apple etc.) — later.
    - OAuth-user deletion re-auth — done, see Account settings above.
    - Post-Google-signup review screen — done as `app/welcome.tsx`:
      shown once to any account with `accepted_privacy_at = null`
      (fresh OAuth signups AND accounts predating consent tracking —
      this also resolved the GDPR "consent for pre-existing users"
      item). Review display name, customize the generated username
      (cooldown-free first change), accept the privacy policy; the
      root layout gates all routes on it and the screen signals the
      layout via `lib/consentEvents.ts` to avoid a refetch race.
      Email is never editable; avatar stays out of scope until real
      photo upload exists.

### Later
- Payments / monetization
- Admin dashboard
- Multi-language support
- Revisit prompt design and other UX/UI improvements — a general pass
  over interaction patterns accumulated feature-by-feature (e.g. the
  inline two-tap confirm/prompt style used for delete and the overdue
  mark-done choice), not tied to one specific screen

## Environment
- Supabase URL and anon key go in `.env` (never commit this file)
- Anthropic API key goes in `.env` as well, used only from Supabase Edge
  Functions — never call the Claude API directly from the client with a
  bundled key
