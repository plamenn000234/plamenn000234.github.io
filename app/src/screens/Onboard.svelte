<script lang="ts">
  // For chefs: one link for a new cook with the tests to pass, the recipes of the section and a first-week checklist.
  import Icon from "../ui/Icon.svelte";
  import Button from "../ui/Button.svelte";
  import LearnLoad from "../ui/LearnLoad.svelte";
  import { LD } from "../core/learn";
  import { LP } from "../core/learnProgress.svelte";
  import { CHECK, packLink } from "../core/onboard.svelte";
  import { byId } from "../core/catalog";
  import { favs, ord } from "../core/kitchen.svelte";
  import { shareText, copyText, toast } from "../core/ui.svelte";
  let by = $state(LP.v.chef || LP.v.name || ""), st = $state(""), days = $state(14);
  let mods = $state(new Set<string>()), recs = $state(new Set<string>()), check = $state(CHECK.join("\n"));
  // Recipes to choose from: the current order and the favourites, library recipes only (own recipes stay on this phone).
  const pool = [...new Set([...ord.v.lines.map((l) => l.id), ...favs.v])].map((id) => byId.get(id)).filter((r) => r && !r.mine).slice(0, 40);
  const tog = (s: Set<string>, k: string) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; };
  function link() {
    const b = by.trim(); if (!b) { toast.show("Add your name first"); return ""; }
    if (!mods.size && !recs.size && !check.trim()) { toast.show("Pick at least one test, recipe or checklist line"); return ""; }
    LP.v.chef = b; LP.save();
    return packLink({ by: b, st: st.trim(), due: "", mods: [...mods], recs: [...recs], check: check.split("\n").map((x) => x.trim()).filter(Boolean) }, days);
  }
  function share() { const l = link(); if (l) shareText("Welcome to the kitchen", `${by.trim()} has prepared your first weeks${st.trim() ? " in " + st.trim() : ""} in Chefsheet: tests, recipes and a checklist.\n${l}`); }
  function copy() { const l = link(); if (l) copyText(l, "Link copied"); }
</script>
<div class="page">
  <a class="back" href="#learn"><Icon name="back" size={16} />Learn</a>
  <div class="head"><p class="eyebrow">For chefs</p><h1>Onboard a new cook</h1></div>
  <p class="note lead">One link with everything for the first weeks. The cook opens it on their phone: the tests appear as tasks from you, and they send you each certificate. No account needed.</p>
  <LearnLoad>
    <section class="card pad blk">
      <div class="g3">
        <label class="tf"><span>Your name</span><input bind:value={by} placeholder="e.g. Chef Ivan" maxlength="60" /></label>
        <label class="tf"><span>Section</span><input bind:value={st} placeholder="e.g. Cold kitchen" maxlength="60" /></label>
        <label class="tf"><span>Tests due</span><select bind:value={days}><option value={0}>No date</option><option value={7}>In a week</option><option value={14}>In 2 weeks</option><option value={30}>In a month</option></select></label>
      </div>
    </section>
    <section class="card pad blk"><h2>Tests to pass</h2>
      <div class="ch">{#each LD.mods as m}<button aria-pressed={mods.has(m.id)} onclick={() => (mods = tog(mods, m.id))}>{m.n}. {m.t}</button>{/each}</div>
    </section>
    <section class="card pad blk"><h2>Recipes to learn</h2>
      {#if pool.length}<div class="ch">{#each pool as r}<button aria-pressed={recs.has(r!.id)} onclick={() => (recs = tog(recs, r!.id))}>{r!.t}</button>{/each}</div>
      {:else}<p class="note">Star the recipes of the section, or add them to the order, and they show here.</p>{/if}
    </section>
    <section class="card pad blk"><label class="tf"><span>First-week checklist, one line each</span><textarea rows="7" bind:value={check}></textarea></label></section>
    <div class="acts end"><Button kind="pri" icon="share" onclick={share}>Share the link</Button><Button icon="copy" onclick={copy}>Copy link</Button></div>
    <p class="note">{mods.size} tests · {recs.size} recipes · {check.split("\n").filter((x) => x.trim()).length} checklist lines</p>
  </LearnLoad>
</div>
<style>
  .back { display: inline-flex; align-items: center; gap: 4px; font-size: 14px; color: var(--ink-2); margin: 16px 0 4px; padding: 6px 12px 6px 8px; border-radius: 999px; background: var(--surface); box-shadow: var(--sh-1); }
  .head { margin: 14px 0 8px; display: grid; gap: 6px; }
  .lead { max-width: 640px; }
  .blk { display: grid; gap: 12px; margin-top: 14px; max-width: 860px; } .blk h2 { font-size: 18px; }
  .ch { display: flex; flex-wrap: wrap; gap: 8px; }
  .ch button { border: 0; border-radius: 999px; padding: 8px 13px; background: var(--sunk); color: var(--ink-2); font-size: 13.5px; text-align: left; }
  .ch button[aria-pressed="true"] { background: var(--pri); color: var(--pri-ink); }
  .end { margin: 18px 0 8px; }
</style>
