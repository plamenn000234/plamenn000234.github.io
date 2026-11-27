<script lang="ts">
  // Live prep board of a shared kitchen. Chefs add tasks, everyone ticks them; the screen asks the server
  // for changes every few seconds while it is open, so the whole team sees the same board.
  import Icon from "../ui/Icon.svelte";
  import Button from "../ui/Button.svelte";
  import Seg from "../ui/Seg.svelte";
  import Empty from "../ui/Empty.svelte";
  import { cloud, api, tryApi } from "../core/cloud.svelte";
  import { ord, portions } from "../core/kitchen.svelte";
  import { byId } from "../core/catalog";
  import { toast } from "../core/ui.svelte";
  let { id }: { id: string } = $props();
  type Task = { id: string; text: string; qty: string; who: string; done: number; by: string; at: number };
  const iso = (k: number) => { const d = new Date(); d.setDate(d.getDate() + k); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  let di = $state(0), tasks = $state<Task[]>([]), rev = $state(0), role = $state(""), name = $state(""), err = $state(""), loaded = $state(false), live = $state(true);
  const d = $derived(iso(di));
  async function meta() { try { const j = await api("GET", "/kitchens/" + id); role = j.role; name = j.kitchen.name; } catch (e: any) { err = e?.code || "server"; } }
  async function poll(force = false) {
    try {
      const j = await api("GET", `/kitchens/${id}/board?day=${d}${force ? "" : "&rev=" + rev}`); live = true;
      if (!j.same) { tasks = j.tasks; rev = j.rev; } loaded = true;
    } catch (e: any) { live = false; if (e?.code !== "offline") err = e?.code || "server"; }
  }
  $effect(() => { if (cloud.signed) meta(); });
  $effect(() => {
    void d; if (!cloud.signed) return; loaded = false; poll(true);
    const iv = setInterval(() => { if (document.visibilityState === "visible") poll(); }, 5000);
    return () => clearInterval(iv);
  });
  const canEdit = $derived(role === "owner" || role === "chef");
  const left = $derived(tasks.filter((t) => !t.done).length);
  async function tick(t: Task) {
    const done = !t.done; t.done = done ? 1 : 0; t.by = done ? cloud.a.user?.name || "" : "";
    if (!(await tryApi(() => api("PATCH", `/kitchens/${id}/board/${t.id}`, { done })))) { t.done = done ? 0 : 1; return; } poll(true);
  }
  let nt = $state({ text: "", qty: "", who: "" });
  async function add() {
    if (!nt.text.trim()) { toast.show("Type the task"); return; }
    if (await tryApi(() => api("POST", `/kitchens/${id}/board`, { day: d, ...nt }))) { nt = { text: "", qty: "", who: nt.who }; poll(true); }
  }
  async function fromOrder() {
    const list = ord.v.lines.map((l) => { const r = byId.get(l.id); return r ? { text: r.t, qty: Math.round(portions(l)) + " portions" } : null; }).filter(Boolean);
    if (!list.length) { toast.show("The current order is empty"); return; }
    const j = await tryApi(() => api("POST", `/kitchens/${id}/board`, { day: d, tasks: list }));
    if (j) { toast.show(j.added.length + " dishes added to the board"); poll(true); }
  }
  let arm = $state("");
  async function del(t: Task) {
    if (arm !== t.id) { arm = t.id; setTimeout(() => { if (arm === t.id) arm = ""; }, 3000); return; }
    arm = ""; if (await tryApi(() => api("DELETE", `/kitchens/${id}/board/${t.id}`))) poll(true);
  }
  const hm = (t: number) => new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
</script>
<div class="page">
  <a class="back" href="#team-{id}"><Icon name="back" size={16} />{name || "Kitchen"}</a>
  {#if !cloud.signed}<Empty title="Sign in first">The prep board is part of a shared kitchen.<div class="ea"><Button href="#account">Account</Button></div></Empty>
  {:else if err}<Empty title={err === "no_kitchen" ? "You are not in this kitchen" : "Could not open the board"}><div class="ea"><Button onclick={() => { err = ""; meta(); poll(true); }}>Try again</Button></div></Empty>
  {:else}
    <div class="head"><p class="eyebrow">{name} · <span class:off={!live}>{live ? "live" : "offline, showing the last state"}</span></p><h1>Prep board</h1></div>
    <div class="bar"><Seg options={["Today", "Tomorrow"]} bind:value={di} /><span class="note">{loaded ? (tasks.length ? left + " of " + tasks.length + " left" : "") : "Loading…"}</span></div>
    {#if loaded && !tasks.length}<p class="note emp">{canEdit ? "No tasks yet. Add them below, or take the dishes from the current order." : "No tasks yet. Your chef adds them here."}</p>{/if}
    {#if tasks.length}<ul class="tl card">{#each tasks as t (t.id)}
      <li class:done={!!t.done}>
        <button class="ck" role="checkbox" aria-checked={!!t.done} aria-label={t.text} onclick={() => tick(t)}>{#if t.done}<Icon name="check" size={16} />{/if}</button>
        <span class="tx"><b>{t.text}</b><small>{[t.qty, t.who ? "→ " + t.who : "", t.done && t.by ? "done by " + t.by + " " + hm(t.at) : ""].filter(Boolean).join(" · ")}</small></span>
        {#if canEdit}<button class="x" class:arm={arm === t.id} aria-label="Delete {t.text}" onclick={() => del(t)}>{#if arm === t.id}Delete?{:else}<Icon name="close" size={14} />{/if}</button>{/if}
      </li>{/each}</ul>{/if}
    {#if canEdit}<section class="card pad form">
      <label class="tf"><span>Task</span><input bind:value={nt.text} placeholder="e.g. Beef stock 20 L" maxlength="160" onkeydown={(e) => e.key === "Enter" && add()} /></label>
      <div class="g2"><label class="tf"><span>Amount</span><input bind:value={nt.qty} placeholder="e.g. 5 kg" maxlength="40" /></label><label class="tf"><span>Who</span><input bind:value={nt.who} placeholder="Name or station" maxlength="40" /></label></div>
      <div class="acts"><Button kind="pri" icon="plus" onclick={add}>Add task</Button>{#if ord.v.lines.length}<Button icon="tool-prep" onclick={fromOrder}>Add dishes from the order</Button>{/if}</div>
    </section>{/if}
  {/if}
</div>
<style>
  .back { display: inline-flex; align-items: center; gap: 4px; font-size: 14px; color: var(--ink-2); margin: 16px 0 4px; padding: 6px 12px 6px 8px; border-radius: 999px; background: var(--surface); box-shadow: var(--sh-1); }
  .head { margin: 14px 0 14px; display: grid; gap: 6px; } .off { color: var(--warn); }
  .ea { display: flex; justify-content: center; margin-top: 12px; }
  .bar { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: center; max-width: 760px; }
  .emp { margin: 16px 0; }
  .tl { list-style: none; margin: 14px 0 0; padding: 4px 16px; max-width: 760px; }
  .tl li { display: flex; align-items: center; gap: 12px; padding: 12px 0; box-shadow: inset 0 -1px 0 var(--hair); }
  .tl li:last-child { box-shadow: none; }
  .ck { width: 28px; height: 28px; border-radius: 8px; border: 2px solid var(--line); background: var(--surface); display: grid; place-items: center; color: #fff; flex: none; padding: 0; }
  .done .ck { background: var(--accent); border-color: var(--accent); }
  .tx { flex: 1; display: grid; min-width: 0; } .tx b { font-weight: 600; font-size: 15.5px; } .tx small { font-size: 12.5px; color: var(--muted); }
  .done .tx b { text-decoration: line-through; color: var(--muted); }
  .x { width: 32px; height: 32px; border: 0; border-radius: 999px; background: transparent; color: var(--muted); display: grid; place-items: center; font-size: 12px; flex: none; }
  .x.arm { width: auto; padding: 0 10px; background: var(--warn); color: #fff; }
  .form { display: grid; gap: 12px; margin-top: 14px; max-width: 760px; }
  .acts { display: flex; flex-wrap: wrap; gap: 8px; }
</style>
