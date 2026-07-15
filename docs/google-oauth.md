# Google OAuth (web + native)

"Continue with Google" on the sign-in and sign-up screens works on both
web and native now, via two different mechanisms behind the same
`signInWithGoogle()` (`lib/supabase/auth.ts`):

- **Web**: a full-page redirect through
  `https://<project>.supabase.co/auth/v1/authorize?provider=google` to
  Google's consent screen and back to the app, where supabase-js picks
  the session out of the return URL (`detectSessionInUrl` is enabled on
  web only — see `lib/supabase/client.ts`).
- **Native (iOS/Android)**: `expo-web-browser`'s `openAuthSessionAsync()`
  opens the same Supabase authorize URL in an in-app browser tab
  (`skipBrowserRedirect: true` so Supabase returns the URL instead of
  trying a web-only redirect). The redirect target is
  `expo-auth-session`'s `makeRedirectUri({ path: "redirect" })`, which
  resolves to `greenie://redirect` under this app's own EAS development
  build (see the "Real device deployment" backlog entry below) — the
  explicit `path` matters: verified live that a bare `scheme://` with no
  path doesn't get reliably caught by Android's redirect-matching inside
  `openAuthSessionAsync` (the browser tab never returned control to the
  app). Once the browser tab redirects there, the tokens are parsed out
  of the URL fragment (`expo-auth-session/build/QueryParams`'s
  `getQueryParams()`, the same implicit-grant shape the web flow's
  `detectSessionInUrl` already handles) and set via
  `supabase.auth.setSession()`. Android also delivers this same deep
  link to `expo-router`'s own navigation in parallel with
  `openAuthSessionAsync` capturing it for the auth session — without a
  matching route, that surfaces as an "Unmatched Route" error screen
  even though the sign-in itself already succeeded underneath it. Fixed
  by `app/redirect.tsx`, a route that exists purely to give that
  deep link a harmless landing spot (bounces to `/`, letting
  `app/_layout.tsx`'s session-based redirect take over) — it does no
  auth work itself, all of that happens in `signInWithGoogleNative()`.

**Google Cloud Console needs no change for native.** Google's OAuth
redirect always goes to Supabase's own fixed callback
(`https://bcmlhuljvuvrpylfdrkk.supabase.co/auth/v1/callback`), identical
to the web flow — the app-side redirect only matters for the *second*
hop, from Supabase back into the app.

**Supabase does need an addition: `greenie://redirect`**, added once to
Authentication → URL Configuration → Redirect URLs (an owner/dashboard
action). Unlike an Expo Go connection (which would tie this to the dev
machine's LAN IP, changing across networks), a real device build gets a
stable, scheme-only redirect that doesn't need re-adding.

## First sign-in: the welcome screen

Google signups skip the sign-up form, so they also skip its username
choice and privacy-consent checkbox. The `handle_new_user()` trigger
gives them a generated `user_<id-prefix>` username and seeds
`display_name` from Google's `full_name`; the root layout then routes
any account with `accepted_privacy_at = null` to `/welcome`, where the
user reviews the display name, customizes the username (the
by-design cooldown-free first change), and accepts the privacy policy.

The same gate covers **pre-existing accounts** created before consent
tracking existed — they see the welcome screen once on their next
sign-in. That is the consent rollout, not a bug.

## One-time owner setup (only you can do these)

### 1. Google Cloud Console
1. https://console.cloud.google.com → create (or pick) a project.
2. First time only: **APIs & Services → OAuth consent screen** —
   External, app name "Greenie", your email, default scopes, add
   yourself as a test user while the app is unverified.
3. **APIs & Services → Credentials → Create credentials → OAuth client
   ID**, application type **Web application**:
   - Authorized JavaScript origins:
     - `http://localhost:8081`
     - `https://greenie-cwb.pages.dev`
   - Authorized redirect URI:
     - `https://bcmlhuljvuvrpylfdrkk.supabase.co/auth/v1/callback`
4. Copy the **Client ID** and **Client Secret**.

### 2. Supabase dashboard
1. **Authentication → Providers → Google**: enable, paste the Client
   ID and Client Secret, save.
2. **Authentication → URL Configuration**: add to **Redirect URLs**:
   - `http://localhost:8081`
   - `https://greenie-cwb.pages.dev`

### 3. Verify
- Click "Continue with Google" on the sign-in screen → Google consent
  screen → pick your account → you land back in the app on `/welcome`
  with your Google name pre-filled → accept → Plants.
- Before the setup, the same click bounces straight back to the app
  (Supabase answers "Unsupported provider: provider is not enabled").

## Existing accounts: automatic identity linking

Signing in/up with Google using an email that already belongs to an
account **links up, it does not duplicate**: Supabase Auth's automatic
identity linking (default behavior, no configuration) finds the
existing user by verified email and attaches the Google identity to it
(`auth.identities`, not a new `auth.users` row). Consequences:

- The user lands in their existing account — same profile, username,
  plants, everything. `handle_new_user()` doesn't fire (no new user is
  inserted), so nothing gets overwritten.
- Email/password sign-in continues to work alongside Google.
- The welcome screen appears only if that account never accepted the
  privacy policy — same rule as any sign-in.
- **Caveat**: linking requires the existing account's email to be
  *verified*. Today every account is auto-confirmed ("Confirm email"
  is disabled), so this always holds. When confirmations are
  re-enabled (see the SMTP backlog item), an account that never
  confirmed its email is not a linking target — Supabase instead
  removes such unconfirmed identities to prevent pre-account-takeover.

Suggested test once the provider is configured: create a password
account with your Gmail address, sign out, then "Continue with
Google" with that same Gmail — you should land in the SAME account
(same username/plants), and the old password should still work.

## Notes
- The demo (greenie-cwb.pages.dev) sits behind Cloudflare Access — a
  Google-OAuth demo user must ALSO be on the Access allowlist to reach
  the app at all. The two logins are unrelated layers.
- Account deletion works for Google-only accounts: since they have no
  password, Settings detects it (no `email` identity) and confirms
  deletion with the emailed one-time code plus typing the account's
  @username (a deliberateness check — the code is the security
  factor). Accounts with a password, including linked Google+password
  ones, keep the password + code flow.
