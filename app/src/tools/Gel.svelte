<script lang="ts">
  // Gels and thickeners: how much gelatin, agar, starch, roux or xanthan for a weight of liquid.
  // Gelatin % is for 200 bloom; other blooms by strength ∝ bloom × concentration², so g = g200 × √(200 / bloom).
  import { f0, f1 } from "../core/util";
  import Select from "../ui/Select.svelte"; import Seg from "../ui/Seg.svelte"; import Field from "../ui/Field.svelte"; import Outs from "../ui/Outs.svelte";
  let { s }: { s: any } = $props();
  type Use = [name: string, pct: number];
  const USES: Use[][] = [
    [["Panna cotta, soft set", 1], ["Mousse, bavarois", 1.4], ["Fruit jelly to unmould", 2], ["Firm terrine, aspic to slice", 3], ["Marshmallow, gummies", 6]],
    [["Fluid gel (blend after it sets)", 0.3], ["Soft jelly", 0.5], ["Firm jelly, cubes, noodles", 1], ["Warm jelly to serve hot", 1.2]],
    [["Cornstarch · light sauce", 2], ["Cornstarch · coating sauce", 3], ["Cornstarch · pudding, firm", 6], ["Roux · thin soup, velouté", 5], ["Roux · béchamel, medium", 7], ["Roux · thick, croquettes", 10]],
    [["Light body, jus", 0.1], ["Sauce, purée", 0.2], ["Stable dressing", 0.3], ["Thick gel, piping", 0.6]],
  ];
  const GEL: [string, number, number][] = [["Powder · 200 bloom", 200, 0], ["Gold sheets · 2 g", 200, 2], ["Silver sheets · 2.5 g", 160, 2.5], ["Bronze sheets · 3.3 g", 140, 3.3], ["Platinum sheets · 1.7 g", 250, 1.7], ["Powder · 250 bloom", 250, 0]];
  s.m ??= 0; s.i ??= 0; s.w ??= 1000; s.g ??= 1;
  const L = $derived(USES[s.m]);
  const u = $derived(L[Math.min(s.i, L.length - 1)] || L[0]);
  const roux = $derived(s.m === 2 && /^Roux/.test(u[0]));
  let lastM = s.m, lastK = s.p != null ? s.m + ":" + s.i : "";
  $effect.pre(() => {
    if (s.m !== lastM) { lastM = s.m; s.i = 0; }
    const k = s.m + ":" + s.i; if (k !== lastK) { lastK = k; s.p = u[1]; }
  });
  const base = $derived(((+s.w || 0) * (+s.p || 0)) / 100);
  const gt = $derived(GEL[Math.min(s.g, GEL.length - 1)] || GEL[0]);
  const gG = $derived(base * Math.sqrt(200 / gt[1]));
  const outs = $derived.by((): [string, string, string?][] => {
    if (s.m === 0) return gt[2] ? [["Gelatin", f1(gG), " g"], ["Sheets", f1(gG / gt[2])]] : [["Gelatin", f1(gG), " g"], ["Cold water to bloom", f0(gG * 6), " g"]];
    if (s.m === 1) return [["Agar", f1(base), " g"]];
    if (s.m === 2) return roux ? [["Flour", f0(base), " g"], ["Butter", f0(base), " g"]] : [["Cornstarch", f0(base), " g"], ["Cold water for slurry", f0(base * 2), " g"]];
    return [["Xanthan", f1(base), " g"]];
  });
  const NOTE = [
    "Sheets: soak in cold water for 5 minutes, squeeze, melt into warm liquid (not boiling). Powder: sprinkle on 6 × its weight of cold water, wait 5 minutes, then melt. Raw pineapple, kiwi, papaya and fresh ginger stop gelatin setting: cook them first. Add about 20 % more for very acidic or alcoholic liquids.",
    "Whisk agar into cold liquid, then boil for 1–2 minutes. It sets at about 35–40 °C and stays firm up to 80 °C, so it can be served warm. Acid weakens it: add the acid after boiling or use a little more.",
    "Starch: mix with twice its weight of cold water, whisk into the simmering liquid and boil for 1 minute to cook out the taste. Roux: equal weights of butter and flour, cook 2–3 minutes, then whisk in the liquid and simmer 10–20 minutes. Numbers are a start: reduce or add liquid to taste.",
    "Shear xanthan in with a stick blender, a little at a time, cold or hot. It does not need heat. Too much feels slimy: start low.",
  ];
</script>
<Seg wrap options={["Gelatin", "Agar", "Starch", "Xanthan"]} bind:value={s.m} />
<Select label="Use" options={L.map((x) => x[0] + " · " + x[1] + " %")} bind:value={s.i} />
{#if s.m === 0}<Select label="Gelatin you have" options={GEL.map((x) => x[0])} bind:value={s.g} />{/if}
<div class="g2"><Field label="Liquid" unit="g" bind:value={s.w} /><Field label={roux ? "Flour %" : "Dose %"} bind:value={s.p} /></div>
<Outs items={outs} />
<p class="note">{NOTE[s.m]}</p>
