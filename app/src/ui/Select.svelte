<script lang="ts">
  let { label, options, value = $bindable() }: { label: string; options: string[]; value: number } = $props();
</script>
<label class="fld"><span>{label}</span>
  <select value={String(value)} onchange={(e) => (value = Number((e.target as HTMLSelectElement).value))}>
    {#each options as o, i}<option value={String(i)}>{o}</option>{/each}
  </select>
</label>
<style>
  .fld { display: grid; gap: 5px; min-width: 0; }
  .fld > span { font-size: 12px; color: var(--muted); letter-spacing: .03em; }
  select { width: 100%; min-width: 0; border: 1px solid var(--line); border-radius: 3px; background: var(--surface); padding: 9px 10px; font-size: 14.5px; }
</style>
