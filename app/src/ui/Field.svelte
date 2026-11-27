<script lang="ts">
  // Number field. Empty stays "" so a tool can tell "not filled" from 0.
  let { label, value = $bindable(), placeholder = "", step = "any", id, unit = "" }: { label: string; value: number | ""; placeholder?: string; step?: string; id?: string; unit?: string } = $props();
  function inp(e: Event) { const t = e.target as HTMLInputElement; value = t.value === "" ? "" : Number(t.value.replace(",", ".")); }
</script>
<label class="fld"><span>{label}</span>
  <span class="box"><input {id} type="number" inputmode="decimal" {step} min="0" value={value} {placeholder} oninput={inp} />{#if unit}<i>{unit}</i>{/if}</span>
</label>
<style>
.fld { display: grid; gap: 6px; min-width: 0; }
  .fld > span:first-child { font-size: 12.5px; color: var(--muted); font-weight: 500; }
  .box { display: flex; align-items: baseline; background: var(--sunk); border-radius: var(--r-s); padding: 0 14px; box-shadow: inset 0 0 0 1px transparent; transition: box-shadow .2s, background .2s; }
  .box:focus-within { background: var(--raised); box-shadow: inset 0 0 0 2px var(--ink); }
  input { width: 100%; min-width: 0; border: 0; background: transparent; padding: 11px 0 10px; font-size: 20px; font-family: var(--f-display); font-weight: 600; font-variant-numeric: tabular-nums; outline: none; }
  i { font-style: normal; color: var(--muted); font-size: 13px; padding-left: 6px; }
</style>
