<script lang="ts">
  import { LD } from "../core/learn";
  import { fold } from "../core/util";
  import Seg from "../ui/Seg.svelte";
  let { s }: { s: any } = $props();
  s.q ??= ""; s.sec ??= 0;
  const secs = ["All", ...LD.gloss.map((g) => g[0])];
  const hits = $derived.by(() => { const q = fold(s.q); return LD.gloss.flatMap(([, rows], si) => (s.sec === 0 || s.sec - 1 === si ? rows.filter((r) => !q || r.some((c) => fold(c).includes(q))) : [])); });
</script>
<label class="sfld"><span>Search EN, BG or RU</span><input type="search" bind:value={s.q} placeholder="e.g. blanch, бланширане, бланшировать" autocomplete="off" /></label>
<Seg options={secs} bind:value={s.sec} />
<div class="tw"><table><thead><tr><th>English</th><th>Български</th><th>Русский</th></tr></thead>
  <tbody>{#each hits.slice(0, 300) as r}<tr><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td></tr>{:else}<tr><td colspan="3">No terms match.</td></tr>{/each}</tbody></table></div>
<style>
  .sfld { display: grid; gap: 5px; } .sfld span { font-size: 12px; color: var(--muted); }
  input { border: 0; border-bottom: 1px solid var(--muted); background: transparent; padding: 8px 0; font-size: 16px; outline: none; } input:focus { border-color: var(--accent); }
  .tw { overflow-x: auto; border: 1px solid var(--line-2); border-radius: var(--r); }
  table { border-collapse: collapse; width: 100%; font-size: 13.5px; min-width: 480px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--line-2); vertical-align: top; }
  th { font-weight: 600; background: var(--sunk); font-size: 12px; letter-spacing: .04em; }
</style>
