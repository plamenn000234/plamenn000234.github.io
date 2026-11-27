<script lang="ts">
  import { rowsOf } from "../core/learn";
  import { num, f1 } from "../core/util";
  import Select from "../ui/Select.svelte"; import Field from "../ui/Field.svelte"; import Outs from "../ui/Outs.svelte"; import Timed from "../ui/Timed.svelte";
  let { s }: { s: any } = $props();
  const rw = rowsOf("sous-vide", 0);
  s.i ??= 0; s.w ??= 1000;
  const r = $derived(rw[s.i] || rw[0]);
</script>
<Select label="Product" options={rw.map((x) => x[0])} bind:value={s.i} />
<Outs items={[["Bath", r[1]], ["Time", r[2]], ["Result", r[4]]]} />
<p class="note">Start a timer: <Timed text={r[2]} label={r[0]} /></p>
<div class="g2"><Field label="Raw weight" unit="g" bind:value={s.w} /><Outs items={[["Salt " + r[3], f1((s.w * num(r[3])) / 100), " g"]]} /></div>
<p class="note">Chill the bag in iced water if not served at once. Poultry and pork below 60 °C need a pasteurisation table.</p>
