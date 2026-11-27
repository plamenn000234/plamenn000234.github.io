<script lang="ts">
  import { rowsOf } from "../core/learn";
  import { num, f0, f1 } from "../core/util";
  import Select from "../ui/Select.svelte"; import Seg from "../ui/Seg.svelte"; import Field from "../ui/Field.svelte"; import Outs from "../ui/Outs.svelte";
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
  s.pf ??= 0; s.pp ??= 30; s.dt ??= 25; s.rt ??= 22; s.ft ??= 20; s.fr ??= 14;
  const pfl = $derived((s.pf ? (+s.pp || 0) / 100 : 0) * fl);
  const pwa = $derived(pfl * (s.pf === 1 ? 1 : 0.5));
  const wa = $derived((fl * (+s.h || 0)) / 100), ye = $derived((fl * (+s.y || 0)) / 100);
  const wt = $derived((+s.dt || 0) * 3 - (+s.rt || 0) - (+s.ft || 0) - (+s.fr || 0));
</script>
<Select label="Dough" options={rw.map((x) => x[0] + " · " + x[1])} bind:value={s.i} />
<div class="g2"><Field label={isP ? "Portions" : "Pieces"} bind:value={s.n} /><Field label={isP ? "Dough per portion" : "Weight per piece"} unit="g" bind:value={s.pw} /></div>
<div class={isP ? "g2" : "g3"}><Field label={isP ? "Liquid (egg / water) %" : "Water %"} bind:value={s.h} /><Field label="Salt %" bind:value={s.sl} />{#if !isP}<Field label="Fresh yeast %" bind:value={s.y} />{/if}</div>
<Outs items={[["Flour", f0(fl), " g"], [isP ? "Egg / water" : "Water", f0((fl * (+s.h || 0)) / 100), " g"], ["Salt", f1((fl * (+s.sl || 0)) / 100), " g"], ...(isP ? [] : [["Fresh yeast", f1((fl * (+s.y || 0)) / 100), " g"] as [string, string, string]]), ["Total dough", f0(tot), " g"]]} />
{#if !isP}
  <h3>Preferment</h3>
  <div class="g2"><div class="tf"><span>Type</span><Seg options={["None", "Poolish", "Biga"]} bind:value={s.pf} /></div>{#if s.pf}<Field label="Flour in it, % of all flour" bind:value={s.pp} />{/if}</div>
  {#if s.pf}
    <Outs items={[["Pre: flour", f0(pfl), " g"], ["Pre: water", f0(pwa), " g"], ["Pre: fresh yeast", f1(pfl * 0.002), " g"], ["Final: flour", f0(fl - pfl), " g"], ["Final: water", f0(Math.max(0, wa - pwa)), " g"], ["Final: yeast", f1(Math.max(0, ye - pfl * 0.002)), " g"]]} />
    <p class="note">{s.pf === 1 ? "Poolish: equal flour and water, 12–16 h at 18–20 °C." : "Biga: 50 % water, 16–24 h at 16–18 °C."} Salt goes in the final dough.</p>
  {/if}
  <h3>Water temperature</h3>
  <div class="g2"><Field label="Dough should be" unit="°C" bind:value={s.dt} /><Field label="Room" unit="°C" bind:value={s.rt} /></div>
  <div class="g2"><Field label="Flour" unit="°C" bind:value={s.ft} /><Field label="Mixer heat" unit="°C" bind:value={s.fr} /></div>
  <Outs items={[["Water at", f0(wt), " °C"]]} />
  <p class="note">Water = dough × 3 − room − flour − mixer heat. Mixer heat: about 14 °C for a spiral mixer, 4 °C by hand. Below 4 °C use ice in the water.</p>
{/if}
<p class="note">All % are of flour weight. Rest: {r[2]}.{isP ? " About 1 egg (55 g) per 100 g flour." : " Dry yeast = fresh ÷ 3."}</p>
