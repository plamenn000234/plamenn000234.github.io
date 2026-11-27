<script lang="ts">
  // Learn path. Lessons and tests open in the current version during the alpha.
  const BASE = import.meta.env.BASE_URL;
  import Icon from "../ui/Icon.svelte";
  import { LD, loadLearn } from "../core/learn";
  import { read, KEYS } from "../core/store.svelte";
  import { ROOT } from "../core/catalog";
  let ready = $state(LD.ready), err = $state(false), open = $state<string | null>(null);
  $effect(() => { if (!LD.ready) loadLearn().then(() => (ready = true)).catch(() => (err = true)); });
  const lp = read<any>(KEYS.learn, { done: {}, quiz: {} });
  const done = (id: string) => !!lp.done?.[id];
  const nAll = $derived(ready ? LD.mods.reduce((a, m) => a + m.L.length, 0) : 64);
  const nDone = $derived(ready ? LD.mods.reduce((a, m) => a + m.L.filter((l) => done(l.id)).length, 0) : 0);
  const nextMod = $derived(ready ? LD.mods.find((m) => m.L.some((l) => !done(l.id))) : null);
</script>
<div class="page">
  <div class="head"><p class="eyebrow">Training</p><h1>Learn</h1></div>
  <section class="card pad prog" style="--img:url({BASE}bg/learn-dark.webp)">
    <div><b class="num">{nDone}</b><small>of {nAll} lessons</small></div>
    <div class="bar"><i style="width:{nAll ? (nDone / nAll) * 100 : 0}%"></i></div>
    <div class="pa"><a class="hb" href="{ROOT}#learn">Card of the day</a><a class="hb2" href="#review">Repeat mistakes</a><a class="hb2" href="#tool-glossary">Glossary</a></div>
  </section>
  {#if err}<p class="note">Could not load the lessons. Check your connection.</p>
  {:else if !ready}<p class="note">Loading…</p>
  {:else}
    <ol class="mods">
      {#each LD.mods as m (m.id)}{@const k = m.L.filter((l) => done(l.id)).length}
        <li class:here={nextMod === m} class:full={k === m.L.length}>
          <button class="mh" onclick={() => (open = open === m.id ? null : m.id)} aria-expanded={open === m.id}>
            <span class="n">{m.n}</span><span class="t"><b>{m.t}</b><small>{k} of {m.L.length} lessons{nextMod === m ? " · you are here" : ""}</small></span><Icon name={open === m.id ? "minus" : "plus"} size={16} />
          </button>
          {#if open === m.id}<div class="ls">
            {#each m.L as l}<a href="#l-{l.id}" class:ok={done(l.id)}><Icon name={done(l.id) ? "check" : "fwd"} size={15} /><span>{l.t}</span></a>{/each}
            <a class="quiz" href="#quiz-{m.id}"><Icon name="learn-quiz" size={16} /><span>Module test</span></a>
          </div>{/if}
        </li>
      {/each}
    </ol>
    <p class="note">Lessons and tests open in the current version of Chefsheet for now. Your progress is shared.</p>
  {/if}
</div>
<style>
  .head { margin: 22px 0 16px; display: grid; gap: 6px; }
  .prog { display: grid; gap: 14px; background: linear-gradient(90deg, var(--hero) 35%, color-mix(in srgb, var(--hero) 50%, transparent) 65%, transparent 100%), var(--img) right center / auto 100% no-repeat, var(--hero); color: var(--hero-ink); border-radius: 24px; box-shadow: var(--sh-3); }
  .prog small { color: var(--hero-muted) !important; }
  .prog b { font: 600 30px var(--f-display); margin-right: 6px; } .prog small { color: var(--muted); }
  .bar { height: 6px; background: rgba(255, 240, 220, .14); border-radius: 999px; overflow: hidden; }
  .bar i { border-radius: 999px; } .bar i { display: block; height: 100%; background: var(--accent); }
  .pa { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
  .hb, .hb2 { display: inline-flex; align-items: center; min-height: 40px; padding: 0 16px; border-radius: 999px; font-size: 14px; font-weight: 600; }
  .hb { background: var(--hero-ink); color: var(--hero); } .hb2 { color: var(--hero-ink); box-shadow: inset 0 0 0 1px rgba(255, 240, 220, .25); }
  .mods { list-style: none; margin: 24px 0 12px; padding: 0 0 0 16px; border-left: 1px solid var(--line); display: grid; gap: 10px; }
  .mods li { position: relative; }
  .mods li::before { content: ""; position: absolute; left: -21px; top: 24px; width: 9px; height: 9px; border-radius: 50%; background: var(--bg); border: 1px solid var(--muted); }
  .mods li.full::before { background: var(--ok); border-color: var(--ok); }
  .mods li.here::before { background: var(--accent); border-color: var(--accent); }
  .mh { width: 100%; display: flex; align-items: center; gap: 14px; padding: 14px 16px; border: 0; background: var(--surface); box-shadow: var(--sh-1); border-radius: var(--r-m); text-align: left; color: var(--ink); }
  .n { font: 600 20px var(--f-display); color: var(--muted); width: 26px; }
  .t { flex: 1; display: grid; } .t b { font: 600 15.5px var(--f-display); } .t small { font-size: 12.5px; color: var(--muted); }
  .here .t small { color: var(--accent); }
  .ls { display: grid; padding: 6px 0 6px 12px; }
  .ls a { display: flex; align-items: center; gap: 8px; padding: 8px 4px; color: var(--ink); border-bottom: 1px solid var(--line-2); font-size: 14px; }
  .ls a.ok { color: var(--muted); } .ls a.ok :global(svg) { color: var(--ok); }
  .ls a.quiz { color: var(--accent); font-weight: 600; border: 0; }
</style>
