<script lang="ts">
  // Prep list for the current order: semi-finished first, then each dish scaled, tick lines off as you go.
  import Icon from "../ui/Icon.svelte";
  import Button from "../ui/Button.svelte";
  import Empty from "../ui/Empty.svelte";
  import { ord } from "../core/kitchen.svelte";
  import { byId, D } from "../core/catalog";
  import { fmtG } from "../core/util";
  import { prepData, semiNeeds, prepPdf, labelsPdf, type PrepItem } from "../core/pdfs";
  import { makePdf, fileBase, today } from "../core/files";
  const o = ord.v;
  let P = $state<PrepItem[] | null>(null);
  let got = $state(new Set<string>());
  $effect(() => { prepData().then((x) => (P = x)); });
  const need = $derived(P ? [...semiNeeds(P)] : []);
  const isY = (n: string) => /^(cooked )?yield/i.test(n);
  function tick(k: string) { const n = new Set(got); n.has(k) ? n.delete(k) : n.add(k); got = n; }
  const base = () => fileBase(o.name || "order") + (o.date ? "_" + o.date : "");
</script>
<div class="page">
  <a class="back" href="#kitchen"><Icon name="back" size={16} />Kitchen</a>
  {#if !o.lines.length}
    <Empty art="orders" title="The order is empty">Add dishes to an order first.<div class="ea"><Button kind="pri" href="#recipes">Pick dishes</Button></div></Empty>
  {:else}
    <div class="sub-h"><div><p class="eyebrow">{o.name || "Order"} · {o.date || "no date"} · {o.pax} guests · reserve {o.reserve}%</p><h1>Prep list</h1></div>
      <div class="acts"><Button icon="tool-label" onclick={() => makePdf("Labels_" + fileBase(o.name || "prep") + "_" + today() + ".pdf", labelsPdf)}>Labels</Button><Button kind="pri" icon="pdf" onclick={() => makePdf("Prep_List_" + base() + ".pdf", prepPdf)}>PDF</Button></div></div>
    <p class="note">Tap a line to tick it off. Labels print on an A4 sheet of 14 (99 × 38 mm), with the use-by date from the storage note.</p>
    {#if !P}
      <div class="skel"></div>
    {:else}
      {#if need.length}
        <section class="card pd semi"><h2>Semi-finished to make first</h2><small class="muted">For the dishes below. Open one to scale its batch.</small>
          <ul>{#each need as [id, g]}{@const s = byId.get(id)}{#if s}<li class:got={got.has("s" + id)}><button onclick={() => tick("s" + id)}><span><a href="#r-{id}" onclick={(e) => e.stopPropagation()}>{s.t}</a></span><b class="num">{fmtG(g)}</b></button></li>{/if}{/each}</ul></section>
      {/if}
      {#each P as { r, d, p }, di}
        {@const f = p / r.N}
        <section class="card pd">
          <h2><a href="#r-{r.id}">{r.t}</a></h2>
          <small class="muted">{(Math.round(p * 10) / 10).toLocaleString("en")} portions{r.pg ? " × " + r.pg + " " + (r.pu || "g") : ""} · {D.folders[r.f][0]}</small>
          {#if !d || !d.c.length}<p class="note">No recipe card yet.</p>
          {:else}{#each d.c as c, ci}
            {@const yl = c[2].find((x) => isY(x[0]))}
            <h3>{c[0] || "Ingredients"}</h3>
            <ul>{#each c[2].filter((x) => !isY(x[0])) as x, i}{@const k = di + "." + ci + "." + i}<li class:got={got.has(k)}><button onclick={() => tick(k)}><span>{x[0]}</span><b class="num">{typeof x[1] === "number" ? fmtG(x[1] * f) : x[1]}</b></button></li>{/each}</ul>
            {#if yl && typeof yl[1] === "number"}<p class="yl">Yield ≈ {fmtG(yl[1] * f)}</p>{/if}
          {/each}{/if}
          {#if d?.st}<p class="note st">{d.st}</p>{/if}
        </section>
      {/each}
    {/if}
  {/if}
</div>
<style>
  .ea { display: flex; justify-content: center; margin-top: 12px; }
  .pd { padding: 18px 20px 14px; margin-top: 14px; display: grid; }
  .pd h2 { font-size: 19px; } .pd h2 a { color: var(--ink); }
  .semi { box-shadow: var(--sh-1), inset 3px 0 0 var(--accent); }
  h3 { font: 600 12px var(--f-body); letter-spacing: .08em; text-transform: uppercase; color: var(--accent); margin: 16px 0 2px; }
  ul { list-style: none; margin: 6px 0 0; padding: 0; }
  li button { width: 100%; display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; border: 0; background: transparent; box-shadow: inset 0 -1px 0 var(--hair); text-align: left; font-size: 15px; }
  li b { font-weight: 600; white-space: nowrap; }
  li.got button { color: var(--muted); text-decoration: line-through; }
  .yl { font-size: 13px; color: var(--muted); margin-top: 8px; font-style: italic; }
  .st { margin-top: 10px; }
  .skel { height: 240px; border-radius: var(--r); margin-top: 14px; background: linear-gradient(90deg, var(--sunk), var(--surface), var(--sunk)); background-size: 200% 100%; animation: sk 1.2s infinite; }
  @keyframes sk { to { background-position: -200% 0; } }
</style>
