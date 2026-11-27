<script lang="ts" module>
  const scaleMem = new Map<string, number>();
</script>
<script lang="ts">
  // The recipe as a workbench: tools sit right under the title and open with this batch filled in.
  import { untrack } from "svelte";
  import Icon from "../ui/Icon.svelte";
  import Dish from "../ui/Dish.svelte";
  import Button from "../ui/Button.svelte";
  import Stepper from "../ui/Stepper.svelte";
  import Timed from "../ui/Timed.svelte";
  import Empty from "../ui/Empty.svelte";
  import { byId, detail, D, R, type Detail, type Recipe } from "../core/catalog";
  import { ALG } from "../core/constants";
  import { fmtG, shelf } from "../core/util";
  import { favs, toggleFav, seen, addLine, inOrder, ord, recipeCost, money } from "../core/kitchen.svelte";
  import { toast, shareText, copyText } from "../core/ui.svelte";
  import { TOOLS, openWith } from "../tools/registry.svelte";
  import { router } from "../core/router.svelte";
  let { id }: { id: string } = $props();
  const r = $derived(byId.get(id));
  let d = $state<Detail | null>(null), err = $state(false);
  let p = $state(1);
  let got = $state(new Set<string>()), done = $state(new Set<string>());
  $effect(() => {
    const rr = r; d = null; err = false; got = new Set(); done = new Set();
    if (!rr) return;
    p = scaleMem.get(rr.id) || rr.N; untrack(() => seen(rr.id));
    detail(rr).then((x) => { if (r === rr) d = x || { c: [] }; }).catch(() => (err = true));
    window.scrollTo(0, 0);
  });
  $effect(() => { if (r) scaleMem.set(r.id, p); });
  const f = $derived(r ? p / r.N : 1);
  const quick = $derived(r ? [...new Set([r.N, 10, 25, 50, 100])].sort((a, b) => a - b) : []);
  const cost = $derived(r ? recipeCost(r) : null);
  const sh = $derived(shelf(d?.st));
  const nItems = $derived(d?.c ? d.c.reduce((a, c) => a + c[2].length, 0) : 0);
  const fav = $derived(r ? favs.v.includes(r.id) : false);
  const io = $derived.by(() => { void ord.v.lines.length; return r ? inOrder(r.id) : false; });
  function batch(rr: Recipe, dd: Detail | null) {
    let tot = 0, yl: number | null = null;
    (dd?.c || []).forEach((c) => c[2].forEach((x) => { if (typeof x[1] !== "number") return; if (/^(cooked |total )?yield/i.test(x[0])) { yl = (yl || 0) + x[1]; return; } if (/\([A-Z]\)\s*$/.test(x[0])) return; tot += x[1]; }));
    return { raw: Math.round(tot * f), cooked: rr.pg && (!rr.pu || rr.pu === "g") ? Math.round(rr.pg * p) : dd && dd.c.length === 1 && yl != null ? Math.round(yl * f) : null };
  }
  const strip = TOOLS.filter((t) => t.fromRecipe);
  function openTool(tid: string) {
    if (!r) return; const b = batch(r, d);
    openWith(tid, { r, d, portions: p, raw: b.raw, cooked: b.cooked, costPortion: cost && cost.n ? cost.sum : null });
    router.go("#tool-" + tid);
  }
  function text() {
    if (!r || !d) return "";
    let t = `${r.name}\n${p} portions${r.pg ? " × " + r.pg + " " + (r.pu || "g") : ""}\n`;
    d.c.forEach((c) => { t += `\n${c[0] ? c[0].toUpperCase() + "\n" : ""}`; c[2].forEach((x) => (t += `${x[0]} — ${typeof x[1] === "number" ? fmtG(x[1] * f) : x[1]}\n`)); if (c[3].length) t += "\n" + c[3].map((s, i) => `${i + 1}. ${s}`).join("\n") + "\n"; });
    if (d.st) t += `\nStorage: ${d.st}`; if (r.algs.length) t += `\nAllergens: ${r.algs.map((a) => ALG[a]).join(", ")}`;
    return t + "\n\nChefsheet";
  }
  const tick = (s: Set<string>, k: string) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; };
  const usedIn = $derived(r?.semi ? R.filter((x) => x.mine && x.semis?.some((s) => s[0] === r!.id)) : []);
