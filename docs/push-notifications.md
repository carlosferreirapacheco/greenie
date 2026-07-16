# Push notifications — owner setup runbook

Real OS push (migration `0020_push_notifications.sql` + the `send-push`
Edge Function) works end-to-end only after the one-time owner steps
below. Until they're done the app degrades gracefully: notifications
keep landing in the in-app inbox, the client's token registration
fails silently, and the DB webhook trigger no-ops without its secret.

## How it fits together

```
notifications insert (social triggers / hourly care-due cron)
  → push_notification_webhook trigger (pg_net async POST)
    → send-push Edge Function (service role)
      → Expo push API → FCM → device
```

- The trigger authenticates to `send-push` with a bearer secret read
  from Supabase Vault (`push_webhook_secret`); the function compares
  it against its `PUSH_WEBHOOK_SECRET` secret. The secret exists in
  those two places only — never in the repo.
- Devices register their Expo push token into `push_tokens` on app
  start (see `lib/pushNotificationManager.ts`).

## 1. Webhook secret (Supabase)

Generate one random string and put it in both places:

1. **Vault**: SQL editor →
   `select vault.create_secret('<secret>', 'push_webhook_secret');`
2. **Edge Function secret**: Dashboard → Edge Functions → Secrets →
   add `PUSH_WEBHOOK_SECRET` = the same value
   (or `npx supabase secrets set PUSH_WEBHOOK_SECRET=<secret>`).

## 2. FCM V1 (Firebase, required for Android delivery)

Expo's push service delivers to Android through Firebase Cloud
Messaging; Expo needs a service-account key for your Firebase project.

1. [Firebase console](https://console.firebase.google.com) → create a
   project (any name, e.g. `greenie`).
2. Project settings → General → *Add app* → Android, package name
   `com.hederahelix.greenie`. Download `google-services.json` into the
   repo root and commit it (it holds public identifiers, not secrets —
   Google and Expo both document it as safe to commit), then add to
   `app.json` under `expo.android`:
   `"googleServicesFile": "./google-services.json"`.
3. Project settings → Service accounts → *Generate new private key*
   (downloads a JSON key — this one IS a secret, do not commit).
4. Upload it to Expo: `npx eas-cli credentials` → Android →
   the project → *Google Service Account* → *Manage your Google
   Service Account Key For Push Notifications (FCM V1)* → upload the
   key file. (Runs with `EXPO_TOKEN` from `.env` like every other EAS
   command.)
5. **Fresh EAS build** — `googleServicesFile` is native config, so the
   installed dev build must be rebuilt once:
   `npx eas-cli build --platform android --profile development`.

## 3. Verify

- Sign in on the device → a row appears in `push_tokens`.
- From another account, like one of the device user's reports → the
  device gets the push; tapping opens the report.
- Settings → Notifications → "Push notifications" Off → the token row
  disappears and pushes stop (the in-app inbox keeps filling).

## Troubleshooting

- **No `push_tokens` row**: FCM not set up (token issuance fails
  silently by design), notification permission denied, or the push
  toggle is off.
- **Row exists but no push**: check `net._http_response` for the
  webhook call result and the `send-push` function logs; an
  `InvalidCredentials` ticket from Expo means the FCM service-account
  key is missing/wrong.
- **`DeviceNotRegistered` tickets**: normal after uninstalls — the
  function deletes those token rows automatically.
