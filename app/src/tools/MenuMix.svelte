<script lang="ts">
  // Menu engineering: each dish by popularity (how many sold) and by profit per portion.
  // Star = popular and profitable, Plowhorse = popular but low profit, Puzzle = profitable but rarely ordered, Dog = neither.
  // Popular = at least 70 % of an equal share of the sales (Kasavana & Smith). Profitable = profit per portion at or above the menu's weighted average.
  import Field from "../ui/Field.svelte";
  import Outs from "../ui/Outs.svelte";
  import Button from "../ui/Button.svelte";
  import { Persisted, KEYS } from "../core/store.svelte";
  import { ord, savedMenus, recipeCost, curSym, money } from "../core/kitchen.svelte";
  import { byId } from "../core/catalog";
  import { f1 } from "../core/util";
  import { copyText, shareText } from "../core/ui.svelte";
  let { s }: { s: any } = $props();
  type Row = { p?: number | ""; n?: number | ""; c?: number | "" };
  const M = new Persisted<{ vat: number | ""; src: string; rows: Record<string, Row> }>(KEYS.mix, { vat: 20, src: "", rows: {} });
  if (!M.v.rows) M.v.rows = {};
  const menus = savedMenus();
  const srcs = [...(ord.v.lines.length ? [["o", "Current order: " + (ord.v.name || "Order")]] : []), ...menus.map((m) => ["m:" + m.id, "Menu: " + m.name])] as [string, string][];
  if (!srcs.some((x) => x[0] === M.v.src)) M.v.src = srcs[0]?.[0] || "";
  const ids = $derived.by(() => {
    const src = M.v.src;
    const lines = src === "o" ? ord.v.lines : (menus.find((m) => "m:" + m.id === src)?.lines || []);
    return [...new Set(lines.map((l) => l.id))].filter((id) => byId.has(id));
  });
  $effect(() => { for (const id of ids) if (!M.v.rows[id]) M.v.rows[id] = {}; });
  const autoCost = (id: string) => { const r = byId.get(id)!, c = recipeCost(r); return c.n ? c.sum : null; };
  const n0 = (v: unknown) => { const n = Number(v); return isFinite(n) && n > 0 ? n : 0; };
  const res = $derived.by(() => {
    void JSON.stringify(M.v);
    const vat = 1 + n0(M.v.vat) / 100;
    const rows = ids.map((id) => {
      const r = byId.get(id)!, x = M.v.rows[id] || {}, ac = autoCost(id);
      const cost = x.c !== "" && x.c != null && n0(x.c) ? n0(x.c) : ac, price = n0(x.p), sold = n0(x.n), net = price / vat;
      const cm = cost != null && price ? net - cost : null;
      return { id, t: r.t, cost, ac, price, sold, net, cm, fc: cost != null && net ? (cost / net) * 100 : null };
    });
    const ok = rows.filter((r) => r.cm != null && r.sold > 0);
    const total = ok.reduce((a, r) => a + r.sold, 0);
    const avgCm = total ? ok.reduce((a, r) => a + r.cm! * r.sold, 0) / total : 0;
    const popLim = ok.length ? (0.7 / ok.length) * 100 : 0;
    const out = rows.map((r) => {
      if (r.cm == null || !(r.sold > 0) || !total) return { ...r, mix: null, cls: "" };
      const mix = (r.sold / total) * 100, pop = mix >= popLim, prof = r.cm >= avgCm;
      return { ...r, mix, cls: pop && prof ? "Star" : pop ? "Plowhorse" : prof ? "Puzzle" : "Dog" };
    });
    const rev = ok.reduce((a, r) => a + r.net * r.sold, 0), gp = ok.reduce((a, r) => a + r.cm! * r.sold, 0);
    return { rows: out, total, avgCm, popLim, rev, gp, fc: rev ? ((rev - gp) / rev) * 100 : null, n: ok.length };
  });
  const ADVICE: Record<string, string> = {
    Star: "Keep it as it is. Best place on the menu, keep quality and portion exact.",
    Plowhorse: "Guests love it but it earns little. Raise the price a little, make the portion or garnish cheaper, or pair it with a profitable side.",
    Puzzle: "It earns well but sells little. Move it to a better place on the menu, rename or describe it better, let the staff recommend it.",
    Dog: "Low sales and low profit. Replace it or rework it, unless it must stay (a guest favourite, kids menu).",
  };
  const c = curSym(), m2 = (v: number | null) => (v == null || !isFinite(v) ? "–" : (Math.round(v * 100) / 100).toFixed(2));
  function text() {
    let t = "MENU ENGINEERING · " + (srcs.find((x) => x[0] === M.v.src)?.[1] || "") + "\n" + res.total + " sold · average profit " + money(res.avgCm) + " per portion\n";
    for (const k of ["Star", "Plowhorse", "Puzzle", "Dog"]) { const a = res.rows.filter((r) => r.cls === k); if (a.length) t += "\n" + k.toUpperCase() + "\n" + a.map((r) => "- " + r.t + ": " + r.sold + " sold, profit " + money(r.cm!) + ", food cost " + f1(r.fc!) + " %").join("\n") + "\n" + ADVICE[k] + "\n"; }
    return t;
  }
