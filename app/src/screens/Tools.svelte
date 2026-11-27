<script lang="ts">
  import ToolTile from "../ui/ToolTile.svelte";
  import Icon from "../ui/Icon.svelte";
  import { TOOLS, TOOL_GROUPS } from "../tools/registry.svelte";
  import { toolFavs } from "../core/kitchen.svelte";
  import { fold } from "../core/util";
  let q = $state("");
  const toks = $derived(fold(q).split(/\s+/).filter(Boolean));
  const hit = $derived(TOOLS.filter((t) => toks.every((k) => fold(t.name + " " + t.desc + " " + t.kw + " " + t.group).includes(k))));
  const pinned = $derived(toolFavs.v.map((id) => TOOLS.find((t) => t.id === id)).filter(Boolean));
</script>
<div class="page">
  <div class="head"><p class="eyebrow">Kitchen tools</p><h1>Tools</h1><p class="note">Calculators that work offline. Open one from a recipe and it starts with that batch.</p></div>
  <label class="sq"><Icon name="search" size={18} /><input type="search" bind:value={q} placeholder="Salt, yield, sous-vide, price…" autocomplete="off" aria-label="Search tools" /></label>
  {#if toks.length}
    <div class="grid sec">{#each hit as t (t.id)}<ToolTile {t} />{:else}<p class="note">No tool matches “{q}”.</p>{/each}</div>
  {:else}
    {#if pinned.length}<section class="sec"><div class="sec-h"><h2>Pinned</h2></div><div class="grid">{#each pinned as t (t!.id)}<ToolTile t={t!} />{/each}</div></section>{/if}
    {#each TOOL_GROUPS as g}{@const list = TOOLS.filter((t) => t.group === g)}{#if list.length}
      <section class="sec"><div class="sec-h"><h2>{g}</h2><small class="muted">{list.length}</small></div><div class="grid">{#each list as t (t.id)}<ToolTile {t} />{/each}</div></section>
    {/if}{/each}
  {/if}
</div>
<style>
  .head { margin: 14px 0 12px; display: grid; gap: 4px; }
  .sq { display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--muted); color: var(--muted); }
  .sq:focus-within { border-color: var(--accent); color: var(--ink); }
  .sq input { flex: 1; min-width: 0; border: 0; background: transparent; padding: 10px 0; font-size: 16px; outline: none; color: var(--ink); }
</style>
