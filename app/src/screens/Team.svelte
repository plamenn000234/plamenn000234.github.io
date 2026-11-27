<script lang="ts">
  // A shared kitchen: invite code, members and roles, the kitchen's recipes, the prep board.
  import Icon from "../ui/Icon.svelte";
  import Button from "../ui/Button.svelte";
  import Empty from "../ui/Empty.svelte";
  import { cloud, api, tryApi, refresh } from "../core/cloud.svelte";
  import { read, KEYS } from "../core/store.svelte";
  import { mineSave, type Mine } from "../core/catalog";
  import { toast, copyText, shareText } from "../core/ui.svelte";
  import { router } from "../core/router.svelte";
  let { id }: { id: string } = $props();
  type Member = { uid: string; name: string; role: "owner" | "chef" | "cook" };
  type KR = { id: string; name: string; data: Mine; at: number };
  let k = $state<{ id: string; name: string; code: string | null } | null>(null), role = $state(""), me = $state(""), members = $state<Member[]>([]), recs = $state<KR[]>([]), err = $state("");
  const ROLE: Record<string, string> = { owner: "Head chef", chef: "Chef", cook: "Cook" };
  async function load() {
    try {
      const j = await api("GET", "/kitchens/" + id); k = j.kitchen; role = j.role; me = j.me; members = j.members;
      recs = (await api("GET", "/kitchens/" + id + "/recipes")).list; err = "";
    } catch (e: any) { err = e?.code || "server"; }
  }
  $effect(() => { if (cloud.signed) load(); });
  const canEdit = $derived(role === "owner" || role === "chef");
  const invite = $derived(k?.code ? `Join our kitchen “${k.name}” in Chefsheet: Settings → Account → Join with a code: ${k.code}` : "");
  let arm = $state("");
  function confirm(x: string, f: () => void) { if (arm !== x) { arm = x; setTimeout(() => { if (arm === x) arm = ""; }, 3500); return; } arm = ""; f(); }
  async function setRole(uid: string, r: string) { if (await tryApi(() => api("PATCH", `/kitchens/${id}/members/${uid}`, { role: r }))) { toast.show("Role changed"); load(); } }
  async function remove(uid: string) {
    if (!(await tryApi(() => api("DELETE", `/kitchens/${id}/members/${uid}`)))) return;
    if (uid === me) { await refresh(); toast.show("You left the kitchen"); router.go("#account"); } else load();
  }
  async function newCode() { if (await tryApi(() => api("PATCH", "/kitchens/" + id, { newCode: true }))) { toast.show("New code made. The old one no longer works"); load(); } }
  async function delKitchen() { if (await tryApi(() => api("DELETE", "/kitchens/" + id))) { await refresh(); toast.show("Kitchen deleted"); router.go("#account"); } }
  let rename = $state("");
  async function doRename() { const n = rename.trim(); if (!n) return; if (await tryApi(() => api("PATCH", "/kitchens/" + id, { name: n }))) { rename = ""; await refresh(); load(); } }

  /* recipes */
  const mine = read<Mine[]>(KEYS.mine, []);
  let pick = $state("");
  async function share() {
    const r = mine.find((x) => x.id === pick); if (!r) { toast.show("Pick one of your recipes"); return; }
    if (await tryApi(() => api("PUT", `/kitchens/${id}/recipes/${r.id}`, { data: r }))) { toast.show("Shared with the kitchen: " + r.name); pick = ""; load(); }
  }
  function take(r: KR) {
    const have = read<Mine[]>(KEYS.mine, []).find((x) => x.id === r.id);
    mineSave({ ...r.data, id: r.id }); toast.show((have ? "Updated in" : "Saved to") + " your recipes: " + r.name);
  }
  async function unshare(rid: string) { if (await tryApi(() => api("DELETE", `/kitchens/${id}/recipes/${rid}`))) load(); }
