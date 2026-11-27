<script lang="ts">
  // Stock on hand, write-offs with a reason, and the history with a monthly PDF.
  import Icon from "../ui/Icon.svelte";
  import Button from "../ui/Button.svelte";
  import Seg from "../ui/Seg.svelte";
  import Empty from "../ui/Empty.svelte";
  import { S, WHY, KIND_LABEL, receive, take, count, setMin, drop, undo, low, items, unitOf, canon, priceFor, wasteOf, stockPdf, receiveAll, useAll } from "../core/stock.svelte";
  import { ord, compute, money } from "../core/kitchen.svelte";
  import { D } from "../core/catalog";
  import { makePdf, fmtD } from "../core/files";
  import { fmtQ } from "../core/util";
  import { fold } from "../core/util";
  import { toast } from "../core/ui.svelte";
  import { router } from "../core/router.svelte";
  let tab = $state(router.route.q.get("t") === "waste" ? 1 : 0);
  const v = $derived(S.v);
  const num = (s: unknown) => { const n = parseFloat(String(s ?? "").replace(",", ".")); return isFinite(n) ? n : null; };
  const hm = (t: number) => new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const when = (t: number) => (new Date(t).toDateString() === new Date().toDateString() ? "Today " : fmtD(t) + " ") + hm(t);
  const names = [...new Set(D.products.map((p) => p[0]))].sort();

  /* on hand */
  let q = $state(""), open = $state(""), aIn = $state(""), aQ = $state("");
  let rIn = $state<Record<string, string>>({}), cIn = $state<Record<string, string>>({}), mIn = $state<Record<string, string>>({});
  const list = $derived.by(() => { void JSON.stringify(v.have); const f = fold(q.trim()); return items().filter(([n]) => !f || fold(n).includes(f)); });
  const lows = $derived.by(() => { void JSON.stringify(v.have); return new Set(low()); });
  const value = $derived.by(() => { void JSON.stringify(v.have); let s = 0, n = 0; for (const [p, it] of items()) { const pv = priceFor(p); if (pv != null) { s += pv * it.q; n++; } } return { s, n }; });
  function addNew() {
    const n = aIn.trim(), x = num(aQ); if (!n) { toast.show("Type the product"); return; }
    if (x == null || x < 0) { toast.show("Type how much you have"); return; }
    const c = canon(n); if (v.have[c]) receive(c, x); else count(c, x);
    toast.show("In stock: " + c + " " + fmtQ(S.v.have[c].q) + " " + S.v.have[c].u); aIn = ""; aQ = "";
  }
  function doIn(n: string) { const x = num(rIn[n]); if (x == null || x <= 0) { toast.show("Type the quantity received"); return; } receive(n, x); rIn[n] = ""; toast.show("Received " + fmtQ(x) + " " + v.have[n].u); }
  function doCount(n: string) { const x = num(cIn[n]); if (x == null || x < 0) { toast.show("Type the counted quantity"); return; } count(n, x); cIn[n] = ""; toast.show("Counted: " + fmtQ(x) + " " + v.have[n].u); }
  function doMin(n: string) { setMin(n, num(mIn[n])); toast.show(v.have[n].min ? "Minimum set" : "Minimum removed"); }
  let arm = $state("");
  function confirm(k: string, f: () => void) { if (arm !== k) { arm = k; setTimeout(() => { if (arm === k) arm = ""; }, 3000); return; } arm = ""; f(); }

  /* the current order */
  const oc = $derived.by(() => { void JSON.stringify(ord.v.lines); return ord.v.lines.length ? compute() : null; });
  const oItems = $derived(oc ? oc.secs.flat() : []);
  const ref = $derived(ord.v.name || "Order" + (ord.v.date ? " " + ord.v.date : ""));
  function inAll() { confirm("in-all", () => { const n = receiveAll(oItems, ref); toast.show(n + " products added to stock"); }); }
  function useOrder() { confirm("use-all", () => { const n = useAll(oItems, ref); toast.show(n ? n + " products taken from stock" : "None of these products are in stock yet"); }); }

  /* write-off */
  let w = $state({ p: "", q: "", why: 0, note: "" });
  const wUnit = $derived(w.p.trim() ? unitOf(canon(w.p)) : "");
  const wCost = $derived.by(() => { const pv = w.p.trim() ? priceFor(canon(w.p)) : null, x = num(w.q); return pv != null && x ? pv * x : null; });
  function saveW() {
    const n = w.p.trim(), x = num(w.q); if (!n) { toast.show("Type the product"); return; }
    if (x == null || x <= 0) { toast.show("Type the quantity"); return; }
    take(n, x, "waste", { why: WHY[w.why], ...(w.note.trim() ? { note: w.note.trim() } : {}) });
    toast.show("Written off: " + canon(n) + " " + fmtQ(x) + " " + unitOf(canon(n))); w = { ...w, p: "", q: "", note: "" };
  }
  const d0 = new Date(); let mi = $state(0);
  const months = [0, 1, 2].map((k) => new Date(d0.getFullYear(), d0.getMonth() - k, 1));
  const rep = $derived.by(() => { void v.log.length; const m = months[mi]; return wasteOf(m.getFullYear(), m.getMonth()); });
  function pdf() { const m = months[mi]; makePdf("Stock_" + m.getFullYear() + "-" + String(m.getMonth() + 1).padStart(2, "0") + ".pdf", () => stockPdf(m.getFullYear(), m.getMonth())); }
  const sign = (k: string) => (k === "in" ? "+" : k === "count" ? "= " : "−");
