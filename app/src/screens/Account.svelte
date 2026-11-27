<script lang="ts">
  // The optional account: sign in with Google, cloud copy, kitchens, sign out, delete.
  import Icon from "../ui/Icon.svelte";
  import Button from "../ui/Button.svelte";
  import { cloud, googleButton, signOut, deleteAccount, refresh, pushCopy, pullCopy, tryApi, api, errText } from "../core/cloud.svelte";
  import { toast } from "../core/ui.svelte";
  import { fmtD } from "../core/files";
  import { router } from "../core/router.svelte";
  let gEl = $state<HTMLElement>(), gState = $state<"wait" | "ok" | "no">("wait");
  $effect(() => { if (!cloud.signed && gEl) googleButton(gEl, (u) => toast.show("Signed in as " + u.name)).then((ok) => (gState = ok ? "ok" : "no")); });
  $effect(() => { if (cloud.signed) refresh().catch(() => {}); });
  let kName = $state(""), kCode = $state(""), arm = $state("");
  const isNative = document.documentElement.classList.contains("native");
  function confirm(k: string, f: () => void) { if (arm !== k) { arm = k; setTimeout(() => { if (arm === k) arm = ""; }, 3500); return; } arm = ""; f(); }
  async function create() {
    const n = kName.trim(); if (!n) { toast.show("Type the kitchen name"); return; }
    const j = await tryApi(() => api("POST", "/kitchens", { name: n })); if (!j) return;
    kName = ""; await refresh(); router.go("#team-" + j.kitchen.id);
  }
  async function join() {
    const c = kCode.trim(); if (!c) { toast.show("Type the code from your chef"); return; }
    const j = await tryApi(() => api("POST", "/kitchens/join", { code: c })); if (!j) return;
    kCode = ""; await refresh(); toast.show("You joined " + j.kitchen.name); router.go("#team-" + j.kitchen.id);
  }
  async function save() { cloud.busy = true; const at = await tryApi(pushCopy); cloud.busy = false; if (at) toast.show("Saved to the cloud"); }
  function restoreCloud() {
    confirm("pull", async () => {
      cloud.busy = true; const n = await tryApi(pullCopy); cloud.busy = false;
      if (n == null) return; if (n < 0) { toast.show("No cloud copy yet. Save one first"); return; }
      toast.show(n + " parts restored. Reloading…"); setTimeout(() => location.reload(), 900);
    });
  }
  const ROLE: Record<string, string> = { owner: "Head chef", chef: "Chef", cook: "Cook" };
