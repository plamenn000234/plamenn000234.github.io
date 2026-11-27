<script lang="ts">
  import ToolTile from "../ui/ToolTile.svelte";
  import RecipeRow from "../ui/RecipeRow.svelte";
  import Icon from "../ui/Icon.svelte";
  import Dish from "../ui/Dish.svelte";
  import { TOOLS } from "../tools/registry.svelte";
  import { toolFavs, recent, favs, ord, compute } from "../core/kitchen.svelte";
  import { byId, R, D } from "../core/catalog";
  import { read, KEYS } from "../core/store.svelte";
  import { timers } from "../core/ui.svelte";
  const DEFAULT = ["yield", "salt", "cost", "doneness"];
  const pinned = $derived((toolFavs.v.length ? toolFavs.v : DEFAULT).map((id) => TOOLS.find((t) => t.id === id)).filter(Boolean));
  const rec = $derived(recent.v.map((id) => byId.get(id)).filter(Boolean).slice(0, 5));
  const nFav = $derived(favs.v.length);
  const o = $derived(ord.v);
  const items = $derived(o.lines.length ? compute().count : 0);
  const now = new Date();
  const hour = now.getHours();
  const hello = hour < 11 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const SKIP = ["Prep & Mise en Place", "Marinades", "Sauces", "Staff Canteen", "Fermentation & Pickling", "Drinks", "Classic Cocktails & Bar Spec", "Batch Cocktails & Event Punches", "Texture-Modified Meals (IDDSI)", "Sugar & Chocolate Décor"];
  const pool = R.filter((r) => !r.mine && r.kcal && !SKIP.includes(D.folders[r.f][0]) && r.lines.length > 4 && r.N >= 4 && r.kcal < 900);
  const fr = pool.length ? pool[(Math.floor(Date.now() / 864e5) * 7919) % pool.length] : null;
  const lp = read<any>(KEYS.learn, { done: {} });
  const lessonsDone = Object.keys(lp.done || {}).length;
</script>
<div class="page">
  <div class="head"><p class="eyebrow">{dateStr}</p><h1>{hello}</h1></div>

  <section class="cards">
    <a class="big card" href="#kitchen">
      <span class="ic"><Icon name="tab-order" size={28} /></span>
      <span class="tx">{#if o.lines.length}<small class="eyebrow">Current order</small><b>{o.name || "Order"}{o.date ? " · " + o.date : ""}</b><small>{o.lines.length} dish{o.lines.length === 1 ? "" : "es"} · {o.pax} guests · {items} products to order</small>
        {:else}<small class="eyebrow">Kitchen</small><b>Start an order</b><small>Pick dishes, set guests, get the supplier list and prep list.</small>{/if}</span>
      <Icon name="fwd" size={18} />
    </a>
    {#if o.lines.length}<a class="mini card" href="#prep"><Icon name="tool-prep" size={24} /><span><b>Prep list</b><small>For this order</small></span></a>{/if}
    {#if timers.list.length}<div class="mini card"><Icon name="timer" size={24} /><span><b>{timers.list.length} timer{timers.list.length > 1 ? "s" : ""} running</b><small>See the bar at the bottom</small></span></div>{/if}
  </section>

  <section class="sec">
    <div class="sec-h"><h2>{toolFavs.v.length ? "Your tools" : "Tools"}</h2><a href="#tools">All tools</a></div>
    <div class="grid tools">{#each pinned as t (t!.id)}<ToolTile t={t!} compact />{/each}</div>
    {#if !toolFavs.v.length}<p class="note hint">Pin the tools you use most: open a tool and tap “Pin to Today”.</p>{/if}
  </section>

  {#if rec.length}
    <section class="sec"><div class="sec-h"><h2>Recently opened</h2><a href="#recipes">Recipes</a></div>
      <div class="list">{#each rec as r (r!.id)}<RecipeRow r={r!} />{/each}</div></section>
  {/if}

  <section class="sec two">
    {#if fr}<a class="feat card" href="#r-{fr.id}"><Dish kind={fr.ty[1]} size={84} /><span><small class="eyebrow">Recipe of the day · {D.folders[fr.f][0]}</small><b>{fr.t}</b>{#if fr.s}<small>{fr.s}</small>{/if}</span></a>{/if}
    <a class="feat card" href="#learn"><span class="ic"><Icon name="tab-learn" size={30} /></span><span><small class="eyebrow">Learn</small><b>{lessonsDone ? lessonsDone + " lessons done" : "14 modules, 64 lessons"}</b><small>Card of the day, tests and certificates</small></span></a>
    {#if nFav}<a class="feat card" href="#recipes-fav"><span class="ic"><Icon name="star" size={26} /></span><span><small class="eyebrow">Favourites</small><b>{nFav} saved recipe{nFav === 1 ? "" : "s"}</b></span></a>{/if}
  </section>
</div>
<style>
  .head { margin: 16px 0 14px; display: grid; gap: 2px; }
  h1 { font-size: 30px; }
  .cards { display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); }
  .big { grid-column: 1 / -1; display: flex; align-items: center; gap: 14px; padding: 16px; color: var(--ink); border-left: 3px solid var(--accent); }
  .ic { width: 52px; height: 52px; border-radius: 50%; background: var(--sunk); display: grid; place-items: center; flex: none; }
  .tx { flex: 1; min-width: 0; display: grid; gap: 2px; }
  .tx b, .feat b, .mini b { font: 600 17px/1.3 var(--f-display); letter-spacing: .02em; }
  .tx small:not(.eyebrow), .feat small:not(.eyebrow), .mini small { font-size: 13px; color: var(--muted); }
  .mini { display: flex; align-items: center; gap: 12px; padding: 12px 14px; color: var(--ink); }
  .mini span { display: grid; } .mini b { font-size: 15px; }
  .tools { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
  .hint { margin-top: 8px; }
  .list { display: grid; gap: 6px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr)); }
  .two { display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr)); }
  .feat { display: flex; align-items: center; gap: 14px; padding: 14px; color: var(--ink); }
  .feat > span:last-child { display: grid; gap: 3px; min-width: 0; }
</style>
