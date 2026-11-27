<script lang="ts">
  // Welcome tour: four short cards on the first start. Swipe, arrows or the buttons move between them.
  import Icon from "./Icon.svelte";
  import { tour } from "../core/tour.svelte";
  import { R, D } from "../core/catalog";
  const BASE = import.meta.env.BASE_URL;
  const S = [
    { i: "tab-recipes", t: "Recipes for a professional kitchen", x: `${R.length.toLocaleString("en")} tech cards in ${D.folders.length} collections. Scale any dish to your portions, filter by allergens, diet and kcal, and add your own recipes.` },
    { i: "tools", t: "Tools for the pass", x: "Yield and cost, brines, sous-vide, prep labels and timers that keep running while you cook. Tap a time in any method to start a timer." },
    { i: "kitchen", t: "Orders and prep in one place", x: "Put dishes in the order with the number of guests. Chefsheet adds up the products by section or supplier, and makes the prep list, labels and PDFs." },
    { i: "cap", t: "Learn the craft", x: "Short lessons on safety, knife work, sauces and costing, with tests, a card of the day and a certificate at the end." },
  ];
  let i = $state(0);
  const last = $derived(i === S.length - 1);
  function go(d: number) { const n = i + d; if (n >= 0 && n < S.length) i = n; else if (n >= S.length) tour.close(); }
  let x0 = 0;
  const key = (e: KeyboardEvent) => { if (e.key === "ArrowRight") go(1); else if (e.key === "ArrowLeft") go(-1); else if (e.key === "Escape") tour.close(); };
  $effect(() => { addEventListener("keydown", key); return () => removeEventListener("keydown", key); });
</script>
<div class="tour" role="dialog" aria-modal="true" aria-label="Welcome to Chefsheet">
  <div class="card" onpointerdown={(e) => (x0 = e.clientX)} onpointerup={(e) => { const d = e.clientX - x0; if (Math.abs(d) > 60) go(d < 0 ? 1 : -1); }} role="presentation">
    <div class="hero" style="--img:url({BASE}bg/today-dark.webp)"><span class="ic"><Icon name={S[i].i} size={30} /></span>{#if i === 0}<b class="brand">Chefsheet</b>{/if}</div>
    <div class="body">
      {#key i}<div class="sl"><h2>{S[i].t}</h2><p>{S[i].x}</p></div>{/key}
      <div class="dots" aria-hidden="true">{#each S as _, j}<i class:on={j === i}></i>{/each}</div>
      <p class="sr" aria-live="polite">Card {i + 1} of {S.length}</p>
      <div class="bt">
        {#if !last}<button class="skip" onclick={() => tour.close()}>Skip</button>{:else}<span class="free">Free · no account · works offline</span>{/if}
        <button class="nx" onclick={() => go(1)}>{last ? "Start cooking" : "Next"}<Icon name={last ? "check" : "fwd"} size={18} /></button>
      </div>
    </div>
  </div>
</div>
<style>
  .tour { position: fixed; inset: 0; z-index: 80; display: grid; place-items: center; padding: calc(var(--sat) + 16px) 16px calc(var(--sab) + 16px); background: color-mix(in srgb, #000 55%, transparent); animation: fade .25s var(--ease); }
  @keyframes fade { from { opacity: 0; } }
  .card { width: min(440px, 100%); background: var(--surface); color: var(--ink); border-radius: 24px; overflow: hidden; box-shadow: var(--sh-3); touch-action: pan-y; }
  .hero { position: relative; height: 170px; background: linear-gradient(180deg, transparent 30%, color-mix(in srgb, var(--hero) 85%, transparent)), var(--img) center / cover no-repeat, var(--hero); display: flex; align-items: flex-end; justify-content: space-between; padding: 18px 20px; }
  .ic { width: 58px; height: 58px; border-radius: 16px; background: var(--accent); color: #fff; display: grid; place-items: center; box-shadow: 0 8px 24px rgba(0, 0, 0, .3); }
  .brand { color: #fff; font: 800 22px var(--f-display); letter-spacing: -.03em; }
  .body { padding: 20px 22px 18px; display: grid; gap: 14px; }
  .sl { animation: in .25s var(--ease); display: grid; gap: 8px; min-height: 138px; }
  @keyframes in { from { opacity: 0; transform: translateX(14px); } }
  h2 { font-size: 22px; line-height: 1.2; letter-spacing: -.01em; }
  p { color: var(--ink-2); font-size: 15.5px; line-height: 1.5; }
  .dots { display: flex; gap: 6px; } .dots i { width: 7px; height: 7px; border-radius: 999px; background: var(--line); transition: width .2s var(--ease), background .2s; } .dots i.on { width: 22px; background: var(--accent); }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .bt { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .skip { border: 0; background: none; color: var(--muted); font-size: 15px; padding: 10px 4px; }
  .free { font-size: 12.5px; color: var(--muted); }
  .nx { display: inline-flex; align-items: center; gap: 8px; height: 50px; padding: 0 22px; border: 0; border-radius: 999px; background: var(--pri); color: var(--pri-ink); font-size: 16px; font-weight: 700; }
  @media (prefers-reduced-motion: reduce) { .tour, .sl { animation: none; } }
</style>
