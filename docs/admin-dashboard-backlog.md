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

## Prerequisite: access control

Every feature below needs this solved first — none of them are safely
buildable without it.

- **Who is an admin?** Two real options: (a) a new `profiles.is_admin`
  boolean, matching the schema-driven pattern every other
  permission in this app already uses (`notify_*`, `profile_visibility`,
  etc.), settable only via migration/direct SQL, never client-writable;
  or (b) a hardcoded allowlist of user IDs checked in the dashboard's
  own auth layer, no schema change at all. Given there's currently
  exactly one admin (the app's owner), (b) is the cheaper start and
  defers the schema decision until a second admin is ever needed — but
  it means "who's an admin" lives in code/env, not the database, which
  is worth being deliberate about rather than defaulting into.
- **RLS implications**: admin actions (deleting another user's content,
  reading `reports`/`ai_lookup_error_logs` across all users) can't go
  through the normal `authenticated`-role RLS policies those tables
  already have (`reports_select_own` etc. are intentionally scoped to
  the reporter). Either every admin screen calls a `security definer`
  RPC that checks the admin allowlist/flag internally before doing
  anything (keeps the service-role key out of the client entirely,
  consistent with `delete-account`/`email-data-export`'s existing
  pattern of least-privileged Edge Functions), or the dashboard is a
  server-side-only tool that uses the service role directly and is
  never shipped as client-side code at all. The Edge Function approach
  matches how every other privileged operation in this app already
  works and is the recommended default.
- **Platform**: does this live inside the existing Expo app as a
  hidden, admin-gated route (reuses `expo-router`, the design system,
  `t()` i18n — but ships inside the same bundle end users download,
  and RN's web-first admin screens would be a strange fit for anything
  table/filter-heavy), or as a small separate internal web tool (own
  repo or a `/admin` Next.js-style app, free to use normal web
  patterns — tables, filters, bulk actions — without fighting React
  Native primitives, at the cost of a second codebase and its own
  auth)? Recommendation: a separate lightweight internal tool. Nothing
  about admin work needs to work on a phone, and every feature below is
  fundamentally "filter a table, click a row, take an action" — plain
  web is a better fit than screens built for a mobile app.

## Features

### Moderation (highest priority — closes the real Play Store gap)

- **Report review**. List/triage the `reports` table (migration
  `0023_reports.sql`): filter by `target_type`/`reason`, resolve each
  soft `target_id` reference by looking it up in the right table
  (`plant_progress`, `comments`, or `profiles` depending on
  `target_type` — there's no FK, so this is always a manual lookup,
  not a join), show the reporter and the reported content/user
  side-by-side, and act: delete the offending row, block the reported
  user (reusing the existing `blocks` table/RLS shape — an admin block
  is really just inserting a row with the reporter's... no, the
  *platform's* intent, which argues for a dedicated admin-only removal
  path rather than reusing user-facing `blockUser()`, which is scoped
  to `auth.uid()` as the blocker), or dismiss with no action. Needs a
  `resolved_at`/`resolved_by` pair added to `reports` (new nullable
  columns) so the queue only shows open reports and there's a record
  of who handled what.
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

1. **Access control foundation** (blocks everything else) + **Report
   review** + **direct content search & removal** — the pair Google
   Play's UGC policy actually cares about, and the most-requested
   reason this dashboard exists at all.
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

- Access model: `profiles.is_admin` column vs. hardcoded allowlist (see
  Prerequisite section above) — leaning allowlist for now, but confirm
  before writing any code.
- Does every destructive admin action (content deletion, forced account
  deletion) need its own audit log, separate from `reports.resolved_by`?
  Given this app already tracks moderation provenance nowhere else,
  probably yes for at least deletions — but scope that explicitly
  rather than assuming.
- Platform choice (in-app hidden route vs. separate tool) — recommended
  above as a separate tool, but that's a real cost (second codebase,
  second deploy, second auth surface) worth confirming is wanted before
  committing.