</script>
<div class="page">
  <a class="back" href="#settings"><Icon name="back" size={16} />Settings</a>
  <div class="head"><p class="eyebrow">Optional</p><h1>Account</h1></div>
  {#if !cloud.signed}
    <section class="card pad st">
      <h2>Sign in to keep your kitchen in the cloud</h2>
      <ul class="ben">
        <li><Icon name="check" size={16} /><span><b>Cloud copy</b> of everything you saved: open it on a new phone or tablet.</span></li>
        <li><Icon name="kitchen" size={16} /><span><b>Shared kitchen</b>: invite your team with a code, give roles, share recipes.</span></li>
        <li><Icon name="tool-prep" size={16} /><span><b>Live prep board</b>: tasks for the shift, cooks tick them off, everyone sees it at once.</span></li>
        <li><Icon name="learn-cert" size={16} /><span><b>Certificates with a QR</b> that an employer can check.</span></li>
        <li><Icon name="book" size={16} /><span><b>Share recipes</b> with other cooks in the community.</span></li>
      </ul>
      <div class="g" bind:this={gEl}></div>
      {#if gState === "no"}<p class="note">{isNative ? "Sign-in in the Android app comes with the next app update. For now, sign in on plamenn000234.github.io/v3/ in a browser." : cloud.online ? "Sign-in is being set up. Try again later." : "No connection. Sign in when you are online."}</p>{/if}
      <p class="note">Without an account everything works as now and stays on this device. We only keep your name and email from Google. <a href="../privacy.html">Privacy policy</a></p>
    </section>
  {:else}
    {@const u = cloud.a.user!}
    <section class="card pad st who"><span class="av">{u.name.slice(0, 1).toUpperCase()}</span><span><b>{u.name}</b><small>{u.email}</small></span></section>
    <section class="card pad st">
      <h2>Cloud copy</h2>
      <p class="note">{cloud.a.syncAt ? "Last saved " + fmtD(cloud.a.syncAt, true) : "Not saved yet."} The cloud copy holds the same as “Back up everything”.</p>
      <label class="sw"><input type="checkbox" bind:checked={cloud.a.auto} onchange={() => cloud.save()} /><span><b>Save automatically</b><small>When you leave the app, at most every 5 minutes</small></span></label>
      <div class="acts"><Button kind="pri" icon="share" disabled={cloud.busy} onclick={save}>Save now</Button><Button icon="back" disabled={cloud.busy} onclick={restoreCloud}>{arm === "pull" ? "Tap again: replace this device" : "Restore from the cloud"}</Button></div>
    </section>
    <section class="card pad st">
      <h2>Kitchens</h2>
      {#if cloud.a.kitchens.length}<div class="ks">{#each cloud.a.kitchens as k (k.id)}<a class="row" href="#team-{k.id}"><Icon name="kitchen" size={18} /><span><b>{k.name}</b><small>{ROLE[k.role]}</small></span><Icon name="fwd" size={16} /></a>{/each}</div>
      {:else}<p class="note">Make a kitchen for your team, or join one with the code from your chef.</p>{/if}
      <div class="two">
        <div class="add"><label class="tf"><span>New kitchen</span><input bind:value={kName} placeholder="e.g. Hotel main kitchen" maxlength="60" onkeydown={(e) => e.key === "Enter" && create()} /></label><Button icon="plus" onclick={create}>Create</Button></div>
        <div class="add"><label class="tf"><span>Join with a code</span><input bind:value={kCode} placeholder="6 letters" maxlength="12" autocapitalize="characters" onkeydown={(e) => e.key === "Enter" && join()} /></label><Button onclick={join}>Join</Button></div>
      </div>
    </section>
    <section class="card pad st">
      <div class="acts"><Button icon="back" onclick={() => signOut().then(() => toast.show("Signed out. Your data stays on this device"))}>Sign out</Button>
        <Button icon="trash" onclick={() => confirm("del", () => deleteAccount().then(() => toast.show("Account and cloud data deleted")).catch((e) => toast.show(errText(e))))}>{arm === "del" ? "Tap again: delete forever" : "Delete account"}</Button></div>
      <p class="note">Deleting removes your account, the cloud copy, kitchens you made, your certificates and shared recipes from the server. What is on this device stays.</p>
    </section>
  {/if}
</div>
<style>
  .back { display: inline-flex; align-items: center; gap: 4px; font-size: 14px; color: var(--ink-2); margin: 16px 0 4px; padding: 6px 12px 6px 8px; border-radius: 999px; background: var(--surface); box-shadow: var(--sh-1); }
  .head { margin: 14px 0 14px; display: grid; gap: 6px; }
  .st { display: grid; gap: 14px; margin-top: 14px; max-width: 760px; } .st h2 { font-size: 19px; }
  .ben { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; font-size: 14.5px; color: var(--ink-2); }
  .ben li { display: flex; gap: 10px; align-items: flex-start; } .ben :global(svg) { color: var(--accent); flex: none; margin-top: 3px; } .ben b { color: var(--ink); }
  .g { min-height: 44px; } .g :global(.gbtn) { height: 44px; padding: 0 20px; border-radius: 999px; border: 1px solid var(--line); background: var(--surface); color: var(--ink); font-size: 15px; font-weight: 600; }
  .who { display: flex; align-items: center; gap: 14px; } .who span:last-child { display: grid; } .who b { font: 600 17px var(--f-display); } .who small { color: var(--muted); font-size: 13px; }
  .av { width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; background: var(--accent); color: #fff; font: 700 20px var(--f-display); flex: none; }
  .acts { display: flex; flex-wrap: wrap; gap: 8px; }
  .sw { display: flex; gap: 12px; align-items: flex-start; } .sw input { width: 22px; height: 22px; margin-top: 2px; accent-color: var(--accent); flex: none; }
  .sw span { display: grid; gap: 2px; } .sw b { font-weight: 600; font-size: 15px; } .sw small { font-size: 13px; color: var(--muted); }
  .ks { display: grid; } .row { display: flex; align-items: center; gap: 12px; padding: 12px 2px; color: var(--ink); box-shadow: inset 0 -1px 0 var(--hair); }
  .row span { flex: 1; display: grid; } .row b { font-weight: 600; } .row small { font-size: 12.5px; color: var(--muted); } .row :global(svg) { color: var(--muted); flex: none; }
  .two { display: grid; gap: 14px; } @media (min-width: 700px) { .two { grid-template-columns: 1fr 1fr; } }
  .add { display: flex; gap: 8px; align-items: end; } .add .tf { flex: 1; }
</style>
