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

  <a class="hero press" href="#kitchen">
    <div class="ht"><p class="eyebrow">Kitchen{o.lines.length ? " · current order" : ""}</p>
      <h2>{o.lines.length ? o.name || "Order" : "Start an order"}</h2>
      {#if o.lines.length && o.date}<p class="hs">{new Date(o.date + "T12:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>{/if}
      {#if !o.lines.length}<p class="hs">Pick dishes, set guests, get the supplier list and prep list.</p>{/if}</div>
    {#if o.lines.length}<div class="stats"><div><b>{o.lines.length}</b><small>dishes</small></div><div><b>{o.pax}</b><small>guests</small></div><div><b>{items}</b><small>products</small></div></div>{/if}
    <span class="go">{o.lines.length ? "Open order" : "Pick dishes"}<Icon name="fwd" size={16} /></span>
  </a>
  {#if o.lines.length || timers.list.length}<div class="minis">
    {#if o.lines.length}<a class="mini card press" href="#prep"><span class="mi"><Icon name="tool-prep" size={22} /></span><span><b>Prep list</b><small>For this order</small></span></a>{/if}
    {#if timers.list.length}<div class="mini card"><span class="mi"><Icon name="timer" size={22} /></span><span><b>{timers.list.length} timer{timers.list.length > 1 ? "s" : ""}</b><small>Running now</small></span></div>{/if}
  </div>{/if}

  <section class="sec">
    <div class="sec-h"><h2>{toolFavs.v.length ? "Your tools" : "Tools"}</h2><a href="#tools">All tools</a></div>
    <div class="grid tools">{#each pinned as t (t!.id)}<ToolTile t={t!} compact />{/each}</div>
    {#if !toolFavs.v.length}<p class="note hint">Pin the tools you use most: open a tool and tap “Pin to Today”.</p>{/if}
  </section>

  {#if rec.length}
    <section class="sec"><div class="sec-h"><h2>Recently opened</h2><a href="#recipes">Recipes</a></div>
      <div class="car">{#each rec as r (r!.id)}<a class="rc card press" href="#r-{r!.id}"><Dish kind={r!.ty[1]} size={88} /><b>{r!.t}</b><small>{D.folders[r!.f][0]}</small></a>{/each}</div></section>
  {/if}

  <section class="sec two">
    {#if fr}<a class="feat card press" href="#r-{fr.id}"><Dish kind={fr.ty[1]} size={104} /><span><small class="eyebrow">Recipe of the day</small><b>{fr.t}</b><small>{fr.s || D.folders[fr.f][0]}</small></span></a>{/if}
    <a class="feat card press" href="#learn"><span class="fi"><Icon name="cap" size={34} /></span><span><small class="eyebrow">Learn</small><b>{lessonsDone ? lessonsDone + " lessons done" : "14 modules, 64 lessons"}</b><small>Card of the day, tests and certificates</small></span></a>
    {#if nFav}<a class="feat card press" href="#recipes-fav"><span class="fi"><Icon name="star" size={30} /></span><span><small class="eyebrow">Favourites</small><b>{nFav} saved recipe{nFav === 1 ? "" : "s"}</b></span></a>{/if}
  </section>
</div>
<style>
  .head { margin: 22px 0 20px; display: grid; gap: 6px; }
  h1 { font-size: 36px; }
  .hero { position: relative; display: grid; gap: 18px; padding: 22px 22px 20px; border-radius: 24px; color: var(--hero-ink); overflow: hidden;
    background: radial-gradient(120% 140% at 100% 0%, color-mix(in srgb, var(--accent) 38%, transparent) 0%, transparent 55%), var(--hero); box-shadow: var(--sh-3); }
  .hero::after { content: ""; position: absolute; right: -40px; top: -40px; width: 180px; height: 180px; border-radius: 50%; border: 1px solid rgba(255, 240, 220, .12); }
  .hero .eyebrow { color: var(--hero-muted); }
  .hero h2 { font-size: 26px; color: var(--hero-ink); margin-top: 6px; }
  .hs { color: var(--hero-muted); font-size: 14px; margin-top: 6px; max-width: 34ch; }
  .stats { display: flex; gap: 28px; }
  .stats div { display: grid; } .stats b { font: 600 30px/1 var(--f-display); font-variant-numeric: tabular-nums; } .stats small { font-size: 12px; color: var(--hero-muted); margin-top: 4px; }
  .go { justify-self: start; display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px; border-radius: 999px; background: var(--hero-ink); color: var(--hero); font-size: 14px; font-weight: 600; }
  .minis { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); margin-top: 12px; }
  .mini { display: flex; align-items: center; gap: 12px; padding: 14px; color: var(--ink); }
  .mi, .fi { width: 44px; height: 44px; border-radius: 14px; background: var(--sunk); display: grid; place-items: center; flex: none; }
  .fi { width: 72px; height: 72px; border-radius: 22px; }
  .mini span:last-child { display: grid; } .mini b { font: 600 15.5px var(--f-display); } .mini small { font-size: 12.5px; color: var(--muted); }
  .tools { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
  .hint { margin-top: 10px; }
  .car { display: flex; gap: 12px; overflow-x: auto; scrollbar-width: none; margin: 0 calc(-1 * var(--gap)); padding: 4px var(--gap) 12px; scroll-snap-type: x mandatory; }
  .car::-webkit-scrollbar { display: none; }
  .rc { flex: none; width: 168px; display: grid; justify-items: start; gap: 6px; padding: 16px; color: var(--ink); scroll-snap-align: start; }
  .rc :global(.dish) { margin-bottom: 6px; }
  .rc b { font: 600 15px/1.3 var(--f-display); display: -webkit-box; line-clamp: 2; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .rc small { font-size: 12px; color: var(--muted); }
  .two { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); }
  .feat { display: flex; align-items: center; gap: 18px; padding: 18px; color: var(--ink); }
  .feat > span:last-child { display: grid; gap: 4px; min-width: 0; }
  .feat b { font: 600 19px/1.25 var(--f-display); }
  .feat small:not(.eyebrow) { font-size: 13px; color: var(--muted); }
</style>
