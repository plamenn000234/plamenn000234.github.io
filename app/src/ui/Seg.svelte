<script lang="ts">
  // Segmented choice: one of a few options.
  let { options, value = $bindable(), wrap = false, disabled = [], onchange }: { options: string[]; value: number; wrap?: boolean; disabled?: boolean[]; onchange?: (i: number) => void } = $props();
</script>
<div class="seg" class:wrap role="group">
  {#each options as o, i}<button type="button" aria-pressed={value === i} disabled={disabled[i]} onclick={() => { value = i; onchange?.(i); }}>{o}</button>{/each}
</div>
<style>
  .seg { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; }
  .seg.wrap { flex-wrap: wrap; overflow: visible; }
  .seg::-webkit-scrollbar { display: none; }
  button { flex: none; border: 1px solid var(--line); background: transparent; border-radius: 3px; padding: 7px 12px; font-size: 13.5px; white-space: nowrap; transition: all .15s; }
  button[aria-pressed="true"] { background: var(--ink); color: var(--bg); border-color: var(--ink); }
  button:disabled { opacity: .4; }
</style>
