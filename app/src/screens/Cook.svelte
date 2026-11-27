<script lang="ts">
  // Cook mode: one step at a time in large type, the screen stays on, swipe or tap to move, times start timers.
  import { untrack } from "svelte";
  import Icon from "../ui/Icon.svelte";
  import Timed from "../ui/Timed.svelte";
  import { byId, detail, type Detail } from "../core/catalog";
  import { fmtG } from "../core/util";
  import { router } from "../core/router.svelte";
  import { toast } from "../core/ui.svelte";
  import { noteOf } from "../core/notes.svelte";
  let { id }: { id: string } = $props();
  const r = $derived(byId.get(id));
  const p = $derived(Math.max(1, Number(router.route.q.get("p")) || r?.N || 1));
  const f = $derived(r ? p / r.N : 1);
  const note = $derived(noteOf(id));
  let d = $state<Detail | null>(null), i = $state(0), showIng = $state(false), awake = $state(false);
  $effect(() => { const rr = r; if (rr) detail(rr).then((x) => (d = x || { c: [] })).catch(() => (d = { c: [] })); });
  const steps = $derived(d ? d.c.flatMap((c) => c[3].map((s) => ({ comp: d!.c.length > 1 ? c[0] : "", s }))) : []);
  const ings = $derived(d ? d.c.flatMap((c) => c[2].map((x) => ({ comp: d!.c.length > 1 ? c[0] : "", n: x[0], q: x[1] }))) : []);

  // keep the screen on: the Android bridge, else the Wake Lock API
  let lock: any = null;
  async function wake(on: boolean) {
    const A = window.ChefsheetApp;
    if (A?.keepScreenOn) { try { A.keepScreenOn(on); return true; } catch {} }
    try {
      const n: any = navigator;
      if (on) { if (!n.wakeLock) return false; lock = await n.wakeLock.request("screen"); lock.addEventListener("release", () => (lock = null)); return true; }
      if (lock) { await lock.release(); lock = null; }
    } catch { return false; }
    return true;
  }
  $effect(() => {
    untrack(() => wake(true).then((ok) => { awake = ok; if (!ok) toast.show("This browser can't keep the screen on"); }));
    const vis = () => { if (document.visibilityState === "visible" && !lock && !window.ChefsheetApp) wake(true); };
    const key = (e: KeyboardEvent) => { if (e.key === "ArrowRight" || e.key === " ") go(1); else if (e.key === "ArrowLeft") go(-1); else if (e.key === "Escape") exit(); };
    document.addEventListener("visibilitychange", vis); addEventListener("keydown", key);
    document.documentElement.classList.add("cooking");
    return () => { wake(false); document.removeEventListener("visibilitychange", vis); removeEventListener("keydown", key); document.documentElement.classList.remove("cooking"); };
  });
  function go(dir: number) { const n = i + dir; if (n >= 0 && n < steps.length) i = n; else if (n >= steps.length) toast.show("That was the last step"); }
  function exit() { router.go("#r-" + id); }
  let x0 = 0, y0 = 0;
  const down = (e: PointerEvent) => { x0 = e.clientX; y0 = e.clientY; };
  const up = (e: PointerEvent) => { const dx = e.clientX - x0, dy = e.clientY - y0; if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1); };
