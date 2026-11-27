<script lang="ts">
  // Own recipe or semi-finished product, saved in bb-mine (same format as 2.x).
  import Icon from "../ui/Icon.svelte";
  import Button from "../ui/Button.svelte";
  import Seg from "../ui/Seg.svelte";
  import Empty from "../ui/Empty.svelte";
  import { D, MINE_SLUG, OTHER_SEC, mineList, mineSave, mineRemove, type Mine } from "../core/catalog";
  import { ALG } from "../core/constants";
  import { fold } from "../core/util";
  import { favs, recent, ord } from "../core/kitchen.svelte";
  import { toast } from "../core/ui.svelte";
  import { router } from "../core/router.svelte";
  let { id = "", semi = false }: { id?: string; semi?: boolean } = $props();
  // svelte-ignore state_referenced_locally
  const u = id ? mineList().find((x) => x.id === id) : undefined;
  // svelte-ignore state_referenced_locally
  const missing = !!id && !u;
  type Row = { n: string; q: string | number };
  // svelte-ignore state_referenced_locally
  const x = $state({
    name: u?.name || "", N: u?.N || 10, pg: u?.pg || "", kcal: u?.kcal || "", diet: Number(u?.diet) || 0, algs: [...(u?.algs || [])] as number[],
    semi: u ? !!u.semi : semi, y: u?.y || "", st: u?.st || "", steps: (u?.steps || []).join("\n"),
    ing: (u?.ing.length ? u.ing.map((i) => ({ n: String(i[0]), q: i[1] })) : [{ n: "", q: "" }, { n: "", q: "" }, { n: "", q: "" }]) as Row[],
  });
  const k = (s: string) => fold(s).replace(/\s+/g, " ").trim();
  const usedIn = u ? mineList().filter((v) => v.id !== u.id && v.ing.some((i) => k(String(i[0])) === k(u.name))).length : 0;
  const semis = mineList().filter((v) => v.semi && v.id !== id);
  const prods = D.products.filter((p) => p[5] !== "My product");
  const back = u ? "#r-" + u.id : "#c-" + MINE_SLUG;
  let armDel = $state(false);

  function save() {
    const name = x.name.trim(); if (!name) { toast.show("Add a dish name"); (document.getElementById("ed-name") as HTMLInputElement)?.focus(); return; }
    const nid = id || "u" + Date.now().toString(36);
    const num = (v: unknown) => { const q = parseFloat(String(v).replace(",", ".")); return isFinite(q) && q > 0 ? Math.round(q * 100) / 100 : ""; };
    const r: Mine = { id: nid, name, N: Math.max(1, Math.round(Number(x.N) || 1)), pg: Number(x.pg) || 0, kcal: Number(x.kcal) || 0, diet: x.diet, algs: [...x.algs].sort((a, b) => a - b),
      ing: x.ing.map((i) => [i.n.trim(), num(i.q)] as [string, number | string]).filter((i) => i[0]),
      steps: x.steps.split("\n").map((s) => s.trim()).filter(Boolean), st: x.st.trim() };
    if (x.semi) { r.semi = true; const y = num(x.y); if (y) r.y = y as number; }
    if (r.semi && mineList().some((v) => v.id !== nid && v.semi && k(v.name) === k(name))) { toast.show("Another semi-finished recipe has this name"); return; }
    mineSave(r); toast.show("Recipe saved"); router.go("#r-" + nid);
  }
  function del() {
    if (!u) return;
    if (!armDel) { armDel = true; setTimeout(() => (armDel = false), 3000); return; }
    mineRemove(u.id);
    favs.set(favs.v.filter((i) => i !== u.id)); recent.set(recent.v.filter((i) => i !== u.id));
    ord.v.lines = ord.v.lines.filter((l) => l.id !== u.id); ord.save();
    toast.show("Recipe deleted"); router.go("#c-" + MINE_SLUG);
  }
  function toggleAlg(n: number) { x.algs = x.algs.includes(n) ? x.algs.filter((a) => a !== n) : [...x.algs, n]; }
