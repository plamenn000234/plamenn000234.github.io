<script lang="ts">
  import Icon from "../ui/Icon.svelte";
  import Button from "../ui/Button.svelte";
  import LearnHead from "../ui/LearnHead.svelte";
  import LearnLoad from "../ui/LearnLoad.svelte";
  import Assign from "../ui/Assign.svelte";
  import Empty from "../ui/Empty.svelte";
  import { LD } from "../core/learn";
  import { LP, modDone, certPdf } from "../core/learnProgress.svelte";
  import { makePdf, fileBase } from "../core/files";
  import { toast } from "../core/ui.svelte";
  let { id }: { id: string } = $props();
  function cert(m: { id: string; n: number }) {
    if (!LP.v.name) { toast.show("Add your name on the test page first"); location.hash = "#quiz-" + m.id; return; }
    makePdf("Certificate_" + fileBase(LP.v.name) + "_Module_" + m.n + ".pdf", () => certPdf(m.id));
  }
</script>
<div class="page">
  <a class="back" href="#learn"><Icon name="back" size={16} />Learn</a>
  <LearnLoad>
    {@const m = LD.mods.find((x) => x.id === id)}
    {#if !m}<Empty title="Module not found"><a href="#learn">Back to Learn</a></Empty>
    {:else}
      {@const d = modDone(m)}{@const q = LP.v.quiz[m.id]}{@const nx = m.L.find((l) => !LP.v.done[l.id]) || m.L[0]}
      <LearnHead crumb="Module {m.n} · {m.L.length} lessons" title={m.t} stats={[["Lessons done", d + " of " + m.L.length], ["Test", m.quiz.length + " questions"], ["Best score", q ? q.best + "%" : "–"]]}>
        <Button kind="pri" href="#l-{nx.id}" icon="cap">{d ? (d === m.L.length ? "Review lessons" : "Continue") : "Start module"}</Button>
        <Button href="#quiz-{m.id}" icon="learn-quiz">Take the test</Button>
        {#if q?.pass}<Button icon="pdf" onclick={() => cert(m)}>Certificate</Button>{/if}
      </LearnHead>
      <div class="asg"><Assign k={"q:" + m.id} /></div>
      <ol class="ls group">
        {#each m.L as l, i}{@const ok = !!LP.v.done[l.id]}
          <li><a href="#l-{l.id}" class:ok><span class="n">{#if ok}<Icon name="check" size={16} />{:else}{i + 1}{/if}</span><span class="t"><b>{l.t}</b><small>{l.k}</small></span>{#if l.tool}<Icon name="calc" size={18} />{/if}<Icon name="fwd" size={16} /></a></li>
        {/each}
      </ol>
    {/if}
  </LearnLoad>
</div>
<style>
  .asg { margin: 14px 0; }
  .ls { list-style: none; margin: 0; padding: 0; }
  .ls a { display: flex; align-items: center; gap: 14px; padding: 14px 16px; color: var(--ink); }
  .n { flex: none; width: 30px; height: 30px; border-radius: 50%; background: var(--sunk); display: grid; place-items: center; font-size: 13px; font-weight: 700; color: var(--muted); }
  .ok .n { background: var(--ok); color: #fff; }
  .t { flex: 1; min-width: 0; display: grid; gap: 2px; } .t b { font-size: 15.5px; font-weight: 600; } .t small { font-size: 12.5px; color: var(--muted); display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .ls a :global(svg) { color: var(--muted); flex: none; }
</style>
