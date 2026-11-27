<script lang="ts">
  // Menu price from portion cost: by target food cost %, or by the profit each portion must bring. Optional rounding to a menu-friendly price.
  import { f1 } from "../core/util";
  import { curSym } from "../core/kitchen.svelte";
  import Field from "../ui/Field.svelte"; import Outs from "../ui/Outs.svelte"; import Seg from "../ui/Seg.svelte";
  let { s }: { s: any } = $props();
  s.c ??= 3.2; s.fc ??= 30; s.v ??= 20; s.mp ??= ""; s.by ??= 0; s.gp ??= 8; s.rd ??= 0;
  const RD = ["Exact", ".00", ".50", ".90"];
  const c = curSym();
  const cost = $derived(+s.c || 0), vat = $derived(1 + (+s.v || 0) / 100);
  const net0 = $derived(s.by ? cost + (+s.gp || 0) : cost / ((+s.fc || 0) / 100));
  // Rounding works on the price the guest sees (with VAT), always upwards.
  const gross = $derived.by(() => {
    const g = net0 * vat; if (!isFinite(g) || s.rd === 0) return g;
    if (s.rd === 1) return Math.ceil(g - 1e-9);
    const end = s.rd === 2 ? 0.5 : 0.9, b = Math.floor(g), cand = b + end;
    return cand + 1e-9 >= g ? cand : cand + 1;
  });
  const net = $derived(gross / vat);
  const m2 = (v: number) => (isFinite(v) ? (Math.round(v * 100) / 100).toFixed(2) : "–");
</script>
<div class="g2"><Field label="Portion cost" unit={c} bind:value={s.c} /><Field label="VAT %" bind:value={s.v} /></div>
<Seg options={["By food cost %", "By profit per portion"]} bind:value={s.by} />
{#if s.by}<Field label="Profit each portion must bring" unit={c} bind:value={s.gp} />
{:else}<Field label="Target food cost %" bind:value={s.fc} />{/if}
<div class="tf"><span>Round the menu price</span><Seg options={RD} bind:value={s.rd} /></div>
<Outs items={[["Menu price, with VAT", m2(gross), " " + c], ["Price, net", m2(net), " " + c], ["Gross profit", m2(net - cost), " " + c], ["Food cost", net > 0 && isFinite(net) ? f1((cost / net) * 100) : "–", " %"]]} />
<h3>Check a menu price</h3>
<div class="g2"><Field label="Menu price with VAT" unit={c} placeholder="e.g. 18" bind:value={s.mp} />{#if +s.mp > 0}<Outs items={[["Food cost", f1((cost / (+s.mp / vat)) * 100), " %"], ["Profit", m2(+s.mp / vat - cost), " " + c]]} />{/if}</div>
<p class="note">Portion cost = recipe cost ÷ portions, using yield-adjusted (as-bought) prices. Rounding always goes up, so food cost stays at or under the target.</p>
