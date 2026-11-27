<script lang="ts">
  import { f1 } from "../core/util";
  import { curSym } from "../core/kitchen.svelte";
  import Field from "../ui/Field.svelte"; import Outs from "../ui/Outs.svelte";
  let { s }: { s: any } = $props();
  s.c ??= 3.2; s.fc ??= 30; s.v ??= 20; s.mp ??= "";
  const net = $derived((+s.c || 0) / ((+s.fc || 0) / 100));
  const gr = $derived(net * (1 + (+s.v || 0) / 100));
  const m2 = (v: number) => (isFinite(v) ? (Math.round(v * 100) / 100).toFixed(2) : "–");
  const c = curSym();
</script>
<div class="g3"><Field label="Portion cost" unit={c} bind:value={s.c} /><Field label="Target food cost %" bind:value={s.fc} /><Field label="VAT %" bind:value={s.v} /></div>
<Outs items={[["Price, net", m2(net), " " + c], ["Menu price, with VAT", m2(gr), " " + c], ["Gross profit", m2(net - (+s.c || 0)), " " + c]]} />
<h3>Check a menu price</h3>
<div class="g2"><Field label="Menu price with VAT" unit={c} placeholder="e.g. 18" bind:value={s.mp} />{#if +s.mp > 0}<Outs items={[["Food cost", f1(((+s.c || 0) / (+s.mp / (1 + (+s.v || 0) / 100))) * 100), " %"]]} />{/if}</div>
<p class="note">Portion cost = recipe cost ÷ portions, using yield-adjusted (as-bought) prices.</p>
