<script lang="ts">
  let { value = $bindable(), min = 1, max = 5000, label = "Portions" }: { value: number; min?: number; max?: number; label?: string } = $props();
  const set = (v: number) => (value = Math.max(min, Math.min(max, Math.round(v) || min)));
</script>
<div class="stp">
  <button type="button" aria-label="Fewer {label.toLowerCase()}" onclick={() => set(value - 1)}>−</button>
  <input type="number" inputmode="numeric" aria-label={label} {min} {max} value={value} onchange={(e) => set(Number((e.target as HTMLInputElement).value))} />
  <button type="button" aria-label="More {label.toLowerCase()}" onclick={() => set(value + 1)}>+</button>
</div>
<style>
  .stp { display: inline-flex; align-items: stretch; border: 1px solid var(--line); border-radius: 3px; background: var(--surface); }
  button { width: 42px; border: 0; background: transparent; font-size: 20px; }
  input { width: 64px; border: 0; border-inline: 1px solid var(--line-2); background: transparent; text-align: center; font: 600 19px var(--f-display); padding: 6px 0; -moz-appearance: textfield; appearance: textfield; }
  input::-webkit-inner-spin-button { display: none; }
</style>
