<script lang="ts">
  import { rowsOf } from "../core/learn";
  import { num, f0, f1 } from "../core/util";
  import Select from "../ui/Select.svelte"; import Field from "../ui/Field.svelte"; import Outs from "../ui/Outs.svelte";
  let { s }: { s: any } = $props();
  const rw = rowsOf("buffet-sizing", 0).concat(rowsOf("buffet-sizing", 1).map((x) => [x[0] + " (2 proteins)", x[1]]));
  const KS = ["0.5", "0.6", "0.7", "0.8", "0.9", "1", "1.1", "1.2", "1.3", "1.5"];
  s.i ??= 0; s.p ??= 100; s.ki ??= 5; s.rs ??= 10;
  const r = $derived(rw[s.i] || rw[0]);
  let last = s.g != null ? s.i : -1;
  $effect.pre(() => { if (s.i !== last) { last = s.i; s.g = num(r[1]); } });
  const u = $derived(/ml/.test(r[1]) ? "ml" : "g");
  const tot = $derived((+s.p || 0) * (+s.g || 0) * Number(KS[s.ki]) * (1 + (+s.rs || 0) / 100));
</script>
<Select label="Item" options={rw.map((x) => x[0] + " · " + x[1])} bind:value={s.i} />
<div class="g2"><Field label="Guests" bind:value={s.p} /><Field label="Per guest" unit={u} bind:value={s.g} /></div>
<div class="g2"><Select label="K (popularity)" options={KS} bind:value={s.ki} /><Field label="Reserve %" bind:value={s.rs} /></div>
<Outs items={[["Total", tot >= 1000 ? f1(tot / 1000) : f0(tot), tot >= 1000 ? (u === "ml" ? " l" : " kg") : " " + u]]} />
<p class="note">Raw quantity per guest. K 1 = average, 1.3 = very popular (salmon, trout), 0.7 = less popular (couscous). For a full menu use Kitchen.</p>
