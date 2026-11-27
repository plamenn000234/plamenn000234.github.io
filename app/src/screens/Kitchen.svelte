<script lang="ts">
  // Production: the current order, its order list by section or by supplier, files to print, saved orders and menus.
  import Icon from "../ui/Icon.svelte";
  import Button from "../ui/Button.svelte";
  import Field from "../ui/Field.svelte";
  import Seg from "../ui/Seg.svelte";
  import Empty from "../ui/Empty.svelte";
  import Dish from "../ui/Dish.svelte";
  import { ord, compute, portions, saveOrder, savedOrders, savedMenus, openSaved, orderText, money, blankOrder, saveMenu, deleteSaved, sup, supGroups, supText, supPhone } from "../core/kitchen.svelte";
  import { orderPdf, orderCsv, mxPdf, svcPdf, orderDishes } from "../core/pdfs";
  import { makePdf, saveFile, fileBase } from "../core/files";
  import { byId, D } from "../core/catalog";
  import { ALG } from "../core/constants";
  import { fmtQ } from "../core/util";
  import { toast, copyText, shareText } from "../core/ui.svelte";
  import { router } from "../core/router.svelte";
  import { H, dueToday } from "../core/haccp.svelte";
  import { guestLink, qrSvg, guestPdf } from "../core/guest";
  let showQr = $state(false);
  const gLink = $derived.by(() => { void JSON.stringify(o.lines); return showQr ? guestLink(o.name || "", orderDishes()) : ""; });
  const nDue = $derived(H.v.on ? dueToday().length : 0);
  const tab = $derived(router.route.arg === "saved" ? 1 : 0);
  let rev = $state(0);
  const o = $derived(ord.v);
  const c = $derived.by(() => { void rev; void JSON.stringify(o); return compute(); });
  let ticked = $state(new Set<string>());
  const saved = $derived.by(() => { void rev; return savedOrders(); });
  const menus = $derived.by(() => { void rev; return savedMenus(); });
  const KS = ["0.5", "0.7", "0.8", "1", "1.2", "1.3", "1.5"];
  function upd() { ord.save(); }
  function remove(id: string) { o.lines = o.lines.filter((l) => l.id !== id); upd(); }
  function tick(k: string) { const n = new Set(ticked); n.has(k) ? n.delete(k) : n.add(k); ticked = n; }
  let by = $state(0), showMx = $state(false), arm = $state("");
  const groups = $derived.by(() => { void JSON.stringify(sup.v); return by ? supGroups(c) : []; });
  const dishes = $derived.by(() => { void JSON.stringify(o.lines); return orderDishes(); });
  const AK = Object.keys(ALG).map(Number);
  const base = () => fileBase(o.name || "order") + (o.date ? "_" + o.date : "");
  function setSup(name: string, id: string) { if (id) sup.v.map[name] = id; else delete sup.v.map[name]; sup.save(); }
  function del(id: string, menu: boolean) {
    const k = (menu ? "m:" : "o:") + id;
    if (arm !== k) { arm = k; setTimeout(() => { if (arm === k) arm = ""; }, 3000); return; }
    arm = ""; deleteSaved(id, menu); rev++; toast.show(menu ? "Menu deleted" : "Order deleted");
  }
  function newOrder() { ord.set(blankOrder()); ticked = new Set(); toast.show("New order"); }
