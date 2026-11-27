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
.stp { display: inline-flex; align-items: center; gap: 2px; padding: 3px; border-radius: 999px; background: var(--sunk); }
  button { width: 40px; height: 40px; border: 0; border-radius: 50%; background: var(--raised); box-shadow: var(--sh-1); font-size: 20px; line-height: 1; transition: transform .15s var(--ease); }
  button:active { transform: scale(.9); }
  input { width: 64px; border: 0; background: transparent; text-align: center; font: 600 21px var(--f-display); padding: 6px 0; -moz-appearance: textfield; appearance: textfield; font-variant-numeric: tabular-nums; outline: none; }
  input::-webkit-inner-spin-button { display: none; }
</style>
