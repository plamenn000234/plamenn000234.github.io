<script lang="ts">
  // Production: the current order and its supplier list, saved orders and menus.
  // Prep list, labels, PDF, service cards, suppliers and prices still open in 2.x during the alpha.
  import Icon from "../ui/Icon.svelte";
  import Button from "../ui/Button.svelte";
  import Field from "../ui/Field.svelte";
  import Seg from "../ui/Seg.svelte";
  import Empty from "../ui/Empty.svelte";
  import Dish from "../ui/Dish.svelte";
  import { ord, compute, portions, saveOrder, savedOrders, savedMenus, openSaved, orderText, money, blankOrder } from "../core/kitchen.svelte";
  import { byId, D, ROOT } from "../core/catalog";
  import { ALG } from "../core/constants";
  import { fmtQ } from "../core/util";
  import { toast, copyText, shareText } from "../core/ui.svelte";
  import { router } from "../core/router.svelte";
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
  function newOrder() { ord.set(blankOrder()); ticked = new Set(); toast.show("New order"); }
</script>
<div class="page">
  <div class="head"><p class="eyebrow">Production</p><h1>Kitchen</h1></div>
  <div class="tabs2"><a href="#kitchen" aria-current={tab === 0 ? "page" : undefined}>Current order</a><a href="#kitchen-saved" aria-current={tab === 1 ? "page" : undefined}>Saved orders and menus</a></div>

  {#if tab === 0}
    {#if !o.lines.length}
      <Empty art="orders" title="The order is empty">Open a recipe and tap “Add to order”, or start from a saved menu.<div class="ea"><Button kind="pri" href="#recipes" icon="tab-recipes">Pick dishes</Button><Button href="#kitchen-saved">Saved menus</Button></div></Empty>
    {:else}
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

      <section class="sec ticket paper">
        <div class="th"><div><p class="eyebrow">Order list</p><h2>{o.name || "Order"}</h2><p class="note">{o.date || "no date"} · {o.pax} guests · reserve {o.reserve}% · {c.count} products</p></div>
          <div class="ta"><Button small icon="copy" onclick={() => copyText(orderText(c), "Order list copied")}>Copy</Button><Button small icon="share" onclick={() => shareText("Order list", orderText(c))}>Share</Button></div></div>
        {#each c.secs as s, i}{#if s.length}
          <h3>{D.sections[i]}</h3>
          <ul>{#each s as it}{@const k = it.name + "|" + it.unit}<li class:got={ticked.has(k)}><button onclick={() => tick(k)}><span>{it.name}{#if it.note}<small>{it.note}</small>{/if}</span><b class="num">{fmtQ(it.q)} <i>{it.unit}</i></b></button></li>{/each}</ul>
        {/if}{/each}
        {#if c.algs.length}<p class="note al">Allergens: {c.algs.map((a) => ALG[a]).join(", ")}</p>{/if}
        {#if c.miss.length}<p class="note">Not counted (no product data yet): {c.miss.join(", ")}</p>{/if}
        {#if c.cost.n}<p class="cost">Food cost <b>{money(c.cost.sum)}</b>{c.cost.n < c.count ? ` · prices for ${c.cost.n} of ${c.count} products` : ""}</p>{/if}
      </section>

      <div class="acts">
        <Button kind="pri" icon="check" onclick={() => { const r = saveOrder(); if (r) { rev++; toast.show("Order saved on this device"); } }}>Save order</Button>
        <Button icon="tool-prep" href="#prep">Prep list</Button>
        <Button icon="pdf" href="{ROOT}#order">PDF, labels, service cards</Button>
        <Button icon="tool-price" href="#prices">Prices</Button>
        <Button icon="plus" onclick={newOrder}>New order</Button>
      </div>
      <p class="note">PDF, labels, service cards, suppliers and prices open in the current version of Chefsheet for now.</p>
    {/if}
  {:else}
    <section class="sec"><div class="sec-h"><h2>Saved orders</h2><small class="muted">{saved.length}</small></div>
      {#if saved.length}<div class="sl">{#each saved as s (s.id)}<button class="card" onclick={() => { openSaved(s.id); router.go("#kitchen"); toast.show("Opened: " + s.name); }}><b>{s.name}</b><small>{s.date || "no date"} · {s.pax} guests · {s.lines.length} dishes</small></button>{/each}</div>
      {:else}<p class="note">Save an order to keep it here.</p>{/if}</section>
    <section class="sec"><div class="sec-h"><h2>Menus</h2><small class="muted">{menus.length}</small></div>
      {#if menus.length}<div class="sl">{#each menus as s (s.id)}<button class="card" onclick={() => { openSaved(s.id, true); router.go("#kitchen"); toast.show("Menu loaded: " + s.name); }}><b>{s.name}</b><small>{s.lines.length} dishes · reserve {s.reserve}%</small></button>{/each}</div>
      {:else}<Empty art="menu" title="No menus yet">A menu is a set of dishes you use again and again. Save one from the order in the current version.</Empty>{/if}</section>
  {/if}
</div>
<style>
  .head { margin: 14px 0 10px; display: grid; gap: 4px; }
  .tabs2 { display: flex; gap: 18px; border-bottom: 1px solid var(--line); margin-bottom: 14px; }
  .tabs2 a { padding: 8px 0; color: var(--muted); font-size: 14px; border-bottom: 2px solid transparent; margin-bottom: -1px; }
  .tabs2 a[aria-current="page"] { color: var(--ink); border-color: var(--accent); font-weight: 600; }
  .ea { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-top: 12px; }
  .ev { display: grid; gap: 14px; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); align-items: end; }
  .tf { display: grid; gap: 5px; min-width: 0; }
  .tf span { font-size: 12px; color: var(--muted); }
  .tf input, .tf select { width: 100%; min-width: 0; border: 0; border-bottom: 1px solid var(--muted); background: transparent; padding: 8px 0 6px; font-size: 16px; outline: none; }
  .tf select { border: 1px solid var(--line); border-radius: 3px; padding: 7px 8px; background: var(--surface); }
  .tf input:focus { border-color: var(--accent); }
  .lines { display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 420px), 1fr)); }
  .ln { padding: 12px; display: grid; gap: 10px; }
  .lt { display: flex; align-items: center; gap: 10px; }
  .lt a { flex: 1; min-width: 0; display: grid; color: var(--ink); }
  .lt b { font: 600 15px var(--f-display); } .lt small { font-size: 12.5px; color: var(--muted); }
  .x { width: 34px; height: 34px; border: 1px solid var(--line); border-radius: 50%; background: transparent; display: grid; place-items: center; color: var(--muted); }
  .ticket { padding: 18px 16px 14px; background-image: repeating-linear-gradient(transparent 0 31px, var(--line-2) 31px 32px); }
  .th { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 10px; align-items: flex-start; margin-bottom: 6px; }
  .ta { display: flex; gap: 6px; }
  .ticket h3 { font-size: 13px; letter-spacing: .14em; text-transform: uppercase; color: var(--accent); margin: 16px 0 4px; font-family: var(--f-body); }
  .ticket ul { list-style: none; margin: 0; padding: 0; }
  .ticket li button { width: 100%; display: flex; justify-content: space-between; gap: 12px; padding: 7px 0; border: 0; border-bottom: 1px dashed var(--line); background: transparent; text-align: left; font-size: 14.5px; }
  .ticket li span { display: grid; } .ticket li small { font-size: 11.5px; color: var(--muted); }
  .ticket li b { font: 600 15.5px var(--f-display); white-space: nowrap; } .ticket li i { font-style: normal; font-size: 12px; color: var(--muted); }
  .ticket li.got button { color: var(--muted); text-decoration: line-through; }
  .al { margin-top: 12px; } .cost { margin-top: 10px; font-size: 14px; } .cost b { font: 600 18px var(--f-display); }
  .acts { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0 8px; }
  .sl { display: grid; gap: 6px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); }
  .sl button { display: grid; gap: 2px; text-align: left; padding: 12px 14px; }
  .sl b { font: 600 15px var(--f-display); } .sl small { font-size: 12.5px; color: var(--muted); }
</style>
