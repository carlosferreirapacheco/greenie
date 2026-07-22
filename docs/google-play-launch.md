# Google Play launch — submission runbook

A reference for filling out Play Console's own forms accurately and
quickly. This doc doesn't replace Play Console — it's prep so each
section there is a copy/adjust job instead of a research project.

## Pre-flight checklist

- [ ] **Play Developer account registered** ($25 one-time). No account
  exists yet as of this doc — see "Closed testing" below, since a new
  personal account cannot publish straight to production.
- [ ] **Privacy policy legally reviewed.** `app/privacy-policy.tsx` is
  still marked "Draft — requires review before public launch." Don't
  submit for production review until that's resolved.
- [ ] **Target API level compliant.** Google requires new apps to target
  Android 15 (API level 35) or higher as of this writing. Expo SDK 57
  should already meet this, but confirm from the actual EAS build
  output rather than assuming — check the build logs
  (`eas build:view <build-id>` or the Expo dashboard) for the Gradle
  `targetSdkVersion` it compiled against. If it's below the current
  requirement, bump the Expo SDK before submitting.
- [ ] **Google OAuth consent screen moved to production.** Currently
  "Testing" status (`docs/google-oauth.md`), which caps sign-in to
  manually-added test accounts. Google Cloud Console → APIs & Services
  → OAuth consent screen → Publish App. (Google may require its own
  verification review for some scopes — this app only requests default
  scopes, so it likely doesn't need Google's full verification process,
  but confirm in-console since this depends on Google's current rules.)
- [ ] **Two public URLs ready** (both already live, no work needed):
  - Privacy policy: `<demo-host>/privacy-policy`
  - Account deletion: `<demo-host>/delete-account`
  Play Console's store listing and Data Safety section both ask for a
  privacy policy URL; the Data Safety section also asks whether
  in-app account deletion is available and may ask for the URL if the
  app supports web-based deletion outside the app.

## Data Safety section

Cross-checked against `lib/supabase/gdpr.ts`'s `collectMyData()` —
that function is the actual single source of truth for what this app
stores, so this table won't drift from it silently. Note: that export
(and the privacy policy's "What Greenie stores" section) predates this
session's new `reports` table and doesn't yet mention it, blocks,
plant-sitting, or the notifications inbox — a pre-existing content gap,
not something introduced here; worth a follow-up pass before launch.

| Data type | Collected? | Shared? | Purpose | User can request deletion? |
|---|---|---|---|---|
| Email address | Yes | No (see note below) | Account creation/login, security codes | Yes |
| Name (display name, username) | Yes | No | Account, shown to other users | Yes |
| Photos (profile/plant/progress photos) | Yes | No | Core app functionality | Yes |
| User-generated content (progress reports, comments, bio) | Yes | No | Core app functionality (social features) | Yes |
| App activity (follows, likes, blocks, reports filed) | Yes | No | Core app functionality | Yes |
| Device or other IDs (push notification token) | Yes, if push enabled | Yes — Expo's push service (see note) | Deliver push notifications | Yes (disable push / delete account) |
| Location | **No** — `plants.location` is a free-text field the user types (e.g. "Living room"), not device geolocation | — | — | — |
| Financial info, health info, contacts, messages, calendar, etc. | No | — | — | — |

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
  which needs the device's push token to route notifications.
- The **Support/donation link** (Settings → "Buy me a coffee") is a
  plain outbound link to an external site (buymeacoffee.com) — the app
  never handles payment details itself, so this does **not** trigger
  Play Billing policy and isn't a "financial info" collection point.
  Still worth a one-line mention in the store listing's "About" text
  for transparency (e.g. "Optional external link to support
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

**Category suggestion**: Lifestyle (or House & Home, if Play offers a
closer match at submission time — check current category list).

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
