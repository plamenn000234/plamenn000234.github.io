<script lang="ts">
  // The page a guest sees after scanning the QR code: the menu's dishes and their allergens, read-only.
  import { ALG } from "../core/constants";
  import { readGuest } from "../core/guest";
  import { router } from "../core/router.svelte";
  const g = readGuest(router.route.q.get("d"));
  let avoid = $state(new Set<number>());
  const AK = Object.keys(ALG).map(Number);
  function tog(a: number) { const s = new Set(avoid); s.has(a) ? s.delete(a) : s.add(a); avoid = s; }
  const list = $derived(g ? g.dishes.map((d) => ({ ...d, bad: d.algs.some((a) => avoid.has(a)) })) : []);
  const nOk = $derived(list.filter((d) => !d.bad).length);
</script>
<div class="gp">
  {#if !g || !g.dishes.length}
    <h1>Menu not found</h1><p class="note">This link is not complete. Please ask your server for the allergen information.</p>
  {:else}
    <p class="eyebrow">Allergens</p>
    <h1>{g.name || "Our menu"}</h1>
    <p class="note">Tap what you cannot eat. Dishes that contain it are marked.</p>
    <div class="al">{#each AK as a}<button aria-pressed={avoid.has(a)} onclick={() => tog(a)}>{ALG[a]}</button>{/each}</div>
    {#if avoid.size}<p class="cnt">{nOk} of {list.length} dishes are free from what you selected</p>{/if}
    <ul>{#each list as d}<li class:bad={d.bad}>
      <div><b>{d.t}</b>{#if d.s}<small>{d.s}</small>{/if}{#if d.diet}<em>{d.diet === 2 ? "Vegan" : "Vegetarian"}</em>{/if}</div>
      <p class="tags">{#if d.algs.length}{#each d.algs as a}<span class:hit={avoid.has(a)}>{ALG[a]}</span>{/each}{:else}<span class="none">None of the 14 allergens</span>{/if}</p>
    </li>{/each}</ul>
    <p class="disc">Allergens come from the recipe ingredients (EU list of 14). Traces can be present from the kitchen. Please tell your server about any allergy before you order.</p>
  {/if}
  <p class="by">Chefsheet</p>
</div>
<style>
  .gp { max-width: 640px; margin: 0 auto; padding: calc(var(--sat, 0px) + 28px) 18px 40px; }
  .eyebrow { color: var(--accent); }
  h1 { font-size: clamp(28px, 8vw, 38px); margin: 6px 0 8px; line-height: 1.15; }
  .al { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 6px; }
  .al button { border: 0; border-radius: 999px; padding: 9px 14px; background: var(--surface); box-shadow: var(--sh-1); color: var(--ink); font-size: 14.5px; }
  .al button[aria-pressed="true"] { background: var(--warn); color: #fff; }
  .cnt { margin: 10px 0 0; font-weight: 600; font-size: 15px; }
  ul { list-style: none; margin: 16px 0 0; padding: 0; display: grid; gap: 10px; }
  li { padding: 14px 16px; border-radius: var(--r-m, 16px); background: var(--surface); box-shadow: var(--sh-1); display: grid; gap: 8px; }
  li > div { display: grid; gap: 2px; } li b { font: 600 17px/1.3 var(--f-display); } li small { font-size: 13px; color: var(--muted); }
  li em { font-style: normal; font-size: 12px; font-weight: 700; color: var(--ok); text-transform: uppercase; letter-spacing: .05em; }
  li.bad { box-shadow: var(--sh-1), inset 4px 0 0 var(--warn); } li.bad b { color: var(--warn); }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .tags span { font-size: 12.5px; padding: 4px 10px; border-radius: 999px; background: var(--sunk); color: var(--ink-2); }
  .tags span.hit { background: var(--warn); color: #fff; } .tags .none { color: var(--ok); }
  .disc { margin-top: 20px; font-size: 13px; color: var(--muted); line-height: 1.5; }
  .by { margin-top: 24px; text-align: center; font-size: 12px; color: var(--muted); }
</style>
