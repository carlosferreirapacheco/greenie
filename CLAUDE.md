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
- Settings screen — general and security settings (e.g. notification
  preferences, password/security options, account deletion); not yet
  scoped in detail
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
- Real authentication — replace the hardcoded dev user
  (`lib/supabase/session.ts`, `dev-dummy-user@greenie.local`) with real
  sign-up/sign-in screens; every RLS policy already assumes a real
  `auth.uid()`, so this is wiring, not a schema change
  - Once sign-up exists, wire `profiles` row creation into that flow (e.g.
    a trigger on `auth.users` insert, or a client-side call right after
    sign-up) — the `profiles` table (see Data model) currently only has a
    row for the one hardcoded dev user, backfilled manually

### Later
- Payments / monetization
- Admin dashboard
- Multi-language support

## Environment
- Supabase URL and anon key go in `.env` (never commit this file)
- Anthropic API key goes in `.env` as well, used only from Supabase Edge
  Functions — never call the Claude API directly from the client with a
  bundled key
