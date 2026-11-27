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
  import Learn from "./screens/Learn.svelte";
  import Prep from "./screens/Prep.svelte";
  import Suppliers from "./screens/Suppliers.svelte";
  import Prices from "./screens/Prices.svelte";
  import { router } from "./core/router.svelte";
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
  {:else if rt.view === "learn"}<Learn />
  {:else if rt.view === "prep"}<Prep />
  {:else if rt.view === "suppliers"}<Suppliers />
  {:else if rt.view === "prices"}{#key rt.arg}<Prices rid={rt.arg} />{/key}
  {/if}
</main>
<TabBar place="bottom" />
<TimerBar />
<Toast />
<Search bind:open={searching} />
<style>
  .boot { display: grid; justify-items: center; gap: 14px; padding-top: 30vh; text-align: center; }
  .ink { width: 46px; height: 46px; border-radius: 50%; border: 2px solid var(--line); border-top-color: var(--accent); animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
