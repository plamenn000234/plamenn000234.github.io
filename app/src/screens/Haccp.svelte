<script lang="ts">
  // Food safety logs: temperatures, cooling, deliveries, and a monthly PDF for an inspection.
  import Icon from "../ui/Icon.svelte";
  import Button from "../ui/Button.svelte";
  import Seg from "../ui/Seg.svelte";
  import Empty from "../ui/Empty.svelte";
  import { H, KINDS, tempOk, coolState, recvOk, addTemp, startCool, checkCool, addRecv, removeRec, dueToday, unitOf, haccpPdf, COOL1, COOL2, type Kind } from "../core/haccp.svelte";
  import { sup } from "../core/kitchen.svelte";
  import { makePdf, fmtD } from "../core/files";
  import { toast, timers } from "../core/ui.svelte";
  let tab = $state(0);
  const v = $derived(H.v);
  const hm = (t: number) => new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const when = (t: number) => (new Date(t).toDateString() === new Date().toDateString() ? "Today " : fmtD(t) + " ") + hm(t);
  const num = (s: unknown) => { const n = parseFloat(String(s ?? "").replace(",", ".")); return isFinite(n) ? n : null; };
  let now = $state(Date.now()); $effect(() => { const iv = setInterval(() => (now = Date.now()), 30000); return () => clearInterval(iv); });

  /* temperatures */
  let tIn = $state<Record<string, string>>({});
  const due = $derived.by(() => { void v.temps.length; void now; return new Set(dueToday().map((u) => u.id)); });
  function saveT(uid: string) {
    const t = num(tIn[uid]); if (t == null) { toast.show("Type the temperature"); return; }
    const u = unitOf(uid)!; addTemp(uid, t); tIn[uid] = "";
    toast.show(tempOk(u.kind, t) ? "Saved: " + u.name + " " + t + " °C" : "Saved. " + u.name + " is outside the limit: act and write what you did");
  }
  let nu = $state(""), nk = $state(0), editUnits = $state(false);
  function addUnit() { const n = nu.trim(); if (!n) return; H.v.units.push({ id: "u" + Date.now().toString(36), name: n, kind: KINDS[nk][0] }); H.save(); nu = ""; }
  function delUnit(id: string) { H.v.units = H.v.units.filter((u) => u.id !== id); H.save(); }
  const recentT = $derived(v.temps.slice(0, 12));

  /* cooling */
  let cf = $state(""), ct = $state("70"), cIn = $state<Record<string, string>>({});
  function start() {
    const f = cf.trim(), t = num(ct); if (!f || t == null) { toast.show("Type the food and its temperature"); return; }
    startCool(f, t); cf = ""; timers.add(COOL1.h * 3600, "Cooling check", f);
  }
  function check(id: string, food: string, first: boolean) {
    const t = num(cIn[id]); if (t == null) { toast.show("Type the core temperature"); return; }
    checkCool(id, t); cIn[id] = "";
    const c = H.v.cool.find((x) => x.id === id)!;
    if (first && t <= COOL1.t) { timers.add(Math.max(60, Math.round((c.at + COOL2.h * 36e5 - Date.now()) / 1000)), "Cooling final check", food); toast.show("Stage 1 OK. Final check timer started"); }
    else toast.show(coolState(c) === "ok" ? "Cooling done in time" : "Outside the limit: reheat to 75 °C or throw away, and note it");
  }
  const active = $derived.by(() => { void now; return v.cool.filter((c) => !c.done); });
  const doneCool = $derived(v.cool.filter((c) => c.done).slice(0, 12));
  const left = (c: { at: number }, h: number) => { const m = Math.round((c.at + h * 36e5 - now) / 60000); return m >= 0 ? `${Math.floor(m / 60)} h ${m % 60} min left` : `${Math.floor(-m / 60)} h ${-m % 60} min late`; };

  /* deliveries */
  const RK = ["chilled", "frozen", "ambient"] as const;
  let r = $state({ sup: "", prod: "", kind: 0, t: "", useBy: "", pack: true });
  function saveR() {
    if (!r.prod.trim()) { toast.show("Type the product"); return; }
    const t = RK[r.kind] === "ambient" ? null : num(r.t);
    if (RK[r.kind] !== "ambient" && t == null) { toast.show("Probe it and type the temperature"); return; }
    const ok = addRecv({ sup: r.sup.trim(), prod: r.prod.trim(), kind: RK[r.kind], t, useBy: r.useBy, pack: r.pack });
    toast.show(ok ? "Delivery accepted" : "Reject it: " + (!r.pack ? "packaging damaged" : "too warm"));
    r = { ...r, prod: "", t: "", useBy: "", pack: true };
  }
  const rWarn = $derived(RK[r.kind] !== "ambient" && num(r.t) != null && !recvOk(RK[r.kind], num(r.t)));

  /* PDF */
  const d0 = new Date(); let mi = $state(0);
  const months = [0, 1, 2].map((k) => new Date(d0.getFullYear(), d0.getMonth() - k, 1));
  function pdf() { const m = months[mi]; makePdf("Food_Safety_Log_" + m.getFullYear() + "-" + String(m.getMonth() + 1).padStart(2, "0") + ".pdf", () => haccpPdf(m.getFullYear(), m.getMonth())); }
  let arm = $state("");
  function del(list: "temps" | "cool" | "recv", id: string) { if (arm !== id) { arm = id; setTimeout(() => { if (arm === id) arm = ""; }, 3000); return; } arm = ""; removeRec(list, id); }