</script>
<div class="page">
  <a class="back" href="#account"><Icon name="back" size={16} />Account</a>
  {#if !cloud.signed}<Empty title="Sign in first">Kitchens are part of the optional account.<div class="ea"><Button href="#account">Account</Button></div></Empty>
  {:else if err}<Empty title={err === "no_kitchen" ? "You are not in this kitchen" : "Could not open the kitchen"}>{err === "offline" ? "No connection. Try again when you are online." : ""}<div class="ea"><Button onclick={load}>Try again</Button></div></Empty>
  {:else if !k}<p class="note">Loading…</p>
  {:else}
    <div class="head"><p class="eyebrow">Kitchen · {ROLE[role]}</p><h1>{k.name}</h1></div>
    <a class="card hz press" href="#board-{id}"><Icon name="tool-prep" size={22} /><span><b>Prep board</b><small>Tasks for today and tomorrow, live for the whole team</small></span><Icon name="fwd" size={16} /></a>
    {#if k.code}<section class="card pad st">
      <h2>Invite your team</h2>
      <div class="code"><b class="num">{k.code}</b><span class="acts"><Button small icon="copy" onclick={() => copyText(k!.code!, "Code copied")}>Copy</Button><Button small icon="share" onclick={() => shareText("Join our kitchen", invite)}>Share</Button></span></div>
      <p class="note">New people join as cooks. Cooks tick tasks and read recipes. Chefs also add tasks and share recipes.</p>
    </section>{/if}
    <section class="card pad st">
      <h2>Team · {members.length}</h2>
      <ul class="ms">{#each members as m (m.uid)}<li><span class="av">{m.name.slice(0, 1).toUpperCase()}</span><span class="nm"><b>{m.name}{m.uid === me ? " (you)" : ""}</b><small>{ROLE[m.role]}</small></span>
        {#if role === "owner" && m.uid !== me}<select aria-label="Role of {m.name}" value={m.role} onchange={(e) => setRole(m.uid, (e.target as HTMLSelectElement).value)}><option value="cook">Cook</option><option value="chef">Chef</option><option value="owner">Head chef (hand over)</option></select>
          <button class="x" class:arm={arm === "m:" + m.uid} aria-label="Remove {m.name}" onclick={() => confirm("m:" + m.uid, () => remove(m.uid))}>{#if arm === "m:" + m.uid}Remove?{:else}<Icon name="close" size={14} />{/if}</button>{/if}
      </li>{/each}</ul>
    </section>
    <section class="card pad st">
      <h2>Kitchen recipes · {recs.length}</h2>
      {#if recs.length}<ul class="ms">{#each recs as r (r.id)}<li><span class="nm"><b>{r.name}</b><small>{r.data.N} portions · {r.data.ing.length} ingredients</small></span>
        <Button small onclick={() => take(r)}>Save to mine</Button>
        {#if canEdit}<button class="x" class:arm={arm === "r:" + r.id} aria-label="Stop sharing {r.name}" onclick={() => confirm("r:" + r.id, () => unshare(r.id))}>{#if arm === "r:" + r.id}Remove?{:else}<Icon name="close" size={14} />{/if}</button>{/if}</li>{/each}</ul>
      {:else}<p class="note">{canEdit ? "Share your own recipes so the whole team cooks them the same way." : "Your chef has not shared recipes yet."}</p>{/if}
      {#if canEdit}{#if mine.length}<div class="add"><label class="tf"><span>Share one of my recipes</span><select bind:value={pick}><option value="">Pick a recipe…</option>{#each mine as r}<option value={r.id}>{r.name}</option>{/each}</select></label><Button icon="share" onclick={share}>Share</Button></div>
      {:else}<p class="note"><a href="#new">Make your own recipe</a> or use “Make it mine” on any library recipe, then share it here.</p>{/if}{/if}
    </section>
    <section class="card pad st">
      {#if role === "owner"}
        <div class="add"><label class="tf"><span>Rename the kitchen</span><input bind:value={rename} placeholder={k.name} maxlength="60" /></label><Button onclick={doRename}>Save</Button></div>
        <div class="acts"><Button icon="tools" onclick={newCode}>New invite code</Button><Button icon="trash" onclick={() => confirm("del", delKitchen)}>{arm === "del" ? "Tap again: delete for everyone" : "Delete kitchen"}</Button></div>
      {:else}<div class="acts"><Button icon="back" onclick={() => confirm("leave", () => remove(me))}>{arm === "leave" ? "Tap again to leave" : "Leave this kitchen"}</Button></div>{/if}
    </section>
  {/if}
</div>
<style>
  .back { display: inline-flex; align-items: center; gap: 4px; font-size: 14px; color: var(--ink-2); margin: 16px 0 4px; padding: 6px 12px 6px 8px; border-radius: 999px; background: var(--surface); box-shadow: var(--sh-1); }
  .head { margin: 14px 0 14px; display: grid; gap: 6px; }
  .ea { display: flex; justify-content: center; margin-top: 12px; }
  .hz { display: flex; align-items: center; gap: 12px; padding: 14px 16px; color: var(--ink); max-width: 760px; }
  .hz span { flex: 1; display: grid; } .hz b { font: 600 15.5px var(--f-display); } .hz small { font-size: 12.5px; color: var(--muted); }
  .st { display: grid; gap: 12px; margin-top: 14px; max-width: 760px; } .st h2 { font-size: 18px; }
  .code { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 16px; border-radius: var(--r-s); background: var(--sunk); }
  .code b { font: 700 28px var(--f-display); letter-spacing: .14em; }
  .acts { display: flex; flex-wrap: wrap; gap: 8px; }
  .ms { list-style: none; margin: 0; padding: 0; display: grid; }
  .ms li { display: flex; align-items: center; gap: 10px; padding: 10px 0; box-shadow: inset 0 -1px 0 var(--hair); }
  .ms li:last-child { box-shadow: none; }
  .nm { flex: 1; display: grid; min-width: 0; } .nm b { font-weight: 600; font-size: 15px; } .nm small { font-size: 12.5px; color: var(--muted); }
  .av { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: var(--sunk); font: 700 15px var(--f-display); flex: none; }
  .ms select { border: 0; border-radius: 8px; background: var(--sunk); padding: 7px 8px; font-size: 13px; max-width: 150px; }
  .x { width: 32px; height: 32px; border: 0; border-radius: 999px; background: transparent; color: var(--muted); display: grid; place-items: center; font-size: 12px; flex: none; }
  .x.arm { width: auto; padding: 0 10px; background: var(--warn); color: #fff; }
  .add { display: flex; gap: 8px; align-items: end; } .add .tf { flex: 1; }
</style>
