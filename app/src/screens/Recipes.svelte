<script lang="ts">
  import RecipeRow from "../ui/RecipeRow.svelte";
  import Seg from "../ui/Seg.svelte";
  import Icon from "../ui/Icon.svelte";
  import Empty from "../ui/Empty.svelte";
  import Button from "../ui/Button.svelte";
  import { R, D, filtered, folderCount, folderStyle, dishImg, mineFolder } from "../core/catalog";
  import { GROUPS, ALG } from "../core/constants";
  import { favs } from "../core/kitchen.svelte";
  import { router } from "../core/router.svelte";
  let q = $state(router.route.q.get("q") || "");
  let diet = $state(0), sort = $state(0), free = $state(new Set<number>()), low = $state(false), showF = $state(false), shown = $state(40);
  const arg = $derived(router.route.arg);
  const onlyFav = $derived(arg === "fav");
  const coll = $derived(arg.startsWith("c:") ? D.folders.findIndex((f) => f[1] === arg.slice(2)) : -1);
  const browsing = $derived(!!q.trim() || coll >= 0 || onlyFav || diet > 0 || free.size > 0 || low);
  const list = $derived(filtered({ q, coll, diet: [0, 1, 2][diet], free, low, sort: (["rel", "az", "kcal"] as const)[sort], only: onlyFav ? new Set(favs.v) : null }));
  $effect(() => { q; coll; onlyFav; diet; sort; free; low; shown = 40; });
  const nFilters = $derived((diet ? 1 : 0) + free.size + (low ? 1 : 0));
  function toggleAlg(a: number) { const s = new Set(free); s.has(a) ? s.delete(a) : s.add(a); free = s; }
  const groups = GROUPS.map(([g, names]) => [g, names.map((n) => D.folders.findIndex((f) => f[0] === n)).filter((i) => i >= 0)] as [string, number[]]);
