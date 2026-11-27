<script lang="ts">
  import RecipeRow from "../ui/RecipeRow.svelte";
  import Seg from "../ui/Seg.svelte";
  import Icon from "../ui/Icon.svelte";
  import Empty from "../ui/Empty.svelte";
  import Button from "../ui/Button.svelte";
  import { R, D, filtered, byProducts, findProducts, pickSet, pickName, completeWord, folderCount, folderStyle, dishImg, mineFolder, mineBackup, mineRestore } from "../core/catalog";
  import { saveFile, today } from "../core/files";
  import { toast } from "../core/ui.svelte";
  import { GROUPS, ALG } from "../core/constants";
  import { favs } from "../core/kitchen.svelte";
  import { router } from "../core/router.svelte";
  import { saveOffline } from "../core/offline";
  import { pantry, avoid } from "../core/have.svelte";
  let q = $state(router.route.q.get("q") || "");
  let diet = $state(0), sort = $state(0), free = $state(new Set<number>()), low = $state(false), showF = $state(false), shown = $state(40);
  const arg = $derived(router.route.arg);
  const onlyFav = $derived(arg === "fav");
  const haveMode = $derived(arg === "have");
  let pq = $state("");
  const word = $derived(completeWord(pq));
  const wordN = $derived(word.length >= 3 && !pantry.v.includes(word) ? pickSet(word).size : 0);
  const sugg = $derived(findProducts(pq).filter((i) => !pantry.v.includes(i)));
  // "Without": products the cook does not want (no mushrooms, no pork…).
  let aq = $state("");
  const aword = $derived(completeWord(aq));
  const awordN = $derived(aword.length >= 3 && !avoid.v.includes(aword) ? pickSet(aword).size : 0);
  const asugg = $derived(findProducts(aq, 6).filter((i) => !avoid.v.includes(i)));
  const notSet = $derived.by(() => { const n = new Set<number>(); for (const k of avoid.v) pickSet(k).forEach((i) => n.add(i)); return n; });
  function avoidPick(i: number | string) { avoid.add(i); aq = ""; }
  function pick(i: number | string) { pantry.add(i); pq = ""; (document.getElementById("pq") as HTMLInputElement)?.focus(); }
  const haves = $derived.by(() => { void rev; return haveMode ? byProducts(pantry.v, filtered({ q: "", coll: -1, diet: [0, 1, 2][diet], free, low, sort: "az", only: null, not: notSet })) : []; });
  const coll = $derived(arg.startsWith("c:") ? D.folders.findIndex((f) => f[1] === arg.slice(2)) : -1);
  const browsing = $derived(!!q.trim() || coll >= 0 || onlyFav || diet > 0 || free.size > 0 || low || avoid.v.length > 0);
  let rev = $state(0);
  function restore(e: Event) {
    const inp = e.target as HTMLInputElement, f = inp.files?.[0]; if (!f) return;
    f.text().then((t) => { const n = mineRestore(t); toast.show(n < 0 ? "This file is not a Chefsheet backup" : n + " recipes restored"); rev++; inp.value = ""; });
  }
  const list = $derived.by(() => { void rev; return filtered({ q, coll, diet: [0, 1, 2][diet], free, low, sort: (["rel", "az", "kcal"] as const)[sort], only: onlyFav ? new Set(favs.v) : null, not: notSet }); });
  $effect(() => { q; coll; onlyFav; diet; sort; free; low; pantry.v; avoid.v; shown = 40; });
  const nFilters = $derived((diet ? 1 : 0) + free.size + (low ? 1 : 0) + avoid.v.length);
  function toggleAlg(a: number) { const s = new Set(free); s.has(a) ? s.delete(a) : s.add(a); free = s; }
  const groups = GROUPS.map(([g, names]) => [g, names.map((n) => D.folders.findIndex((f) => f[0] === n)).filter((i) => i >= 0)] as [string, number[]]);
