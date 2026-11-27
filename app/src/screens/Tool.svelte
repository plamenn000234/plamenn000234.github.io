<script lang="ts">
  import Icon from "../ui/Icon.svelte";
  import Button from "../ui/Button.svelte";
  import Empty from "../ui/Empty.svelte";
  import { toolById, TS } from "../tools/registry.svelte";
  import { loadLearn } from "../core/learn";
  import { byId } from "../core/catalog";
  import { toolFavs, toggleTool } from "../core/kitchen.svelte";
  import { toast } from "../core/ui.svelte";
  let { id }: { id: string } = $props();
  // svelte-ignore state_referenced_locally
  if (!TS[id]) TS[id] = {};
  const t = $derived(toolById(id));
  const s = $derived(TS[id]);
  const fr = $derived(s.from ? byId.get(s.from) : null);
  const pinned = $derived(toolFavs.v.includes(id));
  let comp: any = $state(null), err = $state(false);
  $effect(() => {
    const tt = t; comp = null; err = false; if (!tt) return;
    Promise.all([tt.load(), tt.learn ? loadLearn() : null]).then(([m]) => { if (t === tt) comp = m.default; }).catch(() => (err = true));
  });
</script>
<div class="page">
  {#if !t}<Empty title="Tool not found"><a href="#tools">All tools</a></Empty>
  {:else}
    <a class="back" href={fr ? "#r-" + fr.id : "#tools"}><Icon name="back" size={16} />{fr ? fr.t : "Tools"}</a>
    <header class="hd">
      <span class="ic"><Icon name={t.icon} size={34} /></span>
      <div><p class="eyebrow">{t.group}</p><h1>{t.name}</h1><p class="note">{t.desc}</p></div>
    </header>
    <div class="acts">
      <Button small icon="star" pressed={pinned} onclick={() => toast.show(toggleTool(id) ? "Pinned to Today" : "Unpinned")}>{pinned ? "Pinned" : "Pin to Today"}</Button>
      {#if fr}<span class="for"><Icon name="cook" size={16} />For {s.fromLabel || fr.t}</span>{/if}
    </div>
    <section class="card pad tool-body">
      {#if err}<p class="note">Could not load this tool. Check your connection and open it again.</p>
      {:else if comp}{@const C = comp}<C {s} />
      {:else}<p class="note">Loading…</p>{/if}
    </section>
  {/if}
</div>
<style>
  .back { display: inline-flex; align-items: center; gap: 4px; font-size: 14px; color: var(--ink-2); margin: 16px 0 12px; padding: 6px 12px 6px 8px; border-radius: 999px; background: var(--surface); box-shadow: var(--sh-1); }
  .hd { display: flex; gap: 16px; align-items: center; margin-bottom: 16px; }
  .hd div { display: grid; gap: 4px; }
  .ic { width: 72px; height: 72px; border-radius: 22px; background: var(--surface); box-shadow: var(--sh-2); display: grid; place-items: center; flex: none; }
  .acts { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; margin-bottom: 18px; }
  .tool-body { border-radius: 24px; padding: 22px; }
  .for { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: var(--accent); }
</style>
