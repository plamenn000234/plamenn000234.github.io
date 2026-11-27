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
  import { REPORT_TO, ALG } from "../core/constants";
  import { fmtG, shelf } from "../core/util";
  import { favs, toggleFav, seen, addLine, inOrder, ord, recipeCost, money } from "../core/kitchen.svelte";
  import { toast, shareText, copyText } from "../core/ui.svelte";
  import { TOOLS, openWith } from "../tools/registry.svelte";
  import { router } from "../core/router.svelte";
  import { recipePdf, svcPdf } from "../core/pdfs";
  import { makePdf, fileBase } from "../core/files";
  import { notes, noteOf, setNote } from "../core/notes.svelte";
  let { id }: { id: string } = $props();
  const r = $derived(byId.get(id));
  let d = $state<Detail | null>(null), err = $state(false);
  let p = $state(1);
  let editNote = $state(false), draft = $state("");
  const note = $derived.by(() => { void notes.v; return r ? noteOf(r.id) : ""; });
  function saveNote() { if (!r) return; setNote(r.id, draft); editNote = false; toast.show(draft.trim() ? "Note saved" : "Note removed"); }
  let got = $state(new Set<string>()), done = $state(new Set<string>());
  $effect(() => {
    const rr = r; d = null; err = false; got = new Set(); done = new Set(); editNote = false;
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
  const reportHref = (rr: Recipe) => "mailto:" + REPORT_TO + "?subject=" + encodeURIComponent("Chefsheet: problem in " + rr.t) + "&body=" + encodeURIComponent("Recipe: " + rr.name + "\nCollection: " + D.folders[rr.f][0] + "\nID: " + rr.id + "\n\nWhat is wrong:\n");
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
    if (note) t += `\nNotes: ${note}`;
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
    <div class="art"><Dish kind={r.ty[1]} size={168} /></div>
    <p class="eyebrow"><a href="#c-{D.folders[r.f][1]}">{D.folders[r.f][0]}</a>{r.sub ? " · " + r.sub : ""}</p>
    <h1>{r.t}</h1>
    {#if r.s}<p class="sub">{r.s}</p>{/if}
  </header>
  <dl class="pass">
    <div><dt>Batch</dt><dd>{r.N}<small> portions</small></dd></div>
    <div><dt>Portion</dt><dd>{r.pg ? r.pg : "–"}<small> {r.pg ? r.pu || "g" : ""}</small></dd></div>
    {#if r.kcal}<div><dt>Energy</dt><dd>{r.kcal}<small> kcal</small></dd></div>{/if}
    {#if sh.txt || sh.temp}<div class="k"><dt>Keeps</dt><dd class="sm">{[sh.temp, sh.txt].filter(Boolean).join(" · ")}</dd></div>{/if}
  </dl>
  <div class="acts">
    <Button kind={io ? "line" : "pri"} icon={io ? "check" : "plus"} onclick={() => toast.show(addLine(r.id) ? "Added to the order" : "Removed from the order")}>{io ? "In the order" : "Add to order"}</Button>
    <button class="rb" class:on={fav} aria-pressed={fav} aria-label="Favourite" onclick={() => toast.show(toggleFav(r.id) ? "Added to favourites" : "Removed from favourites")}><Icon name="star" size={20} /></button>
    <button class="rb" aria-label="Share" onclick={() => shareText(r.t, text())}><Icon name="share" size={20} /></button>
    <button class="rb" aria-label="Copy" onclick={() => copyText(text(), "Recipe copied")}><Icon name="copy" size={20} /></button>
    <a class="rb cookb" aria-label="Cook mode" title="Cook mode: one step at a time, the screen stays on" href="#cook-{r.id}?p={p}"><Icon name="flame" size={20} /></a>
    <button class="rb" aria-label="PDF" title="PDF for {p} portions" onclick={() => makePdf(fileBase(r.t) + "_" + p + "p.pdf", async () => (d ? recipePdf(r, d, p, note) : null))}><Icon name="pdf" size={20} /></button>
    <button class="rb" aria-label="Service card" title="Service card for the front of house" onclick={() => makePdf("Service_Card_" + fileBase(r.t) + ".pdf", () => svcPdf([r]))}><Icon name="cook" size={20} /></button>
    {#if r.mine}<a class="rb" aria-label="Edit" href="#edit-{r.id}"><Icon name="edit" size={20} /></a>
    {:else}<a class="rb" aria-label="Make it mine" title="Make it mine: a copy you can edit" href="#new?from={r.id}"><Icon name="edit" size={20} /></a>{/if}
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

  <section class="card notes" aria-label="My notes">
    {#if editNote}
      <label class="tf"><span>My notes</span><!-- svelte-ignore a11y_autofocus --><textarea rows="4" bind:value={draft} maxlength="2000" autofocus placeholder="e.g. We plate it on a 28 cm plate. Less salt for the banquet."></textarea></label>
      <div class="na"><Button small kind="pri" icon="check" onclick={saveNote}>Save note</Button><Button small onclick={() => (editNote = false)}>Cancel</Button></div>
    {:else if note}
      <div class="nh"><span class="eyebrow">My notes</span><button class="ne" onclick={() => { draft = note; editNote = true; }}>Edit</button></div>
      <p class="nt">{note}</p>
    {:else}
      <button class="nadd" onclick={() => { draft = ""; editNote = true; }}><Icon name="edit" size={16} />Add a note for your kitchen</button>
    {/if}
  </section>
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
          <ol class="steps">{#each c[3] as s, i}{@const k = ci + ":" + i}<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events --><li class:done={done.has(k)} onclick={() => (done = tick(done, k))}><span><Timed text={s} ctx={r.t} /></span></li>{/each}</ol>
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
      {#if d.nu?.p}<div><h4>Nutrition</h4><table class="nut"><thead><tr><th><span class="sr">Per</span></th><th>Protein</th><th>Fat</th><th>Carbs</th><th>kcal</th></tr></thead><tbody>
        <tr><td>Portion</td>{#each d.nu.p as v}<td>{v}</td>{/each}</tr>{#if d.nu.h}<tr><td>100 g</td>{#each d.nu.h as v}<td>{v}</td>{/each}</tr>{/if}</tbody></table></div>{/if}
    </div>
    <p class="disc">{r.mine ? "Your own recipe, saved on this device. " : ""}Allergens and diet tags come from the listed ingredients. Always check the labels of the products you buy. Nutrition values are estimates. {#if !r.mine}<a href={reportHref(r)}>Report a problem with this recipe</a>{/if}</p>
  {/if}
</article>
{/if}
<style>
  .notes { margin-top: 12px; padding: 12px 16px; display: grid; gap: 10px; }
  .nh { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .nt { white-space: pre-wrap; font-size: 15px; line-height: 1.5; color: var(--ink); }
  .ne, .nadd { border: 0; background: transparent; color: var(--accent); font: 600 14px var(--f-body, inherit); padding: 4px 0; display: inline-flex; align-items: center; gap: 6px; justify-self: start; }
  .na { display: flex; gap: 8px; }
  .notes textarea { width: 100%; }
  .back { display: inline-flex; align-items: center; gap: 4px; font-size: 14px; color: var(--ink-2); margin: 16px 0 4px; padding: 6px 12px 6px 8px; border-radius: 999px; background: var(--surface); box-shadow: var(--sh-1); }
  .hd { display: grid; justify-items: center; text-align: center; gap: 8px; padding: 8px 0 4px; max-width: 680px; margin: 0 auto; }
  .art { width: 220px; height: 220px; display: grid; place-items: center; border-radius: 50%; margin-bottom: 8px;
    background: radial-gradient(closest-side, var(--surface) 0%, var(--surface) 62%, transparent 63%), radial-gradient(closest-side, transparent 70%, var(--hair) 71%, transparent 72%); }
  .art :global(.dish) { box-shadow: var(--sh-2); }
  .hd .eyebrow a { color: inherit; }
  h1 { font-size: clamp(28px, 7.5vw, 42px); line-height: 1.12; }
  .sub { color: var(--muted); font-size: 15px; }
  .pass { display: grid; grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); grid-auto-flow: dense; margin: 22px auto 0; max-width: 680px; background: var(--surface); border-radius: var(--r); box-shadow: var(--sh-1); overflow: hidden; }
  .pass div { padding: 14px 12px; text-align: center; display: grid; gap: 4px; align-content: center; }
  .pass div + div { box-shadow: inset 1px 0 0 var(--hair); }
  .pass div.k { grid-column: 1 / -1; box-shadow: inset 0 1px 0 var(--hair); }
  dt { font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
  dd { margin: 0; font: 600 22px/1.1 var(--f-display); font-variant-numeric: tabular-nums; }
  dd small { font: 500 12px var(--f-body); color: var(--muted); }
  dd.sm { font-size: 14px; }
  .acts { display: flex; justify-content: center; flex-wrap: wrap; gap: 10px; margin: 20px 0 4px; }
  .rb { width: 46px; height: 46px; border: 0; border-radius: 50%; display: grid; place-items: center; background: var(--surface); color: var(--ink); box-shadow: var(--sh-1), inset 0 0 0 1px var(--hair); transition: transform .18s var(--ease); }
  .rb:active { transform: scale(.9); }
  .rb.on { color: var(--accent); background: var(--accent-soft); box-shadow: none; }
  .rb.on :global(path) { fill: currentColor; }
  .bench { margin: 30px 0 6px; }
  .bench .eyebrow { margin-bottom: 12px; }
  .strip { display: flex; gap: 10px; overflow-x: auto; scrollbar-width: none; margin: 0 calc(-1 * var(--gap)); padding: 2px var(--gap) 10px; }
  .strip::-webkit-scrollbar { display: none; }
  .strip > * { flex: none; display: grid; justify-items: center; align-content: center; gap: 8px; width: 96px; height: 96px; padding: 10px 6px; border: 0; background: var(--surface); box-shadow: var(--sh-1); border-radius: var(--r); color: var(--ink); font-size: 12px; font-weight: 500; text-align: center; line-height: 1.2; transition: transform .18s var(--ease), box-shadow .2s; }
  @media (hover: hover) { .strip > *:hover { box-shadow: var(--sh-2); transform: translateY(-2px); } }
  .strip > *:active { transform: scale(.95); }
  .scaler { position: sticky; top: calc(var(--sat) + 64px); z-index: 5; display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; padding: 12px 14px; margin: 18px 0 22px; border-radius: 22px;
    background: color-mix(in srgb, var(--surface) 88%, transparent); backdrop-filter: saturate(1.6) blur(16px); -webkit-backdrop-filter: saturate(1.6) blur(16px); box-shadow: var(--sh-2); }
  .lb { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
  .qk { display: flex; gap: 4px; flex-wrap: wrap; }
  .qk button { min-width: 44px; padding: 8px 10px; border: 0; border-radius: 999px; background: var(--sunk); font-size: 13.5px; font-weight: 500; font-variant-numeric: tabular-nums; transition: background .2s, color .2s; }
  .qk button[aria-pressed="true"] { background: var(--pri); color: var(--pri-ink); }
  .fx { margin-left: auto; }
  @media (max-width: 560px) { .fx { margin-left: 0; width: 100%; } }
  .skel { height: 300px; border-radius: var(--r); background: linear-gradient(90deg, var(--sunk), var(--surface), var(--sunk)); background-size: 200% 100%; animation: sk 1.2s infinite; }
  @keyframes sk { to { background-position: -200% 0; } }
  .body { display: grid; gap: 32px; grid-template-columns: minmax(0, 1fr); margin-top: 8px; }
  @media (min-width: 860px) { .body { grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); } .body > section:first-child { position: sticky; top: calc(var(--sat) + 76px); align-self: start; max-height: calc(100vh - var(--sat) - 92px); overflow-y: auto; overscroll-behavior: contain; } }
  .body h2 { font-size: 24px; margin-bottom: 14px; }
  .comp { margin-bottom: 22px; } .comp h3 { font-size: 13px; font-family: var(--f-body); letter-spacing: .08em; text-transform: uppercase; color: var(--accent); margin: 4px 0 8px; } .comp > .note { margin-bottom: 8px; }
  .ing { list-style: none; margin: 0; padding: 0 16px; background: var(--surface); border-radius: var(--r); box-shadow: var(--sh-1); }
  .ing li + li { box-shadow: inset 0 1px 0 var(--hair); }
  .ing button { width: 100%; display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 13px 0; border: 0; background: transparent; text-align: left; font-size: 15px; color: var(--ink); }
  .ing b { font: 600 16px var(--f-display); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .ing li.yl { color: var(--muted); font-style: italic; }
  .ing li.got button { color: var(--muted); text-decoration: line-through; }
  .steps { margin: 0; padding: 0; list-style: none; counter-reset: s; display: grid; gap: 2px; }
  .steps li { counter-increment: s; display: flex; gap: 16px; padding: 12px 6px; border-radius: var(--r-m); cursor: pointer; font-size: 15.5px; line-height: 1.6; transition: background .15s; }
  .steps li:active { background: var(--sunk); }
  .steps li::before { content: counter(s); flex: none; width: 30px; height: 30px; border-radius: 50%; background: var(--surface); box-shadow: var(--sh-1); display: grid; place-items: center; font: 600 14px var(--f-display); margin-top: 0; transition: background .2s, color .2s; }
  .steps li.done { color: var(--muted); }
  .steps li.done::before { content: "✓"; background: var(--ok); color: var(--bg); box-shadow: none; }
  .facts { display: grid; gap: 12px; margin-top: 26px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); }
  .facts > div { background: var(--surface); border-radius: var(--r); box-shadow: var(--sh-1); padding: 18px 20px; display: grid; gap: 8px; align-content: start; font-size: 14.5px; }
  .facts h4 { font-family: var(--f-body); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); font-weight: 500; }
  .big { font: 600 24px var(--f-display); }
  .alist { display: flex; flex-wrap: wrap; gap: 8px 14px; }
  .alist i { font-style: normal; display: inline-grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: var(--accent-soft); color: var(--ink); font-size: 11px; font-weight: 700; margin-right: 6px; }
  .nut { border-collapse: collapse; font-size: 13.5px; } .nut th, .nut td { padding: 5px 10px 5px 0; text-align: left; font-variant-numeric: tabular-nums; } .nut th { font-weight: 500; color: var(--muted); font-size: 11.5px; }
  .disc { font-size: 12px; color: var(--muted); margin: 20px 0 0; } .disc a { text-decoration: underline; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .pad { padding: 20px 0; }
</style>
