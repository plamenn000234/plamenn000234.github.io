<script lang="ts">
  import { rowsOf } from "../core/learn";
  import { num, f0, f1 } from "../core/util";
  import Select from "../ui/Select.svelte"; import Seg from "../ui/Seg.svelte"; import Button from "../ui/Button.svelte"; import Icon from "../ui/Icon.svelte";
  import { shareText } from "../core/ui.svelte"; import Field from "../ui/Field.svelte"; import Outs from "../ui/Outs.svelte";
  let { s }: { s: any } = $props();
  const R4 = rowsOf("buffet-sizing", 0), R2 = rowsOf("buffet-sizing", 1);
  const KS = ["0.5", "0.6", "0.7", "0.8", "0.9", "1", "1.1", "1.2", "1.3", "1.5"];
  s.t ??= 0; s.i ??= 0;
  const rw = $derived(s.t ? R2 : R4); s.p ??= 100; s.ki ??= 5; s.rs ??= 10;
  const r = $derived(rw[s.i] || rw[0]);
  // A new line-up or item resets grams per guest to the table; the same item name keeps its place when the line-up changes.
  let lastT = s.t, last = s.g != null ? s.t + ":" + s.i : "";
  $effect.pre(() => {
    if (s.t !== lastT) { const nm = (lastT ? R2 : R4)[s.i]?.[0]; lastT = s.t; const j = rw.findIndex((x) => nm && (x[0] === nm || x[0].startsWith(nm.split(" ")[0]))); s.i = j >= 0 ? j : 0; }
    const k = s.t + ":" + s.i; if (k !== last) { last = k; s.g = num(r[1]); }
  });
  const u = $derived(/ml/.test(r[1]) ? "ml" : "g");
  s.list ??= [];
  const fmt = (v: number, un: string) => (v >= 1000 ? f1(v / 1000) + (un === "ml" ? " l" : " kg") : f0(v) + " " + un);
  function add() { const nm = r[0]; s.list = [...s.list.filter((x: any) => x.n !== nm), { n: nm, q: tot, u }]; }
  const listText = () => "Buffet for " + s.p + " guests\n" + s.list.map((x: any) => x.n + ": " + fmt(x.q, x.u)).join("\n");
  const tot = $derived((+s.p || 0) * (+s.g || 0) * Number(KS[s.ki]) * (1 + (+s.rs || 0) / 100));
</script>
<Seg options={["4 or more proteins", "2 proteins"]} bind:value={s.t} />
<Select label="Item" options={rw.map((x) => x[0] + " · " + x[1])} bind:value={s.i} />
<div class="g2"><Field label="Guests" bind:value={s.p} /><Field label="Per guest" unit={u} bind:value={s.g} /></div>
<div class="g2"><Select label="K (popularity)" options={KS} bind:value={s.ki} /><Field label="Reserve %" bind:value={s.rs} /></div>
<Outs items={[["Total", tot >= 1000 ? f1(tot / 1000) : f0(tot), tot >= 1000 ? (u === "ml" ? " l" : " kg") : " " + u]]} />
<div class="acts"><Button small icon="plus" onclick={add}>Add to the list</Button></div>
{#if s.list.length}
  <h3>Buffet list</h3>
  <div class="tlist">{#each s.list as x, j (x.n)}<div><span>{x.n}</span><b>{fmt(x.q, x.u)} <button class="x" aria-label="Remove {x.n}" onclick={() => (s.list = s.list.filter((_: any, k: number) => k !== j))}><Icon name="close" size={14} /></button></b></div>{/each}</div>
  <div class="acts"><Button small icon="share" onclick={() => shareText("Buffet list", listText())}>Share the list</Button><Button small kind="ghost" onclick={() => (s.list = [])}>Clear</Button></div>
{/if}
<p class="note">Raw quantity per guest. With fewer proteins on the line each one gets a bigger share. K 1 = average, 1.3 = very popular (salmon, trout), 0.7 = less popular (couscous). For a full menu use Kitchen.</p>
<style>
  .x { border: 0; background: none; color: var(--muted); padding: 2px 0 2px 6px; vertical-align: middle; }
  h3 { margin-top: 4px; }
</style>
