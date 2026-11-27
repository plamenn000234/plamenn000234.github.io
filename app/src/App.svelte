<script lang="ts">
  import TopBar from "./ui/TopBar.svelte";
  import TimerBar from "./ui/TimerBar.svelte";
  import TabBar from "./ui/TabBar.svelte";
  import Toast from "./ui/Toast.svelte";
  import Search from "./ui/Search.svelte";
  import Today from "./screens/Today.svelte";
  import Tools from "./screens/Tools.svelte";
  import Tool from "./screens/Tool.svelte";
  import Kitchen from "./screens/Kitchen.svelte";
  import Recipes from "./screens/Recipes.svelte";
  import Recipe from "./screens/Recipe.svelte";
  import Tour from "./ui/Tour.svelte";
  import { tour } from "./core/tour.svelte";
  import Lazy from "./ui/Lazy.svelte";
  import { router } from "./core/router.svelte";
  const L = {
    Prep: () => import("./screens/Prep.svelte"),
    Suppliers: () => import("./screens/Suppliers.svelte"),
    Haccp: () => import("./screens/Haccp.svelte"),
    Prices: () => import("./screens/Prices.svelte"),
    Editor: () => import("./screens/Editor.svelte"),
    Cook: () => import("./screens/Cook.svelte"),
    Module: () => import("./screens/Module.svelte"),
    Lesson: () => import("./screens/Lesson.svelte"),
    Quiz: () => import("./screens/Quiz.svelte"),
    Review: () => import("./screens/Review.svelte"),
    Settings: () => import("./screens/Settings.svelte"),
    Learn: () => import("./screens/Learn.svelte"),
  };
  import { load } from "./core/catalog";
  let ready = $state(false), err = $state(""), searching = $state(false);
  load().then(() => (ready = true)).catch((e) => (err = String(e?.message || e)));
  const rt = $derived(router.route);
  addEventListener("keydown", (e) => { if ((e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) && !(e.target as HTMLElement)?.closest("input,textarea,select")) { e.preventDefault(); searching = true; } });
</script>
<TopBar onsearch={() => (searching = true)} />
<main style="view-transition-name: main">
  {#if err}
    <div class="page boot"><h2>Could not load the recipe library</h2><p class="note">Check your connection and reload. ({err})</p></div>
  {:else if !ready}
    <div class="page boot"><div class="ink"></div><p class="note">Loading the recipe library…</p></div>
  {:else if rt.view === "today"}<Today />
  {:else if rt.view === "tools"}<Tools />
  {:else if rt.view === "tool"}{#key rt.arg}<Tool id={rt.arg} />{/key}
  {:else if rt.view === "kitchen"}<Kitchen />
  {:else if rt.view === "recipes"}{#key rt.arg}<Recipes />{/key}
  {:else if rt.view === "recipe"}<Recipe id={rt.arg} />
  {:else if rt.view === "learn"}<Lazy load={L.Learn} />
  {:else if rt.view === "cook"}{#key rt.arg}<Lazy load={L.Cook} id={rt.arg} />{/key}
  {:else if rt.view === "module"}{#key rt.arg}<Lazy load={L.Module} id={rt.arg} />{/key}
  {:else if rt.view === "lesson"}{#key rt.arg}<Lazy load={L.Lesson} id={rt.arg} />{/key}
  {:else if rt.view === "quiz"}{#key rt.arg}<Lazy load={L.Quiz} id={rt.arg} />{/key}
  {:else if rt.view === "review"}<Lazy load={L.Review} />
  {:else if rt.view === "settings"}<Lazy load={L.Settings} />
  {:else if rt.view === "prep"}<Lazy load={L.Prep} />
  {:else if rt.view === "suppliers"}<Lazy load={L.Suppliers} />
  {:else if rt.view === "haccp"}<Lazy load={L.Haccp} />
  {:else if rt.view === "editor"}{#key rt.arg}<Lazy load={L.Editor} id={rt.arg.startsWith("+") ? "" : rt.arg} semi={rt.arg === "+semi"} />{/key}
  {:else if rt.view === "prices"}{#key rt.arg}<Lazy load={L.Prices} rid={rt.arg} />{/key}
  {/if}
</main>
<TabBar place="bottom" />
<TimerBar />
<Toast />
<Search bind:open={searching} />
{#if ready && tour.on && rt.view !== "cook"}<Tour />{/if}
<style>
  .boot { display: grid; justify-items: center; gap: 14px; padding-top: 30vh; text-align: center; }
  .ink { width: 46px; height: 46px; border-radius: 50%; border: 2px solid var(--line); border-top-color: var(--accent); animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
