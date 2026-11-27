import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
export default {
  preprocess: vitePreprocess(),
  // Tool components set their defaults on the state object they get once; that is intended.
  compilerOptions: { warningFilter: (w) => !(w.code === "state_referenced_locally" && /[\\/]tools[\\/]/.test(w.filename || "")) },
};
