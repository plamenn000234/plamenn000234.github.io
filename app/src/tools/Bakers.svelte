<script lang="ts">
  import { rowsOf } from "../core/learn";
  import { num, f0, f1 } from "../core/util";
  import Select from "../ui/Select.svelte"; import Field from "../ui/Field.svelte"; import Outs from "../ui/Outs.svelte";
  let { s }: { s: any } = $props();
  const rw = rowsOf("pasta-dough", 0);
  s.i ??= 3; s.n ??= 10;
  const r = $derived(rw[s.i] || rw[0]);
  const isP = $derived(/pasta/i.test(r[0]));
  // Defaults follow the dough, until the cook types their own value for this dough.
  let last = s.pw != null ? s.i : -1;
  $effect.pre(() => { if (s.i !== last) { last = s.i; s.pw = isP ? 110 : 250; s.h = num(r[1]); s.sl = isP ? 0.5 : 2; s.y = isP ? 0 : /pizza/i.test(r[0]) ? 0.2 : 1; } });
  const tot = $derived((+s.n || 0) * (+s.pw || 0));
  const fl = $derived(tot / (1 + (+s.h || 0) / 100 + (+s.sl || 0) / 100 + (+s.y || 0) / 100));
</script>
<Select label="Dough" options={rw.map((x) => x[0] + " · " + x[1])} bind:value={s.i} />
<div class="g2"><Field label="Pieces" bind:value={s.n} /><Field label="Weight per piece" unit="g" bind:value={s.pw} /></div>
<div class="g3"><Field label={isP ? "Liquid (egg/water) %" : "Water %"} bind:value={s.h} /><Field label="Salt %" bind:value={s.sl} /><Field label={isP ? "Yeast % (0)" : "Fresh yeast %"} bind:value={s.y} /></div>
<Outs items={[["Flour", f0(fl), " g"], [isP ? "Egg / water" : "Water", f0((fl * s.h) / 100), " g"], ["Salt", f1((fl * s.sl) / 100), " g"], ["Yeast", f1((fl * s.y) / 100), " g"], ["Total dough", f0(tot), " g"]]} />
<p class="note">All % are of flour weight. Rest: {r[2]}. Dry yeast = fresh ÷ 3.</p>
