<script lang="ts">
  // Number field. Empty stays "" so a tool can tell "not filled" from 0.
  let { label, value = $bindable(), placeholder = "", step = "any", id, unit = "" }: { label: string; value: number | ""; placeholder?: string; step?: string; id?: string; unit?: string } = $props();
  function inp(e: Event) { const t = e.target as HTMLInputElement; value = t.value === "" ? "" : Number(t.value.replace(",", ".")); }
</script>
<label class="fld"><span>{label}</span>
  <span class="box"><input {id} type="number" inputmode="decimal" {step} min="0" value={value} {placeholder} oninput={inp} />{#if unit}<i>{unit}</i>{/if}</span>
</label>
<style>
  .fld { display: grid; gap: 5px; min-width: 0; }
  .fld > span:first-child { font-size: 12px; color: var(--muted); letter-spacing: .03em; }
  .box { display: flex; align-items: baseline; border-bottom: 1px solid var(--muted); transition: border-color .15s; }
  .box:focus-within { border-color: var(--accent); }
  input { width: 100%; min-width: 0; border: 0; background: transparent; padding: 8px 0 6px; font-size: 18px; font-family: var(--f-display); font-variant-numeric: tabular-nums; outline: none; }
  i { font-style: normal; color: var(--muted); font-size: 13px; padding-left: 6px; }
</style>