</script>
<div class="page">
  <a class="back" href={back}><Icon name="back" size={16} />{u ? u.name : "My recipes"}</a>
  {#if missing}
    <Empty title="Recipe not found">It may have been deleted on this device.<div class="ea"><Button href="#c-{MINE_SLUG}">My recipes</Button></div></Empty>
  {:else}
    <div class="sub-h"><div><p class="eyebrow">My recipes</p><h1>{u ? "Edit recipe" : x.semi ? "New semi-finished" : "New recipe"}</h1></div></div>
    <p class="note">Saved on this device only. Your recipe works with scaling, orders, prep lists, labels, allergens and food cost.</p>

    <section class="card pad ed">
      <label class="tf"><span>Dish name</span><input id="ed-name" bind:value={x.name} placeholder="e.g. Chicken liver pâté" maxlength="120" /></label>
      <div class="tf"><span>Type</span><Seg options={["Dish", "Semi-finished"]} value={x.semi ? 1 : 0} onchange={(i) => (x.semi = !!i)} /></div>
      {#if x.semi}
        <p class="note">A sauce, stock, dough or marinade you make in a batch. Type its name as an ingredient in another recipe and Chefsheet counts its products, cost and allergens there.{usedIn ? ` Used in ${usedIn} of your recipes, so keep the name.` : ""}</p>
        <label class="tf"><span>Batch yield, g or ml</span><input type="number" inputmode="decimal" min="0" step="any" bind:value={x.y} placeholder="empty = sum of the ingredients" /></label>
      {/if}
      <div class="g3">
        <label class="tf"><span>Portions in this batch</span><input type="number" inputmode="numeric" min="1" bind:value={x.N} /></label>
        <label class="tf"><span>Portion, g</span><input type="number" inputmode="numeric" min="0" bind:value={x.pg} placeholder="optional" /></label>
        <label class="tf"><span>kcal per portion</span><input type="number" inputmode="numeric" min="0" bind:value={x.kcal} placeholder="optional" /></label>
      </div>
    </section>

    <section class="card pad ed">
      <h2>Ingredients</h2><p class="note">For the whole batch, net, in g or ml.</p>
      <div class="ing">
        {#each x.ing as row, i}
          <div class="ir"><input class="n" list="prodlist" bind:value={row.n} placeholder="Ingredient, e.g. Butter" autocomplete="off" aria-label="Ingredient {i + 1}" /><input class="q" type="number" inputmode="decimal" step="any" min="0" bind:value={row.q} placeholder="g / ml" aria-label="Amount {i + 1}" />
            <button class="x" aria-label="Remove ingredient {i + 1}" onclick={() => x.ing.splice(i, 1)}><Icon name="close" size={16} /></button></div>
        {/each}
      </div>
      <div><Button small icon="plus" onclick={() => x.ing.push({ n: "", q: "" })}>Add ingredient</Button></div>
      <p class="note">Pick a name from the list to link it to the product catalogue and its prices. Your semi-finished recipes are in the list too. A new name goes to “{OTHER_SEC}” in the order list.</p>
      <datalist id="prodlist">{#each semis as v}<option value={v.name} label="Semi-finished"></option>{/each}{#each prods as p}<option value={p[0]}></option>{/each}</datalist>
    </section>

    <section class="card pad ed">
      <label class="tf"><span>Method, one step per line</span><textarea rows="6" bind:value={x.steps} placeholder={"Melt the butter.\nAdd the onions and cook for 10 min."}></textarea></label>
      <label class="tf"><span>Storage</span><input bind:value={x.st} placeholder="e.g. 0–4 °C 3 days" /></label>
      <div class="tf"><span>Diet</span><Seg options={["None", "Vegetarian", "Vegan"]} value={x.diet} onchange={(i) => (x.diet = i)} /></div>
      <div class="tf"><span>Allergens it contains</span>
        <div class="al">{#each Object.entries(ALG) as [n, a]}<button class="chip" class:on={x.algs.includes(+n)} aria-pressed={x.algs.includes(+n)} onclick={() => toggleAlg(+n)}><i>{n}</i>{a}</button>{/each}</div></div>
    </section>

    <div class="acts end">
      <Button kind="pri" icon="check" onclick={save}>Save recipe</Button>
      <Button href={back}>Cancel</Button>
      {#if u}<button class="delb" class:arm={armDel} onclick={del}><Icon name="trash" size={17} />{armDel ? "Tap again to delete" : "Delete"}</button>{/if}
    </div>
  {/if}
</div>
<style>
  .ea { display: flex; justify-content: center; margin-top: 12px; }
  .ed { display: grid; gap: 16px; margin-top: 14px; }
  .ed h2 { font-size: 19px; } .ed > .note { margin-top: -10px; }
  .ing { display: grid; gap: 8px; }
  .ir { display: grid; grid-template-columns: minmax(0, 1fr) 96px 36px; gap: 8px; align-items: center; }
  .ir input { min-width: 0; border: 0; border-radius: var(--r-s); background: var(--sunk); padding: 11px 12px; font-size: 16px; outline: none; }
  .ir input:focus { box-shadow: inset 0 0 0 2px var(--ink); background: var(--raised); }
  .ir .q { text-align: right; font-variant-numeric: tabular-nums; }
  .x { width: 36px; height: 36px; border: 0; border-radius: 50%; background: transparent; color: var(--muted); display: grid; place-items: center; }
  .al { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border: 0; border-radius: 999px; background: var(--sunk); color: var(--ink-2); font-size: 13.5px; }
  .chip i { font-style: normal; font-size: 11px; color: var(--muted); }
  .chip.on { background: var(--pri); color: var(--pri-ink); } .chip.on i { color: inherit; opacity: .7; }
  .end { margin: 18px 0 8px; align-items: center; }
  .delb { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; padding: 10px 14px; border: 0; border-radius: 999px; background: transparent; color: var(--warn); font-size: 14px; font-weight: 500; }
  .delb.arm { background: var(--warn); color: #fff; }
</style>
