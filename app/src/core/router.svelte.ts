// Hash routes. 2.x links (#r-…, #quiz-…, #tool-…, #order, #fav …) keep working.
export type Tab = "today" | "tools" | "kitchen" | "recipes" | "learn" | "app";
export interface Route { tab: Tab; view: string; arg: string; q: URLSearchParams }

const REDIRECT: Record<string, string> = { "#order": "#kitchen", "#orders": "#kitchen-saved", "#fav": "#recipes-fav", "#home": "#today", "#browse": "#recipes" };


export function parse(h: string): Route {
  h = REDIRECT[h] || h;
  const qi = h.indexOf("?"); const q = new URLSearchParams(qi >= 0 ? h.slice(qi + 1) : ""); if (qi >= 0) h = h.slice(0, qi);
  const m = (p: string) => h.startsWith(p) ? h.slice(p.length) : null;
  let a: string | null;
  if (!h || h === "#" || h === "#today") return { tab: "today", view: "today", arg: "", q };
  if (h === "#tools") return { tab: "tools", view: "tools", arg: "", q };
  if ((a = m("#tool-")) != null) return { tab: "tools", view: "tool", arg: a, q };
  if (h === "#kitchen") return { tab: "kitchen", view: "kitchen", arg: "", q };
  if ((a = m("#kitchen-")) != null) return { tab: "kitchen", view: "kitchen", arg: a, q };
  if (h === "#prep") return { tab: "kitchen", view: "prep", arg: "", q };
  if (h === "#stock") return { tab: "kitchen", view: "stock", arg: "", q };
  if (h === "#haccp") return { tab: "kitchen", view: "haccp", arg: "", q };
  if (h === "#suppliers") return { tab: "kitchen", view: "suppliers", arg: "", q };
  if (h === "#prices") return { tab: "kitchen", view: "prices", arg: "", q };
  if ((a = m("#prices-")) != null) return { tab: "recipes", view: "prices", arg: a, q };
  if (h === "#new" || h === "#new-semi") return { tab: "recipes", view: "editor", arg: h === "#new-semi" ? "+semi" : "+", q };
  if ((a = m("#edit-")) != null) return { tab: "recipes", view: "editor", arg: a, q };
  if (h === "#recipes") return { tab: "recipes", view: "recipes", arg: "", q };
  if (h === "#recipes-fav") return { tab: "recipes", view: "recipes", arg: "fav", q };
  if (h === "#recipes-have") return { tab: "recipes", view: "recipes", arg: "have", q };
  if ((a = m("#c-")) != null) return { tab: "recipes", view: "recipes", arg: "c:" + a, q };
  if ((a = m("#cook-")) != null) return { tab: "recipes", view: "cook", arg: a, q };
  if ((a = m("#r-")) != null) return { tab: "recipes", view: "recipe", arg: a, q };
  if (h === "#guest") return { tab: "app", view: "guest", arg: "", q };
  if (h === "#settings") return { tab: "app", view: "settings", arg: "", q };
  if (h === "#learn") return { tab: "learn", view: "learn", arg: "", q };
  if (h === "#onboard-new") return { tab: "learn", view: "onboard", arg: "", q };
  if (h === "#welcome") return { tab: "learn", view: "welcome", arg: "", q };
  if (h === "#review") return { tab: "learn", view: "review", arg: "", q };
  if ((a = m("#m-")) != null) return { tab: "learn", view: "module", arg: a, q };
  if ((a = m("#l-")) != null) return { tab: "learn", view: "lesson", arg: a, q };
  if ((a = m("#quiz-")) != null) return { tab: "learn", view: "quiz", arg: a, q };
  return { tab: "today", view: "today", arg: "", q };
}

import { flushSync } from "svelte";

class Router {
  hash = $state(location.hash);
  route = $derived(parse(this.hash));
  constructor() {
    const fix = (anim: boolean) => {
      const h = location.hash, qi = h.indexOf("?"), base = qi >= 0 ? h.slice(0, qi) : h;
      if (REDIRECT[base]) history.replaceState(null, "", REDIRECT[base] + (qi >= 0 ? h.slice(qi) : ""));
      const next = location.hash; if (next === this.hash) return;
      const d: any = document;
      if (anim && d.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) { const t = d.startViewTransition(() => flushSync(() => (this.hash = next))); t.ready?.catch(() => {}); t.finished?.catch(() => {}); t.updateCallbackDone?.catch(() => {}); }
      else this.hash = next;
    };
    fix(false);
    addEventListener("hashchange", () => fix(true));
  }
  go(h: string) { if (location.hash === h) this.hash = h; else location.hash = h; }
}
export const router = new Router();
