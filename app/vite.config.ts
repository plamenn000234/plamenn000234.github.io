import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// 3.0 is served from /v3/ next to the live 2.x app. Data files (index.json, r/, learn.json, img/) stay at the site root.
export default defineConfig({
  base: "/v3/",
  plugins: [svelte()],
  build: { outDir: "../v3", emptyOutDir: true, target: "es2020", assetsInlineLimit: 0 },
});
