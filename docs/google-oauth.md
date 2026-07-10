# Google OAuth (web)

"Continue with Google" on the sign-in and sign-up screens uses
Supabase's web OAuth flow: a full-page redirect through
`https://<project>.supabase.co/auth/v1/authorize?provider=google` to
Google's consent screen and back to the app, where supabase-js picks
the session out of the return URL (`detectSessionInUrl` is enabled on
web only — see `lib/supabase/client.ts`).

**Web only for now.** Native (iOS/Android) needs a different mechanism
(`expo-web-browser` + `expo-auth-session` + a custom URL scheme) and is
backlogged until the app targets devices.

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
- Account deletion's password re-auth doesn't work for Google-only
  accounts (they have no password) — a different second factor for
  OAuth users is backlogged.
