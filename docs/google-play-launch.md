# Google Play launch — submission runbook

A reference for filling out Play Console's own forms accurately and
quickly. This doc doesn't replace Play Console — it's prep so each
section there is a copy/adjust job instead of a research project.

## Pre-flight checklist

- [x] **Play Developer account registered** ($25 one-time). Done. Since
  the account was created after Nov 13, 2023, it still can't publish
  straight to production — see "Closed testing" below for the mandatory
  12+ tester / 14-day track.
- [x] **Privacy policy legally reviewed.** Done — the "Draft — requires
  review before public launch" banner was removed from
  `app/privacy-policy.tsx` per explicit user sign-off.
- [ ] **Terms of Use legally reviewed.** `app/terms-of-use.tsx` is
  still marked "Draft — requires review before public launch" (new
  this session, added to satisfy Play's UGC-terms requirement — see
  the Content rating section below). Don't submit for production
  review until that's resolved.
- [x] **Target API level compliant.** New apps and updates need to
  target Android 16 (API level 36) by Aug 31, 2026 (extension to Nov 1,
  2026 available). Confirmed from a real production build's Gradle log
  (`eas build:view <build-id> --json` → build log): `compileSdk 36`,
  `targetSdk 36`, `minSdk 24` — ahead of the deadline. Re-confirm on
  each future build if the Expo SDK ever gets bumped.
- [x] **Google OAuth consent screen moved to production.** Done —
  Publish App clicked in Google Cloud Console. Sign-in now works for
  any Google account, not just manually-added test users; publishing
  didn't trigger Google's verification review since only default
  (non-sensitive) scopes are requested. See `docs/google-oauth.md`.
- [x] **Three public URLs ready** (all already live, no work needed):
  - Privacy policy: `<demo-host>/privacy-policy`
  - Terms of use: `<demo-host>/terms-of-use`
  - Account deletion: `<demo-host>/delete-account`
  Play Console's store listing and Data Safety section both ask for a
  privacy policy URL; the Data Safety section also asks whether
  in-app account deletion is available and may ask for the URL if the
  app supports web-based deletion outside the app. The terms-of-use URL
  isn't a Play Console form field itself, but Play's UGC policy expects
  it to be linked from the app (it's now reachable from the signup and
  re-consent consent checkboxes) and reviewers may check it.

## Data Safety section