</script>
<div class="page">
  <a class="back" href="#kitchen"><Icon name="back" size={16} />Kitchen</a>
  <div class="head"><p class="eyebrow">Food safety</p><h1>Logs</h1></div>
  {#if !v.on}
    <Empty title="Food safety logs are off">Turn them on in Settings to record fridge temperatures, cooling and deliveries.<div class="ea"><Button href="#settings">Settings</Button></div></Empty>
  {:else}
  <div class="top">
    <label class="tf by"><span>Checked by</span><input bind:value={H.v.by} placeholder="Your name or initials" maxlength="40" onchange={() => H.save()} /></label>
    <div class="pdf"><select aria-label="Month" bind:value={mi}>{#each months as m, i}<option value={i}>{m.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</option>{/each}</select><Button icon="pdf" onclick={pdf}>PDF</Button></div>
  </div>
  <Seg options={["Temperatures", "Cooling", "Deliveries"]} bind:value={tab} />

  {#if tab === 0}
    <section class="card pad list">
      {#if !v.units.length}<p class="note">Add your fridges and freezers below.</p>{/if}
      {#each v.units as u (u.id)}{@const last = v.temps.find((x) => x.u === u.id)}
        <div class="unit">
          <div class="un"><b>{u.name}</b><small>{KINDS.find((k) => k[0] === u.kind)?.[2]}{#if last}{" · last "}{when(last.at)}: <span class:bad={!tempOk(u.kind, last.t)}>{last.t} °C</span>{/if}</small>
            {#if due.has(u.id)}<em class="due">Not checked today</em>{/if}</div>
          <div class="in"><input type="number" inputmode="decimal" step="0.1" bind:value={tIn[u.id]} placeholder="°C" aria-label="Temperature of {u.name}" onkeydown={(e) => e.key === "Enter" && saveT(u.id)} /><Button small kind="pri" onclick={() => saveT(u.id)}>Save</Button></div>
          {#if editUnits}<button class="x" aria-label="Remove {u.name}" onclick={() => delUnit(u.id)}><Icon name="trash" size={16} /></button>{/if}
        </div>
      {/each}
      <button class="lnk" onclick={() => (editUnits = !editUnits)}>{editUnits ? "Done" : "Add or remove units"}</button>
      {#if editUnits}<div class="add"><input bind:value={nu} placeholder="e.g. Pastry fridge" aria-label="New unit name" /><Seg options={KINDS.map((k) => k[1])} bind:value={nk} /><Button small icon="plus" onclick={addUnit}>Add</Button></div>{/if}
    </section>
    {#if recentT.length}<h2 class="h2">Recent</h2><ul class="log card">{#each recentT as x (x.id)}{@const u = unitOf(x.u)}<li class:bad={!!u && !tempOk(u.kind, x.t)}><span>{u?.name || "Removed unit"}<small>{when(x.at)}{x.by ? " · " + x.by : ""}</small></span><b class="num">{x.t} °C</b><button class="x" class:arm={arm === x.id} aria-label="Delete reading" onclick={() => del("temps", x.id)}>{#if arm === x.id}Delete?{:else}<Icon name="close" size={14} />{/if}</button></li>{/each}</ul>{/if}

  {:else if tab === 1}
    <section class="card pad form">
      <p class="note">Cool cooked food from 60 °C to {COOL1.t} °C within {COOL1.h} hours, then to {COOL2.t} °C within {COOL2.h} hours from the start. Timers remind you to probe.</p>
      <div class="g2"><label class="tf"><span>Food</span><input bind:value={cf} placeholder="e.g. Beef stock 20 L" /></label><label class="tf"><span>Start temperature, °C</span><input type="number" inputmode="decimal" bind:value={ct} /></label></div>
      <div><Button kind="pri" icon="timer" onclick={start}>Start cooling</Button></div>
    </section>
    {#each active as c (c.id)}{@const st = coolState(c)}
      <section class="card pad cool" class:late={st === "late"}>
        <div class="un"><b>{c.food}</b><small>Started {hm(c.at)} at {c.t0} °C{c.t1 != null ? ` · ${hm(c.at1!)} ${c.t1} °C` : ""}</small>
          <em class:due={st === "late"}>{c.t1 == null ? `Below ${COOL1.t} °C: ${left(c, COOL1.h)}` : `Below ${COOL2.t} °C: ${left(c, COOL2.h)}`}</em></div>
        <div class="in"><input type="number" inputmode="decimal" step="0.1" bind:value={cIn[c.id]} placeholder="°C" aria-label="Core temperature of {c.food}" /><Button small kind="pri" onclick={() => check(c.id, c.food, c.t1 == null)}>{c.t1 == null ? "2 h check" : "Final check"}</Button></div>
      </section>
    {/each}
    {#if doneCool.length}<h2 class="h2">Finished</h2><ul class="log card">{#each doneCool as c (c.id)}{@const st = coolState(c)}<li class:bad={st !== "ok"}><span>{c.food}<small>{when(c.at)} · {c.t0} → {c.t1 ?? "–"}{c.t2 != null ? " → " + c.t2 : ""} °C{c.by ? " · " + c.by : ""}</small></span><b>{st === "ok" ? "OK" : "Failed"}</b><button class="x" class:arm={arm === c.id} aria-label="Delete record" onclick={() => del("cool", c.id)}>{#if arm === c.id}Delete?{:else}<Icon name="close" size={14} />{/if}</button></li>{/each}</ul>{/if}

  {:else}
    <section class="card pad form">
      <div class="g2">
        <label class="tf"><span>Supplier</span><input bind:value={r.sup} list="haccp-sup" placeholder="e.g. Metro" /></label>
        <label class="tf"><span>Product</span><input bind:value={r.prod} placeholder="e.g. Chicken breast 10 kg" /></label>
      </div>
      <datalist id="haccp-sup">{#each sup.v.list as s}<option value={s.name}></option>{/each}</datalist>
      <Seg options={["Chilled ≤ 5 °C", "Frozen ≤ -15 °C", "Dry store"]} bind:value={r.kind} />
      <div class="g2">
        {#if RK[r.kind] !== "ambient"}<label class="tf"><span>Probe temperature, °C</span><input type="number" inputmode="decimal" step="0.1" bind:value={r.t} class:badin={rWarn} /></label>{/if}
        <label class="tf"><span>Use by</span><input type="date" bind:value={r.useBy} /></label>
      </div>
      <label class="ck"><input type="checkbox" bind:checked={r.pack} /> Packaging clean and not damaged</label>
      {#if rWarn}<p class="warn">Too warm: reject it or tell the supplier.</p>{/if}
      <div><Button kind="pri" icon="check" onclick={saveR}>Save delivery</Button></div>
    </section>
    {#if v.recv.length}<h2 class="h2">Recent</h2><ul class="log card">{#each v.recv.slice(0, 15) as x (x.id)}<li class:bad={!x.ok}><span>{x.prod}<small>{when(x.at)}{x.sup ? " · " + x.sup : ""}{x.useBy ? " · use by " + fmtD(new Date(x.useBy + "T12:00").getTime()) : ""}{x.by ? " · " + x.by : ""}</small></span><b>{x.t != null ? x.t + " °C · " : ""}{x.ok ? "Accepted" : "Rejected"}</b><button class="x" class:arm={arm === x.id} aria-label="Delete record" onclick={() => del("recv", x.id)}>{#if arm === x.id}Delete?{:else}<Icon name="close" size={14} />{/if}</button></li>{/each}</ul>{/if}
  {/if}
  <p class="note foot">Saved on this device only. Make the PDF each month and keep it with your HACCP file. These limits are common defaults: follow your own plan and local rules.</p>
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
  .list, .form { display: grid; gap: 12px; margin-top: 14px; max-width: 760px; }
  .unit, .cool { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; padding-bottom: 12px; box-shadow: inset 0 -1px 0 var(--hair); }
  .cool { margin-top: 12px; max-width: 760px; box-shadow: var(--sh-1); }
  .cool.late { box-shadow: var(--sh-1), inset 3px 0 0 var(--warn); }
  .un { flex: 1 1 200px; display: grid; gap: 2px; min-width: 0; }
  .un b { font: 600 16px var(--f-display); } .un small { font-size: 12.5px; color: var(--muted); }
  .un em { font-style: normal; font-size: 12.5px; color: var(--accent); font-weight: 600; }
  .due { color: var(--warn) !important; }
  .bad { color: var(--warn); }
  .in { display: flex; gap: 8px; align-items: center; }
  .in input { width: 92px; border: 0; border-radius: var(--r-s); background: var(--sunk); padding: 9px 12px; font: 600 18px var(--f-display); text-align: right; outline: none; }
  .in input:focus { box-shadow: inset 0 0 0 2px var(--ink); background: var(--raised); }
  .x { width: 32px; height: 32px; border: 0; border-radius: 999px; background: transparent; color: var(--muted); display: grid; place-items: center; font-size: 12px; flex: none; }
  .x.arm { width: auto; padding: 0 10px; background: var(--warn); color: #fff; }
  .lnk { justify-self: start; border: 0; background: none; color: var(--accent); font-size: 14px; font-weight: 600; padding: 2px 0; }
  .add { display: grid; gap: 10px; }
  .add input { border: 0; border-radius: var(--r-s); background: var(--sunk); padding: 11px 12px; font-size: 16px; }
  .h2 { font-size: 17px; margin: 20px 0 8px; }
  .log { list-style: none; margin: 0; padding: 4px 16px; max-width: 760px; }
  .log li { display: flex; align-items: center; gap: 10px; padding: 10px 0; box-shadow: inset 0 -1px 0 var(--hair); font-size: 14.5px; }
  .log li:last-child { box-shadow: none; }
  .log span { flex: 1; display: grid; min-width: 0; } .log small { font-size: 12px; color: var(--muted); }
  .log li.bad b, .log li.bad span { color: var(--warn); }
  .ck { display: flex; gap: 8px; align-items: center; font-size: 14.5px; }
  .warn { color: var(--warn); font-weight: 600; font-size: 14px; }
  .badin { box-shadow: inset 0 0 0 2px var(--warn) !important; }
  .foot { margin: 18px 0 8px; max-width: 760px; }
</style>
