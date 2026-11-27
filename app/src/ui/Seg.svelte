<script lang="ts">
  // Segmented choice: one of a few options.
  let { options, value = $bindable(), wrap = false, disabled = [], onchange }: { options: string[]; value: number; wrap?: boolean; disabled?: boolean[]; onchange?: (i: number) => void } = $props();
</script>
<div class="seg" class:wrap role="group">
  {#each options as o, i}<button type="button" aria-pressed={value === i} disabled={disabled[i]} onclick={() => { value = i; onchange?.(i); }}>{o}</button>{/each}
</div>
<style>
.seg { display: flex; gap: 2px; padding: 3px; border-radius: 12px; background: var(--sunk); overflow-x: auto; scrollbar-width: none; width: max-content; max-width: 100%; }
  .seg.wrap { flex-wrap: wrap; width: auto; }
  .seg::-webkit-scrollbar { display: none; }
  button { flex: none; border: 0; background: transparent; border-radius: 9px; padding: 8px 14px; font-size: 13.5px; font-weight: 500; color: var(--muted); white-space: nowrap; transition: background .2s var(--ease), color .2s, box-shadow .2s; }
  button[aria-pressed="true"] { background: var(--raised); color: var(--ink); box-shadow: 0 1px 2px rgba(0,0,0,.08), 0 2px 8px rgba(0,0,0,.06); }
  button:disabled { opacity: .35; }
</style>