Cross-checked against `lib/supabase/gdpr.ts`'s `collectMyData()` —
that function is the actual single source of truth for what this app
stores, so this table won't drift from it silently. The export now
covers every user-facing table, including `reports` and
`plant_sitting_assignments` (closed out in the same session that added
the Terms of Use — see CLAUDE.md's "Public launch / production
readiness" backlog); the privacy policy's "What Greenie stores"
section already covered blocks, plant-sitting, and the notifications
inbox from an earlier content pass.

| Data type | Collected? | Shared? | Purpose | User can request deletion? |
|---|---|---|---|---|
| Email address | Yes | No (see note below) | Account creation/login, security codes | Yes |
| Name (display name, username) | Yes | No | Account, shown to other users | Yes |
| Photos (profile/plant/progress photos) | Yes | No | Core app functionality | Yes |
| User-generated content (progress reports, comments, bio) | Yes | No | Core app functionality (social features) | Yes |
| App activity (follows, likes, blocks, reports filed) | Yes | No | Core app functionality | Yes |
| Device or other IDs (push notification token) | Yes, if push enabled | No (see note below) | Deliver push notifications | Yes (disable push / delete account) |
| Location | **No** — `plants.location` is a free-text field the user types (e.g. "Living room"), not device geolocation | — | — | — |
| Financial info (purchase history) | Yes — `profiles.total_donated` / `bmc_donations.amount`+`currency` (see note below) | No | Drives the supporter badge tier | Yes (delete account) |
| Health info, contacts, messages, calendar, etc. | No | — | — | — |

**Notes for the "shared" answers:**
- The AI plant-lookup feature sends a plant name/description or photo
  to **Google Gemini** — but only the content the user is actively
  looking up, never account data. Declare this as processing for app
  functionality, not "shared for advertising/marketing."
- Account-related emails (signup confirmation, password reset,
  account-deletion codes, and the "email me a copy" data export) go
  through **Resend**. Declare as shared with a service provider for
  account management, not third-party marketing.
- Push notification delivery goes through **Expo's push service**,
  which needs the device's push token to route notifications — but
  Expo only relays the notification you send to Apple/Google's push
  infrastructure on your instruction, the same service-provider
  relationship as Resend for email, not a third party the token is
  "shared" with. Corrected from an earlier draft that marked this
  "Shared: Yes" before that distinction was worked through carefully.
- The **Support/donation link** (Settings → "Buy me a coffee") is a
  plain outbound link to an external site (buymeacoffee.com) — the app
  never handles payment details itself, and the donation transaction
  happens entirely on Buy Me a Coffee's own site, so this does
  **not** trigger Play Billing policy. That said, the *separate*
  `bmc-webhook` integration is a real financial-info collection point:
  once a donation happens on BMC, their webhook sends the amount and
  currency into Greenie, which stores it (`bmc_donations`,
  `profiles.total_donated`) to compute the supporter badge tier. BMC
  is the *source* of that data here, not a recipient — Greenie never
  transmits a donation amount back out to BMC or anyone else, so
  "Shared" is still "No" even though "Collected" is "Yes." Still worth
  a one-line mention in the store listing's "About" text for
  transparency (e.g. "Optional external link to support
  development").
- All data is encrypted in transit (HTTPS/TLS via Supabase); answer
  "Yes" to the encryption-in-transit question.
- Account deletion is available in-app (Settings → Danger zone) and
  also via the public `/delete-account` page without installing the
  app — answer "Yes" to both the in-app and non-app deletion questions.

## Content rating questionnaire — draft answers

- Violence: None.
- Sexual content: None.
- Profanity: None built into the app; user-generated text content
  (comments, bios) isn't pre-moderated, so answer per Play's guidance
  for apps with unmoderated UGC (usually still fine for a "Everyone"-ish
  rating alongside the UGC disclosure below, but let the questionnaire's
  own branching logic decide — don't assume a specific final rating).
- Controlled substances / gambling: None.
- **User-generated content**: Yes — progress reports, comments, photos,
  bios. Disclose the in-app reporting/blocking mechanism (this
  session's new feature) when asked how UGC is moderated.
- **User interaction**: Yes — users can follow, comment, like, and
  message indirectly through comments; no direct private messaging
  exists in this app.
- **Shares location**: No (see Data Safety table above — no device
  geolocation is ever collected).
- **Digital purchases**: No in-app purchases; the donation link is an
  external site, not an IAP flow.

## Store listing — draft copy

**Short description** (≤80 characters):
> Track your plants' care schedules, log their growth, and share with friends.

**Full description** (draft — adjust tone/voice before publishing):
> Greenie helps you keep your houseplants alive and thriving. Add a
> plant (photo-based AI identification helps you get the name and
> watering schedule right), track care tasks like watering and
> fertilizing, and log progress reports with photos and height
> measurements to watch them grow over time.
>
> Follow other plant people, share your own plants' progress, and lend
> a hand with plant-sitting when a friend goes on vacation — full
> care-task access and progress logging for whoever's watching your
> plants while you're away.
>
> Features:
> • Photo-based AI plant identification and care suggestions
> • Care task reminders (watering, fertilizing, repotting)
> • Growth tracking with photos and a height-over-time chart
> • A social feed to follow other plant owners and share progress
> • Plant-sitting: delegate care access to a trusted friend
> • Full data export and account deletion, right from Settings
> • Available in English and Português (Portugal)

**Category suggestion**: Lifestyle — "style guides, wedding and party
planning, how-to guides" per Play's own category definitions, the best
fit for a plant-care hobby app. House & Home was considered and
dropped: despite the name, its actual scope is "house and apartment
search, home improvement, interior decoration, mortgages, real
estate," which doesn't fit Greenie at all. Productivity was also
considered (Greenie does have care-task scheduling) but Lifestyle
better matches the app's actual identity as a plant-care hobby app,
not a general organizational tool.

**Contact email**: use the same address the Support Greenie link and
account-deletion emails already come from.

## Closed testing (mandatory — no existing developer account)

Per Google's current policy, an account created after Nov 13, 2023
cannot go straight to production — it must run a closed test with
**12+ opted-in testers for 14 consecutive days** before applying for
production access.

1. Play Console → Testing → Closed testing → create a track, upload the
   first `production`-profile `.aab` (see "Building for submission"
   below).
2. Add testers by email (Play Console supports a list or a Google
   Group). This can reuse the same people already using the
   `preview`-profile APK per `docs/tester-guide.md` — Android testers
   just need to opt in via the Play Console invite link and actually
   install through Play, not sideload the APK, for it to count.
3. **"Opted in" means accepted the invite AND installed the app under
   that Google account** — an invite alone doesn't count.
4. The 14-day countdown starts once the release is approved by Google
   **and** at least 12 testers have opted in — not from the moment you
   publish the track.
5. Testers don't need to use the app daily, just stay opted in.
6. Once the 14 days pass with 12+ still opted in, apply for production
   access via Play Console's "Production access" flow (a short
   three-section application; Google's review is typically ≤7 days).

## Building for submission

```
npx eas-cli build --platform android --profile production --non-interactive
```

Produces an `.aab` (Android App Bundle), required for Play Store
submission (the `development`/`preview` profiles both build `.apk` for
direct/internal install, which Play Console won't accept for a
Console-managed track). `autoIncrement: true` on the profile means EAS
bumps `versionCode` automatically each production build — no manual
version bookkeeping needed.

Uploading to Play Console itself (`eas submit` or a manual upload) needs
either a Play Console API service-account key (`eas submit` can use
one) or a manual `.aab` upload through the Console UI — set up once a
Developer account exists.
