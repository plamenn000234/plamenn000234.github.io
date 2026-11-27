# Chefsheet 3.0 (alpha)

Svelte 5 + Vite + TypeScript. Built into `../v3/` and served at `/v3/` next to the live 2.x app (`/index.html`).
Both versions share the same data files (`index.json`, `r/`, `learn.json`, `img/`) and the same `bb-*` keys in localStorage,
so storage changes must stay readable by 2.x: add fields, never rename or remove.

```
npm ci
npm run check     # svelte-check
npm run build     # writes ../v3 (commit it)
# serve the repo root, then:
python3 -m http.server 8765 --directory ..
npm test          # Playwright smoke tests (needs the playwright package)
```

- `src/core/`: data (catalog), storage and migrations, router (2.x links redirect), kitchen state, timers, theme.
- `src/tools/registry.svelte.ts`: every tool has one shape (name, group, icon, keywords, component, `fromRecipe`).
  A new tool is one entry plus one component; it shows up in Tools, search, Today pins and the recipe tool strip.
- `src/ui/`: design-system components in the B2 style.
- `src/screens/`: Today, Tools, Kitchen, Recipes, Recipe (workbench), Learn.
- Screens not moved yet (prep list, labels, PDFs, editor, prices, lessons) open in 2.x (`LEGACY` in the router).
