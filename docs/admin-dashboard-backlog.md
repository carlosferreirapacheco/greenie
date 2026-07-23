# Admin dashboard — feature backlog

Nothing here is built yet. This is a planning document only, split out of
CLAUDE.md's own `Later` section (see the "Admin dashboard" bullet there,
which now just points here) so the dashboard's scope can grow without
bloating the main backlog. Follow the same working-style rules as the
rest of the project once implementation starts: plan before editing,
verify each slice live, keep schema changes deliberate.

## Why this exists

Today, every admin action is done by hand against the live Supabase
project: report review and content moderation via SQL through the
Supabase MCP/Studio, supporter tier assignment by comparing Buy Me a
Coffee's dashboard to a `profiles` row, GDPR requests via ad hoc
`execute_sql`. That's fine at current scale (one owner, a handful of
testers) but doesn't scale to a real Play Store launch with strangers
using the app and Google's UGC policy expecting reports to actually get
handled. This backlog exists to turn "SQL I remember how to write" into
screens that don't depend on that.

## Prerequisite: access control — done

Every feature below needs this solved first — none of them are safely
buildable without it. Decided and built (migration `0025_admin_access.sql`):
a separate web app on its own domain (`backoffice.greenie-app.com`,
scoped from the actual owned domain — see below), sharing only the
Supabase database with the main app, no shared codebase or session.

