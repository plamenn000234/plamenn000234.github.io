<script lang="ts">
  import { rowsOf } from "../core/learn";
  import { num, f1 } from "../core/util";
  import Select from "../ui/Select.svelte"; import Seg from "../ui/Seg.svelte"; import Field from "../ui/Field.svelte"; import Outs from "../ui/Outs.svelte"; import Timed from "../ui/Timed.svelte";
  let { s }: { s: any } = $props();
  const dry = rowsOf("salt-tables", 0).map((x) => [x[0] + " · " + x[1], num(x[1]), x[2]] as [string, number, string]);
  const dish = rowsOf("buffet-salt", 0).map((x) => [x[0] + " · " + x[1] + " % of " + x[2], num(x[1]), ""] as [string, number, string]);
  const br = rowsOf("salt-tables", 1).map((x) => [x[0] + " · " + x[1], num(x[1]), x[2]] as [string, number, string]);
  s.m ??= 0; s.i ??= 0; s.w ??= s.m === 2 ? 2000 : 1000;
  const L = $derived([dry, dish, br][s.m]);
  const it = $derived(L[Math.min(s.i, L.length - 1)] || L[0]);
  // A new list or product resets the salt % to the table value.
  let lastM = s.m, lastK = s.p != null ? s.m + ":" + s.i : "";
  $effect.pre(() => {
    if (s.m !== lastM) { lastM = s.m; s.i = 0; }
    const k = s.m + ":" + s.i; if (k !== lastK) { lastK = k; s.p = it[1]; }
  });
</script>
<Seg options={["Dry salting", "By dish", "Brine"]} bind:value={s.m} />
<Select label={s.m === 2 ? "Product (salt in water)" : "Product"} options={L.map((x) => x[0])} bind:value={s.i} />
<div class="g2"><Field label={s.m === 2 ? "Water, g (ml)" : "Weight"} unit="g" bind:value={s.w} /><Field label="Salt %" bind:value={s.p} /></div>
<Outs items={[["Fine salt", f1(((+s.w || 0) * (+s.p || 0)) / 100), " g"]]} />
{#if it[2]}<p class="note">Time: <Timed text={it[2]} label={it[0]} /></p>{/if}
<p class="note">{s.m === 2 ? "Brine % is salt in water. Rinse and pat dry after brining." : s.m === 1 ? "Weigh the finished batch (or raw meat), then season to the %." : "Spread evenly, refrigerate uncovered on a rack."}</p>
