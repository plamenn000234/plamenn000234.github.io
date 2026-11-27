<script lang="ts">
  // The new cook's first weeks: tests from the chef, recipes to learn, a checklist. Opened from the chef's link.
  import Icon from "../ui/Icon.svelte";
  import Empty from "../ui/Empty.svelte";
  import LearnLoad from "../ui/LearnLoad.svelte";
  import { LD } from "../core/learn";
  import { LP, passed, dueTxt } from "../core/learnProgress.svelte";
  import { OB, takePack, progress } from "../core/onboard.svelte";
  import { byId } from "../core/catalog";
  import { router } from "../core/router.svelte";
  import { toast } from "../core/ui.svelte";
  // svelte-ignore state_referenced_locally
  const d = router.route.q.get("d");
  let pid = $state("");
  $effect(() => {
    if (!d) return;
    // learn.json must be in, so the tests can become tasks with titles
    import("../core/learn").then((m) => m.loadLearn()).then(() => { const id = takePack(d); if (id) { pid = id; toast.show("Welcome! Your first weeks are saved on this phone"); } history.replaceState(null, "", "#welcome"); });
  });
  const p = $derived(OB.v.packs.find((x) => x.id === pid) || OB.v.packs[0]);
  const pr = $derived.by(() => { void JSON.stringify(LP.v.quiz); return p ? progress(p) : { done: 0, total: 0 }; });
  function tick(i: number) { if (!p) return; p.ticks = p.ticks.includes(i) ? p.ticks.filter((x) => x !== i) : [...p.ticks, i]; OB.save(); }
  function know(id: string) { if (!p) return; p.known = p.known.includes(id) ? p.known.filter((x) => x !== id) : [...p.known, id]; OB.save(); }
</script>
<div class="page">
  <a class="back" href="#learn"><Icon name="back" size={16} />Learn</a>
  {#if !p}
    <Empty title="No onboarding yet">Your chef sends you a link. Open it on this phone and your first weeks appear here.</Empty>
  {:else}
    <div class="head"><p class="eyebrow">From {p.by}{p.due ? " · tests due " + dueTxt(p.due) : ""}</p><h1>Welcome{p.st ? " to " + p.st : ""}</h1></div>
    <section class="card pad prog"><b class="num">{pr.done}</b><small>of {pr.total} done</small>
      <div class="bar"><i style="width:{pr.total ? (pr.done / pr.total) * 100 : 0}%"></i></div></section>
    <LearnLoad>
      {#if p.mods.length}<section class="blk"><h2>Tests to pass</h2><div class="group">
        {#each p.mods as mid}{@const m = LD.mods.find((x) => x.id === mid)}{#if m}<a class="it" href="#m-{m.id}"><span class="ck" class:on={passed(m.id)}><Icon name="check" size={14} /></span><span><b>Module {m.n}: {m.t}</b><small>{passed(m.id) ? "Passed · send the certificate from Learn" : m.L.length + " lessons, then the test"}</small></span><Icon name="fwd" size={16} /></a>{/if}{/each}
      </div></section>{/if}
    </LearnLoad>
    {#if p.recs.length}<section class="blk"><h2>Recipes to learn</h2><div class="group">
      {#each p.recs as rid}{@const r = byId.get(rid)}{#if r}<div class="it"><button class="ck" class:on={p.known.includes(rid)} aria-pressed={p.known.includes(rid)} aria-label="I know {r.t}" onclick={() => know(rid)}><Icon name="check" size={14} /></button><a href="#r-{rid}"><b>{r.t}</b><small>{p.known.includes(rid) ? "I know it" : "Open, cook it with the team, then tick it"}</small></a></div>{/if}{/each}
    </div></section>{/if}
    {#if p.check.length}<section class="blk"><h2>First week</h2><div class="group">
      {#each p.check as c, i}<button class="it ckl" aria-pressed={p.ticks.includes(i)} onclick={() => tick(i)}><span class="ck" class:on={p.ticks.includes(i)}><Icon name="check" size={14} /></span><span><b>{c}</b></span></button>{/each}
    </div></section>{/if}
  {/if}
</div>
<style>
  .back { display: inline-flex; align-items: center; gap: 4px; font-size: 14px; color: var(--ink-2); margin: 16px 0 4px; padding: 6px 12px 6px 8px; border-radius: 999px; background: var(--surface); box-shadow: var(--sh-1); }
  .head { margin: 14px 0 12px; display: grid; gap: 6px; }
  .prog { display: grid; grid-template-columns: auto 1fr; align-items: baseline; gap: 4px 10px; max-width: 760px; }
  .prog b { font: 700 34px var(--f-display); } .prog small { color: var(--muted); }
  .bar { grid-column: 1 / -1; height: 6px; border-radius: 999px; background: var(--sunk); overflow: hidden; } .bar i { display: block; height: 100%; background: var(--accent); }
  .blk { margin-top: 22px; max-width: 760px; } .blk h2 { font-size: 18px; margin-bottom: 8px; }
  .group { display: grid; background: var(--surface); border-radius: var(--r); box-shadow: var(--sh-1); padding: 4px 14px; }
  .it { display: flex; align-items: center; gap: 12px; padding: 12px 0; color: var(--ink); box-shadow: inset 0 -1px 0 var(--hair); border: 0; background: none; text-align: left; width: 100%; font: inherit; }
  .it:last-child { box-shadow: none; }
  .it > span:not(.ck), .it > a { flex: 1; display: grid; gap: 2px; color: var(--ink); min-width: 0; }
  .it b { font-weight: 600; font-size: 15px; } .it small { font-size: 12.5px; color: var(--muted); }
  .ck { width: 26px; height: 26px; border-radius: 50%; border: 0; box-shadow: inset 0 0 0 2px var(--line); color: transparent; display: grid; place-items: center; flex: none; background: none; padding: 0; }
  .ck.on { background: var(--ok); box-shadow: none; color: #fff; }
</style>
