# Finishing email delivery (Resend SMTP + Confirm email)

Real email delivery has been on hold since early development: the
Supabase built-in email sender's rate limit (a couple sends/hour) is
too low to test signup repeatedly, so "Confirm email" has been off and
every account auto-confirms. That's fine for solo dev testing, but
external testers create real accounts and need working signup
confirmation, password reset, and account-deletion OTP emails. This is
a one-time owner runbook — none of it can be done from this repo or by
an agent, since it requires your own Resend and Supabase dashboard
logins.

The provider is already decided: **Resend**, chosen over
Brevo/Postmark/Mailgun/SendGrid.

## 1. Verify a sending domain in Resend

Resend's free test address (`onboarding@resend.dev`) can only deliver
to the email the Resend account itself was signed up with — it cannot
reach real testers. To send to arbitrary inboxes you need a verified
domain:

1. https://resend.com/domains → **Add Domain**.
2. Use any domain you control. It doesn't need to be the app's domain —
   a subdomain like `mail.<your-domain>` works well and keeps the DNS
   change isolated from anything else already on that domain.
3. Resend gives you a handful of DNS records (SPF `TXT`, DKIM `CNAME`s,
   sometimes a `MX` for return-path). Add them at your DNS provider.
4. Wait for propagation, then click **Verify** in Resend — usually
   minutes, occasionally longer depending on your DNS host's TTLs.
5. Once verified, note an address on that domain to send from, e.g.
   `noreply@mail.<your-domain>`.

## 2. Configure custom SMTP in Supabase

**Authentication → Emails → SMTP Settings** (dashboard):
- Enable custom SMTP.
- Host: `smtp.resend.com`, Port: `465` (or `587`), Username: `resend`,
  Password: a Resend API key (**Resend → API Keys → Create**; "Sending
  access" scope is enough).
- Sender email: the verified address from step 1. Sender name:
  whatever you want testers to see (e.g. "Greenie").
- Save, then use Supabase's "Send test email" if offered, or just do
  the live signup test in step 5.

## 3. Add the code to the Magic Link template

**Authentication → Email Templates → Magic Link**. The default
template only contains a link; the account-deletion flow
(`requestAccountDeletion()` / `confirmPasswordlessAccountDeletion()` in
`lib/supabase/auth.ts`) relies on the 6-digit code, not the link. Add
`{{ .Token }}` somewhere in the template body so the emailed code is
actually visible.

## 4. Re-enable Confirm email

**Authentication → Providers → Email** (or the general Auth settings
page, depending on current dashboard layout) → toggle **Confirm
email** back on.

Once this is on, a fresh signup no longer returns a session
immediately — `app/sign-up.tsx` already handles this correctly (see
`signUpWithEmail()` in `lib/supabase/auth.ts` returning `session:
null`, which flips the screen to its existing "Check your email to
confirm your account, then sign in." state), so no app code changes
are needed for this step.

## 5. Verify end-to-end

- Sign up a brand-new test account (real inbox you can check) and
  confirm the confirmation email arrives with a working link, and that
  clicking it actually signs you in.
- From Settings → Danger zone, start account deletion and confirm the
  OTP email arrives with a visible 6-digit code (not just a bare
  link) — proves step 3 took effect.
- If using an existing account that already links to Google (see
  `docs/google-oauth.md`), note the identity-linking caveat there: once
  Confirm email is on, Google sign-in only auto-links to an existing
  password account if that account's email is already verified — a
  never-confirmed pre-existing account stops being a linking target.

## Notes

- This only affects **new** signups going forward and any future
  password-reset/account-deletion email. It does not retroactively
  "unconfirm" any of the accounts that were auto-confirmed before this
  was turned on.
- Once this is verified working, the corresponding checklist items
  under "Public launch / production readiness" in `CLAUDE.md` (re-enable
  Confirm email, finish SMTP setup, Magic Link template) should be
  marked done.
