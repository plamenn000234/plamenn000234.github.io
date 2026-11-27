<script lang="ts">
  // Text where every time ("20 min", "2–3 h") is a button that starts a timer.
  import { timeParts } from "../core/util";
  import { timers } from "../core/ui.svelte";
  import Icon from "./Icon.svelte";
  let { text, label = "", ctx = "" }: { text: string; label?: string; ctx?: string } = $props();
  const parts = $derived(timeParts(String(text ?? "")));
</script>
{#each parts as p}{#if p.sec}<button type="button" class="tm" onclick={(e) => { e.stopPropagation(); timers.add(p.sec!, label ? label + " · " + p.t : p.t, ctx); }}><Icon name="timer" size={14} />{p.t}</button>{:else}{p.t}{/if}{/each}
<style>
  .tm { display: inline-flex; align-items: center; gap: 3px; border: 0; border-bottom: 1px dashed var(--accent); background: transparent; color: var(--accent); padding: 0 1px; font: inherit; font-weight: 600; }
</style>
