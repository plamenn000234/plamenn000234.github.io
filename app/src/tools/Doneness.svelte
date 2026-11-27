<script lang="ts">
  // Pull temperatures by kind of meat. Beef and lamb come from the Learn table; pork, poultry and fish are kitchen standards.
  import { rowsOf } from "../core/learn";
  import Seg from "../ui/Seg.svelte"; import Outs from "../ui/Outs.svelte"; import Timed from "../ui/Timed.svelte";
  let { s }: { s: any } = $props();
  const beef = rowsOf("grill-doneness", 0), rs = rowsOf("grill-doneness", 1);
  const KINDS: [string, string[][], string][] = [
    ["Beef & lamb", beef, "Probe the thickest part, away from the bone."],
    ["Pork", [
      ["Medium (blush pink)", "60–61 °C", "63 °C", "Pale pink, juicy"],
      ["Well done", "68 °C", "71 °C", "White, no pink"],
      ["Pork belly, shoulder (slow)", "88–90 °C", "90 °C +", "Pulls apart"],
    ], "Whole cuts are safe at 63 °C core after 3 min rest. Minced pork: 72 °C."],
    ["Poultry", [
      ["Chicken breast", "70 °C", "74 °C", "White, juices clear"],
      ["Chicken thigh, leg", "78 °C", "82 °C", "Tender, falls off the bone"],
      ["Whole chicken (thigh)", "72 °C", "75 °C +", "Juices clear at the joint"],
      ["Duck breast (pink)", "54 °C", "57 °C", "Rosy, fat rendered"],
    ], "Chicken and turkey 74 °C core, or 65 °C held 10 min (pasteurisation). Duck breast is served pink."],
    ["Fish", [
      ["Tuna, rare", "40 °C", "42 °C", "Seared outside, raw centre"],
      ["Salmon, medium", "46 °C", "48 °C", "Translucent, flakes slightly"],
      ["Salmon, cooked through", "52 °C", "54 °C", "Opaque, flakes"],
      ["White fish (cod, sea bass)", "55 °C", "57 °C", "Opaque, flakes easily"],
    ], "Fish served below 60 °C must be frozen first (−20 °C for 24 h) against parasites."],
  ];
  s.t ??= 0; s.i ??= 1;
  const K = $derived(KINDS[s.t] || KINDS[0]);
  // A new kind of meat starts on its first row (beef keeps medium rare).
  let lastT = s.t;
  $effect.pre(() => { if (s.t !== lastT) { lastT = s.t; s.i = s.t === 0 ? 1 : 0; } });
  const r = $derived(K[1][s.i] || K[1][0]);
</script>
<Seg wrap options={KINDS.map((k) => k[0])} bind:value={s.t} />
<Seg wrap options={K[1].map((x) => x[0])} bind:value={s.i} />
<Outs items={[["Pull at", r[1]], ["After rest", r[2]], ["Look", r[3]]]} />
<p class="note">{K[2]} The core rises 2–5 °C while it rests.</p>
<h3>Resting</h3>
<div class="tlist">{#each rs as x}<div><span>{x[0]}</span><b><Timed text={x[1]} label={x[0]} /></b></div>{/each}</div>