</script>
<div class="page">
  <div class="head">
    {#if coll >= 0}<a class="back" href="#recipes"><Icon name="back" size={16} />All recipes</a><h1>{D.folders[coll][0]}</h1>
    {:else if onlyFav}<a class="back" href="#recipes"><Icon name="back" size={16} />All recipes</a><h1>Favourites</h1>
    {:else if haveMode}<a class="back" href="#recipes"><Icon name="back" size={16} />All recipes</a><h1>What can I cook?</h1>
    {:else}<p class="eyebrow">Library</p><h1>Recipes</h1>{/if}
  </div>
  {#if haveMode}
    <p class="note">Add the products you have. Recipes that use the most of them come first. Salt, sugar, pepper and oil are taken as in stock.</p>
    <div class="sbar"><div class="pk"><label class="sq"><Icon name="plus" size={18} /><input id="pq" type="search" bind:value={pq} placeholder="Add a product, e.g. chicken" autocomplete="off" aria-label="Add a product you have" onkeydown={(e) => { if (e.key === "Enter") { if (wordN > 1) pick(word); else if (sugg.length) pick(sugg[0]); } }} /></label>
      {#if wordN > 1 || sugg.length}<ul class="sg" role="listbox">{#if wordN > 1}<li><button class="any" role="option" aria-selected="false" onclick={() => pick(word)}>Any {word}<small>{wordN} products</small></button></li>{/if}{#each sugg as i}<li><button role="option" aria-selected="false" onclick={() => pick(i)}>{D.products[i][0]}</button></li>{/each}</ul>{/if}</div>
      <Button small icon="more" pressed={showF} onclick={() => (showF = !showF)}>Filters{nFilters ? " · " + nFilters : ""}</Button></div>
    {#if pantry.v.length}<div class="have">{#each pantry.v as i}<button class="hc" onclick={() => pantry.del(i)} aria-label="Remove {pickName(i)}">{pickName(i)}<Icon name="close" size={14} /></button>{/each}<button class="clr" onclick={() => pantry.set([])}>Clear</button></div>{/if}
  {:else}
  <div class="sbar">
    <label class="sq"><Icon name="search" size={18} /><input type="search" bind:value={q} placeholder="Dish, product or collection" autocomplete="off" aria-label="Search recipes" /></label>
    <Button small icon="more" pressed={showF} onclick={() => (showF = !showF)}>Filters{nFilters ? " · " + nFilters : ""}</Button>
  </div>
  <div class="chips">
    <a class="chip" class:on={onlyFav} href={onlyFav ? "#recipes" : "#recipes-fav"}><Icon name="star" size={14} />Favourites {favs.v.length || ""}</a>
    <a class="chip" class:on={coll === mineFolder()} href={coll === mineFolder() ? "#recipes" : "#c-" + D.folders[mineFolder()][1]}>My recipes {folderCount[mineFolder()] || ""}</a>
    <a class="chip" href="#recipes-have"><Icon name="kitchen" size={14} />What can I cook?</a>
    <a class="chip" href="#new">New recipe</a>
    <a class="chip" href="#new-semi">New semi-finished</a>
  </div>
  {/if}
  {#if coll === mineFolder()}
    <div class="acts mine"><Button small icon="share" onclick={() => saveFile("Chefsheet_My_Recipes_" + today() + ".json", mineBackup())}>Back up my recipes</Button>
      <label class="btnf"><Icon name="plus" size={16} />Restore from a file<input type="file" accept=".json,application/json" onchange={restore} hidden /></label></div>
    <p class="note">Your recipes live on this device. Back them up to a file to move them to a new phone.</p>
  {/if}
  {#if avoid.v.length}<div class="have av">{#each avoid.v as i}<button class="hc" onclick={() => avoid.del(i)} aria-label="Allow {pickName(i)} again">Without {pickName(i).replace(/^Any /, "")}<Icon name="close" size={14} /></button>{/each}</div>{/if}
  {#if showF}
    <div class="filters card pad">
      <div><p class="eyebrow">Diet</p><Seg options={["Any", "Vegetarian", "Vegan"]} bind:value={diet} /></div>
      <div><p class="eyebrow">Free from</p><div class="algs">{#each Object.entries(ALG) as [a, n]}<button aria-pressed={free.has(+a)} onclick={() => toggleAlg(+a)}>{n}</button>{/each}</div></div>
      <div><p class="eyebrow">Without</p>
        <div class="pk"><label class="sq sm"><Icon name="minus" size={16} /><input type="search" bind:value={aq} placeholder="e.g. mushroom, pork, garlic" autocomplete="off" aria-label="Recipes without this product" onkeydown={(e) => { if (e.key === "Enter") { if (awordN > 1) avoidPick(aword); else if (asugg.length) avoidPick(asugg[0]); } }} /></label>
          {#if awordN > 1 || asugg.length}<ul class="sg" role="listbox">{#if awordN > 1}<li><button class="any" role="option" aria-selected="false" onclick={() => avoidPick(aword)}>Any {aword}<small>{awordN} products</small></button></li>{/if}{#each asugg as i}<li><button role="option" aria-selected="false" onclick={() => avoidPick(i)}>{D.products[i][0]}</button></li>{/each}</ul>{/if}</div></div>
      <div class="fr"><label class="ck"><input type="checkbox" bind:checked={low} /> Up to 400 kcal</label><span><span class="eyebrow">Sort</span> <Seg options={["Best match", "A–Z", "Lightest"]} bind:value={sort} /></span></div>
    </div>
  {/if}
  {#if haveMode}
    {#if !pantry.v.length}<Empty art="search" title="Start with what is in the fridge">Add two or three products, for example chicken, cream and mushrooms.</Empty>
    {:else}
      <p class="count note">{haves.length.toLocaleString("en")} recipe{haves.length === 1 ? "" : "s"} use your products</p>
      {#if haves.length}
        <div class="list group">{#each haves.slice(0, shown) as h (h.r.id)}<RecipeRow r={h.r} hint={`Uses ${h.hit} of ${pantry.v.length}` + (h.miss ? ` · ${h.miss} more to get` : " · nothing else to buy")} />{/each}</div>
        {#if haves.length > shown}<div class="more"><Button onclick={() => (shown += 60)}>Show more ({haves.length - shown})</Button></div>{/if}
      {:else}<Empty art="search" title="No recipe uses these">Try fewer filters or another product.</Empty>{/if}
    {/if}
  {:else if browsing}
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
    <section class="sec card pad off"><div><b>Use it without internet</b><p class="note">Save every recipe collection on this phone, so recipes open in a basement kitchen or on a plane.</p></div><Button icon="check" onclick={saveOffline}>Save all recipes</Button></section>
  {/if}
</div>
<style>
  .head { margin: 22px 0 16px; display: grid; gap: 6px; }
  .back { justify-self: start; display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--muted); }
  .sbar { display: flex; gap: 10px; align-items: center; }
  .sq { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px; height: 48px; padding: 0 16px; border-radius: 999px; background: var(--surface); box-shadow: var(--sh-1); color: var(--muted); transition: box-shadow .2s; }
  .sq:focus-within { box-shadow: var(--sh-2), inset 0 0 0 2px var(--ink); color: var(--ink); }
  .sq input { flex: 1; min-width: 0; border: 0; background: transparent; font-size: 16px; outline: none; color: var(--ink); }
  .pk { flex: 1; min-width: 0; position: relative; }
  .sg { position: absolute; left: 0; right: 0; top: 52px; z-index: 5; list-style: none; margin: 0; padding: 6px; background: var(--surface); border-radius: var(--r-m); box-shadow: var(--sh-3); display: grid; }
  .sg button { width: 100%; text-align: left; border: 0; background: none; padding: 11px 12px; border-radius: var(--r-s); font-size: 15px; color: var(--ink); }
  .sg .any { display: flex; justify-content: space-between; font-weight: 600; } .sg .any small { color: var(--muted); font-weight: 400; }
  .sg button:hover, .sg button:focus-visible { background: var(--sunk); }
  .have { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .hc { display: inline-flex; align-items: center; gap: 6px; border: 0; padding: 8px 10px 8px 14px; border-radius: 999px; background: var(--pri); color: var(--pri-ink); font-size: 13.5px; font-weight: 500; }
  .av .hc { background: var(--accent-soft); color: var(--accent); }
  .sq.sm { height: 42px; box-shadow: none; background: var(--sunk); }
  .clr { border: 0; background: none; color: var(--muted); font-size: 13.5px; padding: 8px; }
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
  .mine { margin: 4px 0 6px; }
  .off { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; justify-content: space-between; } .off > div { flex: 1 1 240px; display: grid; gap: 4px; }
  .btnf { display: inline-flex; align-items: center; gap: 6px; height: 36px; padding: 0 14px; border-radius: 999px; background: var(--surface); box-shadow: var(--sh-1), inset 0 0 0 1px var(--hair); font-size: 13.5px; font-weight: 500; cursor: pointer; }
  .coll { flex: none; width: 150px; display: grid; gap: 10px; padding: 16px 14px 14px; background: var(--surface); border-radius: var(--r); box-shadow: var(--sh-1); color: var(--ink); scroll-snap-align: start; transition: transform .2s var(--ease), box-shadow .2s; }
  .coll:active { transform: scale(.97); }
  @media (hover: hover) { .coll:hover { box-shadow: var(--sh-2); transform: translateY(-2px); } }
  .coll img { width: 72px; height: 72px; object-fit: contain; border-radius: 50%; background: var(--ill-bg); padding: 6px; }
  .coll span { display: grid; gap: 2px; min-width: 0; } .coll b { font: 600 15px/1.25 var(--f-display); } .coll small { font-size: 12px; color: var(--muted); }
</style>
