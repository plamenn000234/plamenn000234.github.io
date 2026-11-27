<script lang="ts">
  import { untrack } from "svelte";
  import Icon from "../ui/Icon.svelte";
  import Button from "../ui/Button.svelte";
  import LearnHead from "../ui/LearnHead.svelte";
  import LearnLoad from "../ui/LearnLoad.svelte";
  import Assign from "../ui/Assign.svelte";
  import Empty from "../ui/Empty.svelte";
  import RecipeRow from "../ui/RecipeRow.svelte";
  import Timed from "../ui/Timed.svelte";
  import { LD } from "../core/learn";
  import { LP, lessonRecipes, takeTask } from "../core/learnProgress.svelte";
  import { ART } from "../core/learnArt";
  import { TOOLS } from "../tools/registry.svelte";
  import { toast } from "../core/ui.svelte";
  import { router } from "../core/router.svelte";
  let { id }: { id: string } = $props();
  $effect(() => {
    const q = router.route.q; if (!q.get("by")) return;
    untrack(() => { const by = takeTask("lesson", id, q); history.replaceState(null, "", "#l-" + id); router.hash = "#l-" + id; if (by) toast.show(by + " sent you this lesson"); });
  });
  function mark(lid: string) {
    const v = LP.v, e = LD.byL.get(lid); if (!e) return;
    if (v.done[lid]) { delete v.done[lid]; LP.save(); return; }
    v.done[lid] = Date.now(); LP.save();
    if (v.tasks["l:" + lid]) { toast.show("Done. Now tell " + v.tasks["l:" + lid].by); return; }
    const nx = e.m.L[e.li + 1];
    if (nx) { toast.show("Lesson done"); router.go("#l-" + nx.id); } else toast.show("Module lessons done. Take the test");
  }