</script>
<div class="page">
  <div class="head">
    {#if coll >= 0}<a class="back" href="#recipes"><Icon name="back" size={16} />All recipes</a><h1>{D.folders[coll][0]}</h1>
    {:else if onlyFav}<a class="back" href="#recipes"><Icon name="back" size={16} />All recipes</a><h1>Favourites</h1>
    {:else}<p class="eyebrow">Library</p><h1>Recipes</h1>{/if}
  </div>
  <div class="sbar">
    <label class="sq"><Icon name="search" size={18} /><input type="search" bind:value={q} placeholder="Dish, product or collection" autocomplete="off" aria-label="Search recipes" /></label>
    <Button small icon="more" pressed={showF} onclick={() => (showF = !showF)}>Filters{nFilters ? " · " + nFilters : ""}</Button>
  </div>
  <div class="chips">
    <a class="chip" class:on={onlyFav} href={onlyFav ? "#recipes" : "#recipes-fav"}><Icon name="star" size={14} />Favourites {favs.v.length || ""}</a>
    <a class="chip" class:on={coll === mineFolder()} href={coll === mineFolder() ? "#recipes" : "#c-" + D.folders[mineFolder()][1]}>My recipes {folderCount[mineFolder()] || ""}</a>
    <a class="chip" href="#new">New recipe</a>
    <a class="chip" href="#new-semi">New semi-finished</a>
  </div>
  {#if showF}
    <div class="filters card pad">
      <div><p class="eyebrow">Diet</p><Seg options={["Any", "Vegetarian", "Vegan"]} bind:value={diet} /></div>
      <div><p class="eyebrow">Free from</p><div class="algs">{#each Object.entries(ALG) as [a, n]}<button aria-pressed={free.has(+a)} onclick={() => toggleAlg(+a)}>{n}</button>{/each}</div></div>
      <div class="fr"><label class="ck"><input type="checkbox" bind:checked={low} /> Up to 400 kcal</label><span><span class="eyebrow">Sort</span> <Seg options={["Best match", "A–Z", "Lightest"]} bind:value={sort} /></span></div>
    </div>
  {/if}
  {#if browsing}
    <p class="count note">{list.length.toLocaleString("en")} recipe{list.length === 1 ? "" : "s"}</p>
    {#if list.length}
      <div class="list group">{#each list.slice(0, shown) as r (r.id)}<RecipeRow {r} />{/each}</div>
      {#if list.length > shown}<div class="more"><Button onclick={() => (shown += 60)}>Show more ({list.length - shown})</Button></div>{/if}
    {:else if onlyFav && !favs.v.length}
      <Empty art="fav" title="No favourites yet">Tap the star on a recipe to keep it here.</Empty>
    {:else}
      <Empty art="search" title="Nothing found">Try another word or fewer filters.</Empty>
    {/if}
  {:else}
    <p class="count note">{R.length.toLocaleString("en")} recipes in {D.folders.length} collections</p>
    {#each groups as [g, ids]}
      <section class="sec"><div class="sec-h"><h2>{g}</h2><small class="muted">{ids.length}</small></div>
        <div class="rack">{#each ids as i}<a class="coll" href="#c-{D.folders[i][1]}"><img src={dishImg(folderStyle(i)[1])} alt="" width="72" height="72" loading="lazy" /><span><b>{D.folders[i][0]}</b><small>{folderCount[i]} recipes</small></span></a>{/each}</div>
      </section>
    {/each}
  {/if}
</div>
<style>
  .head { margin: 22px 0 16px; display: grid; gap: 6px; }
  .back { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--muted); }
  .sbar { display: flex; gap: 10px; align-items: center; }
  .sq { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; height: 48px; padding: 0 16px; border-radius: 999px; background: var(--surface); box-shadow: var(--sh-1); color: var(--muted); transition: box-shadow .2s; }
  .sq:focus-within { box-shadow: var(--sh-2), inset 0 0 0 2px var(--ink); color: var(--ink); }
  .sq input { flex: 1; min-width: 0; border: 0; background: transparent; font-size: 16px; outline: none; color: var(--ink); }
  .chips { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; margin: 14px calc(-1 * var(--gap)) 4px; padding: 2px var(--gap) 4px; }
  .chips::-webkit-scrollbar { display: none; }
  .chip { flex: none; display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; background: var(--surface); box-shadow: var(--sh-1); color: var(--ink); font-size: 13.5px; font-weight: 500; transition: transform .15s var(--ease); }
  .chip:active { transform: scale(.95); }
  .chip.on { background: var(--pri); color: var(--pri-ink); }
  .filters { display: grid; gap: 14px; margin-top: 10px; }
  .filters .eyebrow { margin-bottom: 6px; }
  .algs { display: flex; flex-wrap: wrap; gap: 6px; }
  .algs button { border: 0; background: var(--sunk); border-radius: 999px; padding: 7px 12px; font-size: 13px; }
  .algs button[aria-pressed="true"] { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); text-decoration: line-through; }
  .fr { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
  .ck { display: flex; gap: 6px; align-items: center; font-size: 14px; }
  .count { margin: 16px 0 10px; }
  .list { display: grid; max-width: 760px; }
  .more { display: flex; justify-content: center; margin-top: 14px; }
  .rack { display: flex; gap: 12px; overflow-x: auto; scrollbar-width: none; margin: 0 calc(-1 * var(--gap)); padding: 2px var(--gap) 12px; scroll-snap-type: x mandatory; }
  .rack::-webkit-scrollbar { display: none; }
  .coll { flex: none; width: 150px; display: grid; gap: 10px; padding: 16px 14px 14px; background: var(--surface); border-radius: var(--r); box-shadow: var(--sh-1); color: var(--ink); scroll-snap-align: start; transition: transform .2s var(--ease), box-shadow .2s; }
  .coll:active { transform: scale(.97); }
  @media (hover: hover) { .coll:hover { box-shadow: var(--sh-2); transform: translateY(-2px); } }
  .coll img { width: 72px; height: 72px; object-fit: contain; border-radius: 50%; background: var(--ill-bg); padding: 6px; }
  .coll span { display: grid; gap: 2px; min-width: 0; } .coll b { font: 600 15px/1.25 var(--f-display); } .coll small { font-size: 12px; color: var(--muted); }
</style>
