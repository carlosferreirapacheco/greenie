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
- Use plan mode before large or structural changes — explain the approach
  before editing files.
- Don't install new dependencies without saying which one and why.
- Ask before making changes to the Supabase schema once it's been created —
  schema changes should be deliberate, not incidental to a feature.

## Backlog

### Product features
- Plant-sitting instructions — generate a shareable instructions file
  (per-plant care summary: watering schedule, light, notes) that a user can
  send to a friend/contact watching their plants while away
- Plant nicknames — let a user set a nickname for a plant, separate from
  its species/common name
- Social features — `plant_progress`, `follows`, `likes`, `comments`
  already have schema and RLS policies (see Data model above).
  Progress-report creation (`app/log-progress.tsx`), a Friends list with
  in-list search (`app/friends.tsx`), search for any user by name
  (`app/search-users.tsx`), follow/unfollow (on `app/user/[id].tsx`), a
  feed of progress reports from people you follow (`app/feed.tsx`), and
  likes/comments (inline on feed rows + `app/progress/[id].tsx`) are all
  built. Social features are now feature-complete against the original
  backlog scope.
- Account settings and configuration — a Settings screen covering both
  general and security settings (e.g. notification preferences,
  password/security options, account deletion); not yet scoped in detail
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
- Content visibility scoping — `plants` and `profiles` are currently
  fully public to any signed-in user (needed so the feed and profile
  views can show a followed user's data). Scoping visibility to
  followers-only is deliberately deferred; would mean RLS policies that
  reference the `follows` table instead of `using (true)`.
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
- Plant list on user profiles — `app/user/[id].tsx` currently shows only
  avatar/display name/bio; add a list of that user's plants so other
  people can browse them from a profile
- Review feed behavior on multiple progress reports — audit how the feed
  reads when a plant has several reports (ordering, whether they should
  ever be grouped/collapsed under one plant); not a concrete feature yet

### Technical follow-ups
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
