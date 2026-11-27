<script lang="ts">
  // Product prices per kg, litre or piece. Used for food cost in recipes and orders.
  import Icon from "../ui/Icon.svelte";
  import Seg from "../ui/Seg.svelte";
  import { D, byId } from "../core/catalog";
  import { prices, cur, curSym, ord } from "../core/kitchen.svelte";
  import { CURS } from "../core/constants";
  import { fold } from "../core/util";
  let { rid = "" }: { rid?: string } = $props();
  // svelte-ignore state_referenced_locally
  const r = rid ? byId.get(rid) : undefined;
  const modes = [...(r ? ["r"] : []), ...(ord.v.lines.length ? ["o"] : []), "all"];
  const labels: Record<string, string> = { r: "This recipe", o: "This order", all: "All products" };
  let mode = $state(modes[0]), q = $state("");
  const hay = D.products.map((p) => fold(p[0] + " " + D.sections[p[1]]));
  const ids = $derived.by(() => {
    let a: number[];
    if (mode === "r" && r) a = [...new Set(r.lines.map((l) => l[0]))];
    else if (mode === "o") { const s = new Set<number>(); ord.v.lines.forEach((l) => byId.get(l.id)?.lines.forEach((y) => s.add(y[0]))); a = [...s]; }
    else a = D.products.map((_, i) => i);
    const f = fold(q.trim()); return a.filter((i) => !f || hay[i].includes(f)).sort((x, y) => D.products[x][0].localeCompare(D.products[y][0]));
  });
  const nSet = $derived(Object.keys(prices.v).length);
  function setPrice(name: string, v: string) {
    const n = parseFloat(v.replace(",", "."));
    if (v.trim() === "" || !isFinite(n) || n <= 0) delete prices.v[name]; else prices.v[name] = Math.round(n * 100) / 100;
    prices.save();
  }
</script>
<div class="page">
  <a class="back" href={r ? "#r-" + r.id : "#kitchen"}><Icon name="back" size={16} />{r ? r.t : "Kitchen"}</a>
  <div class="sub-h"><div><p class="eyebrow">{nSet} price{nSet === 1 ? "" : "s"} set</p><h1>Product prices</h1></div>
    <label class="tf cur"><span>Currency</span><select bind:value={cur.v} onchange={() => cur.save()}>{#each CURS as c}<option value={c[0]}>{c[0]} ({c[1]})</option>{/each}</select></label></div>
  <p class="note">Price you pay per kg, litre or piece, without VAT. Saved on this device and used for food cost in recipes and orders. Changing the currency does not convert prices you already entered.</p>
  <div class="bar">{#if modes.length > 1}<Seg options={modes.map((m) => labels[m])} value={modes.indexOf(mode)} onchange={(i) => (mode = modes[i])} />{/if}
    <label class="srch"><Icon name="search" size={18} /><input type="search" bind:value={q} placeholder="Search products, e.g. butter" aria-label="Search products" autocomplete="off" /></label></div>
  <div class="group">
    {#each ids.slice(0, 300) as i (i)}{@const p = D.products[i]}{@const v = prices.v[p[0]]}
      <label class="pr"><span><b>{p[0]}</b><small>{D.sections[p[1]]}</small></span>
        <span class="in"><i>{curSym()}</i><input type="number" inputmode="decimal" step="any" min="0" placeholder="0.00" value={typeof v === "number" ? v : ""} onchange={(e) => setPrice(p[0], (e.target as HTMLInputElement).value)} aria-label="Price of {p[0]} per {p[2]}" /><i>/ {p[2]}</i></span></label>
    {:else}<p class="pr muted">No products match.</p>{/each}
  </div>
  {#if ids.length > 300}<p class="note" style="margin-top:10px">Showing 300 of {ids.length}. Search to find more.</p>{/if}
</div>
<style>
  .cur { width: 200px; }
  .bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin: 16px 0 12px; }
  .srch { flex: 1 1 220px; display: flex; align-items: center; gap: 8px; padding: 0 14px; border-radius: 999px; background: var(--sunk); color: var(--muted); }
  .srch input { flex: 1; min-width: 0; border: 0; background: transparent; padding: 11px 0; font-size: 15px; outline: none; color: var(--ink); }
  .pr { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 16px; }
  .pr > span:first-child { display: grid; min-width: 0; } .pr b { font-weight: 500; font-size: 15px; } .pr small { font-size: 12px; color: var(--muted); }
  .in { display: flex; align-items: center; gap: 6px; flex: none; } .in i { font-style: normal; font-size: 13px; color: var(--muted); }
  .in input { width: 88px; border: 0; border-radius: var(--r-s); background: var(--sunk); padding: 9px 10px; font-size: 16px; text-align: right; outline: none; font-variant-numeric: tabular-nums; }
  .in input:focus { box-shadow: inset 0 0 0 2px var(--ink); background: var(--raised); }
</style>
