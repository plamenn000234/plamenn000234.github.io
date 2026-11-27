<script lang="ts">
  // One search for everything: tools, recipes, lessons, glossary.
  import Icon from "./Icon.svelte";
  import RecipeRow from "./RecipeRow.svelte";
  import { TOOLS } from "../tools/registry.svelte";
  import { filtered } from "../core/catalog";
  import { LD, loadLearn } from "../core/learn";
  import { fold } from "../core/util";
  import { router } from "../core/router.svelte";
  let { open = $bindable() }: { open: boolean } = $props();
  let q = $state(""), el: HTMLInputElement | undefined = $state();
  let learnReady = $state(LD.ready);
  $effect(() => { if (open) { setTimeout(() => el?.focus(), 30); if (!LD.ready) loadLearn().then(() => (learnReady = true)).catch(() => {}); } });
  const toks = $derived(fold(q).split(/\s+/).filter((t) => t.length > 1));
  const tools = $derived(toks.length ? TOOLS.filter((t) => toks.every((k) => fold(t.name + " " + t.desc + " " + t.kw + " " + t.group).includes(k))) : TOOLS.slice(0, 4));
  const recipes = $derived(toks.length ? filtered({ q, coll: -1, diet: 0, free: new Set(), low: false, sort: "rel" }).slice(0, 8) : []);
  const lessons = $derived.by(() => { learnReady; if (!toks.length || !LD.ready) return []; const out: { id: string; t: string; m: string }[] = [];
    for (const m of LD.mods) for (const l of m.L) if (toks.every((k) => fold(l.t + " " + l.k + " " + m.t).includes(k))) out.push({ id: l.id, t: l.t, m: m.t });
    return out.slice(0, 5); });
  const gloss = $derived.by(() => { learnReady; if (!toks.length || !LD.ready) return []; return LD.gloss.flatMap(([, rows]) => rows).filter((r) => toks.every((k) => r.some((c) => fold(c).includes(k)))).slice(0, 4); });
  function close() { open = false; q = ""; }
  $effect(() => { router.hash; close(); });
</script>
{#if open}
  <div class="scrim" onclick={close} role="presentation"></div>
  <div class="panel" role="dialog" aria-label="Search">
    <div class="bar"><Icon name="search" size={18} /><input bind:this={el} bind:value={q} type="search" placeholder="Salt, brine, risotto, braise…" autocomplete="off" onkeydown={(e) => e.key === "Escape" && close()} /><button onclick={close} aria-label="Close search"><Icon name="close" /></button></div>
    <div class="res">
      {#if tools.length}<h4 class="eyebrow">Tools</h4><div class="tl">{#each tools as t}<a href="#tool-{t.id}"><Icon name={t.icon} size={22} /><span><b>{t.name}</b><small>{t.desc}</small></span></a>{/each}</div>{/if}
      {#if recipes.length}<h4 class="eyebrow">Recipes</h4><div class="rl">{#each recipes as r (r.id)}<RecipeRow {r} />{/each}</div><a class="more" href="#recipes?q={encodeURIComponent(q)}">All recipes for “{q}”</a>{/if}
      {#if lessons.length}<h4 class="eyebrow">Lessons</h4><div class="tl">{#each lessons as l}<a href="#l-{l.id}"><Icon name="learn-module" size={22} /><span><b>{l.t}</b><small>{l.m}</small></span></a>{/each}</div>{/if}
      {#if gloss.length}<h4 class="eyebrow">Glossary</h4><div class="gl">{#each gloss as g}<div><b>{g[0]}</b><span>{g[1]}</span><span>{g[2]}</span></div>{/each}</div>{/if}
      {#if toks.length && !tools.length && !recipes.length && !lessons.length && !gloss.length}<p class="note" style="padding:20px 4px">Nothing found for “{q}”.</p>{/if}
    </div>
  </div>
{/if}
<style>
  .scrim { position: fixed; inset: 0; z-index: 40; background: rgba(20, 18, 15, .35); animation: f .2s; }
  .panel { position: fixed; z-index: 41; top: calc(var(--sat) + 8px); left: 8px; right: 8px; max-width: 680px; margin: 0 auto; max-height: calc(100dvh - var(--sat) - 16px); display: flex; flex-direction: column;
    background: var(--bg); border: 1px solid var(--line); border-radius: var(--r); box-shadow: 0 20px 60px rgba(0,0,0,.25); animation: d .25s var(--ease); }
  .bar { display: flex; align-items: center; gap: 10px; padding: 8px 8px 8px 14px; border-bottom: 1px solid var(--line-2); }
  input { flex: 1; min-width: 0; border: 0; background: transparent; font-size: 17px; padding: 8px 0; outline: none; }
  .bar button { width: 40px; height: 40px; border: 0; background: transparent; display: grid; place-items: center; }
  .res { overflow-y: auto; padding: 6px 14px 16px; display: grid; gap: 8px; }
  h4 { margin-top: 10px; font-family: var(--f-body); }
  .tl { display: grid; gap: 2px; }
  .tl a { display: flex; align-items: center; gap: 12px; padding: 9px 6px; border-radius: 3px; color: var(--ink); }
  .tl a:hover { background: var(--sunk); }
  .tl span { display: grid; } .tl b { font: 600 15px var(--f-display); } .tl small { font-size: 12.5px; color: var(--muted); }
  .rl { display: grid; gap: 6px; }
  .more { font-size: 13.5px; padding: 4px 2px; }
  .gl div { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; font-size: 13.5px; padding: 7px 2px; border-bottom: 1px solid var(--line-2); }
  @keyframes f { from { opacity: 0; } } @keyframes d { from { opacity: 0; transform: translateY(-8px); } }
</style>
