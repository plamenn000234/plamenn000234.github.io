<script lang="ts">
  // Settings: look, currency, offline, a full backup of everything saved on this device, and help.
  import Icon from "../ui/Icon.svelte";
  import Button from "../ui/Button.svelte";
  import Seg from "../ui/Seg.svelte";
  import { THEMES, theme, applyTheme, toast } from "../core/ui.svelte";
  import { cur, favs, ord } from "../core/kitchen.svelte";
  import { CURS, REPORT_TO } from "../core/constants";
  import { backup, restore, read, KEYS } from "../core/store.svelte";
  import { mineList, ROOT } from "../core/catalog";
  import { saveFile, today } from "../core/files";
  import { saveOffline } from "../core/offline";
  import { tour } from "../core/tour.svelte";
  import { NEWS } from "../core/news.svelte";
  import { H } from "../core/haccp.svelte";
  let showNews = $state(false);
  const VERSION = __APP_VERSION__;
  let ti = $state(Math.max(0, THEMES.findIndex((t) => t[0] === theme.v)));
  function setTheme(i: number) { theme.set(THEMES[i][0]); applyTheme(); }
  const learn = read<any>(KEYS.learn, {});
  const counts = [
    [favs.v.length, "favourites"], [mineList().length, "own recipes"], [ord.v.lines.length, "dishes in the order"],
    [read<unknown[]>(KEYS.saved, []).length, "saved orders"], [read<unknown[]>(KEYS.menus, []).length, "menus"],
    [Object.keys(learn?.done || {}).length, "lessons done"],
  ] as [number, string][];
  function backupAll() { saveFile("Chefsheet_Backup_" + today() + ".json", JSON.stringify(backup(), null, 1)); }
  function restoreAll(e: Event) {
    const inp = e.target as HTMLInputElement, f = inp.files?.[0]; if (!f) return;
    f.text().then((t) => {
      inp.value = "";
      let n = -1; try { n = restore(JSON.parse(t)); } catch {}
      if (n < 0) { toast.show("This file is not a Chefsheet backup"); return; }
      toast.show(n + " parts restored. Reloading…"); setTimeout(() => location.reload(), 900);
    });
  }
  const mail = "mailto:" + REPORT_TO + "?subject=" + encodeURIComponent("Chefsheet " + VERSION + ": feedback") + "&body=" + encodeURIComponent("Device: " + navigator.userAgent + "\n\nWhat happened:\n");
</script>
<div class="page">
  <div class="head"><p class="eyebrow">App</p><h1>Settings</h1></div>
  <div class="cols">

  <section class="card pad st">
    <h2>Look</h2>
    <div class="tf"><span>Theme</span><Seg wrap options={THEMES.map((t) => t[1])} bind:value={ti} onchange={setTheme} /></div>
    <label class="tf"><span>Currency for food cost</span>
      <select bind:value={cur.v}>{#each CURS as [c, s]}<option value={c}>{c} · {s}</option>{/each}</select></label>
  </section>

  <section class="card pad st">
    <h2>Without internet</h2>
    <p class="note">Tools, lessons and recipes you opened already work offline. Save every collection to open any recipe without a connection.</p>
    <div><Button icon="check" onclick={saveOffline}>Save all recipes</Button></div>
  </section>

  <section class="card pad st">
    <h2>Extra sections</h2>
    <label class="sw"><input type="checkbox" checked={H.v.on} onchange={(e) => { H.v.on = (e.target as HTMLInputElement).checked; H.save(); toast.show(H.v.on ? "Food safety logs are in Kitchen now" : "Food safety logs hidden. Records are kept"); }} />
      <span><b>Food safety logs (HACCP)</b><small>Fridge and freezer temperatures, cooling, deliveries, a monthly PDF. Shows in Kitchen.</small></span></label>
  </section>

  <section class="card pad st" id="data">
    <h2>Your data</h2>
    <p class="note">Everything is saved on this device only. There is no account. Back it up to a file to move to a new phone or to keep it safe.</p>
    <ul class="cnt">{#each counts as [n, t]}<li><b class="num">{n}</b><small>{t}</small></li>{/each}</ul>
    <div class="acts">
      <Button kind="pri" icon="share" onclick={backupAll}>Back up everything</Button>
      <label class="btnf"><Icon name="plus" size={16} />Restore from a file<input type="file" accept=".json,application/json" onchange={restoreAll} hidden /></label>
    </div>
    <p class="note">Restoring replaces what is on this device with the data from the file.</p>
  </section>

  <section class="card pad st">
    <h2>Help</h2>
    <div class="links">
      <button class="row" aria-expanded={showNews} onclick={() => (showNews = !showNews)}><Icon name="star" size={18} /><span>What's new</span><Icon name="fwd" size={16} /></button>
      {#if showNews}<div class="nw">{#each NEWS as n}<p class="eyebrow">{n.date}</p><ul>{#each n.items as [t, x]}<li><b>{t}</b> · {x}</li>{/each}</ul>{/each}</div>{/if}
      <button class="row" onclick={() => tour.open()}><Icon name="book" size={18} /><span>Show the welcome tour again</span><Icon name="fwd" size={16} /></button>
      <a class="row" href={mail}><Icon name="edit" size={18} /><span>Send feedback or report a problem</span><Icon name="fwd" size={16} /></a>
      <a class="row" href="{ROOT}privacy.html"><Icon name="check" size={18} /><span>Privacy policy</span><Icon name="fwd" size={16} /></a>
      <a class="row" href="{ROOT}terms.html"><Icon name="book" size={18} /><span>Terms of use</span><Icon name="fwd" size={16} /></a>
    </div>
  </section>
  </div>
  <p class="note ver">Chefsheet {VERSION} · free, no ads, no account</p>
</div>
<style>
  .head { margin: 22px 0 16px; display: grid; gap: 6px; }
  .st { display: grid; gap: 14px; margin-top: 14px; max-width: 760px; }
  .st h2 { font-size: 19px; }
  @media (min-width: 900px) { .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start; } .st { max-width: none; } }
  .cnt { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; }
  .cnt li { display: grid; gap: 2px; padding: 10px 12px; border-radius: var(--r-s); background: var(--sunk); }
  .cnt b { font: 700 20px var(--f-display); } .cnt small { font-size: 12px; color: var(--muted); }
  .btnf { display: inline-flex; align-items: center; gap: 6px; height: 44px; padding: 0 16px; border-radius: 999px; background: var(--surface); box-shadow: var(--sh-1), inset 0 0 0 1px var(--hair); font-size: 14px; font-weight: 500; cursor: pointer; }
  .links { display: grid; }
  .row { display: flex; align-items: center; gap: 12px; padding: 13px 2px; border: 0; background: none; color: var(--ink); font-size: 15px; text-align: left; box-shadow: inset 0 -1px 0 var(--hair); }
  .row:last-child { box-shadow: none; }
  .row span { flex: 1; } .row :global(svg) { color: var(--muted); flex: none; }
  .nw { padding: 6px 2px 12px; box-shadow: inset 0 -1px 0 var(--hair); } .nw ul { margin: 6px 0 0; padding-left: 18px; display: grid; gap: 6px; font-size: 14px; color: var(--ink-2); }
  .sw { display: flex; gap: 12px; align-items: flex-start; } .sw input { width: 22px; height: 22px; margin-top: 2px; accent-color: var(--accent); flex: none; }
  .sw span { display: grid; gap: 2px; } .sw b { font-weight: 600; font-size: 15px; } .sw small { font-size: 13px; color: var(--muted); }
  .ver { margin: 18px 0 8px; text-align: center; }
</style>
