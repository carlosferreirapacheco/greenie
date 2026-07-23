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
- **Direct content search & removal — shelved.** Originally scoped as
  free-text search across any account's content, for the case where
  something needs to come down before anyone's reported it. On
  reflection this is a real privacy problem, not just a technical
  triviality: Report review only ever surfaces content a user already
  saw and flagged — there's always a trigger and a specific target —
  while a general search tool turns "technically reachable via SQL"
  into "one search box away" for *any* account's content, including
  private ones. That's in real tension with the privacy policy's own
  claim that "private content is enforced by the database itself, not
  just hidden by the app" (`app/privacy-policy.tsx`), even though
  nothing about it is technically new (the service-role backend, and
  direct SQL before it, could always reach everything). Shelved rather
  than deleted: if revisited, scope it much narrower than the original
  sketch — public content only, no private-account reach at all;
  lookup by a specific known ID/URL rather than open free-text
  browsing; a logged trail of every lookup. For now, moderation stays
  report-driven only — the rare unreported-content case is handled the
  way it always has been, via direct SQL.
- **Unban** — done, see "User lookup & account actions" below (the
  report-review ban action itself is deliberately still one-way; this
  is where it gets reversed).

### Users & support

- **User lookup & account actions** — the **unban slice is done**;
  force-unlinking a Google identity and triggering account deletion on
  someone's behalf are deliberately deferred (see below). Search (by
  username, `profiles.username ilike`, or by email — `listUsers()`
  filtered client-side, since the Admin API has no server-side email
  filter) resolves to `src/app/users/[id]/page.tsx`, a profile summary
  built around one explicit design constraint from the user: **only
  public, non-sensitive content**, not a service-role bypass of the
  app's own privacy settings just because the backend technically can.
  Confirmed the exact boundary by reading the live RLS policies
  directly (`pg_policies` for `plants_select_visible`/
  `plant_progress_select_visible`) and deliberately replicating only
  the fully-public branch (`profile_visibility`/`progress_visibility =
  'public'`) — never the `is_accepted_follower` branch, since that
  depends on *who's looking*, not on what's actually public, and an
  admin's own follow relationships shouldn't leak extra access into a
  support tool. Progress reports additionally require `shared_to_feed
  = true`, stricter than RLS alone — an unlisted report is a
  deliberate non-sharing choice the summary respects too. Account/
  moderation metadata (`email`, `banned_until`, reports where the user
  is reporter or a direct `target_type: "user"` target) is shown
  regardless of content visibility, since it's not the user's content
  and is already admin-only. `src/lib/users.ts` hit a real, current bug
  live: `admin.auth.admin.getUserById()` throws `"unrecognized JWT kid
  <nil> for algorithm ES256"` (403 `bad_jwt`) with this project's
  `sb_secret_...` key format, even via the same admin client that
  works fine elsewhere — worked around by using `listUsers({ perPage:
  1000 })` + `.find()` instead (already proven working in the search
  path), not a bug in application logic. **Unban** itself
  (`src/app/users/actions.ts`) reuses `ReportActionDialog` from Report
  review (already generalized, not report-specific) and calls
  `admin.auth.admin.updateUserById(userId, { ban_duration: "none" })`.
  Verified live end-to-end against dev-fixture accounts only: username
  and email search both resolve correctly; a private-account summary
  shows zero plants/reports (matching the mobile app's own
  non-follower empty state); a seeded shared + unlisted progress
  report pair shows only the shared one; banning via SQL then
  unbanning through the UI clears `auth.users.banned_until`,
  UI-verified via Server Action `revalidatePath` with no manual
  reload. All seeded test data cleaned up afterward. Committed
  directly to `master` in `greenie-backoffice` (this repo's own
  established convention, unlike the main app's branch+PR rule).
  **Deferred, each its own future pass**: force-unlinking a Google
  identity gone wrong, and manually triggering the account-deletion
  Edge Function on someone's behalf (a support request where the user
  can't complete the normal two-factor flow themselves — needs its own
  careful auth story, since bypassing the password+OTP check is
  exactly what that flow exists to prevent).
  **Force-unlink specifically re-scoped, not just deferred**:
  investigated and found there's no supported way to build it as an
  admin action at all — `supabase.auth.admin` has no identity-unlink
  method, and `auth.identities` isn't reachable through the
  service-role client (PostgREST doesn't expose the `auth` schema, and
  there's no admin REST endpoint for it either, confirmed via
  `search_docs`). Building it for real would mean giving the
  backoffice app a raw Postgres connection — a materially bigger
  capability than the service-role key it holds today — just for this
  one action. Rather than do that, the mobile app itself gained a
  *self-service* unlink instead (CLAUDE.md's "Change account email /
  link Google account" entry, "Unlink Google account" sub-item) using
  the one primitive Supabase actually supports. That covers the common
  support case (walk the user through Settings) without the admin
  action; force-unlink-on-someone's-behalf stays open only for the
  Postgres-connection approach, if ever revisited.
- **Manual GDPR data subject requests — the export half is done**;
  erasure is deferred. Reuses the existing `/users` search (no new
  lookup UI needed) — a new "GDPR data export" section on
  `src/app/users/[id]/page.tsx` sends the account's full data export to
  its own registered email, for the case where someone emails asking
  for their data but can't get into their account. Checked the
  backlog's original assumption before building: `collectMyData()`
  (`lib/supabase/gdpr.ts`) and `email-data-export`
  (`supabase/functions/email-data-export`) are both hardwired to the
  *authenticated caller's own session/JWT* — neither can be pointed at
  an arbitrary user id as-is. Rather than loosen either one's "only the
  caller" invariant, built new admin-side equivalents instead: new
  `src/lib/gdpr.ts`'s `collectUserData(userId)` mirrors
  `collectMyData()`'s query shape field-for-field via the admin client;
  a new `emailUserDataExport(userId)` Server Action (`src/app/users/actions.ts`,
  alongside `unbanUser`) mirrors `email-data-export`'s Resend call
  directly — no new Supabase Edge Function, since the backoffice is
  already a trusted server gated by `requireAdmin()`. Needs one new
  env var, `RESEND_API_KEY`, in `greenie-backoffice`'s own
  `.env.local` (owner action — same Resend account already used for
  the main project's email; done). Verified live end-to-end in two
  stages: before the key was added, a test run surfaced a clean `401
  API key is invalid` (proving the whole pipeline — account resolved,
  export collected, Resend request built — was wired correctly and
  failing only at the expected point); after the owner added the key,
  a real send completed against a dev-fixture account
  (`emailUserDataExport` → 200, ~1.9s Resend round-trip) and against
  the owner's own account to a real inbox. **A real reliability issue
  surfaced during this verification, worth remembering**: the Auth
  Admin API's `listUsers()` — which User lookup and this export both
  depend on for resolving `auth.users` email/ban fields — fails
  *intermittently* with the same `unrecognized JWT kid <nil> for
  algorithm ES256` (403 `bad_jwt`) error that `getUserById()` hits
  consistently with this project's `sb_secret_` key format, in
  stretches long enough that a single retry doesn't always clear it.
  Mitigated with a shared `listUsersWithRetry()` (3 attempts) wrapping
  every `listUsers` call site in `src/lib/users.ts`/`src/lib/gdpr.ts`;
  if the flakiness persists or worsens, the durable fix is replacing
  these Auth-Admin-API reads with a `security definer` SQL function
  over `auth.users` (a main-repo migration), which would sidestep the
  key-validation path entirely.
  **Erasure stays deferred, by explicit decision, not oversight.**
  `delete-account` (`supabase/functions/delete-account`) also only
  ever deletes the *authenticated caller* — checked directly, not
  assumed from the backlog's original "erasure side reuses
  delete-account" text, which turned out to not literally hold. The
  technical bypass is trivial (the same `admin.auth.admin.deleteUser()`
  already used for banning, and every table already cascades from
  `auth.users`), but the real gap isn't code: nothing in the backoffice
  can verify the emailer actually owns the account the way the
  self-service password+OTP flow does — the exact
  deletion-on-behalf-of case already deferred once during the User
  lookup & account actions plan, deferred again here for the same
  reason.

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
   **Report review** — done. Moderation stays report-driven only for
   now; **direct content search & removal** is shelved over privacy
   concerns (see the Features section above) rather than built as
   originally scoped.
2. **User lookup & account actions** — the unban slice is done; Google
   identity unlink and on-behalf-of account deletion remain open (the
   latter now shared with the deferred GDPR-erasure case below). +
   **manual GDPR requests** — the export half is done; erasure is
   deferred for the same reason as account-deletion-on-behalf-of
   above.
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
