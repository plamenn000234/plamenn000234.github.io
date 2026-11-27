<script lang="ts">
  import { rowsOf } from "../core/learn";
  import Seg from "../ui/Seg.svelte"; import Outs from "../ui/Outs.svelte"; import Timed from "../ui/Timed.svelte";
  let { s }: { s: any } = $props();
  const rw = rowsOf("grill-doneness", 0), rs = rowsOf("grill-doneness", 1);
  s.i ??= 1;
  const r = $derived(rw[s.i] || rw[0]);
</script>
<Seg wrap options={rw.map((x) => x[0])} bind:value={s.i} />
<Outs items={[["Pull at", r[1]], ["After rest", r[2]], ["Look", r[3]]]} />
<p class="note">Beef and lamb. Poultry 74 °C core (or 65 °C held 10 min by pasteurisation table); minced meat 72 °C.</p>
<h3>Resting</h3>
<div class="tlist">{#each rs as x}<div><span>{x[0]}</span><b><Timed text={x[1]} label={x[0]} /></b></div>{/each}</div>