</script>
{#if !r}
  <div class="page"><Empty art="search" title="Recipe not found"><a href="#recipes">Back to all recipes</a></Empty></div>
{:else}
<article class="page sheet">
  <a class="back" href="#recipes" onclick={(e) => { if (history.length > 1) { e.preventDefault(); history.back(); } }}><Icon name="back" size={16} />Back</a>
  <header class="hd">
    <div class="ht">
      <p class="eyebrow"><a href="#c-{D.folders[r.f][1]}">{D.folders[r.f][0]}</a>{r.sub ? " / " + r.sub : ""}</p>
      <h1>{r.t}</h1>
      {#if r.s}<p class="sub">{r.s}</p>{/if}
      <dl class="pass">
        <div><dt>Batch</dt><dd>{r.N} portions</dd></div>
        <div><dt>Portion</dt><dd>{r.pg ? r.pg + " " + (r.pu || "g") : "–"}</dd></div>
        {#if r.kcal}<div><dt>Energy</dt><dd>{r.kcal} kcal</dd></div>{/if}
        {#if sh.txt || sh.temp}<div><dt>Keeps</dt><dd>{[sh.temp, sh.txt].filter(Boolean).join(", ")}</dd></div>{/if}
        {#if d?.c?.length}<div><dt>Card</dt><dd>{d.c.length} part{d.c.length === 1 ? "" : "s"} · {nItems} items</dd></div>{/if}
      </dl>
    </div>
    <Dish kind={r.ty[1]} size={112} />
  </header>
  <div class="acts">
    <Button kind={io ? "line" : "pri"} icon={io ? "check" : "plus"} onclick={() => toast.show(addLine(r.id) ? "Added to the order" : "Removed from the order")}>{io ? "In the order" : "Add to order"}</Button>
    <Button icon="star" pressed={fav} label="Favourite" onclick={() => toast.show(toggleFav(r.id) ? "Added to favourites" : "Removed from favourites")}>{fav ? "Saved" : "Favourite"}</Button>
    <Button icon="share" label="Share" onclick={() => shareText(r.t, text())}>Share</Button>
    <Button icon="copy" label="Copy" onclick={() => copyText(text(), "Recipe copied")}>Copy</Button>
    {#if r.mine}<Button icon="edit" href="#edit-{r.id}">Edit</Button>{/if}
  </div>

  <section class="bench" aria-label="Tools for this recipe">
    <p class="eyebrow">Tools for this batch</p>
    <div class="strip">
      {#each strip as t}<button onclick={() => openTool(t.id)}><Icon name={t.icon} size={22} /><span>{t.name}</span></button>{/each}
      <a href="#prep"><Icon name="tool-prep" size={22} /><span>Prep list</span></a>
      <a href="#prices-{r.id}"><Icon name="tool-price" size={22} /><span>Prices</span></a>
    </div>
  </section>

  <div class="scaler card">
    <span class="lb">Portions</span>
    <Stepper bind:value={p} />
    <div class="qk">{#each quick as qv}<button aria-pressed={p === qv} onclick={() => (p = qv)}>{qv}</button>{/each}</div>
    <span class="fx note">× {(Math.round(f * 100) / 100).toLocaleString("en")} of the base batch</span>
  </div>

  {#if err}<p class="note pad">Could not load this recipe. Check your connection and open it again.</p>
  {:else if !d}<div class="skel"></div>
  {:else if !d.c.length}<Empty title="This recipe card is not finished yet">Ingredients and method will be added in an update.</Empty>
  {:else}
    <div class="body">
      <section><h2>Ingredients</h2>
        {#each d.c as c, ci}<div class="comp">
          {#if d.c.length > 1 || c[0]}<h3>{c[0]}</h3>{/if}
          {#if c[1]?.length}<p class="note">{c[1].join(" · ").replace(/Batch · /g, "")}</p>{/if}
          <ul class="ing">{#each c[2] as x, i}{@const k = ci + ":" + i}<li class:got={got.has(k)} class:yl={/^(yield|cooked yield)/i.test(x[0])}><button onclick={() => (got = tick(got, k))}><span>{x[0]}</span><b class="num">{typeof x[1] === "number" ? fmtG(x[1] * f) : x[1]}</b></button></li>{/each}</ul>
        </div>{/each}
        <p class="note">Tap an ingredient or a step to tick it off. Tap a time to start a timer.</p>
      </section>
      <section><h2>Method</h2>
        {#each d.c as c, ci}{#if c[3].length}<div class="comp">{#if d.c.length > 1}<h3>{c[0]}</h3>{/if}
          <ol class="steps">{#each c[3] as s, i}{@const k = ci + ":" + i}<li class:done={done.has(k)} onclick={() => (done = tick(done, k))} role="presentation"><span><Timed text={s} ctx={r.t} /></span></li>{/each}</ol>
        </div>{/if}{/each}
      </section>
    </div>
    <div class="facts">
      {#if r.mine && (r.semi || r.semis?.length)}<div><h4>Semi-finished</h4>
        {#if r.semi}<p>Batch yield <b>{fmtG((r.y || 0) * f)}</b>{#if cost?.n && r.y}<br />{money((cost.sum * r.N) / r.y * 1000)} per kg{/if}</p>
          <p class="note">{#if usedIn.length}Used in {#each usedIn as u, i}{i ? ", " : ""}<a href="#r-{u.id}">{u.t}</a>{/each}{:else}Type its name as an ingredient in another of your recipes to use it there.{/if}</p>{/if}
        {#if r.semis?.length}<p>Made with</p>{#each r.semis as [sid, g]}{@const s = byId.get(sid)}{#if s}<p><a href="#r-{sid}">{s.t}</a> · {fmtG(g * p)}</p>{/if}{/each}<p class="note">Its products, cost and allergens are counted in this recipe.</p>{/if}
      </div>{/if}
      {#if r.lines.length && cost}<div><h4>Food cost</h4>
        {#if cost.n}<p><b class="big">{money(cost.sum)}</b> per portion · {money(cost.sum * p)} for {p}</p><p class="note">{cost.n < cost.of ? `Prices set for ${cost.n} of ${cost.of} products, so the real cost is higher. ` : ""}Gross as-bought quantities.</p>
        {:else}<p class="note">Add your product prices to see the cost per portion.</p>{/if}
        <p><a href="#prices-{r.id}">{cost.n ? "Edit prices" : "Set prices"}</a></p></div>{/if}
      <div><h4>Storage</h4><p>{d.st || "Not stated."}</p></div>
      <div><h4>Allergens</h4>{#if r.algs.length}<div class="alist">{#each r.algs as a}<span><i>{a}</i>{ALG[a]}</span>{/each}</div>{#if d.al}<p class="note">{d.al}</p>{/if}{:else}<p>No allergens from the list of 14.</p>{/if}</div>
      {#if d.nu?.p}<div><h4>Nutrition</h4><table class="nut"><thead><tr><th></th><th>Protein</th><th>Fat</th><th>Carbs</th><th>kcal</th></tr></thead><tbody>
        <tr><td>Portion</td>{#each d.nu.p as v}<td>{v}</td>{/each}</tr>{#if d.nu.h}<tr><td>100 g</td>{#each d.nu.h as v}<td>{v}</td>{/each}</tr>{/if}</tbody></table></div>{/if}
    </div>
    <p class="disc">{r.mine ? "Your own recipe, saved on this device. " : ""}Allergens and diet tags come from the listed ingredients. Always check the labels of the products you buy. Nutrition values are estimates.</p>
  {/if}
</article>
{/if}
<style>
  .back { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--muted); margin: 12px 0 4px; }
  .hd { display: flex; gap: 16px; align-items: flex-start; justify-content: space-between; padding: 10px 0 4px; }
  .ht { min-width: 0; display: grid; gap: 6px; }
  .ht .eyebrow a { color: inherit; }
  h1 { font-size: clamp(24px, 6vw, 34px); }
  .sub { color: var(--muted); font-size: 14px; }
  .pass { display: flex; flex-wrap: wrap; gap: 0; margin: 8px 0 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  .pass div { padding: 7px 14px 7px 0; margin-right: 14px; }
  .pass div + div { border-left: 1px solid var(--line-2); padding-left: 14px; margin-left: -14px; }
  dt { font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: var(--muted); }
  dd { margin: 0; font: 600 14px var(--f-display); }
  .hd :global(.dish) { margin-top: 10px; }
  @media (max-width: 520px) { .hd :global(.dish) { width: 76px !important; height: 76px !important; } }
  .acts { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 4px; }
  .bench { margin: 18px 0 6px; }
  .bench .eyebrow { margin-bottom: 8px; }
  .strip { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding-bottom: 4px; }
  .strip::-webkit-scrollbar { display: none; }
  .strip > * { flex: none; display: grid; justify-items: center; gap: 6px; width: 92px; padding: 12px 6px 10px; border: 1px solid var(--line-2); background: var(--surface); border-radius: var(--r); color: var(--ink); font-size: 12px; text-align: center; line-height: 1.2; transition: border-color .15s, transform .15s; }
  .strip > *:hover { border-color: var(--accent); }
  .strip > *:active { transform: scale(.97); }
  .scaler { position: sticky; top: calc(var(--sat) + 55px); z-index: 5; display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; padding: 10px 12px; margin: 14px 0; background: color-mix(in srgb, var(--surface) 96%, transparent); backdrop-filter: blur(8px); }
  .lb { font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
  .qk { display: flex; gap: 4px; flex-wrap: wrap; }
  .qk button { min-width: 40px; padding: 6px 8px; border: 1px solid var(--line); border-radius: 3px; background: transparent; font-size: 13px; }
  .qk button[aria-pressed="true"] { background: var(--ink); color: var(--bg); border-color: var(--ink); }
  .fx { margin-left: auto; }
  @media (max-width: 520px) { .fx { margin-left: 0; width: 100%; } }
  .skel { height: 260px; border-radius: var(--r); background: linear-gradient(90deg, var(--sunk), var(--surface), var(--sunk)); background-size: 200% 100%; animation: sk 1.2s infinite; }
  @keyframes sk { to { background-position: -200% 0; } }
  .body { display: grid; gap: 28px; grid-template-columns: minmax(0, 1fr); margin-top: 8px; }
  @media (min-width: 860px) { .body { grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); } }
  .body h2 { font-size: 20px; padding-bottom: 6px; border-bottom: 2px solid var(--ink); margin-bottom: 10px; }
  .comp { margin-bottom: 18px; } .comp h3 { font-size: 15.5px; margin: 6px 0 4px; } .comp > .note { margin-bottom: 6px; }
  .ing { list-style: none; margin: 0; padding: 0; }
  .ing li { border-bottom: 1px solid var(--line-2); }
  .ing button { width: 100%; display: flex; justify-content: space-between; gap: 12px; padding: 9px 2px; border: 0; background: transparent; text-align: left; font-size: 14.5px; }
  .ing b { font: 600 15px var(--f-display); white-space: nowrap; }
  .ing li.yl { color: var(--muted); font-style: italic; }
  .ing li.got button { color: var(--muted); text-decoration: line-through; }
  .steps { margin: 0; padding: 0; list-style: none; counter-reset: s; display: grid; gap: 4px; }
  .steps li { counter-increment: s; display: flex; gap: 12px; padding: 9px 4px; border-radius: 3px; cursor: pointer; font-size: 15px; line-height: 1.55; }
  .steps li::before { content: counter(s); flex: none; width: 26px; height: 26px; border-radius: 50%; border: 1px solid var(--ink); display: grid; place-items: center; font: 600 13px var(--f-display); margin-top: 1px; }
  .steps li.done { color: var(--muted); }
  .steps li.done::before { content: "✓"; background: var(--ok); border-color: var(--ok); color: var(--bg); }
  .facts { display: grid; gap: 1px; margin-top: 18px; background: var(--line-2); border: 1px solid var(--line-2); border-radius: var(--r); overflow: hidden; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); }
  .facts > div { background: var(--surface); padding: 14px 16px; display: grid; gap: 6px; align-content: start; font-size: 14px; }
  .big { font: 600 20px var(--f-display); }
  .alist { display: flex; flex-wrap: wrap; gap: 6px 12px; }
  .alist i { font-style: normal; display: inline-grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; border: 1px solid var(--accent); color: var(--accent); font-size: 11px; font-weight: 700; margin-right: 5px; }
  .nut { border-collapse: collapse; font-size: 13px; } .nut th, .nut td { padding: 4px 8px 4px 0; text-align: left; } .nut th { font-weight: 500; color: var(--muted); font-size: 11.5px; }
  .disc { font-size: 12px; color: var(--muted); margin: 16px 0 0; }
  .pad { padding: 20px 0; }
</style>
