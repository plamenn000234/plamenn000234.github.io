<script lang="ts">
  import Dish from "./Dish.svelte";
  import Icon from "./Icon.svelte";
  import { D, type Recipe } from "../core/catalog";
  import { ALG } from "../core/constants";
  import { favs } from "../core/kitchen.svelte";
  let { r }: { r: Recipe } = $props();
</script>
<a class="row" href="#r-{r.id}">
  <Dish kind={r.ty[1]} size={56} />
  <span class="tx">
    <b>{r.t}</b>
    {#if r.s}<small class="s">{r.s}</small>{/if}
    <small class="meta"><span>{D.folders[r.f][0]}</span><span>{r.N} portions</span>{#if r.kcal}<span>{r.kcal} kcal</span>{/if}{#if r.diet === 2}<span class="veg">Vegan</span>{:else if r.diet === 1}<span class="veg">Vegetarian</span>{/if}{#if r.algs.length}<span title={r.algs.map((a) => ALG[a]).join(", ")}>{r.algs.length} allergen{r.algs.length > 1 ? "s" : ""}</span>{/if}</small>
  </span>
  {#if favs.v.includes(r.id)}<span class="fav"><Icon name="star" size={16} /></span>{/if}<span class="chev"><Icon name="fwd" size={16} /></span>
</a>
<style>
.row { display: flex; align-items: center; gap: 14px; padding: 12px 16px; background: var(--surface); color: var(--ink); transition: background .15s; }
  @media (hover: hover) { .row:hover { background: var(--raised); } }
  .row:active { background: var(--sunk); }
  .tx { flex: 1; min-width: 0; display: grid; gap: 2px; }
  b { font: 600 16px/1.3 var(--f-display); letter-spacing: .01em; }
  .s { font-size: 13px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .meta { display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 12px; color: var(--muted); margin-top: 3px; }
  .veg { color: var(--ok); }
  .fav { color: var(--accent); }
  .fav :global(path) { fill: currentColor; }
  .chev { color: var(--line); }
</style>
