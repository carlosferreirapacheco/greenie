# Demo hosting: Cloudflare Pages + Cloudflare Access

The demo is the Expo **web** build of the app, deployed as a static
site to Cloudflare Pages and gated by Cloudflare Access so that **only
allowlisted email addresses can load it at all**. Uninvited visitors
are blocked before a single byte of the app is served; invited ones
authenticate with a one-time PIN sent to their email.

Both halves are free: Pages' free plan has unlimited static
bandwidth, and Access' free (Zero Trust) plan covers up to 50 users.

## How it fits together

```
push to master
   └─ GitHub Actions (.github/workflows/deploy.yml)
        ├─ npx expo export --platform web   → dist/ (SPA bundle)
        └─ wrangler pages deploy dist       → https://greenie.pages.dev
                                                 └─ Cloudflare Access gate
                                                      └─ app sign-in (Supabase auth + RLS)
```

- The bundle contains only the Supabase URL and publishable key —
  public by design; all data access is enforced by RLS server-side.
- `app.json` sets `web.output: "single"` (SPA): dynamic routes like
  `/user/[id]` are resolved client-side by expo-router. Cloudflare
  Pages serves `index.html` for unmatched paths automatically (its
  SPA convention when no `404.html` exists), so deep links work.
- Signup stays open on the demo intentionally — the Access gate
  already limits who gets that far, and the signup flow (username,
  consent) is part of the demo.
- **A future mobile release does not depend on any of this.** Native
  builds talk directly to Supabase. This hosting is a demo vehicle
  that can later graduate to a production web app, or serve the
  store-required public pages (privacy policy URL, Google Play
  account-deletion link) — those pages would then need to be excluded
  from the Access policy.

## One-time owner setup

### 1. Cloudflare account + API token
1. Create a free account at https://dash.cloudflare.com/sign-up.
2. Note your **Account ID** (dashboard → Workers & Pages → right
   sidebar, or the URL after `/dash.cloudflare.com/`).
3. Create an API token: My Profile → API Tokens → Create Token → use
   the **"Cloudflare Pages — Edit"** template (or a custom token with
   `Account → Cloudflare Pages → Edit`). Copy the token.

### 2. GitHub repository configuration
Repo → Settings → Secrets and variables → Actions:

| Kind | Name | Value |
|---|---|---|
| Secret | `CLOUDFLARE_API_TOKEN` | the token from step 1.3 |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | the account id from step 1.2 |
| Variable | `EXPO_PUBLIC_SUPABASE_URL` | same value as local `.env` |
| Variable | `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | same value as local `.env` |

### 3. First deploy
Either re-run the **Deploy demo** workflow (Actions tab →
"Deploy demo" → Run workflow) or push anything to `master`. The first
deploy creates the `greenie` Pages project and prints the URL
(`https://greenie.pages.dev` or `https://greenie-<hash>.pages.dev`).

### 4. Turn on the Access gate  ← the actual security step
1. Cloudflare dashboard → Workers & Pages → **greenie** → Settings →
   scroll to **Access policy** → Enable. This protects every
   `*.greenie.pages.dev` URL, including preview deployments.
2. Zero Trust dashboard (one-time: pick any team name, choose the
   **Free** plan) → Access → Applications → the auto-created
   application → Policies → edit:
   - Action: **Allow**
   - Include: **Emails** → list every address you want to admit
     (yours + each invited guest).
3. Done. Visiting the demo now shows Cloudflare's login page; entering
   an allowlisted email delivers a one-time PIN; anything else is
   rejected.

### 5. Inviting / removing someone later
Zero Trust → Access → Applications → policy → add or remove their
email. Takes effect immediately (sessions last 24h by default).

## Day-to-day
- Every merge to `master` redeploys the demo automatically.
- Manual refresh: Actions → Deploy demo → Run workflow.
- Local dry run of exactly what CI builds:
  `npx expo export --platform web && node scripts/patch-dist-for-pages.js`
  then `npx serve dist`.

## Gotcha: fonts and the node_modules upload skip

`wrangler pages deploy` silently skips any `node_modules` directory,
but Expo's web export emits its font assets under
`dist/assets/node_modules/...` — deploying without the patch step drops
every font and the live app falls back to system fonts.
`scripts/patch-dist-for-pages.js` renames that folder to
`assets/vendor` and rewrites the bundle references; the deploy workflow
runs it automatically after the export. A healthy deploy uploads ~45+
files, not 4.
