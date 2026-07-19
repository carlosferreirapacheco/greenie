# Greenie — tester guide

Thanks for helping test the app. This is a real build, not a demo — the
app talks to the same backend it will use going forward, so treat your
account as a real one.

## Installing (Android only, for now)

1. Open the install link Carlos sent you on your Android phone.
2. Android will likely warn about installing from an unknown source —
   this is expected for a build shared outside the Play Store; allow it
   for this install.
3. Once installed, open the app like any other.

There's no iOS build yet.

## Signing up

Use **email + password** to create your account — it's the most
reliable path right now. "Continue with Google" also works for some
accounts, but Google's consent screen is still in testing mode behind
the scenes, so it may reject sign-in for anyone not already added as a
tester; if it bounces you back to the sign-in screen, use email/password
instead.

You'll need to confirm your email address after signing up (check your
inbox for a confirmation link) before you can sign in.

## A few things worth knowing

- **This is one shared app**, not a separate sandbox per tester. Your
  plants, progress reports, and profile are visible to other testers
  the same way they'd be visible to any real user — governed by the
  app's normal privacy settings (Settings → Privacy), which default to
  public. If you'd rather keep things private while testing, set your
  profile to private there.
- **The "Look up with AI" plant-identification feature shares one API
  key across everyone testing.** It should hold up fine for a small
  group, but if it ever seems slow or starts failing, that's likely why
  — let Carlos know.
- Push notifications, care-task reminders, and everything else are the
  real production features — no test-mode shortcuts.

## Feedback

Send bugs, confusing moments, or anything else straight to Carlos.