</script>
<LearnLoad>
  {@const e = LD.byL.get(id)}
  <div class="page">
    {#if !e}<a class="back" href="#learn"><Icon name="back" size={16} />Learn</a><Empty title="Lesson not found"><a href="#learn">Back to Learn</a></Empty>
    {:else}
      {@const m = e.m}{@const l = e.l}{@const nx = m.L[e.li + 1]}{@const pv = m.L[e.li - 1]}{@const dn = !!LP.v.done[l.id]}{@const lr = lessonRecipes(l)}{@const tool = l.tool ? TOOLS.find((t) => t.id === l.tool) : null}
      <a class="back" href="#m-{m.id}"><Icon name="back" size={16} />{m.t}</a>
      <LearnHead crumb="Module {m.n} · Lesson {e.li + 1} of {m.L.length}" title={l.t} />
      <article class="lb">
        <Assign k={"l:" + l.id} mode="banner" />
        <div class="key"><Icon name="today" size={22} /><p>{l.k}</p></div>
        {#if ART[l.id]}<div class="art">{@html ART[l.id]()}</div>{/if}
        {#if l.p?.length}<h2>Key points</h2><ul class="pts">{#each l.p as p}<li><Timed text={p} label={l.t} /></li>{/each}</ul>{/if}
        {#each l.tb || [] as tb}
          <div class="tw"><table><caption>{tb.c}</caption>{#if tb.h?.some(Boolean)}<thead><tr>{#each tb.h as h}<th>{h}</th>{/each}</tr></thead>{/if}<tbody>{#each tb.r as r}<tr>{#each r as c}<td>{c}</td>{/each}</tr>{/each}</tbody></table></div>
        {/each}
        {#if l.x?.length}<div class="mist"><h3>Common mistakes</h3><ul>{#each l.x as x}<li>{x}</li>{/each}</ul></div>{/if}
        <div class="la">
          {#if tool}<a class="tool card press" href="#tool-{tool.id}"><span class="ti"><Icon name={tool.icon} size={22} /></span><span><b>Try it: {tool.name}</b><small>Interactive tool</small></span><Icon name="fwd" size={16} /></a>{/if}
          <Assign k={"l:" + l.id} />
        </div>
        {#if lr.top.length}
          <h2>Recipes to practise</h2>
          <div class="group">{#each lr.top as r (r.id)}<RecipeRow {r} />{/each}</div>
          {#if lr.n > lr.top.length}<p class="note" style="margin-top:8px">{lr.n} recipes match “{lr.q}”. Search for it in Recipes.</p>{/if}
        {/if}
      </article>
      <div class="foot">
        {#if pv}<Button href="#l-{pv.id}" icon="back">Previous</Button>{:else}<span></span>{/if}
        <Button kind={dn ? "line" : "pri"} icon={dn ? "check" : undefined} pressed={dn} onclick={() => mark(l.id)}>{dn ? "Done" : "Mark as done"}</Button>
        {#if nx}<Button href="#l-{nx.id}">Next</Button>{:else}<Button href="#quiz-{m.id}" icon="learn-quiz">Test</Button>{/if}
      </div>
    {/if}
  </div>
</LearnLoad>
<style>
  .lb { display: grid; gap: 14px; margin-top: 18px; }
  .lb h2 { font-size: 19px; margin-top: 10px; }
  .key { display: flex; gap: 12px; align-items: flex-start; padding: 16px 18px; border-radius: var(--r); background: var(--surface); box-shadow: var(--sh-1), inset 3px 0 0 var(--accent); }
  .key :global(svg) { color: var(--accent); flex: none; margin-top: 2px; } .key p { font-size: 16px; line-height: 1.5; font-weight: 500; }
  .pts { margin: 0; padding-left: 20px; display: grid; gap: 8px; font-size: 15px; line-height: 1.55; }
  .tw { overflow-x: auto; border-radius: var(--r-m); background: var(--surface); box-shadow: var(--sh-1); }
  table { border-collapse: collapse; width: 100%; font-size: 14px; }
  caption { text-align: left; padding: 12px 14px 4px; font-weight: 600; font-size: 14px; }
  th, td { padding: 9px 14px; text-align: left; vertical-align: top; box-shadow: inset 0 -1px 0 var(--hair); }
  th { font-size: 12px; color: var(--muted); font-weight: 600; white-space: nowrap; }
  .mist { padding: 14px 18px; border-radius: var(--r); background: var(--accent-soft); }
  .mist h3 { font-size: 14px; font-family: var(--f-body); color: var(--accent); margin-bottom: 6px; }
  .mist ul { margin: 0; padding-left: 18px; display: grid; gap: 4px; font-size: 14.5px; }
  .la { display: grid; gap: 10px; justify-items: start; }
  .tool { display: flex; align-items: center; gap: 12px; padding: 12px 16px; color: var(--ink); width: 100%; max-width: 420px; }
  .ti { width: 44px; height: 44px; border-radius: 12px; background: var(--sunk); display: grid; place-items: center; flex: none; }
  .tool span:nth-child(2) { flex: 1; display: grid; } .tool b { font-weight: 600; } .tool small { font-size: 12.5px; color: var(--muted); }
  .foot { display: flex; justify-content: space-between; gap: 8px; margin: 24px 0 8px; flex-wrap: wrap; }
  /* lesson diagrams from learnArt.ts */
  .art :global(.lart) { margin: 0; padding: 16px 14px 14px; border-radius: 20px; background: var(--ill-bg); color: #1A1917; }
  .art :global(.lart figcaption b) { display: block; font-size: 17px; }
  .art :global(.lart figcaption small) { display: block; font-size: 12.5px; color: #5E646C; margin: 2px 0 10px; }
  .art :global(.lart svg) { display: block; max-width: 100%; height: auto; }
  .art :global(.lart svg text) { fill: currentColor; font-family: inherit; }
  .art :global(.cg) { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .art :global(.ci) { background: #fff; border-radius: 14px; padding: 8px; text-align: center; min-width: 0; }
  .art :global(.ci .pic) { height: 84px; display: flex; align-items: flex-end; justify-content: center; }
  .art :global(.ci b) { display: block; font-size: 14px; margin-top: 4px; }
  .art :global(.ci span) { font-size: 11px; color: #D9480F; font-weight: 700; }
  .art :global(.ci small) { display: block; font-size: 11px; color: #5E646C; }
  .art :global(.lg) { display: flex; flex-wrap: wrap; gap: 6px 12px; margin-top: 10px; font-size: 12px; font-weight: 700; }
  .art :global(.lg i) { display: inline-block; width: 12px; height: 12px; border-radius: 4px; margin-right: 5px; vertical-align: -2px; }
  .art :global(ol) { margin: 10px 0 0; padding-left: 20px; font-size: 13px; line-height: 1.5; }
  .art :global(.yb) { display: flex; height: 26px; border-radius: 9px; overflow: hidden; margin-top: 10px; font-size: 11.5px; font-weight: 800; }
  .art :global(.yb span) { display: flex; align-items: center; padding: 0 8px; white-space: nowrap; overflow: hidden; }
  .art :global(.lcap) { margin: 10px 0 0; font-size: 12px; color: #5E646C; }
  .art { --accent: #D9480F; --muted: #5E646C; --surface: #fff; --ink: #1A1917; }
</style>
