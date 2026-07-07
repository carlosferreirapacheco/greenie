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
- `plants` (id, owner_id, name, species, photo_urls[], location, created_at)
- `care_tasks` (id, plant_id, type [water/fertilize/repot], frequency_days,
  last_done, next_due)
- `posts` (id, plant_id, user_id, photo_url, caption, created_at)
- `follows` (follower_id, followee_id)
- `likes` (post_id, user_id)
- `comments` (id, post_id, user_id, content, created_at)

## Working style
- Work in small, verifiable steps. After scaffolding or adding a feature,
  run the app (`npx expo start`) and confirm it works before moving on.
- Use plan mode before large or structural changes — explain the approach
  before editing files.
- Don't install new dependencies without saying which one and why.
- Ask before making changes to the Supabase schema once it's been created —
  schema changes should be deliberate, not incidental to a feature.

## Planned follow-ups
- Dark mode — `lib/theme.ts` already has `palettes.dark` fully populated;
  just needs `useColorScheme()` wired up to switch which palette is active
  (deliberately deferred when the design system was first applied, to keep
  that change scoped to light mode only)
- Plant-sitting instructions — generate a shareable instructions file
  (per-plant care summary: watering schedule, light, notes) that a user can
  send to a friend/contact watching their plants while away

## Not yet in scope
- Payments / monetization
- Admin dashboard
- Multi-language support

## Environment
- Supabase URL and anon key go in `.env` (never commit this file)
- Anthropic API key goes in `.env` as well, used only from Supabase Edge
  Functions — never call the Claude API directly from the client with a
  bundled key
