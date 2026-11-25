# Batchbook

Professional recipes at any batch size: 4,900+ technical recipe cards, supplier order lists and kitchen training.
Installable web app (PWA), packaged for Google Play as a Trusted Web Activity.

Live: https://plamenn000234.github.io/batchbook

## Files
| Path | What it is |
|---|---|
| `index.html` | The app |
| `index.json` | Recipe index (titles, allergens, products) |
| `r/*.json` | Recipe details, one file per collection |
| `learn.json` | Lessons, tests, glossary |
| `sw.js`, `manifest.json`, `icon-*.png` | Offline cache and install data |
| `privacy.html` | Privacy policy (link in Play Console) |
| `store/assetlinks.json` | Links the Play app to the site. Goes to a second repo `plamenn000234.github.io` at `.well-known/assetlinks.json` |
| `store/` | Play listing text, Data safety answers, icon, feature graphic, screenshots |

## Publish to Google Play
1. Settings → Pages → Source: **Deploy from a branch**, branch `main`, folder `/ (root)`. Wait for https://plamenn000234.github.io/batchbook/ to open.
2. Open https://www.pwabuilder.com, enter the site URL, **Package for stores → Android**.
   Package ID `app.batchbook.twa`, app name `Batchbook`, version `1.0.0` (code 1). Download the zip and keep the **signing key** and its passwords safe.
3. Copy the SHA-256 fingerprint from the PWABuilder zip into `store/assetlinks.json`. Google checks it at the domain root, so it is published from a second repo named `plamenn000234.github.io` as `.well-known/assetlinks.json` (with an empty `.nojekyll`).
4. Play Console → Create app → upload the `.aab` to **Closed testing** (12 testers × 14 days).
5. After upload, copy the **App signing key SHA-256** (Setup → App integrity) into the same `assetlinks.json` as the second fingerprint.
6. Fill the store listing from `store/listing.md` and App content from `store/data-safety.md`.

## Update the app
Replace the changed files and push. Raise `V` in `sw.js` (e.g. `bb-v20`) so phones download the new version.

© 2026 Batchbook. All rights reserved. Recipes, texts and code may not be copied or redistributed without permission.