</script>
<div class="page">
  <a class="back" href="#kitchen"><Icon name="back" size={16} />Kitchen</a>
  <div class="head"><p class="eyebrow">Production</p><h1>Stock</h1></div>
  {#if !v.on}
    <Empty title="Stock is off">Turn it on in Settings to keep stock on hand and write-offs.<div class="ea"><Button href="#settings">Settings</Button></div></Empty>
  {:else}
  <div class="top">
    <label class="tf by"><span>Your name</span><input bind:value={S.v.by} placeholder="Name or initials" maxlength="40" onchange={() => S.save()} /></label>
    <div class="pdf"><select aria-label="Month" bind:value={mi}>{#each months as m, i}<option value={i}>{m.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</option>{/each}</select><Button icon="pdf" onclick={pdf}>PDF</Button></div>
  </div>
  <datalist id="stock-p">{#each names as n}<option value={n}></option>{/each}</datalist>
  <Seg options={["On hand", "Write-off", "History"]} bind:value={tab} />

  {#if tab === 0}
    {#if oItems.length}<section class="card pad oc">
      <div class="un"><b>Current order: {ref}</b><small>{oItems.length} products from the order list</small></div>
      <div class="acts"><Button small icon="plus" onclick={inAll}>{arm === "in-all" ? "Tap again to add" : "Delivered: add to stock"}</Button><Button small icon="cook" onclick={useOrder}>{arm === "use-all" ? "Tap again to take" : "Cooked: take from stock"}</Button></div>
    </section>{/if}
    <section class="card pad form">
      <div class="g3"><label class="tf wide"><span>Product</span><input bind:value={aIn} list="stock-p" placeholder="e.g. Butter" /></label>
        <label class="tf"><span>Quantity{aIn.trim() ? ", " + unitOf(canon(aIn)) : ""}</span><input type="number" inputmode="decimal" min="0" step="any" bind:value={aQ} onkeydown={(e) => e.key === "Enter" && addNew()} /></label></div>
      <div><Button kind="pri" icon="plus" onclick={addNew}>Add to stock</Button></div>
    </section>
    {#if items().length}
      <div class="bar"><label class="srch"><Icon name="search" size={18} /><input type="search" bind:value={q} placeholder="Search stock" aria-label="Search stock" /></label>
        <span class="note">{items().length} product{items().length === 1 ? "" : "s"}{value.n ? " · value " + money(value.s) : ""}{lows.size ? " · " : ""}{#if lows.size}<b class="bad">{lows.size} running low</b>{/if}</span></div>
      <ul class="log card st">{#each list as [n, it] (n)}
        <li class:lowi={lows.has(n)}>
          <button class="row" aria-expanded={open === n} onclick={() => (open = open === n ? "" : n)}><span>{n}<small>{it.min ? "min " + fmtQ(it.min) + " " + it.u : ""}{lows.has(n) ? (it.min ? " · " : "") + "running low" : ""}</small></span><b class="num">{fmtQ(it.q) === "–" ? "0" : fmtQ(it.q)} <i>{it.u}</i></b></button>
          {#if open === n}<div class="ed">
            <div class="in"><input type="number" inputmode="decimal" min="0" step="any" bind:value={rIn[n]} placeholder={it.u} aria-label="Received {n}" /><Button small onclick={() => doIn(n)}>Received</Button></div>
            <div class="in"><input type="number" inputmode="decimal" min="0" step="any" bind:value={cIn[n]} placeholder={it.u} aria-label="Counted {n}" /><Button small onclick={() => doCount(n)}>Counted</Button></div>
            <div class="in"><input type="number" inputmode="decimal" min="0" step="any" bind:value={mIn[n]} placeholder={it.min ? String(it.min) : "min"} aria-label="Minimum of {n}" /><Button small onclick={() => doMin(n)}>Set minimum</Button></div>
            <div class="in"><Button small onclick={() => { w = { ...w, p: n }; tab = 1; }}>Write off</Button><button class="x" class:arm={arm === "d:" + n} aria-label="Remove {n} from stock" onclick={() => confirm("d:" + n, () => { drop(n); open = ""; })}>{#if arm === "d:" + n}Remove?{:else}<Icon name="trash" size={16} />{/if}</button></div>
          </div>{/if}
        </li>
      {:else}<li class="muted">Nothing matches.</li>{/each}</ul>
    {:else}<p class="note foot">Add what you have, or tap “Delivered: add to stock” on an order. When you cook the order, “Cooked: take from stock” takes the products out, and the order list shows what you still need to buy.</p>{/if}

  {:else if tab === 1}
    <section class="card pad form">
      <div class="g3"><label class="tf wide"><span>Product</span><input bind:value={w.p} list="stock-p" placeholder="e.g. Salmon fillet" /></label>
        <label class="tf"><span>Quantity{wUnit ? ", " + wUnit : ""}</span><input type="number" inputmode="decimal" min="0" step="any" bind:value={w.q} /></label></div>
      <label class="tf"><span>Reason</span><select bind:value={w.why}>{#each WHY as x, i}<option value={i}>{x}</option>{/each}</select></label>
      <label class="tf"><span>Note</span><input bind:value={w.note} placeholder="Optional, e.g. fridge 2 was at 9 °C" maxlength="120" /></label>
      {#if wCost != null}<p class="note">Value {money(wCost)}</p>{/if}
      <div><Button kind="pri" icon="trash" onclick={saveW}>Write off</Button></div>
    </section>
    <h2 class="h2">{months[mi].toLocaleDateString("en-GB", { month: "long" })}: {rep.rows.length} write-off{rep.rows.length === 1 ? "" : "s"}{rep.priced ? " · " + money(rep.cost) : ""}</h2>
    {#if rep.rows.length}
      <div class="sum">{#each rep.byWhy as [k, x]}<div class="card"><small>{k}</small><b>{x.cost ? money(x.cost) : x.n + "×"}</b></div>{/each}</div>
      {#if rep.byP.length > 1}<p class="note">Most lost: {rep.byP.slice(0, 3).map(([n, x]) => n + " " + fmtQ(x.q) + " " + x.u).join(", ")}</p>{/if}
      {#if rep.priced < rep.rows.length}<p class="note">No price for {rep.rows.length - rep.priced} of them. <a href="#prices">Add prices</a></p>{/if}
    {:else}<p class="note">Nothing written off this month.</p>{/if}

  {:else}
    {#if v.log.length}<ul class="log card">{#each v.log.slice(0, 60) as m (m.id)}
      <li class:bad={m.k === "waste"}><span>{m.p}<small>{when(m.at)} · {KIND_LABEL[m.k]}{m.why ? ": " + m.why : ""}{m.note ? " · " + m.note : ""}{m.ref ? " · " + m.ref : ""}{m.by ? " · " + m.by : ""}</small></span>
        <b class="num">{sign(m.k)}{fmtQ(m.q) === "–" ? "0" : fmtQ(m.q)} {m.u}</b>
        <button class="x" class:arm={arm === m.id} aria-label="Undo this change" onclick={() => confirm(m.id, () => { undo(m.id); toast.show("Undone"); })}>{#if arm === m.id}Undo?{:else}<Icon name="close" size={14} />{/if}</button></li>
    {/each}</ul>{:else}<p class="note">No changes yet.</p>{/if}
  {/if}
  <p class="note foot">Saved on this device only. Quantities are in the order list units (kg, l, pcs). Values use your prices without VAT.</p>
  {/if}
</div>
<style>
  .back { display: inline-flex; align-items: center; gap: 4px; font-size: 14px; color: var(--ink-2); margin: 16px 0 4px; padding: 6px 12px 6px 8px; border-radius: 999px; background: var(--surface); box-shadow: var(--sh-1); }
  .head { margin: 14px 0 14px; display: grid; gap: 6px; }
  .ea { display: flex; justify-content: center; margin-top: 12px; }
  .top { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; justify-content: space-between; margin-bottom: 14px; }
  .by { flex: 1 1 200px; max-width: 320px; }
  .pdf { display: flex; gap: 8px; align-items: center; }
  .pdf select { border: 0; border-radius: var(--r-s); background: var(--sunk); padding: 10px 12px; font-size: 14px; }
  .form, .oc { display: grid; gap: 12px; margin-top: 14px; max-width: 760px; }
  .g3 { display: grid; gap: 12px; grid-template-columns: 2fr 1fr; } .wide { min-width: 0; }
  .un { display: grid; gap: 2px; } .un b { font: 600 16px var(--f-display); } .un small { font-size: 12.5px; color: var(--muted); }
  .acts { display: flex; flex-wrap: wrap; gap: 8px; }
  .bar { display: flex; flex-wrap: wrap; gap: 10px 14px; align-items: center; margin: 18px 0 10px; max-width: 760px; }
  .srch { flex: 1 1 200px; display: flex; align-items: center; gap: 8px; padding: 0 14px; border-radius: 999px; background: var(--sunk); color: var(--muted); }
  .srch input { flex: 1; min-width: 0; border: 0; background: transparent; padding: 10px 0; font-size: 15px; outline: none; color: var(--ink); }
  .bad { color: var(--warn); }
  .log { list-style: none; margin: 14px 0 0; padding: 4px 16px; max-width: 760px; }
  .log li { display: flex; align-items: center; gap: 10px; padding: 10px 0; box-shadow: inset 0 -1px 0 var(--hair); font-size: 14.5px; }
  .log li:last-child { box-shadow: none; }
  .log span { flex: 1; display: grid; min-width: 0; } .log small { font-size: 12px; color: var(--muted); }
  .log li.bad b, .log li.bad span { color: var(--warn); }
  .log b { font: 600 15.5px var(--f-display); white-space: nowrap; } .log i { font-style: normal; font-size: 12px; color: var(--muted); }
  .st { margin-top: 0; } .st li { display: grid; gap: 10px; padding: 0; }
  .row { display: flex; align-items: center; gap: 10px; width: 100%; padding: 11px 0; border: 0; background: none; color: var(--ink); text-align: left; font-size: 15px; }
  .row span { flex: 1; display: grid; }
  .lowi .row small { color: var(--warn); font-weight: 600; }
  .ed { display: flex; flex-wrap: wrap; gap: 10px 16px; padding: 0 0 14px; }
  .in { display: flex; gap: 8px; align-items: center; }
  .in input { width: 86px; border: 0; border-radius: var(--r-s); background: var(--sunk); padding: 8px 10px; font: 600 16px var(--f-display); text-align: right; outline: none; }
  .in input:focus { box-shadow: inset 0 0 0 2px var(--ink); background: var(--raised); }
  .x { width: 32px; height: 32px; border: 0; border-radius: 999px; background: transparent; color: var(--muted); display: grid; place-items: center; font-size: 12px; flex: none; }
  .x.arm { width: auto; padding: 0 10px; background: var(--warn); color: #fff; }
  .h2 { font-size: 17px; margin: 20px 0 8px; }
  .sum { display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); max-width: 760px; margin-bottom: 8px; }
  .sum div { display: grid; gap: 2px; padding: 12px 14px; } .sum small { font-size: 12px; color: var(--muted); } .sum b { font: 700 18px var(--f-display); }
  .foot { margin: 18px 0 8px; max-width: 760px; }
</style>
