# Plant Care App

## What this is
A mobile app for photographing plants, tracking their care schedules, and
sharing them socially with other users.

## Stack
- **Frontend:** Expo (React Native), TypeScript
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions)
- **AI:** Google Gemini API (`gemini-2.5-flash`) for plant lookup on Add
  Plant (`supabase/functions/lookup-plant`, `lib/supabase/ai.ts`) — a
  vision call identifies the plant from its (now-required) photo, with
  a text-only call retained for follow-up name-based lookups; see the
  Add Plant backlog item for the full flow
- **Notifications:** in-app inbox (a `notifications` table filled by
  DB triggers) + real OS push (pg_net webhook trigger → `send-push`
  Edge Function → Expo push service; care-task reminders ride the same
  pipeline via an hourly pg_cron scan) — see the Notifications backlog
  item; Android delivery needs the one-time FCM owner setup in
  `docs/push-notifications.md`

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
  progress_visibility — a fourth, comment_policy, moved to
  plant_progress as a per-report setting in migration 0012 — plus
  plant_sitter_attribution [allowed/disabled, migration 0015, see
  Plant-sitting below])
- `app_config` (key, value) — app-level settings readable by signed-in
  users, written only via migrations; currently
  `username_change_cooldown_days` and `privacy_policy_updated_at` (the
  policy's effective date, see Re-consent under GDPR)
- `plants` (id, owner_id, name, species, photo_urls[], location, acquired_at,
  created_at, nickname [migration 0007, optional, takes the primary
  display slot over name when set]) — publicly readable (like every
  other social table below), write access owner-only
- `care_tasks` (id, plant_id, type [water/fertilize/repot], frequency_days,
  last_done, next_due)
- `plant_progress` (id, plant_id, user_id, height_cm, notes, photo_url,
  created_at, comment_policy [public/followers/disabled, per-report],
  shared_to_feed [boolean; false = unlisted, kept out of feeds but
  reachable by direct link and the plant's own Progress history]) —
  structured per-plant growth log entries ("progress reports"), not
  generic posts; `photo_url` stays nullable by design (an optional
  attachment, not a nullable-until-built placeholder)
- `follows` (follower_id, followee_id, status [pending/accepted,
  server-computed from the target's follow_policy])
- `likes` (progress_id, user_id)
- `comments` (id, progress_id, user_id, content, created_at)
- `blocks` (blocker_id, blocked_id, created_at) — only the blocker can
  read/write their own outgoing blocks; see the Block users backlog
  item for the asymmetric-identity/symmetric-content RLS design
- `plant_sitting_assignments` (id, owner_id, sitter_id, status
  [pending/accepted/declined/cancelled], starts_at, ends_at, created_at,
  responded_at, cancelled_at) — migration 0015, see Plant-sitting below
- `notifications` (id, recipient_id, actor_id, type [comment/like/
  follow_request/new_follower/follow_accepted/sitting_request/
  sitting_accepted/sitting_declined], progress_id [nullable, set for
  comment/like], read_at, created_at) — migration 0019; recipient-only
  SELECT/UPDATE, no client INSERT (rows are created exclusively by
  security definer triggers, each gated on one of seven
  `profiles.notify_*` boolean columns added in the same migration —
  see the Notifications backlog item)

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
- Plant-sitting — split into two slices. **Share care instructions
  (non-app users) — done** (separate PR #47). `lib/careInstructions.ts`'s
  pure `buildCareInstructionsText()` compiles every one of the signed-in
  user's plants (name/species/location) and their care tasks
  (type/frequency/next-due, human-formatted) into one plain-text block; a
  "Share" link in the Plants screen header (`app/index.tsx`, next to
  "+ Add") gathers plants + `getCareTasksForPlants()` (both pre-existing)
  and hands the text to React Native's built-in `Share.share()` — no new
  dependency, no schema impact. Verified on web (button renders, click
  gathers plants/tasks and calls `Share.share()`, which correctly
  reports "not supported in this browser" there, caught by the
  existing error-banner pattern); real-device verification that the
  native Android share sheet actually opens is also done — see
  Technical follow-ups.
  **In-app delegated plant-sitting (mutual follows) — done.** Migration
  `0015_plant_sitting.sql`: new `plant_sitting_assignments` table
  (`owner_id`, `sitter_id`, `status` [pending/accepted/declined/cancelled],
  optional `starts_at`/`ends_at` window, a partial unique index enforcing
  at most one live request per pair) with RLS requiring **mutual** accepted
  follows to create a request (`is_accepted_follower()` from migration
  0008, reused in both directions — no new helper needed) and separate
  UPDATE policies for the sitter's accept/decline and the owner's
  cancel-anytime. New `is_active_plant_sitter(owner, sitter)` helper
  (mirrors `is_accepted_follower()`/`is_blocked()`'s pattern) drives two
  new `care_tasks` policies letting an active sitter view **and mark
  tasks done** (the broader UPDATE grant is intentional, matching
  `plant_progress_update_own`'s precedent — the UI, not RLS, is what
  actually hides Edit/Delete/+Add task from a sitter on
  `app/plant/[id].tsx`) and a `plant_progress_insert_own` extension
  letting a sitter log a report on the owner's plant. `plant_progress_select_visible`
  gained an explicit, unconditional "the plant's owner can always see
  reports on their own plant" clause, more robust than relying on the
  mutual-follow prerequisite making that true implicitly. A new
  `cancel_sitting_on_unfollow` trigger (`after delete on follows`)
  immediately cancels any live assignment the moment mutual-follow breaks
  for **any** reason — unfollow, follower removal, a declined
  re-request, or a block (which already deletes the `follows` rows via
  migration 0014's `remove_follows_on_block`) — one trigger point covers
  every path since they all end in a `follows` deletion; verified live
  that a sitter loses `care_tasks` access the instant the underlying
  follow is removed. New account-wide `profiles.plant_sitter_attribution`
  column (`allowed`/`disabled`, matches the other three privacy columns'
  shape, defaults to the open position like the rest) drives a new
  Settings "Plant-sitters" toggle. **Corrected in a follow-up fix**: it
  originally shipped documented as controlling whether a sitter's
  shared report credits the owner by name, but nothing ever actually
  read the column — the credit sentence always rendered and the toggle
  had no effect. Redefined instead of wiring up the original spec: it
  now gates whether a sitter's report on the owner's plant can be
  shared to the sitter's own feed **at all** — `disabled` forces the
  report to stay unlisted (reachable only via the plant's own history
  or a direct link, same as any other unlisted report), enforced at
  the RLS layer via a new `can_share_progress_to_feed()` helper
  (migration `0016_plant_sitter_share_gate.sql`) added to both
  `plant_progress_insert_own`'s and `plant_progress_update_own`'s
  `with check` (the update policy needed an explicit `with check` for
  the first time, since a sitter could otherwise log unlisted then
  flip `shared_to_feed` on afterward via
  `updateProgressReportSettings()`, bypassing the insert-time gate).
  The owner's own reports on their own plants are never restricted by
  their own setting. `FeedItem` gained `plant_owner_share_allowed`
  (from a `hydrateReports()` owner-profile fetch that's now
  unconditional rather than skipped when author === owner, since it
  needs to read the *owner's* attribution setting specifically — a
  distinction that matters exactly in the sitter case this field
  exists for); `app/log-progress.tsx` and `app/progress/[id].tsx` both
  replace the Feed sharing control with a static explanatory line
  instead of letting a sitter pick an option the RLS layer will
  reject. Verified live: with the setting disabled, a sitter's Log
  Progress screen hides the Feed toggle and saves unlisted; flipping
  the owner's setting to allowed brings the toggle back and a shared
  report renders correctly with the existing "Logged progress on
  {Owner}'s {Plant}" credit line.
  New `lib/supabase/plant_sitting.ts` (request/accept/decline/cancel,
  `getMyActiveAssignmentOwnerIds()`, and the pure, tested
  `computeSittingAccessState()` state machine handling the
  pending/upcoming/active/ended distinction — an `accepted` assignment
  isn't necessarily currently active if a date window hasn't opened yet
  or has passed, with no scheduled job needed since both RLS and the UI
  just compare against `now()`). `follows.ts` gained `amIFollowedBy()`
  (the reverse of `getFollowStatus()`) and `getMutualFollowers()`
  (intersects `getFollowing()`/`getFollowers()` client-side). Requesting
  plant-sitting lives entirely inside the Plant Sitting flow, not on a
  target's profile: a "+ Request" header button on `app/plant-sitting.tsx`
  opens the new `app/select-sitter.tsx` (lists mutual followers, reusing
  `app/following.tsx`'s row pattern) which links to
  `app/request-sitting.tsx` (optional start/end dates, reusing the
  existing plain `YYYY-MM-DD` text-input pattern) — an earlier version
  put the request link on `app/user/[id].tsx` itself, which turned out
  too hard to discover (you had to already be on the right person's
  profile), so it moved into the Plant Sitting section; `amIFollowedBy()`
  stays in `follows.ts` as a general-purpose primitive even though
  nothing calls it from `user/[id].tsx` anymore. New `app/plant-sitting.tsx`
  hub (linked from the Plants header) has three sections: pending requests to
  respond to (single-tap Accept/Decline, matching
  `app/follow-requests.tsx`'s no-confirm pattern), assignments the
  signed-in user is sitting for (deep-links to the existing
  `app/user/[id].tsx` profile screen and its Plants list — no dedicated
  "sitting session" screen needed, since a mutual follower already has
  full RLS-granted visibility into that list), and sitters requested as
  an owner. That last section is itself split in two: "My sitters" (live
  only — `getMySitters()`, `status in ('pending','accepted')`, two-tap
  Cancel matching Remove follower/Block) and a read-only "Plant sitters
  history" below it (`getSittersHistory()`, `status in
  ('declined','cancelled')`, sorted desc by the pure `sittingSortKey()`
  — `starts_at` if set, else `created_at` — since Supabase's query
  builder can't express a `COALESCE`-based `order()`; no status label or
  actions, just the sitter's name linking to their profile and the
  period if any). An `accepted` assignment whose `ends_at` has simply
  passed without an explicit cancel stays in "My sitters" (shown as
  "Ended" via the existing `computeSittingAccessState`), not history —
  history is reserved for relationships explicitly closed by an action,
  not ones that merely lapsed. Both "My sitters" rows and history rows
  show the sitting period, if one was set, via a new pure
  `formatSittingPeriod(startsAt, endsAt)` (`null` when neither is set →
  no line rendered; otherwise `"{start} – {end}"` / `"From {start}"` /
  `"Until {end}"`, same `Intl.DateTimeFormat` short-date pattern as
  `app/feed.tsx`).
  `hydrateReports()` in `lib/supabase/plant_progress.ts` now also
  resolves each plant's owner (reusing already-known author info when
  author === owner, the common case) so `app/feed.tsx` and
  `app/progress/[id].tsx`'s "Logged progress on ..." sentence gains a
  conditional "{Owner}'s " prefix when a sitter logged the report —
  verified live end-to-end (mutual-follow gate rejects a one-directional
  follow with `42501`, `care_tasks`/`plant_progress` access opens only
  once `starts_at` arrives, the owner sees the sitter's report
  immediately, and the feed/detail screens render "Logged progress on
  Carlos Pacheco's Fiddle Leaf Fig" correctly).
  A sitter can accept or decline a pending request but — matching the
  literal spec ("cancelled by the original user") — can't back out of an
  accepted assignment; only the owner can cancel, at any time. Losing
  mutual-follow status after accepting does **not** retroactively hide
  reports the sitter already logged (those already went through the
  normal owner-always-visible/follower-visibility rules) — only future
  access is cut off.
- Plant nicknames — done. Owners can set a personal `nickname` on a
  plant (new nullable column on `plants`, migration `0007_plant_nickname.sql`,
  no RLS change needed), separate
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
  Progress-report creation (`app/log-progress.tsx`), a Following list
  with in-list search (`app/following.tsx`, `getFollowing()` in
  `lib/supabase/follows.ts` — renamed from Friends/`getFriends()` for
  consistency with the Followers screen and the concept they actually
  represent), search for any user by name
  (`app/search-users.tsx`), follow/unfollow (on `app/user/[id].tsx`), a
  feed of progress reports from people you follow (`app/feed.tsx`), and
  likes/comments (inline on feed rows + `app/progress/[id].tsx`) are all
  built. Social features are now feature-complete against the original
  backlog scope.
  - View who liked a report — done, client-only as expected (no
    schema/RLS change — `likes_select_visible` already scoped the
    right rows). `getLikersForProgress()` in `lib/supabase/likes.ts`
    mirrors `comments.ts`'s `hydrateAuthors` shape: fetch `likes` for
    the report, batch-hydrate `profiles`, and fall back to null
    fields for an unresolvable liker (block asymmetry — they blocked
    the viewer, so their own profile row is hidden even though the
    like itself is visible); the new `app/likes/[progressId].tsx`
    screen (modeled on `app/followers.tsx`, read-only) renders that
    list, falling back to "Someone" for the unresolvable case, same
    convention as the notifications inbox. Scoped to the detail
    screen only, not feed rows, mirroring the existing
    preview-on-feed / full-interaction-on-detail split comments
    already use. On `app/progress/[id].tsx` the like control, previously
    one `Pressable` wrapping both the heart and the count, is now two
    siblings: the heart/label toggle (unchanged behavior) and the
    count itself as its own link to the new screen — reusing the
    existing `(N)` text rather than adding new link copy. Verified
    live with two likers (one with a set display name, one falling
    back to `@username`): the list renders both, tapping a row opens
    the liker's profile, and the heart toggle still likes/unlikes
    without navigating anywhere.
- Account settings and configuration — scoped and split into slices.
  Slice 1 (change password) is done: `app/settings.tsx` (new screen,
  linked from a "Settings" link in `app/profile.tsx`'s header) lets a
  signed-in user change their password, re-authenticating with their
  current password first via `updatePasswordWithReauth()` in
  `lib/supabase/auth.ts` before calling `supabase.auth.updateUser()` —
  deliberate, since `updateUser()` alone never asks for the current
  password and would let anyone with an unlocked session change it with
  no verification. Sign out stays on Profile, unmoved.
  - Notifications — PR 1 of 2 done: the in-app inbox + per-kind
    settings toggles (migration `0019_notifications.sql`). A
    `notifications` table (see Data model) is filled exclusively by
    `security definer` triggers — no client INSERT policy exists —
    covering eight kinds: comment, like, follow_request, new_follower
    (public accounts), follow_accepted, sitting_request,
    sitting_accepted, sitting_declined. Each trigger skips
    self-actions and checks the recipient's per-kind
    `profiles.notify_*` boolean (seven columns, default true) *before
    inserting*, so a disabled kind is never created — not just hidden.
    An `after delete on likes` trigger removes the matching
    notification so like/unlike toggling doesn't leave stale entries.
    Deliberately no notification on a sitting `cancelled` (it can be a
    side effect of unfollow/block via `cancel_sitting_on_unfollow`,
    where notifying would be wrong). Blocks need no extra handling —
    a blocked user's comment/like/follow inserts are already rejected
    by RLS, so the triggers never fire. New
    `lib/supabase/notifications.ts` (`getNotifications()` with
    hydrateReports-style actor batch-hydration,
    `getUnreadNotificationCount()`, `markAllNotificationsRead()`);
    `profiles.ts` gained the `NotificationSettings` type +
    `updateNotificationSettings()`; the shared `mockClient` gained
    `is` chaining + an optional `count` on `QueryResult` for the
    head-count query. UI: an "Alerts" header link on `app/index.tsx`
    with the existing red-dot pattern (lit on unread, refetched on
    focus — header crowding on narrow screens noted for the "Revisit
    UX" item); `app/notifications.tsx` lists rows (actor avatar, a
    sentence per kind, short date, unread rows tinted sage; an
    unresolvable actor — block asymmetry — falls back to "Someone"),
    taps deep-link by kind (comment/like → the report,
    follow_request → Requests, new_follower/follow_accepted → the
    actor's profile, sitting_* → Plant Sitting), and opening the
    screen marks everything read after rendering the unread
    highlights, so they last for that visit. Settings gained a
    "Notifications" section (after Privacy, mirroring its
    ChipGroup-plus-save-button pattern) with seven On/Off rows, one
    per kind. `collectMyData()` (GDPR export) gained a
    `notifications` field. Verified: all trigger paths + pref
    suppression + unlike-cleanup via a rolled-back SQL transaction
    (10/10 cases), and live on web end-to-end (dot appears → inbox →
    tap-through → marked read → dot clears; Likes toggled Off in
    Settings really suppresses creation, then restored).
    **PR 2 — local care-task reminders — done.** New dependency
    **`expo-notifications`** (via `npx expo install`, plus its config
    plugin in `app.json` with the brand `color`; needed a fresh EAS
    build, same native-module lesson as expo-image-picker). Split on
    the `chart.ts`/`HeightChart.tsx` precedent: `lib/careReminders.ts`
    is pure and tested (`selectSchedulableTasks()` — future `next_due`
    only, since a past-dated trigger fires immediately and would spam
    every app open while something stays overdue; overdue tasks are
    already surfaced by the in-app pills — and
    `buildReminderContent()`, "Time to water Big Fred" via
    `plantPrimaryName()`), while `lib/careReminderScheduler.ts` is the
    untested native wrapper (every entry point no-ops on web):
    `get/setCareRemindersEnabled()` (AsyncStorage, device-local like
    the theme — deliberately not an account setting; **on by default**
    per user decision — an unset key counts as enabled, via the pure
    `parseStoredCareRemindersFlag()`; enabling from Settings requests
    notification permission first, and a denial — there or at the
    first-reschedule prompt below — persists the setting off so it
    doesn't spring back on),
    `rescheduleCareReminders()` (cancel-all-then-reschedule, one
    notification per future-due task, `data: { plantId }`; since the
    default is on, this is also where a fresh install's permission
    prompt appears — `getPermissionsAsync()` then a request if it can
    still ask, refusal persists the setting off instead of re-asking
    every focus),
    `configureCareReminderHandling()` (foreground banner behavior +
    the Android channel required on 8+), and
    `addCareReminderResponseListener()`. Wiring: `app/_layout.tsx`
    configures handling and routes a tapped reminder to
    `/plant/[id]`; `app/index.tsx`'s focus refetch hands its fresh
    plants + tasks to `rescheduleCareReminders()` fire-and-forget (so
    reminders track task edits whenever the home screen regains
    focus — accepted v1 cadence); Settings' Notifications section
    gained a "Care task reminders" On/Off row at the top (instant
    persist, no save button; enabling also fetches plants + tasks and
    schedules immediately; on web the toggle is replaced by a
    "reminders are available in the mobile app" hint).
    **PR 3 — real OS push (social kinds + care-task reminders) —
    done** (migration `0020_push_notifications.sql`). Architecture:
    every `notifications` insert → an `after insert`
    `push_notification_webhook` trigger → `pg_net` async POST → new
    `send-push` Edge Function (service role) → recipient's tokens in a
    new `push_tokens` table (token text pk — a device that switches
    accounts upserts and re-owns its row, which is why the UPDATE
    policy is `using (true) with check (auth.uid() = user_id)`; all
    other ops owner-only) → Expo push API, with `DeviceNotRegistered`
    tickets deleting their token rows. The trigger authenticates with
    a bearer secret read from Vault (`push_webhook_secret`) that
    `send-push` (deployed with JWT verification off) compares against
    its `PUSH_WEBHOOK_SECRET` function secret — the payload is only a
    notification id re-read server-side, so a spoofed call can at
    worst re-send, never fabricate; the trigger swallows every error
    (a push failure must never break the comment/like that caused it)
    and no-ops while the secret is missing. **Care-task reminders
    moved off PR 2's local on-device scheduling onto this pipeline**
    (per user decision): an hourly pg_cron job (`care-due-scan`)
    inserts a `care_due` notification (new kind; `actor_id` now
    nullable, new nullable `plant_id`/`care_task_type` columns) for
    each task whose `next_due` arrived within the last hour — fires
    once per due moment, no state; reminders now also appear in the
    in-app inbox ("Time to water Big Fred", plant-name hydration in
    `getNotifications()`), survive weeks of not opening the app, and
    trade exact-minute delivery for within-the-hour. The Settings
    care toggle became the 8th account-wide per-kind row
    (`profiles.notify_care_tasks`, works on web too); a device-local
    "Push notifications" master row (AsyncStorage `pushEnabled`,
    default on, permission-denial persists off — PR 2's pattern)
    replaced it, controlling only THIS device's token
    registration. **Invariant**: the push toggle affects delivery
    only, never creation — with push off, everything still lands in
    the in-app inbox; only a per-kind account toggle stops a
    notification from existing at all. `lib/careReminders.ts` +
    `lib/careReminderScheduler.ts` were deleted, replaced by
    `lib/pushNotifications.ts` (pure/tested: `parseStoredFlag`,
    `notificationTargetPath` — the shared inbox-tap + push-tap
    deep-link mapping, incl. a transition branch for pre-existing
    locally-scheduled reminders that carry only `{plantId}`),
    `lib/pushNotificationManager.ts` (native wrapper: register on app
    start with a session, unregister on sign-out and on toggle-off),
    and `lib/supabase/push_tokens.ts` (upsert/delete, mockClient
    gained `upsert`). `collectMyData()` exports `push_tokens`.
    Verified: rolled-back SQL (care-scan window/pref/one-shot cases +
    cron job registered), web pass (Settings hint + 8 toggles, inbox
    clean). **Owner setup complete and live end-to-end push
    verified** (see `docs/push-notifications.md` for the runbook):
    the Vault secret + matching `PUSH_WEBHOOK_SECRET` function
    secret, the Firebase/FCM V1 setup (`google-services.json` +
    app.json `googleServicesFile` + `eas credentials` service-account
    upload), and a fresh EAS build are all done. Confirmed live on a
    real Android device: a like from a second account produced a
    real push notification (`net._http_response`/function logs
    showed `{"sent":1,"removed":0}`) and tapping it opened the
    report.
    **Later**: notify active plant sitters of care_due too (scan is
    owner-only for now).
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
      for OAuth users. (Owner dashboard action needed for real deletion
      emails to carry a code — see Public launch / production
      readiness below.)
  - Change account email / link Google account — done. Built to unblock
    real-email SMTP testing: every seed/test account had a fake or
    placeholder email, so the account-deletion OTP (and any future
    email) had nowhere real to land. Settings gained an "Email & linked
    accounts" section (between Change password and Privacy) with two
    actions, both gated the same way: a "Send code to current email"
    step (new `requestCurrentEmailConfirmationCode()`/
    `verifyCurrentEmailConfirmationCode()` in `lib/supabase/auth.ts`,
    factored out of the existing account-deletion OTP mechanism via a
    shared internal `sendCurrentEmailOtp()` — same
    `signInWithOtp`/`verifyOtp` pair, no new DB table) must succeed
    before either the email change or the Google link proceeds — proof
    of mailbox control before a change that redirects account recovery.
    **Change email**: `changeAccountEmail()` calls
    `supabase.auth.updateUser({ email })`; in this project's current
    Auth config the change lands immediately (no separate new-email
    confirmation click needed — noted here since Supabase's own
    "Secure email change"/new-email-confirmation settings can make this
    behave differently, so a future config change could reintroduce a
    pending step). **Link Google account**: `linkGoogleAccount()`
    mirrors `signInWithGoogle()`'s web-only redirect shape but calls
    `supabase.auth.linkIdentity()` against the *current* session
    instead of starting a new sign-in, redirecting specifically back to
    `/settings` (not the plain origin `signInWithGoogle()` uses) so the
    sync step below has a screen to land on. Required a one-time owner
    action: Supabase's "Manual linking" setting (Authentication → Sign
    In / Providers) is off by default and must be enabled for
    `linkIdentity()` to work at all — discovered live when the first
    attempt failed with "Manual linking is disabled." Once linked, "the
    previous email is disregarded" is implemented by
    `completePendingGoogleLinkSync()`: a `localStorage` flag (web-only,
    matching the existing `detectSessionInUrl` pattern) set right
    before the redirect survives the full-page round-trip, and on
    return the Settings screen looks up the newly-linked Google
    identity's email and calls `changeAccountEmail()` with it,
    overwriting whatever the account's email was before — verified live
    end-to-end on the dev seed account (`dev-dummy-user@greenie.local`
    → linked to and now showing the real Gmail address). A temporary,
    explicitly-commented `DEV_TEST_ACCOUNT_EMAIL` carve-out let that one
    fake-email account skip the current-email-confirm step (impossible
    to satisfy against an address that doesn't exist) for this one-time
    bootstrap; it was deleted from both `auth.ts` and `settings.tsx`
    immediately after the link succeeded — no standing per-account
    exception shipped, both actions always require the confirm-code
    step now.
    - Linked-account email visibility — done, a follow-up fix.
      `changeAccountEmail()` only ever touches `auth.users.email`; it
      never touches the linked Google identity, so a manual "Change
      email" on an account with Google linked can silently drift the
      two apart (the identity keeps whatever email it had when linked;
      Google sign-in still resolves to the same account regardless,
      since Supabase matches identities by provider + provider user id,
      not by email — so this drift isn't a functional break, just an
      invisible one). Considered requiring an unlink before allowing a
      manual change instead, but rejected: there's no unlink flow yet,
      and a Google-only (passwordless) account can't unlink at all
      without first having a password to fall back to, which is out of
      scope per the existing "no set-a-password option for OAuth users"
      decision. Went with the cheaper fix — `isGoogleLinked()` replaced
      by `getLinkedGoogleEmail(): Promise<string | null>` (the linked
      identity's own email, not just a boolean), and the "Linked
      accounts" row now reads "Google account linked (<email>)" so any
      divergence from the primary email above it is visible at a
      glance instead of silent.
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
  never fails over a username, including OAuth signups (Google sign-in
  has no username field of its own). Shown as `@username` under the display name on
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
    on their next visit. (Native data export and legal review of the
    policy draft are tracked under Public launch / production
    readiness below.)
- Photo-based AI plant lookup on Add Plant — done. "Look up with AI"
  moved from a text-only lookup to primarily photo-driven
  identification: the photo field is now required (it becomes the
  plant's first photo either way), its label dropped "(optional)", and
  `canSave` gained a `photoUrl !== null` condition; the lookup button
  moved from under Name to under Photo and is now gated on the photo
  being set rather than the name. `supabase/functions/lookup-plant`
  gained a second input mode alongside the original `{query}` text
  path (kept exactly as-is, since every follow-up lookup below still
  reuses it): `{photoUrl, hint?}` fetches the image server-side
  (`fetch(photoUrl)` — the `photos` bucket is public) and sends it to
  Gemini as a multimodal `contents` call (`[{text}, {inlineData:
  {mimeType, data}}]`, base64-encoded via `encode()` from
  `npm:base64-arraybuffer`, the same package already used client-side
  in `lib/supabase/storage.ts` for the reverse operation), returning
  `{status: "found"|"ambiguous"|"not_found", name, species,
  wateringFrequencyDays, candidateNames}`. `lib/supabase/ai.ts` gained
  the matching `lookupPlantByPhoto()` alongside the untouched
  `lookupPlantInfo()`. On `app/add-plant.tsx`, tapping "Look up with
  AI" always sends the photo (+ whatever's in the optional Name field
  as a hint) to the vision path, then branches: name empty and a
  single match → fields fill directly (the original behavior); name
  filled and it matches the AI's name (trimmed, case-insensitive) →
  same; name filled but it *doesn't* match → a popup modal offers
  keeping the typed name (redoes the lookup as a **text-only** query
  via the unchanged `lookupPlantInfo`) or taking the AI's name/species
  filled straight from the vision result; `status: "ambiguous"` → a
  modal lists 2-5 candidate names (tapping one does the same
  text-only follow-up lookup) plus "Take a new picture" (clears the
  photo back to empty, ready to re-pick); `status: "not_found"` → a
  modal explains nothing was recognizable and offers "Take a new
  picture", the alternative being to just close the modal, type a
  common name in the still-present Name field, and press "Look up
  with AI" again (the hint is already wired through on every attempt,
  so a hint alone can turn a `not_found` into a `found` without any
  separate input). The modal itself reuses the exact conditionally-
  rendered `Modal` pattern from `components/DatePickerField.tsx`
  (`{prompt ? <Modal visible transparent ...>...</Modal> : null}` —
  React Native Web doesn't reliably unmount `Modal` content on
  `visible={false}` alone) rather than an inline panel, per explicit
  user preference to keep the form uncluttered. Verified live against
  the deployed function (direct authenticated calls, bypassing the
  UI): a real plant photo returns `status: "found"` with a sensible
  name/species/watering frequency; passing a hint measurably shifts
  the identification while the prompt still instructs the model to
  verify against the photo rather than blindly echo it back; the
  original `{query}` text path is unchanged and still works; a
  fetch-failure (bad photo URL) fails gracefully with a friendly
  error, matching the existing text path's error handling. The modal
  branches themselves (mismatch/ambiguous/not-found) are implemented
  and type-checked but **not** click-tested end-to-end in this pass —
  this environment's browser automation can't drive the native
  OS file-picker `Choose from Library` opens (the same pre-existing
  gap noted in the original Photo capture PR1 write-up below), so
  getting a photo into the Add Plant form for a live UI pass needs a
  manual web session or a real-device pass.
  - Review Add Plant screen — done, both loose ends. (1) The Nickname
    field's placeholder text ("e.g. Big Fred") was removed — it read
    as a suggested value rather than a format hint, and the "Nickname
    (optional)" label needs no example. (2) Add Plant gained an
    "Initial height (cm, optional)" field, placed after Acquired date,
    matching `app/log-progress.tsx`'s Height field's styling and its
    lack of extra validation. `plants` gained no height column —
    resolved the design question flagged when this item was first
    logged by reusing the existing `createProgressReport()`
    (`lib/supabase/plant_progress.ts`) with no schema or
    function-signature changes needed: `plant_progress.notes` was
    already nullable at the DB level (confirmed in migration
    `0003_progress_reports.sql` — the `caption` column it was renamed
    from was never `not null`), so passing `notes: ""` is fine and
    renders identically to no notes via the existing `{report.notes ?
    ... : null}` check on `app/plant/[id].tsx`. The row only needs to
    sort as the *earliest* progress report for its plant, which it
    always will be since it's inserted at plant-creation time before
    any other report can exist — no `created_at` backdating to
    `acquired_at` needed, since `computeChartPoints()` already spaces
    chart points evenly by index, not by real date. Marked unlisted
    (`shared_to_feed: false`, `comment_policy` forced to `disabled`
    via the existing `effectiveCommentPolicy()` helper, satisfying the
    `plant_progress_unlisted_implies_comments_disabled` CHECK) and
    `photo_url: null` — a data point, not a social post, so it stays
    out of every feed; it does still appear once in the plant's own
    Progress history (height badge + "Unlisted" tag, no notes line), a
    minor accepted side effect of reusing the reports table rather
    than a bespoke path. Only created when a value is actually typed;
    the call sits inside the same `try` block as `createPlant`/
    `createCareTask` in `handleSave()` (not a fire-and-forget
    try/catch like Log Progress's "set as plant's photo") since this
    is the only place the typed height is captured — a silent failure
    here would lose it with no fallback. Verified: the exact insert
    shape (`notes: ''`, `shared_to_feed: false`, `comment_policy:
    'disabled'`, `photo_url: null`) succeeds against the live schema
    and constraints via a rolled-back SQL transaction; the full save
    flow itself wasn't click-tested end-to-end in this pass for the
    same reason as the photo-lookup feature above — this environment's
    browser automation can't drive the native OS file-picker "Choose
    from Library" opens, and the photo field is required, so getting a
    photo into the form needs a manual web session or a real-device
    pass.
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
  section with three account-wide controls, each a new `profiles` column
  enforced at the RLS level (not just client filtering):
  `profile_visibility` (private hides your plant list from
  non-followers; name/avatar/bio stay visible), `follow_policy`
  (`request` makes new follows land as pending requests — a `before
  insert` trigger on `follows` server-computes the new `status` column
  from the target's policy, so clients can't self-assign accepted), and
  `progress_visibility` (private = followers only, closing the old
  fetch-any-report-by-id gap). A fourth control, `comment_policy`, shipped
  here too but moved off `profiles` onto `plant_progress` as a per-report
  setting in migration 0012 (see "Disable comments entirely" below) —
  the composer on `app/progress/[id].tsx` is hidden client-side when it
  resolves to disabled. Likes/comments SELECT + INSERT policies
  follow the parent report's visibility, `follows` rows are only
  visible to the two parties, and a reusable `security definer` helper
  `is_accepted_follower()` drives all follower checks (migration
  `0008_content_visibility.sql`). New follower-request flow:
  `app/follow-requests.tsx` (Accept/Decline, linked from a "Requests"
  header link on the Following screen), tri-state
  Follow/Requested/Unfollow button on `app/user/[id].tsx` (tapping
  Requested cancels), a "This account is private" state on private
  profiles, and a red-dot badge on the Plants screen's Following link
  and the Following screen's Requests link while requests are pending. Known coherent side effect: a *public*
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
    plant's own Progress history (see Plant profile screen below) lists
    it too, tagged "Unlisted".
  - Tie `comment_policy` to `shared_to_feed` — done, and unlisting
    made permanent along the way (migration
    `0018_couple_comment_policy_to_sharing.sql`). Two DB rules: a
    same-row CHECK constraint
    (`plant_progress_unlisted_implies_comments_disabled`, one-
    directional — `shared_to_feed or comment_policy = 'disabled'` —
    disabling comments on an otherwise-shared report stays perfectly
    legal) plus a `before update` trigger
    (`prevent_reshare_after_unlist`) rejecting any attempt to flip
    `shared_to_feed` from `false` back to `true`. Together these mean
    `comment_policy` is transitively locked to `disabled` forever too
    once a report is unlisted, with no separate one-way rule needed
    for it; no changes to the sitter-attribution RLS (migration 0016),
    an orthogonal gate. A new pure `effectiveCommentPolicy(sharedToFeed,
    commentPolicy)` helper in `lib/supabase/plant_progress.ts` is the
    single source of truth both screens funnel through before saving.
    The one-way lock only applies once a report is actually saved —
    on `app/log-progress.tsx`'s draft form the Feed chips stay
    toggleable in both directions the whole time you're composing
    (nothing's persisted yet, so there's nothing to lock), but the
    Comments chips track the Feed choice live: picking "Don't share"
    sets `commentPolicy` to `disabled` and disables the Comments
    group; toggling back to "Share to feed" re-enables picking a
    comment policy. `effectiveCommentPolicy()` at save time is the
    actual guarantee that the saved pair is consistent. `app/progress/[id].tsx`
    is different: everything there is already a saved report, so once
    an owner picks "Don't share" it's real and permanent — both the
    Feed and Comments chip groups freeze there (via a new optional
    `disabled` prop on `components/ChipGroup.tsx`) the moment
    `report.shared_to_feed` is false, `handleUpdateSettings()` computes
    the coupled value before persisting so a single tap locks both
    fields in one atomic update, and a new hint line explains the lock
    under Feed (this screen didn't have one before). Verified live
    end-to-end: the draft form's free bidirectional toggling before
    save, the persisted-report lock after, and both DB rules (a
    rolled-back transaction confirmed re-sharing and
    re-enabling comments on an unlisted row are both rejected). This
    closes out the specific pair called out in "Review interactions
    between visibility settings" below as a concrete, decided
    outcome — the general audit item itself stays open for other
    setting combinations.
  - Remove follower UI — done. `app/followers.tsx` (linked from a
    "Followers" header link on the Following screen) lists accepted
    followers via
    `getFollowers()` in `lib/supabase/follows.ts`; each row links to
    the follower's profile and has a Remove action behind the inline
    two-tap confirm, calling `removeFollower()` — the same
    `follows_delete_by_followee` RLS delete Decline uses (Decline now
    delegates to it). Removal is silent for the removed person; under
    a `request` policy they'd have to re-request.
  - Block users — done (migration `0014_block_users.sql`). New
    `blocks` table (`blocker_id`, `blocked_id`, RLS: only the blocker
    can see/manage their own outgoing blocks — the blocked party never
    gets row-level visibility into who's blocked them). Two helpers
    mirror `is_accepted_follower()`'s pattern: `blocked(blocker,
    blockee)` (raw single-direction check) and `is_blocked(a, b)`
    (symmetric, `blocked(a,b) or blocked(b,a)`). **Identity is
    asymmetric, content is symmetric** — a deliberate split: the
    blocked party can't see the blocker's profile at all
    (`profiles_select_visible` checks only `blocked(id, auth.uid())`),
    but the blocker *can* still see the blocked party's bare profile
    (needed to render the Blocked-users list and know who they're
    unblocking); plants, progress reports, comments, and likes are
    hidden **both ways** via `is_blocked()` added to
    `plants_select_visible`, `plant_progress_select_visible`,
    `comments_select_visible`/`comments_insert_allowed`,
    `likes_select_visible`/`likes_insert_visible`. A trigger
    (`remove_follows_on_block`) auto-deletes any `follows` row between
    the pair (either direction, any status) the moment a block is
    inserted, and `follows_insert_own`'s `with check` now rejects a
    new follow between a blocked pair — so `getFeed()`,
    `getFollowing()`, and `getFollowers()` all naturally exclude
    blocked accounts for free, no changes needed there. `care_tasks`
    untouched (already owner-only, never publicly visible).
    `getProfile()` now uses `maybeSingle()` + a friendly "This profile
    isn't available" error instead of a raw 0-row PostgREST error
    (covers a block OR a deleted account, deliberately indistinguishable);
    `followUser()` maps the RLS-rejection code (`42501`) to "You can't
    follow this account." — same privacy principle as not telling a
    declined follow requester why. UI: a "Block this account" link on
    `app/user/[id].tsx` (inline two-tap confirm, matching Remove
    follower/account deletion) flips to "You've blocked this account"
    + a single-tap Unblock button (no confirm — low-stakes, instantly
    reversible); `app/blocked-users.tsx` (new, linked from a "Blocked
    users" line in Settings' Privacy section) lists blocked accounts
    with single-tap Unblock. `collectMyData()` (GDPR export) gained a
    `blocks` field for the same completeness the export already
    commits to. Ties into "Review interactions between visibility
    settings" below — this is itself an application of that review
    (see the asymmetric/symmetric split above); re-check block
    interactions against any future visibility setting too.
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
  - Progress history/chrono — done. A "Progress" section on
    `app/plant/[id].tsx` (visible to any viewer the RLS lets see the
    reports, same as the care-status pills — not owner-only), backed
    by `getProgressReportsForPlant()` in `lib/supabase/plant_progress.ts`,
    which deliberately does **not** filter `shared_to_feed` — it relies
    purely on `plant_progress_select_visible` RLS, making this the one
    place unlisted reports surface besides a direct link. A timeline
    list (newest first, matching Feed's convention; each row taps
    through to `/progress/[id]`, shows a height badge when logged, and
    an "Unlisted" tag when `shared_to_feed` is false) plus a simple
    height-over-time line chart (`components/HeightChart.tsx`, shown
    once 2+ reports have a height logged) — the chart always reads
    chronologically oldest → newest left-to-right regardless of the
    list's newest-first order, a deliberate, separate convention for a
    trend-at-a-glance view. New dependency **`react-native-svg`**
    (installed via `npx expo install`) draws a hand-rolled polyline —
    no charting library. Points are spaced evenly by index, not
    date-proportionally (a deliberate simplification for a lightweight
    sparkline); the scaling math lives in `lib/chart.ts`
    (`computeChartPoints()`), kept pure and unit-tested separately from
    the presentational SVG component.
  - Adding a new photo — done, via the consolidated Photo capture item
    (Technical follow-ups below); the plant profile screen is
    owner-editable there.
  - Replace a plant's photo from Log Progress — done. Two owner-only
    entry points, both reusing the existing `updatePlantPhoto()`
    (`lib/supabase/plants.ts`) and `deletePhotoByUrl()`
    (`lib/supabase/storage.ts`) — no new lib functions needed.
    **From Log Progress** (`app/log-progress.tsx`): once a photo is
    picked, a `ChipGroup` ("Just this report" / "Also set as plant's
    photo") appears for the plant's owner, matching the screen's
    existing Comments/Feed chip pattern rather than a new checkbox
    component. On save, if set, the plant-photo update runs after
    `createProgressReport()` succeeds, wrapped in its own try/catch
    that fails silently on error (matching this screen's existing
    non-critical-fetch precedent) — the report itself already saved,
    and the owner can always set the plant photo manually from its
    profile if this secondary step fails. **From the plant's Progress
    history** (`app/progress/[id].tsx`): a new `isPlantOwner` check
    (`report.plant_owner_id === currentUserId`, distinct from the
    existing report-authorship `isOwner` that gates the Comments/Feed
    settings block) drives a "Set as plant's photo" text link under
    the report's photo, shown only when that photo isn't already the
    plant's current one. This comparison is powered by a new
    `plant_photo_url` field added to `FeedItem`
    (`lib/supabase/plant_progress.ts`'s `hydrateReports()`, riding
    along on the plants query it already runs — no extra fetch) and
    updated locally once the action succeeds, so the link disappears
    immediately rather than needing a refetch. Unlike the Log Progress
    entry point, this one surfaces errors visibly (its own
    saving/error state, matching `photoSaveError` on the plant profile
    screen) since it's a standalone action, not bundled into a larger
    save flow. Accepted edge case: if a plant is later deleted,
    `plant_owner_id` falls back to the report's author (existing
    `hydrateReports()` behavior), which could show the link to a
    non-owner in that narrow case — not guarded client-side, since the
    `plants` UPDATE RLS policy is already owner-only and a stray click
    just fails safely into the visible error state.
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
  signed-in user's own plants). Delegated non-owner logging is now live
  via the Plant-sitting feature above — a sitter with an active,
  accepted assignment can log progress reports on the owner's plants.
- Review feed behavior on multiple progress reports — audit how the feed
  reads when a plant has several reports (ordering, whether they should
  ever be grouped/collapsed under one plant); not a concrete feature yet
- UI/UX revamp — persistent tab bar + icon navigation, replacing the
  text-link header navigation that had accumulated feature-by-feature
  and no longer fit a mobile screen (the concrete first chunk of the
  general "Revisit prompt design / UX" item under Later). Design norms
  are documented in the Greenie — Design System artifact and decided
  with the user: four bottom tabs (Plants / Feed / Sitting / Alerts —
  Following moved off the main nav; Profile stays as the avatar thumb
  top-left, not a tab), icon + small-label treatment for both tab
  items and header actions, `+ Add` as a Plants header icon (no center
  FAB), icons from **`@expo/vector-icons`** (new dependency, pure
  JS + fonts — no EAS rebuild needed; MaterialCommunityIcons family
  throughout), and Share (care instructions) moved from Plants to the
  Sitting screen where it belongs. Delivery is per-screen:
  - **PR 1 — foundation + the four tab screens — done.** New
    `app/(tabs)/` route group (`index`/`feed`/`plant-sitting`/
    `notifications` moved in; group segments don't appear in URLs so
    every route and `notificationTargetPath()` deep link kept working
    unchanged) with `app/(tabs)/_layout.tsx` as the Tabs navigator:
    tab bar styled per the design system (icon + 10px label, moss
    active / ink-soft inactive, paper background, hairline top
    border), centered serif titles, a shared 28px avatar-thumb
    headerLeft → `/profile` on every tab, and an Alerts tab badge dot
    via `tabBarBadge`. The root Stack hides its own header for the
    `(tabs)` route (double-header otherwise). Header/badge state
    (avatar, unread count, pending follow requests) lives in the tabs
    layout, refetched via a **navigation `state`-event listener** —
    `useSegments()` was tried first and verified NOT to re-render the
    layout on tab changes, while the root navigation's state event
    fires on tab switches AND stack push/pops (the state tree includes
    nested navigators), matching the old per-screen focus refetch.
    New shared `components/HeaderIconButton.tsx` (icon + ~9px label
    below, optional badge dot / busy spinner) is the header-action
    norm. Per screen: Plants keeps only the `plus` Add action (the
    five old text links replaced by the tab bar); Feed gained
    `account-group-outline` People → `/following` carrying the
    pending-requests dot; Sitting gained `account-plus-outline`
    Request plus the relocated `share-variant` Share (handler, busy
    state, and error banner moved from `app/index.tsx`; fetches
    plants/tasks on demand and reports "no plants" as a friendly
    error; headerRight set from the screen via `navigation.setOptions`
    since Share's busy state lives there); Alerts has no header action
    (its dot moved to the tab icon). Verified live on web: tabs
    persist state across switches, pushed screens cover the bar and
    return correctly, deep links land on the right tab, Share fires
    from Sitting (web's "not supported" banner path), the Alerts badge
    lights on an unread fixture and fades after the inbox visit marks
    it read, no horizontal overflow at 375px, no console errors.
  - **PR 2 — remaining header conversions — not started.** Following
    (`app/following.tsx`): Requests (badge) / Followers / Search text
    links → `HeaderIconButton`s (`account-clock-outline` /
    `account-multiple-outline` / `magnify`). Profile
    (`app/profile.tsx`): Settings link → `cog-outline` icon action.
    No other screen defines header actions (verified); in-body text
    links stay with the general UX-pass item under Later.
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
  - Custom domain — later, free on Cloudflare Pages. A domain is now
    owned (`greenie-app.com`, registered for the SMTP setup below —
    see "Confirm email + real SMTP delivery" under Public launch /
    production readiness) and could point here later, but wiring it up
    is still unstarted.
  - Access seat count — the free Zero Trust plan covers 50 users;
    revisit if the invite list approaches that.
  - (Store-required public pages for a mobile release are tracked
    under Public launch / production readiness below.)

### Technical follow-ups
- Real device deployment (Android) — done. First-ever real-device pass,
  via an **EAS development build** (not Expo Go — Expo Go's Play Store
  build hadn't caught up to this project's SDK 57 yet when tried, a
  store-review timing gap, not a real incompatibility). New `eas.json`
  (`development` profile: `developmentClient: true`, `distribution:
  "internal"`, Android `buildType: "apk"` for a directly-installable
  file, `cli.appVersionSource: "remote"` to avoid an interactive
  first-run prompt), `app.json` gained `android.package:
  "com.hederahelix.greenie"` plus (from `eas init`, run once
  interactively — EAS build tokens are treated as restricted "robot
  users" that can't create a new project) `extra.eas.projectId` and
  `owner`. New dependency **`expo-dev-client`** (`npx expo install`).
  New `.easignore` (mirrors `.gitignore` — EAS's uploader replaces
  `.gitignore` entirely rather than extending it — plus excludes
  `.claude/`/`.agents/`, which broke the upload with an `EPERM` on a
  symlink Windows won't recreate). Auth: `eas-cli` runs non-interactively
  via an `EXPO_TOKEN` personal access token in `.env` (same pattern as
  every other secret already there, e.g. `SUPABASE_SECRET_KEY`) —
  `eas login` was deliberately never used, keeping the account password
  itself out of any tool's hands. Once installed, `npx expo start
  --dev-client` (not `--web`) serves the same Metro bundler the
  installed app connects to over LAN, the same as Expo Go would have.
  This device is also what verified native Google OAuth (see Real
  authentication below) and closes out native-share/dark-mode-status-bar
  verification (both below) — a real device was the point of doing this
  at all, not a Play Store release, which remains out of scope.
- Real-device verification of native share — done, verified live on
  the Android EAS development build above: "Share care instructions"
  (see Plant-sitting above) opens the real Android share sheet with
  correctly formatted, readable text — previously only verified on web,
  where the browser reports "not supported" instead.
- External testing distribution (Android) — done. Independent testers
  need a way to install the app that doesn't depend on Carlos's own
  machine or a live Metro/dev-client session, unlike the `development`
  profile above. New `eas.json` **`preview`** profile (`distribution:
  "internal"`, Android `buildType: "apk"`, deliberately **no**
  `developmentClient: true`) produces a standalone binary with the JS
  bundle embedded at build time — installed testers need no dev-server
  connection at all. No `expo-updates` is installed in this project, so
  there's no OTA channel; a new version means a new
  `eas build --platform android --profile preview` run and a re-shared
  install link, which is fine at this scale. **Gotcha worth
  remembering**: the first `preview` build compiled fine but crashed
  immediately on open, because `lib/supabase/client.ts` throws at
  import time if `EXPO_PUBLIC_SUPABASE_URL`/
  `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are missing — and unlike the
  `development` profile (a shell that loads JS live from a local Metro
  server, which reads `.env` locally), a `preview` build bundles the JS
  **in the cloud** during the EAS build itself, where `.env` isn't
  present (`.easignore` deliberately excludes it, mirroring
  `.gitignore`, so secrets never leave the machine as a plaintext
  project file). Fixed by registering both vars as EAS **project
  environment variables** scoped to the `preview` environment
  (`eas env:create --environment preview --scope project --name <NAME>
  --value <VALUE> --visibility plaintext --non-interactive`) — safe to
  store there since `EXPO_PUBLIC_*` vars end up in the client bundle
  regardless, and the "publishable key" is Supabase's anon key,
  meant to be public and RLS-protected. Applies to any future
  standalone (non-dev-client) build profile, not just this one. Before
  the first build, the dev/test accounts' plant/progress content was
  wiped via a transaction through the Supabase MCP `execute_sql` tool
  (plants, care tasks, progress reports, likes, comments,
  notifications) plus a Storage API bulk-delete for their orphaned
  photo objects (direct SQL `DELETE` against `storage.objects` is
  blocked by Supabase's own `protect_delete()` trigger — has to go
  through the Storage REST API, authenticated with
  `SUPABASE_SECRET_KEY`) — so Carlos's own account starts clean for
  real plants rather than dev fixtures. One unrelated account (`babel`,
  a real email, not a `dev-dummy-user-N@greenie.local` fixture) was
  confirmed to have zero overlap with the wiped accounts and was
  deliberately left untouched. New `docs/tester-guide.md` (install
  instructions, sign-up guidance, and the two honest caveats: one
  shared backend so content is visible to other testers per normal
  privacy rules, and the Gemini AI-lookup key being shared across every
  tester). Google sign-in still works for testers but the OAuth consent
  screen is in Testing publish status (see `docs/google-oauth.md`),
  capping it to manually-added test users — the tester guide defaults
  people to email/password signup instead of chasing that down.
  Finishing real email delivery (Confirm email + Resend SMTP) so
  testers' signup/reset/deletion emails actually arrive is tracked
  separately — see `docs/email-smtp-setup.md` and the "Public launch /
  production readiness" checklist below, which stays open until Carlos
  has run through and verified it live (owner-only dashboard steps,
  can't be done from this repo).
- Screen/component-level tests — unit testing (Jest + `jest-expo`) now
  covers the `lib/` layer (pure logic + Supabase call layer, see
  Conventions), but no screens under `app/` are tested yet. Deferred
  given the setup cost of mocking `expo-router`/`expo-font`/native
  modules for ~20 screens; CI already runs `npm test` so it'll pick up
  new component tests automatically once this is built, no workflow
  changes needed.
- Lazy-load feed items — done. `getFeed()` (`lib/supabase/plant_progress.ts`)
  switched from a flat `.limit(50)` to cursor-based (keyset) pagination on
  `created_at`, 20 rows per page — deliberately not offset/`.range()`,
  which shifts under a feed that's actively being appended to (a followed
  account posting mid-scroll skews every later page's offset); keyset
  pagination anchors each page to the last row actually seen instead of a
  position in a moving set. New signature: `getFeed(options?: { before?:
  string }): Promise<{ items: FeedItem[]; nextCursor: string | null }>` —
  a full page (20 rows) yields the last row's `created_at` as the next
  cursor, a short page yields `null` (accepted edge case: an exact-20
  remainder looks like "more" until the following fetch comes back empty,
  one harmless extra round-trip). `hydrateReports()` itself untouched.
  `lib/supabase/testUtils/mockClient.ts`'s shared `CHAIN_METHODS` gained
  `lt` (additive, used by every test file). `app/(tabs)/feed.tsx`: focus
  refetch (`useFocusEffect`) stays a full reset of `items`/`nextCursor`,
  not an append — revisiting the tab is a fresh look at current state, not
  a resume; a new `fetchMore()` (guarded by the same in-flight `useRef`
  pattern the like-toggle already uses) calls `getFeed({ before:
  nextCursor })` and appends, wired to `FlatList`'s `onEndReached`
  (`onEndReachedThreshold={0.5}`) with a `ListFooterComponent` spinner
  while loading; a failed background page fetch leaves `nextCursor`
  alone so scrolling back down retries, rather than inventing footer
  error UI for a low-stakes fetch. Verified: `tsc --noEmit` + `npm test`
  (6 `getFeed` cases incl. cursor-passed/full-page/short-page), and live
  against the real backend — seeded 25 shared reports, confirmed the
  first page loads 20, and (since this environment's browser automation
  can't reliably drive React Native Web's virtualized `FlatList` scroll
  internals via synthetic scroll events — confirmed via React Fiber
  inspection that the real `onScroll` handler fires but `onEndReached`'s
  own content-size tracking doesn't update from a synthetic event)
  called the component's own `fetchMore` directly via its React Fiber
  hook state: `items` went 20 → 25 and `nextCursor` correctly resolved
  to `null` on the short second page, proving the fetch-append-cursor
  logic end-to-end against live Supabase data, not just mocks. All
  seeded test data (reports, test plant, follow row, throwaway auth
  account) deleted afterward.
- Show email (or future username) for authors without a display name —
  done, resolved by the Usernames feature (see Product features):
  every former "No display name yet" fallback now shows `@username`
  instead (feed rows, comment previews, progress detail, following
  list, follow requests, user search, user profiles)
- Photo capture — PR 1 of 2 done: capture + display for the three
  backlog-named surfaces (Add Plant, profile avatar, Log Progress) plus
  everywhere those specific photos are immediately visible. One shared
  public Storage bucket (`photos`, migration `0017_photo_storage.sql`),
  not three — path convention `<uploader_auth_uid>/<context>/<filename>`
  (`context` = `plants`/`avatars`/`progress`) lets one RLS policy set
  (select-all, insert/update/delete scoped to
  `(storage.foldername(name))[1] = auth.uid()::text`) cover every
  context; keying by the *uploader's* id (not e.g. a plant's owner)
  matters once a sitter uploads a progress photo on someone else's
  plant. Verified live via direct SQL: an insert with a mismatched
  folder prefix is rejected with `42501`, a matching one succeeds.
  New `lib/supabase/storage.ts`: `pickImage(source)` wraps
  `expo-image-picker`'s permission request +
  `launchCameraAsync`/`launchImageLibraryAsync` (`base64: true` avoids
  needing `expo-file-system` at all — the deprecated legacy
  `readAsStringAsync` API some older docs still show), returning
  `{base64, fileExtension} | null` (`null` on cancel/denied permission,
  matching this app's established "backing out isn't an error"
  convention); `uploadPhoto()` decodes via **`base64-arraybuffer`**
  (new dependency, `decode()` only) and calls Supabase Storage's
  `upload()`/`getPublicUrl()`; `deletePhotoByUrl()` parses the storage
  path back out of a public URL and calls `.remove()`, invoked by every
  "replace photo" flow right after a successful re-upload so repeated
  edits don't leak storage objects. **Known, accepted gap**: deleting a
  plant/report/account doesn't cascade-delete its Storage objects
  (Postgres FK cascades don't reach `storage.objects`) — orphaned
  objects are left behind; a cleanup job is separate future work, not
  blocking this PR. New shared display component
  `components/PhotoThumb.tsx` (`uri`/`size`/`radius` props; renders the
  photo or the same flat-color placeholder every screen already used)
  and capture component `components/PhotoPicker.tsx` (current photo +
  explicit "Take Photo"/"Choose from Library" text links, not one
  button with an OS action sheet — deliberate, since this app is tested
  primarily on web where `Alert.alert` is a no-op and camera capture
  isn't available; inline spinner + error text while uploading).
  Capture wired into `app/add-plant.tsx` (single-photo v1 into
  `plants.photo_urls`, the array column staying available for a future
  gallery), `app/plant/[id].tsx` (owner-only, replaces the old photo on
  change), `app/profile.tsx` (own avatar — replaced the old
  initial-letter placeholder with the same flat-color `PhotoThumb`
  fallback used everywhere else, a deliberate simplification), and
  `app/log-progress.tsx` (optional report photo). Display wired into
  `app/index.tsx`/`app/user/[id].tsx`'s plant rows,
  `app/user/[id].tsx`'s viewed avatar, `app/feed.tsx`'s author avatar,
  and `app/progress/[id].tsx`'s report photo + author avatar —
  `lib/supabase/plant_progress.ts`'s `AuthorInfo`/`FeedItem` gained
  `avatar_url`/`author_avatar_url`, populated in `hydrateReports()` the
  same way `author_display_name` already is.
  Verified live on web (signed in as the `dev-dummy-user-2@greenie.local`
  "Sammy" test account — the original `dev-dummy-user@greenie.local`
  account's email was changed to a real Gmail address by the earlier
  "Change account email / link Google account" feature, so its `.env`
  password no longer resolves to any account): every touched screen
  (Add Plant, Plants list, plant profile, own Profile, Feed, progress
  detail) renders cleanly with no console errors. Actual file-selection
  through "Choose from Library" wasn't completable in this pass — the
  browser automation used for verification can't drive the native OS
  file-picker dialog the web `<input type="file">` opens; that upload
  path is covered instead by `lib/supabase/storage.test.ts`'s mocked
  call-layer tests plus the live RLS proof above.
  - **Real-device pass (Take Photo) — done, with three real bugs found
    and fixed along the way.** `expo-image-picker` had been installed
    (PR 1) but never added to `app.json`'s `plugins` array, and — more
    importantly — the Android app already on the test device had been
    built via EAS *before* `expo-image-picker` was ever installed.
    Since this project uses Expo's managed workflow (no `/android` or
    `/ios` directories), that native module simply didn't exist in the
    installed APK; every screen touching `PhotoPicker` errored. Fixed
    by adding the plugin config (`photosPermission`/`cameraPermission`
    strings, `microphonePermission: false` since this app never records
    audio) and triggering a fresh `eas build --platform android
    --profile development`. Two more bugs surfaced once that unblocked
    real testing: `pickImage()` (`lib/supabase/storage.ts`) called the
    picker with `allowsEditing: true`, which forces Android's native
    crop screen after every capture/selection with no "use as-is"
    affirmative action — only "Crop", which a user has to invoke
    manually even to skip cropping — fixed by turning `allowsEditing`
    off entirely; and `app/index.tsx`'s `headerLeft` (the Plants
    screen's nav-bar avatar) was never wired to `PhotoThumb`/
    `avatar_url` at all in PR 1 or PR 2 — it's a `Stack.Screen` render
    prop, not a screen body or list row, so neither pass's file sweep
    caught it — fixed by fetching the signed-in user's own profile
    (`getMyProfile()`) alongside the existing plant fetch on focus.
    Verified live on the rebuilt app: "Take Photo" and "Choose from
    Library" both work end-to-end with no crop screen, and the nav-bar
    avatar shows the real photo.
  - **PR 2 — done.** Swapped the remaining flat-color avatar
    placeholders to `PhotoThumb` (`uri`/`size={44}`/`radius={radius.sm}`,
    matching every row's pre-existing thumb dimensions) in the seven
    minor list-row screens: `app/following.tsx`, `app/followers.tsx`,
    `app/search-users.tsx`, `app/blocked-users.tsx`,
    `app/select-sitter.tsx`, `app/follow-requests.tsx`, and
    `app/plant-sitting.tsx` (four separate row components there —
    `RequestRow`/`AssignmentRow` reading `assignment.owner.avatar_url`,
    `SentRequestRow`/`HistoryRow` reading `assignment.sitter.avatar_url`).
    Purely mechanical as expected — every row's `Profile` object already
    carried `avatar_url` from its existing `select("*")` query, so no
    query, type, or RLS changes were needed anywhere; each file's
    now-unused `thumb` style was removed too. Verified live on web
    (signed in as Sammy, mutually following the primary dev account):
    all seven screens render cleanly with no console errors, real data
    exercised on Following/Followers/Search Users/Select Sitter and the
    empty state exercised on Blocked Users/Follow Requests/Plant
    Sitting (no test data existed for those relationships). Did not
    fabricate a real photo on a live profile to screenshot-verify the
    truthy-`uri` branch specifically — `PhotoThumb`'s `Image` path is
    already proven live across PR 1's screens, and mutating a real
    account's `avatar_url` for a test was correctly out of scope.
- Date picker UI — done. New `components/DatePickerField.tsx` replaces
  the plain `YYYY-MM-DD` text boxes on `app/add-plant.tsx` (Acquired
  date), `app/plant/[id].tsx` (the acquired-date inline editor), and
  `app/request-sitting.tsx` (Start/End date) — every hand-rolled
  `/^\d{4}-\d{2}-\d{2}$/` regex/validity flag was deleted along with
  them, since a calendar can't produce an invalid string.
  New dependency **`react-native-calendars`** (installed via `npx expo
  install`): a **custom in-app calendar**, chosen over the native OS
  picker (`@react-native-community/datetimepicker`) so it renders
  identically and on-brand on web, iOS, and Android alike, rather than
  falling back to an unstyled browser `<input type=date>` on
  web — a deliberate choice given this app's eventual native target,
  made knowingly trading away each platform's native picker feel for
  that consistency. Its `onDayPress` callback hands back a
  `dateString` already in `YYYY-MM-DD` form, so no `Date`/
  `toISOString()` conversion was needed anywhere — every existing save
  handler and `request-sitting.tsx`'s string-based
  `startsAt <= endsAt` range check kept working unchanged.
  **Gotcha worth remembering**: React Native Web's `Modal` component
  doesn't reliably hide/unmount its content when only its `visible`
  prop is toggled false (confirmed via React Fiber inspection — the
  underlying state was correctly `false` while the modal stayed
  visually open); the fix is to conditionally render the `Modal`
  element itself (`{isOpen ? <Modal visible transparent>...</Modal> :
  null}`) rather than trust `visible={isOpen}` alone. Applies to any
  future `Modal` usage in this codebase, not just this component.
  **Month/year quick-navigation — done.** Tapping the month name in the
  picker's header opens a Jan–Dec grid for the year shown; tapping the
  year opens a 12-year grid (current year centered, paged ±12). Picking
  either jumps `DatePickerField`'s internal `viewDate` there and
  returns to the day view; a "‹ Back to calendar" link bails out of
  either grid unchanged. New `lib/dateGrid.ts` (pure, tested) holds the
  three small helpers this needed — `getYearMonth`/`buildMonthDate`
  (string-split YYYY-MM-DD parsing/building, same no-`Date()` reasoning
  as the rest of this component) and `getYearPage` (centers a 12-year
  window on a given year for stable ± 12 paging). The day view's
  `renderHeader` prop (from `react-native-calendars`) replaces the
  default "September 2026" title with two independently-tappable
  segments built from the same `month.toString("MMMM"/"yyyy")` calls
  the library's own default header uses internally.
  **Min/max date limits — done.** `DatePickerField` gained optional
  `minDate`/`maxDate` props, passed straight through to `Calendar`
  (which already grays out/disables out-of-range days natively).
  `acquired_at` (`app/add-plant.tsx`, `app/plant/[id].tsx`) gets
  `maxDate={todayISO()}` — no future acquisition dates.
  `request-sitting.tsx`'s Start date gets `minDate={today}
  maxDate={addYears(today, 1)}`; End date gets the same `maxDate` plus
  a `minDate` that dynamically tracks the picked Start date (falling
  back to today), so the End-date calendar can't go earlier than the
  Start date already chosen. Disabled dates are never just grayed —
  they're kept unreachable entirely, per an explicit user requirement:
  the month/year grids **omit** out-of-range months/years from
  rendering rather than showing them disabled, and the day view's own
  `react-native-calendars` prev/next-month arrows
  (`disableArrowLeft`/`disableArrowRight`, computed against the
  adjacent month — `react-native-calendars` doesn't wire these to
  `minDate`/`maxDate` itself, confirmed by reading its source) stop
  working the moment the neighboring month would be entirely out of
  range, so you can't arrow/swipe into an all-disabled month either.
  The month/year grids' own page/year-nav arrows still disable when an
  entire adjacent page/year is out of range (prevents landing on an
  empty grid), and picking a year clamps the currently-browsed month
  into that year's valid range (`clampMonthToYear()`) — without this,
  browsing August with a July cutoff and then jumping a year forward
  would land on an entirely-invalid month, exactly the bug this
  feature exists to prevent. `lib/dateGrid.ts` gained `todayISO()`
  (moved out of the component; reimplemented with local `Date` getters
  instead of `toISOString()`, which converts to UTC and can report the
  wrong calendar day near midnight — matters now that this drives an
  inclusive date limit, not just a view default), `addYears()`,
  `isMonthOutOfRange()`/`isYearOutOfRange()` (string-prefix
  comparisons, no `Date` parsing needed), `shiftMonth()` (pure
  month-arithmetic with year wraparound), and `clampMonthToYear()`.
- Dark mode — done. A System/Light/Dark preference, activated in Settings
  (new "Appearance" section, first on the screen), not just silent
  OS-detection. `lib/theme.ts`'s `colors`/`statusColors` were static,
  module-level constants bound to `palettes.light`, imported directly in
  ~25 files (604 usages) — making theme switching real meant turning
  `colors` into something reactive and touching every one of those call
  sites. New `lib/ThemeContext.tsx` (`ThemeProvider`/`useTheme()`)
  computes the active palette each render via a new pure, tested
  `resolveScheme(preference, systemScheme)` in `lib/theme.ts`
  (`"system"` reads `useColorScheme()`, defaulting light if the OS
  reports nothing); `statusColors` became `getStatusColors(colors)`,
  parameterized instead of closed over the light palette. Every screen
  and component that used the static `colors` import now calls
  `const { colors } = useTheme()` instead (same call-site shape as the
  existing per-component `fonts = getFonts(...)` pattern); components
  with their own sibling sub-components (e.g. `StatusPill` in
  `app/index.tsx`/`app/user/[id].tsx`) call `useTheme()` independently
  since each function component is its own context consumer.
  **Persistence is `AsyncStorage`-backed (device-local), not a
  `profiles` column** — deliberate: every other user setting in this
  app is account-wide and synced, but theme is conventionally a
  per-device preference (a phone and tablet could reasonably want
  different themes), and CLAUDE.md's own schema-change caution argues
  against an unneeded migration for this. `ThemeProvider` gates on a
  `loaded` flag (folded into `app/_layout.tsx`'s existing
  fonts/session loading gate) so an explicit dark preference doesn't
  flash light on cold start. `app/_layout.tsx` also gained
  `<StatusBar style={scheme === "dark" ? "light" : "dark"}>`
  (`expo-status-bar`, previously unused) so status bar icons stay
  legible against a dark background, and `app.json`'s
  `userInterfaceStyle` changed from `"light"` to `"automatic"` so
  native OS chrome can follow the resolved scheme too — verified live on
  the Android EAS development build (see "Real device deployment"
  below): cycling System/Light/Dark actually switches the status bar
  icon color (light icons on dark, dark icons on light), confirming
  `<StatusBar>` + `userInterfaceStyle: "automatic"` both work as
  intended outside the web preview.
  Verified live: System correctly follows the browser's
  `prefers-color-scheme`, Light/Dark apply instantly across screens
  (Settings, Plants list including `getStatusColors`-driven status
  pills, Add Plant's `DatePickerField` calendar — enabled days render
  legible near-white text, disabled days stay appropriately muted),
  and an explicit choice persists (`AsyncStorage`) across a reload with
  no light-then-dark flash.
- Real authentication — email/password sign-up (`app/sign-up.tsx`),
  sign-in (`app/sign-in.tsx`), and sign-out (on `app/profile.tsx`) are
  built, replacing the old hardcoded dev-user auto-login. A
  `handle_new_user()` trigger on `auth.users` now auto-creates a blank
  `profiles` row for every new signup, so this is no longer a gap.
  "Confirm email" was temporarily disabled in the Supabase Auth dashboard
  during development (built-in email sender's rate limit is a couple
  sends/hour, too low to test signup repeatedly) — see Public launch /
  production readiness below for re-enabling it and finishing SMTP setup.
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
    - Native OAuth — done, verified live on a real Android device (EAS
      development build — see "Real device deployment" below).
      `signInWithGoogle()` (`lib/supabase/auth.ts`) branches on
      `Platform.OS`: native opens the same Supabase authorize URL via
      `expo-web-browser`'s `openAuthSessionAsync()`, redirecting to
      `expo-auth-session`'s `makeRedirectUri({ path: "redirect" })` —
      resolves to `greenie://redirect`. The explicit `path` isn't
      cosmetic: verified live that a bare `scheme://` with no path
      doesn't get reliably caught by Android's redirect-matching inside
      `openAuthSessionAsync` (the browser tab never returned control to
      the app at all). Tokens are parsed from the redirect URL's
      fragment via `expo-auth-session/build/QueryParams`'s
      `getQueryParams()` (same implicit-grant shape the web flow's
      `detectSessionInUrl` already handles) and landed via
      `supabase.auth.setSession()`. Google Cloud Console needs no
      change (Google always redirects to Supabase's fixed callback,
      identical to web); only Supabase's Redirect URLs allowlist needs
      `greenie://redirect` added once (see `docs/google-oauth.md`) — a
      real device build gets a stable, scheme-only redirect, unlike
      Expo Go which would tie it to the dev machine's LAN IP. New
      `app/redirect.tsx`: Android delivers the same deep link to
      `expo-router`'s own navigation in parallel with
      `openAuthSessionAsync` capturing it, and without a matching route
      that surfaced as an "Unmatched Route" screen even though sign-in
      had already succeeded underneath it — this route exists purely to
      give the deep link a harmless landing spot (bounces to `/`,
      letting `app/_layout.tsx`'s session-based redirect take over); it
      does no auth work itself. The web-only gate around the "Continue
      with Google" button on `app/sign-in.tsx`/`app/sign-up.tsx` was
      removed — both platforms show it now. New dependencies
      **`expo-web-browser`** and **`expo-auth-session`** (installed via
      `npx expo install`).
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

### Public launch / production readiness
Everything below is a real, still-open gap between the current dev/demo
state and a real public or store launch — pulled out of the feature
write-ups above so it's scannable as one checklist instead of buried in
unrelated history.
- Confirm email + real SMTP delivery — done. Registered `greenie-app.com`
  via Cloudflare Registrar (chosen for `.com`'s deliverability edge over
  cheap alt-TLDs — `.xyz`/`.site`/`.online` carry meaningfully higher
  spam-filter distrust — and for sitting in the same dashboard as the
  existing Cloudflare Pages demo hosting) and verified a `mail.` subdomain
  in Resend (SPF `TXT` + DKIM `TXT` records added in Cloudflare DNS,
  `DNS only`/grey-cloud so they're never proxied). Supabase's custom SMTP
  now points at `smtp.resend.com` with a sender on the verified domain
  (`noreply@mail.greenie-app.com`) instead of Resend's `onboarding@resend.dev`
  test address, which could only ever deliver to the Resend account's own
  signup email. **Confirm email** is back on. Both the Magic Link/OTP
  template (account-deletion + email-change codes) and a new Confirm
  signup template got a matching basic-HTML treatment (moss-green
  heading, code in a shaded box, plain-language copy, subject line
  "Your Greenie verification code" / "Confirm your Greenie account") —
  a placeholder pass, not a final design; a real HTML template pass is
  future work.
  - **Signup confirmation switched from a link to a code**, matching
    every other emailed-proof-of-mailbox flow in the app (account
    deletion, email change) instead of Supabase's default
    click-a-link `{{ .ConfirmationURL }}`. Deliberate tradeoff: a link
    can be silently pre-consumed by corporate/email-provider link
    scanners that pre-fetch URLs to check for malware, leaving the
    real user with a confusing "expired" error before they ever click
    it themselves — a code typed back into the same app instance the
    signup started in doesn't have that failure mode, and it's
    consistent with the emailed-code pattern testers will already see
    elsewhere in the app. New `verifySignupCode(email, code)` in
    `lib/supabase/auth.ts` (`supabase.auth.verifyOtp({ email, token,
    type: "signup" })` — no session exists yet at this point, so the
    email has to be passed in explicitly rather than read off
    `getUser()` like the other emailed-code flows do). `app/sign-up.tsx`'s
    "check your email" state is now a code-entry form (matching this
    screen's own field/button styling) instead of a static message;
    on success `app/_layout.tsx`'s existing `onAuthStateChange`
    listener picks up the new session the same as any other sign-in,
    no extra wiring needed.
  - **Real bug found and fixed while testing**: the first live signup
    test (via the web preview, a `+`-aliased real Gmail address) hit a
    500 — Resend rejected the send because Supabase's SMTP "Sender
    email" field was still pointed at the old test address even though
    the domain itself was verified; the fix was updating that one field
    to the `mail.greenie-app.com` sender. Caught precisely because the
    test used a different recipient than the account owner's own
    email — an earlier OTP-only test had used the owner's own address,
    which Resend always allows regardless of sender-domain
    verification, and so didn't surface the gap. Confirmed via
    Supabase's auth logs (`get_logs` service `auth`): the failing
    attempt showed a `550` from `gomail`, the retry after the fix
    showed a clean `200`. Verified live end-to-end after the fix: real
    signup → styled confirmation email arrives with a working code →
    typing it in signs the account straight into the Plants screen
    (skipping `/welcome`, confirming `accepted_privacy_at` still gets
    stamped correctly from signup metadata) → test account removed via
    the Auth Admin API afterward.
  - Runbook: `docs/email-smtp-setup.md` (Resend/Supabase steps) is now
    historical, since every step in it is done.
- Native GDPR data export — done, plus a second delivery channel.
  **Native download/share**: `app/settings.tsx`'s `handleDownloadData()`
  keeps the existing web `Blob`/anchor path unchanged and adds a native
  branch using **`expo-file-system`** + **`expo-sharing`** (new
  dependencies, `npx expo install` — same native-module lesson as
  expo-image-picker/expo-notifications, needed a fresh
  `eas build --profile development` before the feature existed on the
  test device). Wrote against SDK 57's modern class-based File API
  (`new File(Paths.cache, filename); file.write(json)`) rather than the
  deprecated string-based `writeAsStringAsync()`/`cacheDirectory`
  functions, which throw at runtime in this SDK version unless imported
  from the `expo-file-system/legacy` subpath — confirmed by reading the
  installed package's own `.d.ts` files rather than assuming the older
  API surface still applied. `Sharing.shareAsync(file.uri, ...)` then
  opens the native OS share sheet; written to `Paths.cache` (not
  documents) since this is a one-shot export artifact, not app state to
  persist, and the share sheet is where the user actually decides where
  it ends up. `expo install` auto-registered the `expo-sharing` config
  plugin in `app.json` with no permission strings needed — confirmed,
  not assumed. The `Platform.OS === "web"` gate around the whole
  "Download my data" button is gone; it now works on both platforms.
  **Email a copy** (new, requested alongside the native fix, for anyone
  who'd rather not have the file land on whatever device they're
  currently using): a new Edge Function
  `supabase/functions/email-data-export` — modeled on
  `delete-account`'s JWT-verification shape but needing no service-role
  key at all, since the only server-side fact required is the caller's
  own `user.email` (straight off `auth.getUser()`) and the export
  payload itself comes from the client's request body rather than being
  re-queried — calls Resend's HTTP API directly (a new integration
  point distinct from the SMTP credentials already configured for
  Supabase Auth's own emails) to send the JSON as an email attachment
  to the caller's own registered address, never a client-supplied one.
  New Edge Function secret `RESEND_API_KEY` (owner action, same Resend
  account/key already in use). New `emailMyDataExport()` in
  `lib/supabase/gdpr.ts` (+ tests) calling
  `supabase.functions.invoke("email-data-export", { body: data })`; new
  "Email me a copy" button in Settings, unconditional on both
  platforms since it's a pure network call with no native-module
  dependency. Verified live end-to-end on both fronts: the email path
  (real email arrived with the correct JSON attachment, once the
  secret was set) and, after the fresh EAS build, the native
  download/share path on a real Android device (share sheet opens with
  the correct file).
- Privacy policy content — done for the specific gaps identified this
  session (not the full legal review, see below). The draft
  (`app/privacy-policy.tsx`) had drifted from what the app actually
  does: it claimed "Photos are not collected yet" (false, Photo capture
  shipped earlier), and "What leaves the app" didn't mention Resend
  (real email delivery, including the new email-a-copy feature sending
  a user's full export as an attachment) or Expo's push notification
  service. All three sections updated to describe actual current data
  flows; "Your rights" also updated to mention the new email-export
  option. Deliberately did **not** touch the hardcoded "Last updated"
  date or bump `app_config.privacy_policy_updated_at` — per this
  screen's own documented process, that's a deliberate "publish" event
  that re-prompts every existing user for consent, not something to
  trigger incidentally on a content fix. Other known gaps (blocks,
  plant-sitting, the notifications inbox aren't mentioned in "What
  Greenie stores") were flagged but deliberately left out of this pass
  since they weren't asked for.
- Legal review of the privacy policy draft (`app/privacy-policy.tsx`,
  currently marked "requires review before public launch") before any
  public launch — still open regardless of the content-accuracy pass
  above; a factual-accuracy check is not a legal-adequacy review.
- Store-required public pages — done, both halves. Privacy policy:
  `/privacy-policy`, carved out of the online demo's Cloudflare Access
  gate (see Online demo, Product features). **Account deletion**:
  Google Play requires this specifically to work *without* the app
  installed, not just be described — a page that only explains the
  in-app steps is the weaker reading of that policy, and since
  deletion here is already fully automated (`delete-account` Edge
  Function + a two-factor confirm flow), there was no reason to settle
  for the weaker version. New `app/delete-account.tsx`, public like
  `/privacy-policy` (added to `app/_layout.tsx`'s `inPublicGroup`
  check, the same carve-out mechanism). The two-factor deletion UI
  itself was extracted from Settings' Danger Zone into
  `components/AccountDeletionFlow.tsx` (self-fetches its own
  `hasPassword`/username/email rather than taking props, so it works
  standalone) so both Settings and this page render identical logic
  instead of duplicating it — Settings now just renders
  `<AccountDeletionFlow />` with no behavior change. The new page
  tracks its own session locally (this route intentionally sits
  outside the normal signed-in app shell) and shows an inline
  sign-in step (email/password, or "Continue with Google") when
  signed out, then the deletion flow once a session exists, then a
  plain confirmation message via a new `onDeleted` callback once
  deletion succeeds — Settings doesn't pass one, since its existing
  redirect-to-sign-in-on-session-clear behavior is still correct
  there. `signInWithGoogle()` (`lib/supabase/auth.ts`) gained an
  optional `redirectPath` param so the OAuth round trip can return to
  `/delete-account` specifically instead of the bare origin (mirrors
  `linkGoogleAccount()`'s existing `/settings`-specific redirect);
  the two existing call sites pass nothing, unchanged. Verified live:
  `/delete-account` renders the sign-in step when visited signed out
  (no redirect to `/sign-in`/`/welcome`) and correctly renders
  `AccountDeletionFlow` once a session exists (its self-fetch calls
  succeeded against live Supabase data); `/settings`'s Danger Zone
  still renders identically post-extraction. The full click-through
  (send code → real emailed OTP → confirm → delete) wasn't completed
  in this pass — this environment's browser automation hit persistent
  session/refresh-token flakiness driving this specific interactive
  flow (consistent with this project's other documented browser-
  automation limits, e.g. the native file picker and FlatList
  virtualization); the deletion handlers themselves are unchanged,
  already-tested code moved verbatim from Settings, not new logic.
  The Cloudflare Access bypass for `/delete-account` is done too —
  verified live (`200` with no redirect to the Access login, and the
  real sign-in-then-delete page renders, mirroring how
  `/privacy-policy` was confirmed). Both URLs still need to be entered
  into Play Console's Data Safety form at actual store-submission
  time — that step is separate and still open.

### Later
- Payments / monetization
- Admin dashboard
- Multi-language support and imperial measurement units (height in
  inches/feet instead of cm, grouped with multi-language since both
  are locale/unit-preference concerns touching the same fields —
  `plant_progress.height_cm`, `log-progress.tsx`, `HeightChart.tsx`,
  and the initial-size field once the Add Plant review item above is
  built)
- Revisit prompt design and other UX/UI improvements — a general pass
  over interaction patterns accumulated feature-by-feature (e.g. the
  inline two-tap confirm/prompt style used for delete and the overdue
  mark-done choice), not tied to one specific screen. Some issues were
  visible during the first real Android device pass (see Technical
  follow-ups) that the browser/web preview hadn't surfaced — not
  itemized yet, worth a dedicated look rather than folding into
  whatever feature happens to touch that screen next

## Environment
- Supabase URL and anon key go in `.env` (never commit this file)
- `GEMINI_API_KEY` (Google Gemini, plant lookup) is a Supabase Edge
  Function secret, not a client `.env` value — never call it directly
  from the client with a bundled key
