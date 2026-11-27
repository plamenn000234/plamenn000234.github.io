# Chefsheet API (Cloudflare Worker + D1)

`worker.js` is the whole server. It is optional for the app: without it everything works offline as before.

## Deploy (Cloudflare dashboard)
1. Workers & Pages → the worker → Edit code → replace everything with `worker.js` → Deploy.
2. Settings → Bindings: D1 database `chefsheet` bound as `DB` (already done).
3. Settings → Variables and Secrets:
   - `GOOGLE_CLIENT_ID` (Text): the Web client ID from Google Cloud (see below).
   - `ADMIN_EMAILS` (Text): emails that may see `/stats` and moderate community recipes, comma separated.
   - `ANTHROPIC_API_KEY` (Secret), only for the photo import later.
4. Tables are created on the first request. No SQL to paste.

## Google sign-in
Google Cloud Console → APIs & Services → OAuth consent screen (External, app name Chefsheet, scopes: email, profile) →
Credentials → Create OAuth client ID → Web application → Authorized JavaScript origins: `https://plamenn000234.github.io`.
Copy the Client ID into `GOOGLE_CLIENT_ID`. The ID is public, it is not a secret.
The Android app needs a native sign-in (WebView blocks Google sign-in): next Android update calls `window.chefsheetGoogle(idToken)`
after `ChefsheetApp.googleSignIn(clientId)`.

## Endpoints
`/auth/google`, `/auth/logout`, `/me` (GET, PATCH, DELETE = delete account and data), `/sync` (cloud copy),
`/kitchens` (create, join, members and roles, `/board` prep board, `/recipes` shared recipes), `/certs` + `/c/<id>` (public check page),
`/community` (list, search, share, report, admin moderation), `/ev` (anonymous counts) + `/stats` (admin), `/import` (photo, needs the key).

## Tests
`node --no-warnings server/test.mjs` runs the API on Node with SQLite in place of D1.
`node --no-warnings server/dev.mjs` serves it on port 8787 for the app tests (sign-in with `dev:<id>:<email>:<name>` tokens; only when `DEV_AUTH=1`, never set on Cloudflare).
