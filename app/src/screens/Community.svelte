<script lang="ts">
  // Community recipes: anyone can read; signed-in cooks share their own recipes. Save one to make it yours.
  import Icon from "../ui/Icon.svelte";
  import Button from "../ui/Button.svelte";
  import Empty from "../ui/Empty.svelte";
  import { cloud, api, tryApi, errText } from "../core/cloud.svelte";
  import { read, KEYS } from "../core/store.svelte";
  import { mineSave, type Mine } from "../core/catalog";
  import { ALG } from "../core/constants";
  import { toast } from "../core/ui.svelte";
  import { router } from "../core/router.svelte";
  import { fmtD } from "../core/files";
  let { id = "" }: { id?: string } = $props();
  type Row = { id: string; author: string; name: string; at: number };
  type Full = { id: string; author: string; name: string; at: number; mine: boolean; data: Mine };
  let q = $state(""), list = $state<Row[]>([]), more = $state(false), loading = $state(true), err = $state("");
  let one = $state<Full | null>(null);
  async function search(append = false) {
    loading = true;
    try { const j = await api("GET", "/community?q=" + encodeURIComponent(q.trim()) + "&o=" + (append ? list.length : 0)); list = append ? [...list, ...j.list] : j.list; more = j.list.length === 30; err = ""; }
    catch (e) { err = errText(e); }
    loading = false;
  }
  async function open(cid: string) { one = null; loading = true; try { one = (await api("GET", "/community/" + cid)).recipe; err = ""; } catch (e) { err = errText(e); } loading = false; }
  $effect(() => { if (id) open(id); else search(); });
  let t: any; function typed() { clearTimeout(t); t = setTimeout(() => search(), 350); }

  /* share */
  const mine = read<Mine[]>(KEYS.mine, []);
  let pick = $state(router.route.q.get("share") || ""), author = $state(cloud.a.user?.name || ""), ok = $state(false);
  async function share() {
    const r = mine.find((x) => x.id === pick); if (!r) { toast.show("Pick one of your recipes"); return; }
    if (!ok) { toast.show("Tick the box first"); return; }
    const { from: _f, ...data } = r as any;
    const j = await tryApi(() => api("POST", "/community", { data, author: author.trim() })); if (!j) return;
    toast.show("Shared: " + r.name); pick = ""; router.go("#community-" + j.id);
  }
  function save(f: Full) { const nid = "c" + f.id; mineSave({ ...f.data, id: nid }); toast.show("Saved to your recipes. Change it as you like"); router.go("#r-" + nid); }
  let armR = $state(false);
  async function report(f: Full) {
    if (!cloud.signed) { toast.show("Sign in to report"); return; }
    if (!armR) { armR = true; setTimeout(() => (armR = false), 3000); return; }
    if (await tryApi(() => api("POST", `/community/${f.id}/report`))) toast.show("Thank you. We will check it");
  }
  async function remove(f: Full) { if (await tryApi(() => api("DELETE", "/community/" + f.id))) { toast.show("Removed from the community"); router.go("#community"); } }
  const qty = (x: number | string) => (typeof x === "number" ? (x >= 1000 ? Math.round(x / 10) / 100 + " kg" : x + " g") : x);
