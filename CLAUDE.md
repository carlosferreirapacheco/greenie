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
- Write a quick test or manual verification step for each feature before
  moving to the next one

## Data model (Supabase tables)
- `profiles` (id [= auth.users id], display_name, bio, avatar_url, created_at)
- `plants` (id, owner_id, name, species, photo_urls[], location, acquired_at,
  created_at) — publicly readable (like every other social table below),
  write access owner-only
- `care_tasks` (id, plant_id, type [water/fertilize/repot], frequency_days,
  last_done, next_due)
- `plant_progress` (id, plant_id, user_id, height_cm, notes, photo_url,
  created_at) — structured per-plant growth log entries ("progress
  reports"), not generic posts; `photo_url` is nullable until photo capture
  is built (see Backlog)
- `follows` (follower_id, followee_id)
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
  - Account deletion — deferred. Actually deleting a Supabase Auth user
    needs elevated (service-role) privileges the client never has —
    needs either a new Edge Function or a `security definer` Postgres
    function, plus thinking through the EU GDPR item below, not
    something to bolt on as a button.
- Add EU GDPR mandatory settings — not yet scoped in detail
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
  - Disable comments entirely — a third `comment_policy` option
    (`disabled`), deliberately left out of this slice's UI and column
    constraint per user decision. Needs deciding what happens to
    *existing* comments (hidden vs. kept visible) plus hiding the
    composer entirely, not just gating new posts.
  - Remove follower UI — the `follows_delete_by_followee` RLS policy
    already lets a user delete a follow row targeting them (that's how
    Decline works); no screen exposes removing an *accepted* follower
    yet.
  - Per-item visibility overrides — this slice is account-wide defaults
    only; overriding a single progress report's visibility independent
    of the account default is a future enhancement.
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
    reports, on its profile screen. Further down the line.
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
  comments and every other author display in the app fall back to "No
  display name yet" today. Showing email instead would need a schema
  change (`profiles` doesn't store email; `auth.users` email isn't
  readable for anyone but the signed-in user) — deferred rather than a
  partial schema change for one screen; revisit alongside real
  usernames/auth
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
  - Google OAuth (and other social providers later) — next slice.
    Needs external setup only the account owner can do first: a Google
    Cloud OAuth client (Web application type), and enabling + configuring
    the Google provider in the Supabase Auth dashboard with that client's
    ID/secret. Client side needs `expo-web-browser` (+ likely
    `expo-auth-session` for the redirect URI helper — confirm exact
    current Supabase-recommended approach from their docs before
    implementing, not from memory) and a custom URL scheme in `app.json`
    for the OAuth redirect to return to the app.
    - Post-Google-signup review screen — first sign-in via Google should
      let the user review/edit what Google auto-populated (display name)
      before landing in the app proper, same as any signup should be
      confirmable. Email is never editable. Avatar is deliberately out of
      scope here — handle it once real photo/image upload exists, not as
      a one-off raw-URL text field.

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
