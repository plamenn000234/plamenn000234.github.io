<script lang="ts">
  let { label, options, value = $bindable() }: { label: string; options: string[]; value: number } = $props();
</script>
<label class="fld"><span>{label}</span>
  <select value={String(value)} onchange={(e) => (value = Number((e.target as HTMLSelectElement).value))}>
    {#each options as o, i}<option value={String(i)}>{o}</option>{/each}
  </select>
</label>
<style>
.fld { display: grid; gap: 6px; min-width: 0; }
  .fld > span { font-size: 12.5px; color: var(--muted); font-weight: 500; }
  select { width: 100%; min-width: 0; border: 0; border-radius: var(--r-s); background: var(--sunk) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%2377716A' stroke-width='1.6'/%3E%3C/svg%3E") no-repeat right 14px center;
    -webkit-appearance: none; appearance: none; padding: 13px 38px 13px 14px; font-size: 15px; outline: none; }
  select:focus { box-shadow: inset 0 0 0 2px var(--ink); }
</style>
