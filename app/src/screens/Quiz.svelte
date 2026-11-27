<script lang="ts" module>
  // Answers stay while the app is open, like in 2.x, so leaving the test does not lose them.
  const QA: Record<string, { a: Record<number, number>; sub: boolean; o: number[][] }> = {};
</script>
<script lang="ts">
  import { untrack } from "svelte";
  import Icon from "../ui/Icon.svelte";
  import Button from "../ui/Button.svelte";
  import LearnHead from "../ui/LearnHead.svelte";
  import LearnLoad from "../ui/LearnLoad.svelte";
  import Assign from "../ui/Assign.svelte";
  import Empty from "../ui/Empty.svelte";
  import { LD, type Module } from "../core/learn";
  import { LP, submitQuiz, takeTask, certPdf } from "../core/learnProgress.svelte";
  import { makePdf, fileBase } from "../core/files";
  import { toast } from "../core/ui.svelte";
  import { router } from "../core/router.svelte";
  let { id }: { id: string } = $props();
  let rev = $state(0);
  $effect(() => {
    const q = router.route.q; if (!q.get("by")) return;
    untrack(() => { const by = takeTask("quiz", id, q); history.replaceState(null, "", "#quiz-" + id); router.hash = "#quiz-" + id; if (by) toast.show(by + " sent you this test"); });
  });
  function st(m: Module) {
    return (QA[m.id] ||= { a: {}, sub: false, o: m.quiz.map((x) => { const a = [...x[1].keys()]; for (let k = a.length - 1; k > 0; k--) { const r = Math.floor(Math.random() * (k + 1)); [a[k], a[r]] = [a[r], a[k]]; } return a; }) });
  }
  function pick(m: Module, i: number, j: number) { const s = st(m); if (s.sub) return; s.a[i] = j; rev++; }
  function check(m: Module) { const s = st(m); s.sub = true; submitQuiz(m, s.a); rev++; window.scrollTo({ top: 0, behavior: "smooth" }); }
  function reset(m: Module) { delete QA[m.id]; rev++; window.scrollTo(0, 0); }
  function cert(m: Module) {
    LP.v.name = LP.v.name.trim(); LP.save();
    if (!LP.v.name) { toast.show("Add your name first"); (document.getElementById("cert-name") as HTMLInputElement)?.focus(); return; }
    makePdf("Certificate_" + fileBase(LP.v.name) + "_Module_" + m.n + ".pdf", () => certPdf(m.id));
  }
</script>
<LearnLoad>
  {@const m = LD.mods.find((x) => x.id === id)}
  <div class="page">
    {#if !m}<a class="back" href="#learn"><Icon name="back" size={16} />Learn</a><Empty title="Test not found"><a href="#learn">Back to Learn</a></Empty>
    {:else}
      {@const s = { ...st(m), rev }}{@const n = m.quiz.length}{@const ok = m.quiz.filter((x, i) => s.a[i] === x[2]).length}{@const sc = Math.round((ok / n) * 100)}{@const pass = sc >= 80}{@const q = LP.v.quiz[m.id]}
      <a class="back" href="#m-{m.id}"><Icon name="back" size={16} />{m.t}</a>
      <LearnHead crumb="Module {m.n} · Test" title={m.t} stats={[["Questions", n], ["Pass mark", "80%"], ["Best score", q ? q.best + "%" : "–"]]} />
      <div class="qb">
        <Assign k={"q:" + m.id} mode="banner" />
        {#if s.sub}<div class="res" class:pass><b>{sc}% · {ok} of {n} correct</b><p>{pass ? "Passed. Add your name for the certificate." : "Below 80%. Review the lessons and try again. Wrong answers go to Repeat mistakes."}</p></div>{/if}
        {#if s.sub ? pass : q?.pass}
          <div class="cf card pad"><label class="tf"><span>Name on the certificate</span><input id="cert-name" bind:value={LP.v.name} onchange={() => LP.save()} placeholder="Your full name" autocomplete="name" /></label><Button kind="pri" icon="pdf" onclick={() => cert(m)}>Certificate PDF</Button></div>
        {/if}
        <ol class="qz">
          {#each m.quiz as x, i}
            <li class="card"><p>{x[0]}</p><div class="opts">
              {#each s.o[i] as j}<button class:sel={s.a[i] === j} class:right={s.sub && j === x[2]} class:wrong={s.sub && s.a[i] === j && j !== x[2]} aria-pressed={s.a[i] === j} disabled={s.sub} onclick={() => pick(m, i, j)}>{x[1][j]}</button>{/each}
            </div></li>
          {/each}
        </ol>
        <div class="foot">
          {#if s.sub}<Button icon="today" onclick={() => reset(m)}>Try again</Button><Button kind="pri" href="#learn">Back to Learn</Button>
          {:else}<span class="note">{Object.keys(s.a).length} of {n} answered</span><Button kind="pri" disabled={Object.keys(s.a).length < n} onclick={() => check(m)}>Check answers</Button>{/if}
        </div>
      </div>
    {/if}
  </div>
</LearnLoad>
<style>
  .qb { display: grid; gap: 14px; margin-top: 18px; }
  .res { padding: 16px 18px; border-radius: var(--r); background: var(--accent-soft); } .res.pass { background: var(--ok-soft); }
  .res b { font-size: 18px; } .res p { margin-top: 4px; font-size: 14px; color: var(--ink-2); }
  .cf { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; } .cf .tf { flex: 1 1 220px; }
  .qz { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; counter-reset: q; }
  .qz li { padding: 16px; counter-increment: q; }
  .qz p { font-weight: 600; font-size: 15.5px; margin-bottom: 10px; } .qz p::before { content: counter(q) ". "; color: var(--muted); }
  .opts { display: grid; gap: 8px; }
  .opts button { text-align: left; padding: 11px 14px; border: 0; border-radius: var(--r-s); background: var(--sunk); color: var(--ink); font-size: 14.5px; line-height: 1.4; }
  .opts button.sel { box-shadow: inset 0 0 0 2px var(--ink); background: var(--raised); }
  .opts button.right { background: var(--ok-soft); box-shadow: inset 0 0 0 2px var(--ok); }
  .opts button.wrong { background: var(--accent-soft); box-shadow: inset 0 0 0 2px var(--warn); }
  .opts button:disabled { cursor: default; opacity: 1; }
  .foot { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin: 8px 0; flex-wrap: wrap; }
</style>