</script>
<div class="page">
  <div class="head"><p class="eyebrow">Production</p><h1>Kitchen</h1></div>
  {#if H.v.on}<a class="card hz press" href="#haccp"><Icon name="thermo" size={22} /><span><b>Food safety logs</b><small>{nDue ? nDue + " unit" + (nDue > 1 ? "s" : "") + " not checked today" : "Temperatures checked today"}</small></span><Icon name="fwd" size={16} /></a>{/if}
  <div class="tabs2"><a href="#kitchen" aria-current={tab === 0 ? "page" : undefined}>Current order</a><a href="#kitchen-saved" aria-current={tab === 1 ? "page" : undefined}>Saved orders and menus</a></div>

  {#if tab === 0}
    {#if !o.lines.length}
      <Empty art="orders" title="The order is empty">Open a recipe and tap “Add to order”, or start from a saved menu.<div class="ea"><Button kind="pri" href="#recipes" icon="tab-recipes">Pick dishes</Button><Button href="#kitchen-saved">Saved menus</Button></div></Empty>
    {:else}
      <div class="kcols"><div class="kl">
      <section class="card pad ev">
        <label class="tf"><span>Event or menu</span><input bind:value={o.name} oninput={upd} placeholder="e.g. Saturday buffet" /></label>
        <label class="tf"><span>Date</span><input type="date" bind:value={o.date} oninput={upd} /></label>
        <Field label="Guests" bind:value={o.pax} /><Field label="Reserve %" bind:value={o.reserve} />
      </section>
      <section class="sec"><div class="sec-h"><h2>Dishes</h2><small class="muted">{o.lines.length}</small></div>
        <div class="lines">{#each o.lines as l (l.id)}{@const r = byId.get(l.id)}{#if r}
          <div class="ln card">
            <div class="lt"><Dish kind={r.ty[1]} size={40} /><a href="#r-{r.id}"><b>{r.t}</b><small>{(Math.round(portions(l) * 10) / 10).toLocaleString("en")} portions{r.pg ? " × " + r.pg + " " + (r.pu || "g") : ""}</small></a>
              <button class="x" aria-label="Remove {r.t}" onclick={() => remove(l.id)}><Icon name="close" size={16} /></button></div>
            <Seg options={["Buffet", "Plated"]} value={l.mode === "buffet" ? 0 : 1} onchange={(i) => { l.mode = i ? "plated" : "buffet"; upd(); }} />
            <div class="g3">
              <label class="tf"><span>Guests</span><input type="number" inputmode="numeric" min="0" value={l.pax ?? ""} placeholder={String(o.pax)} oninput={(e) => { const v = (e.target as HTMLInputElement).value; l.pax = v === "" ? null : Number(v); upd(); }} /></label>
              {#if l.mode === "buffet"}
                <label class="tf"><span>g per guest</span><input type="number" inputmode="decimal" min="0" value={l.gpg ?? ""} placeholder={r.pg ? String(r.pg) : ""} oninput={(e) => { const v = (e.target as HTMLInputElement).value; l.gpg = v === "" ? null : Number(v); upd(); }} /></label>
                <label class="tf"><span>K popularity</span><select value={String(l.k)} onchange={(e) => { l.k = Number((e.target as HTMLSelectElement).value); upd(); }}>{#each KS as k}<option value={k}>{k}</option>{/each}</select></label>
              {/if}
            </div>
          </div>
        {/if}{/each}</div>
      </section>

      </div>
      <section class="sec ticket paper">
        <div class="th"><div><p class="eyebrow">Order list</p><h2>{o.name || "Order"}</h2><p class="note">{o.date || "no date"} · {o.pax} guests · reserve {o.reserve}% · {c.count} products</p></div>
          <div class="ta"><Button small icon="copy" onclick={() => copyText(orderText(c), "Order list copied")}>Copy</Button><Button small icon="share" onclick={() => shareText("Order list", orderText(c))}>Share</Button></div></div>
        {#if c.count}<div class="segw"><Seg options={["By section", "By supplier"]} value={by} onchange={(i) => (by = i)} /></div>{/if}
        {#if by === 0}
          {#each c.secs as s, i}{#if s.length}
            <h3>{D.sections[i]}</h3>
            <ul>{#each s as it}{@const k = it.name + "|" + it.unit}<li class:got={ticked.has(k)}><button onclick={() => tick(k)}><span>{it.name}{#if it.note}<small>{it.note}</small>{/if}</span><b class="num">{fmtQ(it.q)} <i>{it.unit}</i></b></button></li>{/each}</ul>
          {/if}{/each}
        {:else}
          {#each groups as g}
            <div class="sg"><h3>{g.s ? g.s.name : "No supplier"} · {g.items.length}</h3>
              {#if g.s}<span class="sga"><a class="mini" href="https://wa.me/{supPhone(g.s.phone)}?text={encodeURIComponent(supText(g))}" target="_blank" rel="noopener">WhatsApp</a><a class="mini" href="viber://forward?text={encodeURIComponent(supText(g))}">Viber</a><button class="mini" aria-label="Share the order for {g.s.name}" onclick={() => shareText("Order for " + g.s!.name, supText(g))}><Icon name="share" size={15} /></button></span>{/if}</div>
            <ul>{#each g.items as it}<li class="si"><span>{it.name}{#if sup.v.list.length}<select aria-label="Supplier for {it.name}" value={sup.v.map[it.name] || ""} onchange={(e) => setSup(it.name, (e.target as HTMLSelectElement).value)}><option value="">Supplier…</option>{#each sup.v.list as x}<option value={x.id}>{x.name}</option>{/each}</select>{/if}</span><b class="num">{fmtQ(it.q)} <i>{it.unit}</i></b></li>{/each}</ul>
          {/each}
          {#if sup.v.list.length}<p class="note"><a href="#suppliers">Manage suppliers</a></p>
          {:else}<div class="nosup"><b>No suppliers yet</b><p class="note">Add your suppliers, then pick one for each product. The app remembers it for every next order.</p><Button small href="#suppliers" icon="plus">Add suppliers</Button></div>{/if}
        {/if}
        {#if c.algs.length}<p class="note al">Allergens: {c.algs.map((a) => ALG[a]).join(", ")}</p>{/if}
        {#if c.miss.length}<p class="note">Not counted (no product data yet): {c.miss.join(", ")}</p>{/if}
        {#if c.count}<p class="cost">{#if c.cost.n}Food cost <b>{money(c.cost.sum)}</b>{Number(o.pax) > 0 ? ` · ${money(c.cost.sum / Number(o.pax))} per guest` : ""}{c.cost.n < c.count ? ` · prices for ${c.cost.n} of ${c.count} products` : ""}{:else}No prices yet.{/if} <a href="#prices">{c.cost.n ? "Edit prices" : "Add prices"}</a></p>{/if}
      </section>
      </div>

      <div class="acts">
        <Button kind="pri" icon="check" onclick={() => { const r = saveOrder(); if (r) { rev++; toast.show("Order saved on this device"); } }}>{o.sid ? "Update saved order" : "Save order"}</Button>
        <Button icon="pdf" disabled={!c.count} onclick={() => makePdf("Order_List_" + base() + ".pdf", orderPdf)}>PDF</Button>
        <Button disabled={!c.count} onclick={() => saveFile("Order_List_" + base() + ".csv", orderCsv())}>CSV</Button>
        <Button icon="tool-prep" href="#prep">Prep list</Button>
        <Button icon="tool-allergen" pressed={showMx} onclick={() => (showMx = !showMx)}>Allergen matrix</Button>
        <Button icon="cook" onclick={() => makePdf("Service_Cards_" + fileBase(o.name || "menu") + ".pdf", () => svcPdf(dishes))}>Service cards</Button>
        <Button icon="book" onclick={() => { const m = saveMenu(); if (m) { rev++; toast.show((m.updated ? "Menu updated: " : "Menu saved: ") + m.name); } }}>Save as menu</Button>
        <Button icon="plus" onclick={newOrder}>New order</Button>
      </div>
      {#if showMx}
        <section class="card pad mx">
          <div class="th"><div><p class="eyebrow">The 14 allergens, EU 1169/2011</p><h2>Allergen matrix</h2></div><Button small icon="pdf" onclick={() => makePdf("Allergen_Matrix_" + base() + ".pdf", mxPdf)}>PDF</Button></div>
          <div class="mxw"><table><thead><tr><th>Dish</th>{#each AK as k}<th title={ALG[k]}>{k}</th>{/each}</tr></thead>
            <tbody>{#each dishes as r}<tr><td>{r.t}</td>{#each AK as k}<td class:y={r.algs.includes(k)} title={ALG[k]}>{r.algs.includes(k) ? "●" : ""}</td>{/each}</tr>{/each}</tbody></table></div>
          <p class="note">{AK.map((k) => k + " " + ALG[k]).join(" · ")}. From the listed ingredients: check product labels.</p>
          <div class="qa"><Button small icon="share" pressed={showQr} onclick={() => (showQr = !showQr)}>QR for guests</Button></div>
          {#if showQr}<div class="qr">
            <div class="qimg">{@html qrSvg(gLink, 180)}</div>
            <div class="qt"><b>Guests scan it and see the allergens of each dish</b><p class="note">No app or internet account needed. Print table cards, or share the link. If you change the dishes, print new cards.</p>
              <div class="acts"><Button small kind="pri" icon="pdf" onclick={() => makePdf("Allergen_QR_" + base() + ".pdf", () => guestPdf(o.name || "", gLink))}>Table cards PDF</Button><Button small icon="copy" onclick={() => copyText(gLink, "Link copied")}>Copy link</Button><Button small href={gLink}>Preview</Button></div></div>
          </div>{/if}
        </section>
      {/if}
      <p class="note">Gross (as-bought) quantities from the recipe net weights with standard trim losses. Deduct your stock on hand. Deep-frying oil is not included. Suppliers: <a href="#suppliers">{sup.v.list.length ? sup.v.list.length + " saved" : "add yours"}</a>.</p>
    {/if}
  {:else}
    <section class="sec"><div class="sec-h"><h2>Saved orders</h2><small class="muted">{saved.length}</small></div>
      {#if saved.length}<div class="sl">{#each saved as s (s.id)}<div class="card sv"><button class="op" onclick={() => { openSaved(s.id); router.go("#kitchen"); toast.show("Opened: " + s.name); }}><b>{s.name}</b><small>{s.date || "no date"} · {s.pax} guests · {s.lines.length} dishes</small></button><button class="dl" class:arm={arm === "o:" + s.id} aria-label="Delete {s.name}" onclick={() => del(s.id, false)}>{#if arm === "o:" + s.id}Delete?{:else}<Icon name="trash" size={17} />{/if}</button></div>{/each}</div>
      {:else}<p class="note">Save an order to keep it here.</p>{/if}</section>
    <section class="sec"><div class="sec-h"><h2>Menus</h2><small class="muted">{menus.length}</small></div>
      {#if menus.length}<div class="sl">{#each menus as s (s.id)}<div class="card sv"><button class="op" onclick={() => { openSaved(s.id, true); router.go("#kitchen"); toast.show("New order from menu: " + s.name); }}><b>{s.name}</b><small>{s.lines.length} dishes · {s.pax} guests · reserve {s.reserve}%</small></button><button class="dl" class:arm={arm === "m:" + s.id} aria-label="Delete menu {s.name}" onclick={() => del(s.id, true)}>{#if arm === "m:" + s.id}Delete?{:else}<Icon name="trash" size={17} />{/if}</button></div>{/each}</div>
      {:else}<Empty art="menu" title="No menus yet">A menu is a set of dishes you use again and again. Build an order and tap “Save as menu”. Next time start a new order from it in one tap.</Empty>{/if}</section>
  {/if}
</div>
<style>
  @media (min-width: 980px) { .kcols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 24px; align-items: start; } .kcols > .ticket { margin-top: 0; } }
  .head { margin: 22px 0 16px; display: grid; gap: 6px; }
  .hz { display: flex; align-items: center; gap: 12px; padding: 14px 16px; margin-bottom: 14px; color: var(--ink); max-width: 760px; }
  .hz span { flex: 1; display: grid; } .hz b { font: 600 15.5px var(--f-display); } .hz small { font-size: 12.5px; color: var(--muted); }
  .tabs2 { display: flex; gap: 2px; padding: 3px; border-radius: 12px; background: var(--sunk); margin-bottom: 18px; width: max-content; max-width: 100%; }
  .tabs2 a { padding: 8px 14px; border-radius: 9px; color: var(--muted); font-size: 13.5px; font-weight: 500; white-space: nowrap; }
  .tabs2 a[aria-current="page"] { background: var(--raised); color: var(--ink); box-shadow: 0 1px 2px rgba(0,0,0,.08), 0 2px 8px rgba(0,0,0,.06); }
  .ea { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 12px; }
  .ev { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); align-items: end; }
  .tf { display: grid; gap: 5px; min-width: 0; }
  .tf span { font-size: 12px; color: var(--muted); }
  .tf input, .tf select { width: 100%; min-width: 0; border: 0; border-radius: var(--r-s); background: var(--sunk); padding: 11px 14px; font-size: 16px; outline: none; }
  .tf input:focus, .tf select:focus { box-shadow: inset 0 0 0 2px var(--ink); background: var(--raised); }
  .lines { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr)); }
  .ln { padding: 16px; display: grid; gap: 14px; }
  .lt { display: flex; align-items: center; gap: 10px; }
  .lt a { flex: 1; min-width: 0; display: grid; color: var(--ink); }
  .lt b { font: 600 15px var(--f-display); } .lt small { font-size: 12.5px; color: var(--muted); }
  .x { width: 34px; height: 34px; border: 0; border-radius: 50%; background: var(--sunk); display: grid; place-items: center; color: var(--muted); }
  .ticket { padding: 22px 20px 18px; position: relative; }
  .ticket::before { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 4px; border-radius: var(--r) var(--r) 0 0; background: var(--accent); }
  .th { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; align-items: flex-start; margin-bottom: 6px; }
  .ta { display: flex; gap: 6px; }
  .ticket h3 { font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: var(--accent); margin: 16px 0 4px; font-family: var(--f-body); }
  .ticket ul { list-style: none; margin: 0; padding: 0; }
  .ticket li button { width: 100%; display: flex; justify-content: space-between; gap: 12px; padding: 11px 0; border: 0; box-shadow: inset 0 -1px 0 var(--hair); background: transparent; text-align: left; font-size: 15px; }
  .ticket li span { display: grid; } .ticket li small { font-size: 11.5px; color: var(--muted); }
  .ticket li b { font: 600 15.5px var(--f-display); white-space: nowrap; } .ticket li i { font-style: normal; font-size: 12px; color: var(--muted); }
  .ticket li.got button { color: var(--muted); text-decoration: line-through; }
  .al { margin-top: 12px; } .cost { margin-top: 10px; font-size: 14px; } .cost b { font: 600 18px var(--f-display); }
  .acts { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0 8px; }
  .sl { display: grid; gap: 10px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); }
  .sv { display: flex; align-items: center; }
  .sv .op { flex: 1; min-width: 0; display: grid; gap: 4px; text-align: left; padding: 16px 18px; border: 0; background: transparent; color: var(--ink); }
  .dl { flex: none; margin-right: 10px; min-width: 40px; height: 40px; padding: 0 10px; border: 0; border-radius: 999px; background: transparent; color: var(--muted); display: grid; place-items: center; font-size: 13px; font-weight: 600; }
  .dl.arm { background: var(--warn); color: #fff; }
  .segw { margin: 12px 0 4px; }
  .sg { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; margin-top: 16px; } .sg h3 { margin: 0; }
  .sga { display: flex; gap: 6px; }
  .mini { display: inline-flex; align-items: center; gap: 4px; height: 30px; padding: 0 12px; border: 0; border-radius: 999px; background: var(--sunk); color: var(--ink); font-size: 13px; font-weight: 500; }
  .si { display: flex; justify-content: space-between; gap: 12px; padding: 10px 0; box-shadow: inset 0 -1px 0 var(--hair); font-size: 15px; }
  .si span { display: grid; gap: 4px; min-width: 0; } .si select { max-width: 200px; border: 0; border-radius: 8px; background: var(--sunk); padding: 5px 8px; font-size: 13px; color: var(--ink-2); }
  .si b { font: 600 15.5px var(--f-display); white-space: nowrap; } .si i { font-style: normal; font-size: 12px; color: var(--muted); }
  .nosup { display: grid; gap: 6px; justify-items: start; margin-top: 12px; padding: 14px 16px; border-radius: var(--r-m); background: var(--sunk); }
  .mx { margin-top: 12px; }
  .qa { margin-top: 12px; }
  .qr { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; margin-top: 12px; padding-top: 12px; box-shadow: inset 0 1px 0 var(--hair); }
  .qimg { background: #fff; padding: 6px; border-radius: 12px; line-height: 0; } .qt { flex: 1 1 220px; display: grid; gap: 8px; } .qt b { font: 600 15.5px var(--f-display); }
  .mxw { overflow-x: auto; margin: 10px 0; }
  .mx table { border-collapse: collapse; font-size: 13px; min-width: 100%; }
  .mx th, .mx td { padding: 7px 6px; text-align: center; box-shadow: inset 0 -1px 0 var(--hair); }
  .mx th:first-child, .mx td:first-child { text-align: left; min-width: 160px; position: sticky; left: 0; background: var(--surface); }
  .mx th { font-size: 11.5px; color: var(--muted); font-weight: 600; } .mx td.y { color: var(--accent); }
  .sl b { font: 600 15px var(--f-display); } .sl small { font-size: 12.5px; color: var(--muted); }
</style>