</script>
{#if !srcs.length}
  <p class="note">Build an order or save a menu in Kitchen first. Then enter the price and how many portions you sold of each dish.</p>
  <div><Button small href="#kitchen">Kitchen</Button></div>
{:else}
  <div class="g2">
    <label class="tf"><span>Dishes from</span><select bind:value={M.v.src}>{#each srcs as [k, l]}<option value={k}>{l}</option>{/each}</select></label>
    <Field label="VAT in menu prices %" bind:value={M.v.vat} />
  </div>
  <p class="note">For each dish: menu price with VAT and portions sold in the period (a week or a month from your till). Portion cost comes from your product prices; type it if it is missing.</p>
  <div class="mm">{#each ids as id (id)}{@const x = M.v.rows[id]}{@const r = res.rows.find((y) => y.id === id)}{#if x}
    <div class="dish">
      <div class="dn"><a href="#r-{id}">{byId.get(id)!.t}</a>{#if r?.cls}<em class="cls {r.cls.toLowerCase()}">{r.cls}</em>{/if}</div>
      <div class="g3">
        <Field label="Menu price" unit={c} bind:value={x.p} />
        <Field label="Sold" bind:value={x.n} />
        <Field label="Portion cost" unit={c} placeholder={r?.ac != null ? m2(r.ac) : "type it"} bind:value={x.c} />
      </div>
      {#if r?.cm != null}<small class="muted">Profit {m2(r.cm)} {c} · food cost {f1(r.fc!)} %{r.mix != null ? " · " + f1(r.mix) + " % of sales" : ""}</small>{/if}
    </div>
  {/if}{/each}</div>
  {#if res.n >= 2}
    <Outs items={[["Portions sold", String(res.total), ""], ["Average profit", m2(res.avgCm), " " + c], ["Food cost", res.fc != null ? f1(res.fc) : "–", " %"], ["Gross profit", m2(res.gp), " " + c]]} />
    <div class="quad">
      {#each [["Plowhorse", "Popular, low profit"], ["Star", "Popular, high profit"], ["Dog", "Rare, low profit"], ["Puzzle", "Rare, high profit"]] as [k, l]}
        <div class="q {k.toLowerCase()}"><b>{k}</b><small>{l}</small><ul>{#each res.rows.filter((r) => r.cls === k) as r}<li>{r.t}</li>{:else}<li class="muted">–</li>{/each}</ul></div>
      {/each}
    </div>
    {#each ["Star", "Plowhorse", "Puzzle", "Dog"] as k}{#if res.rows.some((r) => r.cls === k)}<p class="note"><b>{k}:</b> {ADVICE[k]}</p>{/if}{/each}
    <p class="note">Popular = at least {f1(res.popLim)} % of portions sold (70 % of an equal share). High profit = {m2(res.avgCm)} {c} per portion or more (the weighted average).</p>
    <div class="acts"><Button small icon="copy" onclick={() => copyText(text(), "Copied")}>Copy</Button><Button small icon="share" onclick={() => shareText("Menu engineering", text())}>Share</Button></div>
  {:else}<p class="note">Enter price and sold for at least two dishes to see the result.</p>{/if}
{/if}
<style>
  .mm { display: grid; gap: 10px; }
  .dish { display: grid; gap: 8px; padding: 12px 0; box-shadow: inset 0 -1px 0 var(--hair); }
  .dn { display: flex; align-items: center; gap: 10px; justify-content: space-between; } .dn a { font: 600 15px var(--f-display); color: var(--ink); }
  .g3 { display: grid; gap: 10px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .cls { font-style: normal; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 999px; background: var(--sunk); flex: none; }
  .cls.star, .q.star b { color: light-dark(#1f7a3a, #6fd08c); } .cls.plowhorse, .q.plowhorse b { color: light-dark(#8a5200, #f0b45a); } .cls.puzzle, .q.puzzle b { color: light-dark(#2b5cab, #8fb4ff); } .cls.dog, .q.dog b { color: var(--warn); }
  .quad { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0; }
  .q { padding: 12px 14px; border-radius: var(--r-s); background: var(--sunk); display: grid; gap: 2px; align-content: start; }
  .q b { font: 700 15px var(--f-display); } .q small { font-size: 12px; color: var(--muted); }
  .q ul { margin: 6px 0 0; padding-left: 16px; font-size: 13.5px; display: grid; gap: 3px; }
  .acts { display: flex; gap: 8px; margin-top: 8px; }
</style>