</script>
<div class="page">
  {#if id}
    <a class="back" href="#community"><Icon name="back" size={16} />Community</a>
    {#if one}
      <div class="head"><p class="eyebrow">Shared by {one.author} · {fmtD(one.at)}</p><h1>{one.name}</h1></div>
      <section class="card pad st">
        <p class="note">{one.data.N} portion{one.data.N === 1 ? "" : "s"}{one.data.algs?.length ? " · allergens: " + one.data.algs.map((a) => ALG[a]).filter(Boolean).join(", ") : ""}</p>
        <ul class="ing">{#each one.data.ing as [n, x]}<li><span>{n}</span><b>{qty(x)}</b></li>{/each}</ul>
        {#if one.data.steps?.length}<ol class="steps">{#each one.data.steps as s}<li>{s}</li>{/each}</ol>{/if}
        <div class="acts"><Button kind="pri" icon="plus" onclick={() => save(one!)}>Save to my recipes</Button>
          {#if one.mine}<Button icon="trash" onclick={() => remove(one!)}>Remove</Button>{:else}<Button onclick={() => report(one!)}>{armR ? "Tap again to report" : "Report"}</Button>{/if}</div>
        <p class="note">Shared by a cook, not checked by Chefsheet. Check allergens and food safety before you cook it for guests.</p>
      </section>
    {:else if loading}<p class="note">Loading…</p>
    {:else}<Empty title="Recipe not found">{err}</Empty>{/if}
  {:else}
    <a class="back" href="#recipes"><Icon name="back" size={16} />Recipes</a>
    <div class="head"><p class="eyebrow">From other cooks</p><h1>Community recipes</h1></div>
    <label class="srch"><Icon name="search" size={18} /><input type="search" bind:value={q} oninput={typed} placeholder="Search by dish or product" aria-label="Search community recipes" /></label>
    {#if err}<p class="note">{err}</p>{/if}
    {#if list.length}<div class="cl">{#each list as r (r.id)}<a class="card press cr" href="#community-{r.id}"><b>{r.name}</b><small>{r.author} · {fmtD(r.at)}</small></a>{/each}</div>
      {#if more}<div class="mo"><Button onclick={() => search(true)}>More</Button></div>{/if}
    {:else if !loading && !err}<p class="note emp">{q.trim() ? "Nothing found." : "No recipes yet. Be the first to share one."}</p>{/if}
    <section class="card pad st">
      <h2>Share your recipe</h2>
      {#if !cloud.signed}<p class="note">Sign in to share. <a href="#account">Account</a></p>
      {:else if !mine.length}<p class="note"><a href="#new">Make your own recipe</a> or use “Make it mine” on a library recipe, then share it here.</p>
      {:else}
        <div class="g2"><label class="tf"><span>Recipe</span><select bind:value={pick}><option value="">Pick a recipe…</option>{#each mine as r}<option value={r.id}>{r.name}</option>{/each}</select></label>
          <label class="tf"><span>Shown as</span><input bind:value={author} maxlength="60" placeholder="Your name or kitchen" /></label></div>
        <label class="sw"><input type="checkbox" bind:checked={ok} /><span>It is my own recipe, anyone may read and copy it, and it has no names of my employer or guests.</span></label>
        <div><Button kind="pri" icon="share" onclick={share}>Share with the community</Button></div>
      {/if}
    </section>
  {/if}
</div>
<style>
  .back { display: inline-flex; align-items: center; gap: 4px; font-size: 14px; color: var(--ink-2); margin: 16px 0 4px; padding: 6px 12px 6px 8px; border-radius: 999px; background: var(--surface); box-shadow: var(--sh-1); }
  .head { margin: 14px 0 14px; display: grid; gap: 6px; }
  .st { display: grid; gap: 12px; margin-top: 18px; max-width: 760px; } .st h2 { font-size: 18px; }
  .srch { display: flex; align-items: center; gap: 8px; padding: 0 14px; border-radius: 999px; background: var(--sunk); color: var(--muted); max-width: 760px; }
  .srch input { flex: 1; min-width: 0; border: 0; background: transparent; padding: 11px 0; font-size: 15px; outline: none; color: var(--ink); }
  .cl { display: grid; gap: 10px; margin-top: 14px; grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr)); }
  .cr { display: grid; gap: 3px; padding: 14px 16px; color: var(--ink); } .cr b { font: 600 15.5px var(--f-display); } .cr small { font-size: 12.5px; color: var(--muted); }
  .mo { margin-top: 12px; } .emp { margin: 16px 0; }
  .ing { list-style: none; margin: 0; padding: 0; } .ing li { display: flex; justify-content: space-between; gap: 12px; padding: 9px 0; box-shadow: inset 0 -1px 0 var(--hair); font-size: 15px; }
  .ing b { font: 600 15px var(--f-display); white-space: nowrap; }
  .steps { margin: 4px 0 0; padding-left: 20px; display: grid; gap: 8px; font-size: 15px; }
  .acts { display: flex; flex-wrap: wrap; gap: 8px; }
  .sw { display: flex; gap: 10px; align-items: flex-start; font-size: 13.5px; color: var(--ink-2); } .sw input { width: 20px; height: 20px; accent-color: var(--accent); flex: none; margin-top: 1px; }
</style>
