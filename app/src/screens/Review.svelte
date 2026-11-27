<script lang="ts">
  // Repeat mistakes: wrong answers come back after a day. A right answer clears one.
  import Icon from "../ui/Icon.svelte";
  import Button from "../ui/Button.svelte";
  import LearnHead from "../ui/LearnHead.svelte";
  import LearnLoad from "../ui/LearnLoad.svelte";
  import Empty from "../ui/Empty.svelte";
  import { LD } from "../core/learn";
  import { LP, missDue, shuf, addMiss } from "../core/learnProgress.svelte";
  let round = $state<{ keys: string[]; a: Record<string, number>; early: boolean } | null>(null);
  function start() {
    const due = missDue(), v = LP.v;
    const keys = (due.length ? due : Object.keys(v.miss)).sort((a, b) => v.miss[a].due - v.miss[b].due).slice(0, 10);
    round = { keys, a: {}, early: !due.length };
  }
  function answer(k: string, j: number, right: number) {
    if (!round || round.a[k] != null) return; round.a[k] = j;
    const [mid, i] = k.split(":"); if (j === right) delete LP.v.miss[k]; else addMiss(mid, +i); LP.save();
  }
  start();
</script>
<div class="page">
  <a class="back" href="#learn"><Icon name="back" size={16} />Learn</a>
  <LearnLoad>
    {#if round}
      {@const items = round.keys.map((k) => { const [mid, i] = k.split(":"); const m = LD.mods.find((x) => x.id === mid); return m && m.quiz[+i] ? { k, m, x: m.quiz[+i] } : null; }).filter((x) => !!x)}
      {@const done = Object.keys(round.a).length}{@const ok = items.filter((it) => round!.a[it.k] === it.x[2]).length}
      <LearnHead crumb="Learn · Practice" title="Repeat mistakes" stats={[["In this round", items.length], ["Answered", done], ["Right", ok]]} />
      <p class="note sub">{round.early && items.length ? "Nothing is due yet. Practise early if you like." : "Questions you got wrong come back after a day. Answer right to clear them."}</p>
      {#if items.length}
        <ol class="qz">{#each items as it (it.k)}{@const a = round.a[it.k]}
          <li class="card"><p>{it.x[0]}<small>Module {it.m.n} · {it.m.t}</small></p><div class="opts">
            {#each shuf(it.x[1].length, it.k) as j}<button disabled={a != null} class:right={a != null && j === it.x[2]} class:wrong={a === j && j !== it.x[2]} onclick={() => answer(it.k, j, it.x[2])}>{it.x[1][j]}</button>{/each}
          </div></li>{/each}</ol>
        <div class="foot"><Button icon="today" onclick={start}>New round</Button><Button kind="pri" href="#learn">Done</Button></div>
      {:else}
        <Empty art="book" title="Nothing to repeat">Wrong answers from tests and the card of the day appear here.</Empty>
      {/if}
    {/if}
  </LearnLoad>
</div>
<style>
  .sub { margin: 14px 0; }
  .qz { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
  .qz li { padding: 16px; } .qz p { font-weight: 600; font-size: 15.5px; margin-bottom: 10px; } .qz small { display: block; font-size: 12px; color: var(--muted); font-weight: 500; margin-top: 2px; }
  .opts { display: grid; gap: 8px; }
  .opts button { text-align: left; padding: 11px 14px; border: 0; border-radius: var(--r-s); background: var(--sunk); color: var(--ink); font-size: 14.5px; }
  .opts button.right { background: var(--ok-soft); box-shadow: inset 0 0 0 2px var(--ok); }
  .opts button.wrong { background: var(--accent-soft); box-shadow: inset 0 0 0 2px var(--warn); }
  .opts button:disabled { cursor: default; }
  .foot { display: flex; justify-content: space-between; gap: 8px; margin: 16px 0 8px; }
</style>
