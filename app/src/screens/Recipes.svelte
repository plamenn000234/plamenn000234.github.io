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
      <div class="list">{#each list.slice(0, shown) as r (r.id)}<RecipeRow {r} />{/each}</div>
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
        <div class="rack">{#each ids as i}<a class="coll" href="#c-{D.folders[i][1]}"><img src={dishImg(folderStyle(i)[1])} alt="" width="44" height="44" loading="lazy" /><span><b>{D.folders[i][0]}</b><small>{folderCount[i]} recipes</small></span></a>{/each}</div>
      </section>
    {/each}
  {/if}
</div>
<style>
  .head { margin: 14px 0 12px; display: grid; gap: 4px; }
  .back { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--muted); }
  .sbar { display: flex; gap: 10px; align-items: center; }
  .sq { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--muted); color: var(--muted); }
  .sq:focus-within { border-color: var(--accent); color: var(--ink); }
  .sq input { flex: 1; min-width: 0; border: 0; background: transparent; padding: 10px 0; font-size: 16px; outline: none; color: var(--ink); }
  .chips { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; margin: 12px 0 4px; padding-bottom: 2px; }
  .chip { flex: none; display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border: 1px solid var(--line); border-radius: 3px; color: var(--ink); font-size: 13px; }
  .chip.on { background: var(--ink); color: var(--bg); border-color: var(--ink); }
  .filters { display: grid; gap: 14px; margin-top: 10px; }
  .filters .eyebrow { margin-bottom: 6px; }
  .algs { display: flex; flex-wrap: wrap; gap: 6px; }
  .algs button { border: 1px solid var(--line); background: transparent; border-radius: 3px; padding: 5px 9px; font-size: 12.5px; }
  .algs button[aria-pressed="true"] { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); text-decoration: line-through; }
  .fr { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; }
  .ck { display: flex; gap: 6px; align-items: center; font-size: 14px; }
  .count { margin: 12px 0 8px; }
  .list { display: grid; gap: 6px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr)); }
  .more { display: flex; justify-content: center; margin-top: 14px; }
  .rack { display: grid; gap: 6px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr)); }
  .coll { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid var(--line-2); background: var(--surface); border-radius: var(--r); color: var(--ink); }
  .coll:hover { border-color: var(--line); }
  .coll img { width: 44px; height: 44px; object-fit: contain; border-radius: 50%; background: var(--ill-bg); flex: none; }
  .coll span { display: grid; min-width: 0; } .coll b { font: 600 14.5px/1.25 var(--f-display); } .coll small { font-size: 12px; color: var(--muted); }
</style>
