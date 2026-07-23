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
  exactly what that flow exists to prevent). *(Both since resolved:
  see the force-unlink re-scoping note below, and manual account
  deletion under Manual GDPR data subject requests.)*
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
  **Erasure (manual account deletion) — now done too**, after being
  deferred twice. The blocker was never code (`delete-account` only
  deletes the authenticated caller, but the
  `admin.auth.admin.deleteUser()` bypass is trivial and every table
  already cascades from `auth.users`) — it was that nothing in the
  backoffice could verify the emailer actually owns the account the
  way the self-service password+OTP flow does. Resolved by a
  user-designed flow that carries the app's own proof-of-mailbox
  mechanism over to the admin trigger: a "Danger zone" section on
  `src/app/users/[id]/page.tsx` sends a one-time code to the
  **account's own registered email** (the exact `signInWithOtp({
  shouldCreateUser: false })` + "Your Greenie verification code"
  mechanism the in-app passwordless deletion uses), the owner reads
  the code back to the admin through the support thread the request
  came in on, and only a valid code — verified via `verifyOtp({
  email, token, type: "email" })` — lets
  `admin.auth.admin.deleteUser()` run. Possession of the code proves
  mailbox control regardless of who clicks the button, so a
  malicious/social-engineered deletion request dies at the relay
  step. Implementation notes: the OTP send/verify run on a throwaway
  publishable-key client (`src/lib/supabase/anon.ts`) since
  `verifyOtp` returns a session for the target user on success —
  discarded, never stored; the email is always re-resolved
  server-side from the userId, never taken from the client;
  `deleteUser` is retried (same 3-attempt pattern as
  `listUsersWithRetry`) so a transient `bad_jwt` doesn't burn the
  just-consumed code; the two-step dialog is
  `src/components/delete-account-dialog.tsx` (purpose-built —
  `ReportActionDialog` has no input field). No audit record beyond
  the support thread itself, accepted for v1 (same reasoning as
  Report review's row-as-audit-trail, except here deletion leaves no
  row at all). Verified live end-to-end with a throwaway account
  created just for the test (`+deltest` Gmail alias — a real inbox):
  a wrong code showed "Token has expired or is invalid" inline and
  deleted nothing; the real code — relayed by the owner, the human
  loop exercised as part of the test — deleted the account, confirmed
  via SQL (`auth.users` row and cascaded `profiles` row both gone).

### Monetization

- **Supporter donation tracking — the backend + admin half is done;
  badge display is a separate, deferred plan.** Originally scoped as
  "admin-managed, not automated" (manually copying a tier from BMC's
  own dashboard) because matching a BMC payment to a Greenie account
  seemed to need an integration that didn't exist. Revisited: BMC's
  current webhook API (`donation.created` etc.) is real, current, and
  confirmed live against `help.buymeacoffee.com`'s own docs —
  HMAC-SHA256-signed (`x-signature-sha256`), delivering
  `supporter_email`/`total_amount`/a donation message. Per explicit
  user decision (`AskUserQuestion`), built the full auto-matching
  webhook pipeline rather than the manual-only fallback. **Honest
  limit, not oversold**: BMC has no concept of a Greenie account —
  matching only ever works via the supporter's BMC email (may differ
  from their Greenie signup email) or an `@username` they choose to
  type into BMC's free-text name/message fields. Best-effort, not a
  guarantee; anything that doesn't match lands in a reconciliation
  queue for the admin.
  New main-repo migration `0028_supporter_donations.sql`:
  `profiles.total_donated numeric` (the single running total — no
  separate tier column, so there's never a second source of truth;
  tier *derivation* is the deferred display plan's job, not this
  one's); new `bmc_donations` table (durable log of every webhook
  event, mirrors `ai_lookup_error_logs`/`app_error_logs`'s existing
  shape — no client RLS policies, service-role/backoffice only); new
  `find_user_id_by_email()` `security definer` SQL function,
  `EXECUTE` revoked from `anon`/`authenticated`, granted only to
  `service_role` — the durable fix the observability pass's own
  write-up flagged for the Auth Admin API's documented intermittent
  `bad_jwt` flakiness, worth building for real here since a webhook
  silently misfiling a real donation during a bad-luck retry window is
  a worse failure mode than a dashboard read needing a manual refresh.
  New Edge Function `supabase/functions/bmc-webhook` (`verify_jwt:
  false`, own HMAC verification instead): idempotent on BMC's
  `event_id` (a unique-constraint conflict means "already processed,"
  since BMC retries on non-2xx); matches in order by email then by an
  `@username` mention in either the message or name field; credits
  `profiles.total_donated` on match; refunds and other non-payment
  event types are logged for visibility only, not auto-subtracted (the
  real refund payload shape wasn't confirmed against BMC's OpenAPI
  spec, not reachable from this environment — noted as a real caveat
  in the function's own comments, worth re-checking against a live
  delivery). New backoffice `/supporters` reconciliation queue
  (`src/lib/supporters.ts`, `src/app/supporters/`) lists unmatched
  donations with a search-and-assign dialog
  (`src/components/match-donation-dialog.tsx`, reusing the existing
  `/users` search); `users/[id]` gained a "Supporter" section (current
  total, matched donation history, a manual `adjustSupporterTotal()`
  correction action for refunds). Verified live end-to-end against the
  real deployed function: constructed real HMAC-signed test payloads
  (no BMC sandbox reachable from here) covering the email-match path
  (confirmed `total_donated` incremented correctly), the
  username-mention fallback path, an unmatched donation landing in the
  queue, re-sending the same `event_id` twice (confirmed no
  double-counting), and an invalid signature (confirmed 401 rejection)
  — all via direct SQL cross-checks, since this session's browser
  automation had no authenticated backoffice session to click through
  the UI with (the `/supporters` route was confirmed to at least
  correctly gate through `requireAdmin()` rather than erroring). All
  seeded test data removed afterward. **Badge display in the mobile
  app is done** — see CLAUDE.md's "Supporter tier badges + beta-tester
  badge" entry for the full write-up (tier derivation via
  `lib/badges.ts`, `components/badges/` chip/icon components, wiring
  into profile/feed/progress screens). A donation-flow hint modal in
  Settings explaining tiers and asking supporters to include their
  `@username` remains unbuilt.

### Observability & health

- **AI lookup error log review — done**, combined with Delivery health
  and Basic usage metrics into one pass: a real home dashboard for the
  backoffice, per explicit user direction ("i'd like this to be the
  main home dashboard... along with the product insights metrics —
  this should show first"). `src/app/page.tsx` now shows Product
  insights first, then Observability & health below it, replacing the
  old bare "Signed in as X" placeholder. `ai_lookup_error_logs`
  (migration `0021`) already had real data flowing into it but was
  only readable via direct SQL — a new `src/lib/errors.ts`
  (`getAiLookupErrorSummary()`/`getAiLookupErrors(filters)`) and
  `/errors/ai-lookup` page make it filterable by stage
  (`fetch_photo`/`gemini_call`/`empty_output`/`parse_json`) and date
  range, plus a counts-by-stage + recent-rows summary block on the
  home page itself. Read-only, no new schema for this half.
- **Delivery health — done, broadened beyond the original scope.** The
  original plan was a rollup sourced from Supabase's own function/auth
  logs (`get_logs`) — but those retain only ~24h, and pulling further
  back needs the Management API's `logs.all` endpoint, which requires
  a new, **account-wide-scoped** Personal Access Token (a materially
  bigger secret than anything the backoffice holds today) and is
  capped to a rolling 24h window regardless of caller-supplied
  timestamps anyway (confirmed via `search_docs` during planning,
  presented to the user via `AskUserQuestion`). Chose instead to
  extend the exact durable-logging pattern that already justified
  `ai_lookup_error_logs` in the first place, to the other three
  Edge Functions that previously failed silently: new
  `app_error_logs` table (`supabase/migrations/0027_app_error_logs.sql`,
  main repo — `source` check-constrained to `push`/`email_export`/
  `account_deletion`, no client RLS policies at all, same shape as
  `ai_lookup_error_logs`). Each function gained a best-effort
  `logError()` mirroring `lookup-plant`'s existing `logFailure()` —
  never affects the caller's actual response, even if the log write
  itself fails: **`send-push`** now logs any Expo ticket status that's
  neither `"ok"` nor `DeviceNotRegistered` (previously silently
  dropped — counted as neither `sent` nor `removed`, a genuinely
  invisible failure before this) plus its own outer catch;
  **`email-data-export`** gained its own service-role client purely
  for this (it previously held none by design, since its only prior
  server-side need was the caller's own `user.email`) — logs on its
  outer catch and a non-2xx Resend response; **`delete-account`** logs
  on its outer catch and specifically a `deleteUser()` failure. New
  `getAppErrorSummary()`/`getAppErrors(filters)` in `src/lib/errors.ts`
  + `/errors/app` (filterable by `source` and date) + a matching
  home-dashboard summary block round out the read side.
  **Verification, and an honest gap**: the read/render pipeline (write
  → home-dashboard rollup → filterable list, plus the source-filter
  links) was verified live end-to-end by seeding one row per source
  directly into `app_error_logs` via SQL, confirming all three
  rendered correctly in both places, then deleting them and confirming
  the dashboard returned to "No other errors." **The write side itself
  wasn't exercised through a real failure for any of the three
  functions**, for reasons specific to each: `send-push` was tried
  live (a garbage `push_tokens` row + a real notification insert,
  twice, with different malformed token shapes) but Expo's push API
  classified both as `DeviceNotRegistered` rather than a genuine ticket
  error, so the "other ticket status" branch never actually fired;
  `email-data-export` and `delete-account` both require a real
  end-user JWT to invoke directly (they're `verify_jwt: true`), which
  wasn't practical to mint from this environment without either a
  browser sign-in flow or the Vault-held webhook secret (decrypting it
  was blocked by this environment's own command classifier). All three
  `logError()` call sites were verified by direct code read against the
  same, already-proven `ai_lookup_error_logs`/`logFailure()` pattern —
  correct table, correct best-effort try/catch shape, called from the
  right branches — but a genuine live failure firing each one end-to-end
  is still open if this ever feels worth revisiting (e.g. a contrived
  bad `SUPABASE_SERVICE_ROLE_KEY` swap for one function, or a real
  device with a stale token that Expo genuinely errors on rather than
  deregisters).

### Product insight

- **Basic usage metrics — done**, part of the same dashboard pass as
  Observability & health above. New `src/lib/metrics.ts`'s
  `getProductInsights()` — total accounts, signups (7d/30d), plants
  created (7d/30d), progress reports logged (7d/30d), and a rough
  active-user count (`last_sign_in_at` within 7d/30d, via the existing
  `listUsersWithRetry()`) — all direct aggregate queries against
  existing `created_at` columns, no new schema, matching the original
  framing exactly. Rendered as a row of metric cards at the very top of
  `src/app/page.tsx`, ahead of Observability & health, per the user's
  explicit ordering. Verified live: every number cross-checked
  independently via direct SQL against the same live data and matched
  exactly (Accounts 5, Signups 1/5, Plants 4/5, Progress reports 1/1).
  **Follow-up pass — retention/engagement, feature adoption, and a
  growth trend chart — done.** User asked for a deeper "product
  metrics" pass beyond the original point-in-time counts; scoped via
  `AskUserQuestion` to all three directions at once. Two real
  constraints shaped the design, checked before building anything:
  (1) dark mode and language preference are `AsyncStorage`-only in the
  mobile app — no server signal exists, so they're excluded from
  feature adoption entirely, called out explicitly in the dashboard's
  own copy rather than silently omitted; (2) there's no "AI lookup
  succeeded" log, only failures (`ai_lookup_error_logs`) — adoption
  uses a labeled approximation instead (whether a plant has any
  AI-derived field set), since those fields are also hand-editable.
  A third finding shaped retention specifically: real per-sign-in
  history exists in `auth.sessions.created_at` (confirmed live — 14
  rows, 4 distinct users, not aggressively pruned), which would enable
  true periodic retention curves, but that table lives in the `auth`
  schema and isn't reachable via `supabase-js .from()` even with the
  service-role client (PostgREST only exposes `public`/configured
  schemas) — reaching it would need a new `security definer` RPC (the
  `username_available()` pattern from the main app). Decided against
  that for now, given the effort/value tradeoff at this app's current
  scale, in favor of a simpler *cumulative* retention metric ("came
  back at least once N+ days after signup") derived entirely from
  `auth.users.created_at`/`last_sign_in_at`, both already fetched via
  the existing `listUsersWithRetry()`. New `src/lib/metrics.ts`
  functions: `getRetentionMetrics()` (D7/D30 cumulative-return rate,
  zero-plant-account rate, avg plants/account, avg reports/plant, %
  of plants with 2+ reports), `getFeatureAdoption()` (AI-info-present
  rate, plant-sitting/follow/like/comment/push-registration adoption
  rates, care-task-type breakdown — one aggregate query per signal
  against already-exposed `public` tables, no new schema), and
  `getGrowthTrend()` (weekly-bucketed signups/plants/reports for the
  last 8 weeks, reusing the same `created_at` arrays
  `getProductInsights()` already fetches). New `src/lib/chart.ts`
  holds the pure weekly-bucketing helper (`bucketWeekly()`) and new
  `src/components/growth-trend-chart.tsx` renders it as a hand-rolled
  inline-SVG grouped bar chart — deliberately not a charting library
  (Recharts/shadcn's chart component), matching the main app's own
  established "hand-roll simple charts" precedent
  (`lib/chart.ts`/`components/HeightChart.tsx` there). All three new
  sections render on the home dashboard under "Product insights",
  still shown first. Verified live: every new metric cross-checked
  independently via direct SQL against the same live data and matched
  exactly (D7 returned 50% [2/4 eligible], D30 0% [0/0 eligible],
  zero-plant accounts 20% [1/5], avg plants/account 1.0, avg
  reports/plant 0.2, AI info 0% [0/5 plants], any-follow 80% [4/5],
  push-registered 20% [1/5], care tasks water:5, growth-chart weekly
  totals summing to the exact signups/plants/reports totals shown
  elsewhere on the page); `tsc --noEmit` clean.

### Configuration

- **`app_config` viewer — done.** New `src/lib/config.ts`'s
  `getAppConfig()` (server-only, admin client) fetches every row from
  `app_config` generically — no hardcoded key list — so a future
  migration adding a new row shows up automatically with no dashboard
  change. New `/config` page (`requireAdmin()`-gated, same pattern as
  every other page) renders a plain key/value list, linked from the
  home page's header nav alongside Reports/Users. Deliberately **not**
  editable — `app_config` is "written only via migrations" by explicit
  existing convention (see CLAUDE.md's Data model section), and an
  admin-editable form would quietly undo that guarantee; the page's own
  copy states this. **Verification note**: `tsc --noEmit` is clean and
  the underlying data was independently confirmed via direct SQL
  (`username_change_cooldown_days: 5`, `privacy_policy_updated_at:
  2026-07-09T00:00:00Z`), but the browser preview's session had expired
  by the time this was built, and re-authenticating wasn't done here
  (entering a password isn't something this assistant does) — so the
  page itself wasn't click-tested live in this pass. Worth a quick
  visual spot-check next time the dashboard is opened.

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
3. **AI lookup error log review** — done, combined with delivery health
   and basic usage metrics into one home-dashboard pass (see
   Observability & health / Product insight above). **`app_config`
   viewer** — done, see Configuration above.
4. **Supporter donation tracking** — the backend + admin reconciliation
   half is done (webhook pipeline + `/supporters` queue); badge
   *display* in the mobile app is deferred to its own separate plan.
5. **Basic usage metrics** + **delivery health** — done, see above.

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
