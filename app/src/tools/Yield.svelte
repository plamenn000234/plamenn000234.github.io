<script lang="ts">
  import { rowsOf } from "../core/learn";
  import { num, f0 } from "../core/util";
  import Select from "../ui/Select.svelte"; import Seg from "../ui/Seg.svelte"; import Field from "../ui/Field.svelte"; import Outs from "../ui/Outs.svelte";
  let { s }: { s: any } = $props();
  const rw = rowsOf("yield-method", 0), hd = ["Sous-vide", "Braise", "Roast", "Grill"];
  s.i ??= 0; s.k ??= 2; s.raw ??= 1000; s.need ??= "";
  const r = $derived(rw[s.i] || rw[0]);
  const avail = $derived(hd.map((_, j) => isFinite(num(r[j + 1]))));
  const pc = $derived(avail[s.k] ? num(r[s.k + 1]) : num(r[avail.indexOf(true) + 1]));
</script>
<Select label="Product" options={rw.map((x) => x[0])} bind:value={s.i} />
<Seg wrap options={hd.map((h, j) => h + " " + r[j + 1])} disabled={avail.map((a) => !a)} bind:value={s.k} />
<div class="g2"><Field label="Raw weight" unit="g" bind:value={s.raw} /><Field label="Cooked weight needed" unit="g" placeholder="e.g. 9000" bind:value={s.need} /></div>
<Outs items={[["Cooked", f0((s.raw * pc) / 100), " g"], ["Loss", f0(s.raw * (1 - pc / 100)), " g"], ["Buy raw", s.need ? f0(s.need / (pc / 100)) : "–", " g"]]} />
<p class="note">Yield {f0(pc)} %. Weigh your own yield tests: equipment and cut change the numbers.</p>