</script>
<div class="cook" role="dialog" aria-modal="true" aria-label="Cook mode">
  <header>
    <button class="ib" aria-label="Exit cook mode" onclick={exit}><Icon name="close" size={20} /></button>
    <div class="ttl"><b>{r?.t || "Recipe"}</b><small>{p} portions · {awake ? "screen stays on" : "larger text"}</small></div>
    <button class="ib" class:on={showIng} aria-pressed={showIng} aria-label="Ingredients" onclick={() => (showIng = !showIng)}><Icon name="tool-prep" size={20} /></button>
  </header>
  {#if !d}<p class="wait">Loading…</p>
  {:else if showIng}
    <section class="ing">{#if note}<p class="cnote"><span>My notes</span>{note}</p>{/if}<h2>Ingredients for {p} portions</h2>
      <ul>{#each ings as x}<li><span>{x.n}{#if x.comp}<small>{x.comp}</small>{/if}</span><b class="num">{typeof x.q === "number" ? fmtG(x.q * f) : x.q}</b></li>{/each}</ul>
      <button class="back2" onclick={() => (showIng = false)}>Back to the steps</button></section>
  {:else if !steps.length}<p class="wait">This recipe has no method yet.</p>
  {:else}
    <div class="bar"><i style="width:{((i + 1) / steps.length) * 100}%"></i></div>
    <section class="step" onpointerdown={down} onpointerup={up} role="presentation">
      <p class="n">Step {i + 1} of {steps.length}{steps[i].comp ? " · " + steps[i].comp : ""}</p>
      {#key i}<p class="tx"><Timed text={steps[i].s} ctx={r?.t || ""} /></p>{/key}
      {#if i === 0 && note}<p class="next cn"><span>My notes</span>{note}</p>{/if}
      {#if steps[i + 1]}<p class="next"><span>Next</span>{steps[i + 1].s}</p>{/if}
    </section>
    <nav class="nav">
      <button class="pv" disabled={i === 0} onclick={() => go(-1)}><Icon name="back" size={22} />Back</button>
      {#if i < steps.length - 1}<button class="nx" onclick={() => go(1)}>Next step<Icon name="fwd" size={22} /></button>
      {:else}<button class="nx" onclick={exit}>Finish<Icon name="check" size={22} /></button>{/if}
    </nav>
  {/if}
</div>
<style>
  .cook { position: fixed; inset: 0; z-index: 50; display: flex; flex-direction: column; background: var(--bg); color: var(--ink); padding: calc(var(--sat) + 10px) 0 calc(var(--sab) + 14px); }
  header { display: flex; align-items: center; gap: 12px; padding: 0 16px 10px; }
  .ttl { flex: 1; min-width: 0; display: grid; text-align: center; } .ttl b { font-size: 16px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .ttl small { font-size: 12.5px; color: var(--muted); }
  .ib { width: 46px; height: 46px; border: 0; border-radius: 50%; background: var(--sunk); color: var(--ink); display: grid; place-items: center; flex: none; }
  .ib.on { background: var(--pri); color: var(--pri-ink); }
  .bar { height: 4px; margin: 0 16px; border-radius: 999px; background: var(--sunk); overflow: hidden; } .bar i { display: block; height: 100%; background: var(--accent); transition: width .25s var(--ease); }
  .step { flex: 1; overflow-y: auto; padding: 28px 24px 16px; max-width: 760px; width: 100%; margin: 0 auto; touch-action: pan-y; }
  .n { font-size: 13px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--accent); }
  .tx { font-size: clamp(24px, 6.4vw, 34px); line-height: 1.35; font-weight: 600; letter-spacing: -.01em; margin-top: 14px; animation: in .25s var(--ease); }
  .tx :global(button) { font-size: inherit; }
  @keyframes in { from { opacity: 0; transform: translateX(16px); } }
  .next { margin-top: 28px; padding: 14px 16px; border-radius: var(--r-m); background: var(--sunk); color: var(--ink-2); font-size: 15px; line-height: 1.45; }
  .next span { display: block; font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; }
  .nav { display: grid; grid-template-columns: 1fr 2fr; gap: 10px; padding: 10px 16px 0; max-width: 760px; width: 100%; margin: 0 auto; }
  .nav button { height: 64px; border: 0; border-radius: 18px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-size: 18px; font-weight: 700; }
  .pv { background: var(--sunk); color: var(--ink); } .pv:disabled { opacity: .4; }
  .nx { background: var(--pri); color: var(--pri-ink); }
  .ing { flex: 1; overflow-y: auto; padding: 16px 20px; max-width: 760px; width: 100%; margin: 0 auto; }
  .ing h2 { font-size: 20px; margin-bottom: 8px; }
  .ing ul { list-style: none; margin: 0; padding: 0; }
  .ing li { display: flex; justify-content: space-between; gap: 12px; padding: 13px 0; box-shadow: inset 0 -1px 0 var(--hair); font-size: 18px; }
  .ing li span { display: grid; } .ing li small { font-size: 12px; color: var(--muted); } .ing li b { font-weight: 700; white-space: nowrap; }
  .back2 { margin-top: 16px; width: 100%; height: 56px; border: 0; border-radius: 16px; background: var(--pri); color: var(--pri-ink); font-size: 17px; font-weight: 700; }
  .cnote { margin-bottom: 16px; padding: 14px 16px; border-radius: var(--r-m); background: var(--sunk); font-size: 16px; line-height: 1.45; white-space: pre-wrap; }
  .cnote span, .cn span { display: block; font-size: 11.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--accent); margin-bottom: 4px; }
  .cn { white-space: pre-wrap; box-shadow: inset 3px 0 0 var(--accent); }
  .wait { padding: 40px 24px; color: var(--muted); }
</style>
