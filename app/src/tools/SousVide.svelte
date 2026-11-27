<script lang="ts">
  // Sous-vide guide row + the time the core needs to reach the bath, by thickness and shape,
  // plus the pasteurisation hold for poultry and pork. Tables: D. Baldwin, as published by the
  // NSW Food Authority, "Sous vide food safety precautions for restaurants" (2022), tables 3, 5, 6.
  import { rowsOf } from "../core/learn";
  import { num, f1 } from "../core/util";
  import Select from "../ui/Select.svelte"; import Field from "../ui/Field.svelte"; import Outs from "../ui/Outs.svelte"; import Timed from "../ui/Timed.svelte"; import Seg from "../ui/Seg.svelte";
  let { s }: { s: any } = $props();
  const rw = rowsOf("sous-vide", 0);
  s.i ??= 0; s.w ??= 1000; s.mm ??= 30; s.sh ??= 0; s.fz ??= 0;
  const r = $derived(rw[s.i] || rw[0]);

  // Minutes to 0.5 °C under the bath, every 5 mm from 5 mm. [fridge, frozen] × [slab, cylinder].
  const HEAT = [
    [[5, 19, 35, 50, 75, 90, 120, 150, 180, 210, 240, 285, 330],
     [5, 11, 18, 30, 40, 50, 60, 75, 90, 120, 135, 150, 180, 210, 225, 255, 285, 315, 360]],
    [[7, 30, 50, 75, 105, 135, 180, 210, 270, 315, 375, 435, 495],
     [7, 17, 30, 40, 55, 75, 90, 120, 150, 165, 195, 240, 255, 300, 345, 390, 435, 480, 525]],
  ];
  // Pasteurisation hold at the core, 6-log Listeria, from 55 °C up (minutes).
  const HOLD = [200, 147, 109, 80, 59, 44, 32, 24, 18, 13, 10, 7, 6, 4, 3, 2, 1.5, 1.1, 0.8, 0.6, 0.45];
  // Linear between table rows, rounded up to 5 min. NaN past the end of the table.
  function heat(mm: number, t: number[]) {
    const x = mm / 5 - 1;
    if (!(mm > 0) || x > t.length - 1) return NaN;
    if (x <= 0) return t[0];
    const a = Math.floor(x), v = t[a] + (t[Math.min(a + 1, t.length - 1)] - t[a]) * (x - a);
    return Math.ceil(v / 5) * 5;
  }
  const veg = $derived(!isFinite(num(r[3])));
  const fish = $derived(/tuna|salmon|fish|prawn/i.test(r[0]));
  const needHold = $derived(/chicken|duck|turkey|pork/i.test(r[0]));
  const bath = $derived(parseFloat(String(r[1]))); // lower end of the range: the safe side
  const hold = $derived(!needHold ? 0 : bath < 55 ? NaN : bath >= 76 ? 0 : Math.ceil(HOLD[Math.floor(bath) - 55]));
  const mins = $derived(heat(+s.mm, HEAT[s.fz ? 1 : 0][s.sh ? 1 : 0]));
  const total = $derived(mins + hold);
  const hm = (m: number) => (!isFinite(m) ? "–" : m < 60 ? m + " min" : Math.floor(m / 60) + " h" + (m % 60 ? " " + (m % 60) + " min" : ""));
  // Longest time in the guide row, in minutes.
  const guideMax = $derived.by(() => { const v = String(r[2]).match(/[\d.]+/g)?.map(Number) || []; const m = Math.max(...v); return /h/.test(r[2]) ? m * 60 : m; });
  const maxMm = $derived(s.sh ? 95 : 65);
</script>
<Select label="Product" options={rw.map((x) => x[0])} bind:value={s.i} />
<Outs items={[["Bath", r[1]], ["Time", r[2]], ["Result", r[4]]]} />
<p class="note">Start a timer: <Timed text={r[2]} label={r[0]} /></p>
{#if !veg}
  <h3>Time by thickness</h3>
  <div class="g2"><Field label="Thickness" unit="mm" bind:value={s.mm} /><Seg options={["Slab", "Cylinder"]} bind:value={s.sh} /></div>
  <Seg options={["From the fridge", "Frozen"]} bind:value={s.fz} />
  {#if isFinite(mins)}
    <Outs items={needHold ? [["Core reaches bath", hm(mins)], ["Hold at " + bath + " °C", hm(hold)], ["Minimum in bath", hm(total)]] : [["Minimum in bath", hm(total)]]} />
    <p class="note">Start a timer for the minimum: <Timed text={total + " min"} label={r[0]} />{#if total > guideMax}{" "}The piece is thicker than the guide row: go by this time, not {r[2]}.{/if}</p>
  {:else}<p class="note">Over {maxMm} mm is past the table{s.sh ? "" : " for a slab"}. Cut the piece thinner or check the core with a probe.</p>{/if}
  <p class="note">Thickness is the thinnest side of the piece. Slab: steak, breast, fillet. Cylinder: loin, tenderloin, rolled roast.
    {#if needHold}The hold makes {r[0].toLowerCase()} safe at {bath} °C (Listeria, 6-log), counted from when the core reaches the bath.{:else if fish}Fish at this bath is not pasteurised: serve it right away, and freeze it first (−20 °C, 24 h) against parasites.{/if}
    Times: D. Baldwin, via NSW Food Authority (2022).</p>
{/if}
{#if !veg}<div class="g2"><Field label="Raw weight" unit="g" bind:value={s.w} /><Outs items={[["Salt " + r[3], f1(((+s.w || 0) * num(r[3])) / 100), " g"]]} /></div>
{:else}<p class="note">No salt in the bag for {r[0].toLowerCase()}: season after cooking.</p>{/if}
<p class="note">Chill the bag in iced water if not served at once.</p>