- **Who is an admin?** `profiles.is_admin` (a new boolean column) —
  the schema-driven option, matching every other permission in this
  app (`notify_*`, `profile_visibility`, etc.) and supporting more than
  one admin later with no redeploy. **Critical safeguard**:
  `profiles_update_own` (`0002_profiles.sql:18`) is `using (auth.uid()
  = id)` with **no `with check` clause at all**, so without a guard any
  signed-in user could self-grant admin through the exact same
  `supabase.from("profiles").update(...)` call `updateProfile()`
  already uses for bio/display name — confirmed live via a rolled-back
  transaction before the fix existed. Fixed with a `before update`
  trigger (`guard_is_admin`) that silently reverts any client-submitted
  change to `is_admin` whenever `current_user in ('anon',
  'authenticated')` — those are literal Postgres roles PostgREST
  assumes per the caller's JWT, so the column becomes physically
  unreachable from any client request regardless of what the UPDATE
  policy allows; only direct SQL/migrations (`postgres`) or a
  service-role client pass through untouched. **Two real bugs found
  and fixed while verifying live, both worth remembering**: (1) the
  first version checked `auth.role()`, which reads a PostgREST-only JWT
  session GUC that simply isn't set when running outside a real client
  request (migrations, Studio, MCP) — it returned `NULL` there and
  silently reverted the migration's own seed update. (2) the fix's
  first attempt marked the trigger function `security definer`, which
  made `current_user` inside the function body evaluate to the
  *function's owner* (`postgres`) rather than the invoking role — a
  classic `SECURITY DEFINER` trap — so a simulated authenticated
  self-grant attempt wasn't reverted either. Switching to `security
  invoker` (the default, and this project's own documented preference)
  fixed it for real, verified via three rolled-back transactions: an
  `authenticated`-role self-grant is reverted, a `service_role` update
  succeeds, and the seeded admin row survived both. The first admin
  row (the account's owner) was seeded in the same migration.
- **RLS implications**: admin work (report review, user lookup, ad hoc
  content search) is inherently query-heavy in a way that doesn't fit
  a handful of narrow `security definer` RPCs the way
  `delete-account`/`email-data-export` do for their one job each.
  Decided instead: the backoffice app has its own backend (server-side
  code, not client-side), and the existing `SUPABASE_SECRET_KEY`
  (already an env var) is used **only** there — never shipped to the
  client bundle. Every server-side handler funnels through one shared
  `requireAdmin()`-style check first (read the caller's Supabase
  session, look up `profiles.is_admin` via the service-role client,
  reject if not true) *then* performs the privileged read/write. RLS
  on the main tables stays completely untouched — the backoffice's
  trusted, authorization-checked backend is what bypasses it, not a
  policy change.
- **Outer gate**: Cloudflare Access in front of the whole
  `backoffice.greenie-app.com` domain, reusing the exact mechanism
  already gating the demo site (`docs/demo-hosting.md`) and the same
  Cloudflare account/Zero Trust team — an unauthorized visitor never
  reaches the login screen at all, email/password is a second layer
  behind it.
- **Sign-in**: email/password only, against the same Supabase Auth
  project/`auth.users` table the main app uses (no new auth system, no
  Google OAuth on this domain for now) — an admin's existing Greenie
  credentials work unchanged. Because it's a different domain there's
  no shared cookie/localStorage session with the main app; a fresh
  sign-in on first visit is expected, not a bug.
- **Platform**: a separate lightweight internal web tool, not a hidden
  route inside the existing Expo app. Nothing about admin work needs to
  work on a phone, and every feature below is fundamentally "filter a
  table, click a row, take an action" — plain web is a better fit than
  screens built for a mobile app.

**The skeleton is scaffolded and live-verified**: a new standalone
private repo, [`carlosferreirapacheco/greenie-backoffice`](https://github.com/carlosferreirapacheco/greenie-backoffice)
(Next.js App Router + Tailwind + shadcn/ui). `src/lib/auth/requireAdmin.ts`
is where the design above actually became code — validates the caller's
session via `getClaims()` (never `getSession()`/`getUser()`, per
Supabase's own current guidance: only `getClaims()` verifies the JWT
signature), then checks `profiles.is_admin` with a service-role client
(`src/lib/supabase/admin.ts`, guarded with `import "server-only"` so it
can never be pulled into a client bundle). One protected page (`/`)
proves the chain end-to-end. Verified live: no session → redirects to
`/login`; a signed-in non-admin → `requireAdmin()` throws "Not
authorized"; a real admin → the page renders correctly; and — checked
against an actual production build's output, not just dev mode — the
service-role key does not appear in the client bundle (a first grep for
the literal string `sb_secret_` did match a client chunk, but turned out
to be only the Supabase SDK's own generic key-prefix-detection code, not
the real key; confirmed by searching for the actual key value instead).
Deferred to when the app has a first real feature to deploy: Cloudflare
Pages hosting, the `backoffice.greenie-app.com` domain, and the
Cloudflare Access gate.

## Features

### Moderation (highest priority — closes the real Play Store gap)

- **Report review** — done, in `greenie-backoffice` (the first real
  feature built on the skeleton). List/triage the `reports` table
  (migration `0023_reports.sql`, `0026_report_resolution.sql` for the
  new `resolved_at`/`resolved_by`/`resolution` columns): filter by
  `?status=open|resolved|all`, each `target_id` resolved against the
  right table per `target_type` (`plant_progress`, `comments`, or
  `profiles` — no FK, always a manual lookup, batch-fetched in
  `src/lib/reports.ts` to avoid N+1), reporter and target shown
  side-by-side. Three actions, each its own Server Action in
  `src/app/reports/actions.ts` that re-checks `requireAdmin()` itself:
  **delete the reported content** (not offered for `target_type:
  "user"`, no content to delete), **dismiss** (resolve with no
  action), and **ban** — scope grew here per an explicit user decision
  during planning: rather than reusing the user-facing `blockUser()`
  (wrong semantics for a platform action, and the original sketch's
  own uncertainty about this is exactly why it came up for
  discussion), banning uses Supabase Auth's own built-in primitive,
  `supabase.auth.admin.updateUserById(userId, { ban_duration:
  "876000h" })` — confirmed current via `search_docs` before writing
  any code. This blocks future sign-ins and token refreshes at the
  Auth layer itself, with zero RLS or schema changes needed anywhere
  else in the app. Honest limit, not oversold: an already-issued,
  still-unexpired access token keeps working until it naturally
  expires or the user tries to refresh it — this is "can't sign in or
  stay signed in going forward," not instant mid-session revocation.
  Every report row is its own audit trail (`resolved_at`/`resolved_by`/
  `resolution`) — deliberately no separate audit table for this
  report-driven path.
  Destructive actions go behind a controlled `AlertDialog`
  (`src/components/report-action-dialog.tsx`) — deliberately **not**
  shadcn's own `AlertDialogAction`, which auto-closes on click
  regardless of what its handler does, which would hide the
  pending/error state an async Server Action needs; a plain `Button`
  under the component's own `open`/`isPending` state instead.
  Verified live end-to-end against seeded throwaway fixtures (a test
  plant/progress-report/comment, three reports covering all three
  `target_type`s, reporter/target both dev-fixture accounts, never
  real user data): delete correctly cascades — confirmed live when
  deleting the progress report also removed its attached comment,
  which then correctly surfaced Report review's own "content no
  longer exists" fallback for the second report, an unplanned but
  welcome proof of that fallback path — dismiss and ban both resolve
  correctly, ban sets `auth.users.banned_until` to ~100 years out, and
  all three resolutions render correctly under the Resolved/All
  filters. All seeded data removed and the test account unbanned
  afterward.
- **Direct content search & removal**. Independent of a report existing
  at all — search progress reports/comments/plants by owner or
  free-text, for the case where something needs to come down before
  anyone's gotten around to reporting it (or Play Store's own review
  flags something). Thin wrapper over the same delete calls Report
  review already needed — its own future slice, not bundled into that
  pass.
- **Unban** — the report-review ban action is deliberately one-way;
  reversing it belongs on the future "User lookup & account actions"
  screen below, where an admin can see a user's full status first.
- **Direct content search & removal**. Independent of a report existing
  at all — search progress reports/comments/plants by owner or
  free-text, for the case where something needs to come down before
  anyone's gotten around to reporting it (or Play Store's own review
  flags something). Thin wrapper over the same delete calls Report
  review already needs.

### Users & support

- **User lookup & account actions**. Search by username/email, view a
  profile summary (plants, follower counts, report history — both
  reports filed *by* them and *against* them), and take action:
  force-unlink a Google identity gone wrong, manually trigger the
  account-deletion Edge Function on someone's behalf (support request
  where the user can't complete the normal two-factor flow themselves —
  needs its own careful auth story, since bypassing the password+OTP
  check is exactly what that flow exists to prevent), or just have
  enough visibility to answer a support email without an ad hoc SQL
  query every time.
- **Manual GDPR data subject requests**. A lookup-by-email path that
  reuses `collectMyData()` (`lib/supabase/gdpr.ts`) to produce the same
  export the in-app "Download my data" button does, for the case where
  someone emails asking for their data or asking to be forgotten but
  can't get into their account. Erasure side reuses `delete-account`.
  This is a compliance safety net, not a new capability — everything it
  calls already exists and is already tested.

### Monetization

- **Supporter badge tier assignment** (already scoped in CLAUDE.md's
  Payments/monetization backlog item). Manually setting a user's
  supporter tier based on Buy Me a Coffee donations the owner sees on
  BMC's own dashboard — deliberately not BMC-API-integrated (see that
  backlog item for why). Blocked on the supporter badge feature itself
  shipping first; this is just the admin half of it.

### Observability & health

- **AI lookup error log review**. `ai_lookup_error_logs` (migration
  `0021`) already exists specifically for this and already has real
  data flowing into it, but the only way to read it today is a direct
  SQL query. A simple filterable list (by stage — `fetch_photo` /
  `gemini_call` / `empty_output` / `parse_json` — and by date) turns
  "notice a systemic problem" from "someone happens to go looking" into
  something glanceable. Read-only, no new schema.
- **Delivery health**. A rollup of recent failures from the push
  (`send-push`) and email (`email-data-export`, Supabase Auth SMTP)
  pipelines — sourced from Supabase's own function/auth logs
  (`get_logs`), not a new table. Lower priority than it sounds: Expo
  push already self-heals by deleting `DeviceNotRegistered` tokens, and
  failures are rare enough that `get_logs` on demand has been
  sufficient so far. Worth building once there's been a real delivery
  incident, not before.

### Product insight

- **Basic usage metrics**. Signups, plants created, progress reports
  logged, rough active-user counts — all just aggregate queries against
  existing `created_at` columns, no new schema. Useful for its own
  sake, and specifically ties into the "would take six-figure MAU
  before Gemini cost is a real budget line" note from the monetization
  scoping pass — something should actually be watching that number
  rather than assuming it stays small.

### Configuration

- **`app_config` viewer**. Read-only display of
  `username_change_cooldown_days` and `privacy_policy_updated_at` so
  checking current values doesn't require SQL. Deliberately **not**
  editable from the dashboard — `app_config` is "written only via
  migrations" by explicit existing convention (see CLAUDE.md's Data
  model section), and an admin-editable form would quietly undo that
  guarantee. If that convention ever changes, it should be a deliberate
  decision, not a side effect of this dashboard being convenient.

## Suggested phasing

1. **Access control foundation** (blocks everything else) — done.
   **Report review** — done. **Direct content search & removal** —
   still open, the other half of the pair Google Play's UGC policy
   actually cares about.
2. **User lookup & account actions** + **manual GDPR requests** —
   support/compliance safety nets, cheap once #1 exists since they
   mostly wrap already-built functions.
3. **AI lookup error log review** + **`app_config` viewer** — low
   effort, read-only, no new schema.
4. **Supporter badge tier assignment** — once the supporter badge
   feature itself ships.
5. **Basic usage metrics** + **delivery health** — valuable but nothing
   is currently on fire without them; revisit once the earlier phases
   are live and real usage exists to look at.

## Open questions (resolve during planning, before implementation)

- Does every destructive admin action (content deletion, forced account
  deletion) need its own audit log, separate from `reports.resolved_by`?
  Given this app already tracks moderation provenance nowhere else,
  probably yes for at least deletions — but scope that explicitly
  rather than assuming.
- Framework/repo decided and scaffolded (Next.js, standalone repo — see
  the Prerequisite section above). Still open: actual hosting
  (Cloudflare Pages is the working assumption, not yet set up).
- One-time Cloudflare Access setup for `backoffice.greenie-app.com`
  (owner action, mirrors `docs/demo-hosting.md`'s runbook) — not done
  yet, needed before the backoffice app is reachable at all.
