<script lang="ts">
  // Learn: progress, tasks from a chef, card of the day, mistakes to repeat, and the module path.
  const BASE = import.meta.env.BASE_URL;
  import Icon from "../ui/Icon.svelte";
  import Button from "../ui/Button.svelte";
  import LearnLoad from "../ui/LearnLoad.svelte";
  import { sendBack } from "../ui/Assign.svelte";
  import { LD } from "../core/learn";
  import { LP, modDone, passed, dailyPick, streakNow, answerDaily, missDue, shuf, dayKey, taskTitle, taskDone, taskHref, dueTxt, certPdf } from "../core/learnProgress.svelte";
  import { makePdf, fileBase } from "../core/files";
  import { toast } from "../core/ui.svelte";
  import { OB, progress } from "../core/onboard.svelte";
  const v = LP.v;
  function courseCert() {
    v.name = v.name.trim(); LP.save();
    if (!v.name) { toast.show("Add your name first"); return; }
    makePdf("Certificate_" + fileBase(v.name) + "_Course.pdf", () => certPdf("all"));
  }
  function rmTask(k: string) { delete v.tasks[k]; LP.save(); toast.show("Removed"); }
</script>
<div class="page">
  <div class="head"><p class="eyebrow">Training</p><h1>Learn</h1></div>
  <LearnLoad>
    {@const all = LD.mods.reduce((a, m) => a + m.L.length, 0)}
    {@const done = LD.mods.reduce((a, m) => a + modDone(m), 0)}
    {@const nPass = LD.mods.filter((m) => passed(m.id)).length}
    {@const next = LD.mods.flatMap((m) => m.L).find((l) => !v.done[l.id])}
    {@const cur = LD.mods.find((m) => !passed(m.id))}
    {@const nMiss = Object.keys(v.miss).length}
    {@const tks = Object.keys(v.tasks).filter((k) => taskTitle(k)).sort((a, b) => Number(taskDone(a)) - Number(taskDone(b)) || ((v.tasks[a].due || "9") < (v.tasks[b].due || "9") ? -1 : 1))}
    {@const dp = dailyPick()}{@const [qm, qi, qx] = dp.q}{@const [fm, fl] = dp.f}{@const today = dayKey()}{@const d = v.daily && v.daily.d === today ? v.daily : null}{@const sn = streakNow()}
    <section class="card pad prog" style="--img:url({BASE}bg/learn-dark.webp)">
      <div><b class="num">{done}</b><small>of {all} lessons · {nPass} of {LD.mods.length} tests passed</small></div>
      <div class="bar" role="progressbar" aria-label="Lessons done" aria-valuenow={Math.round((done / all) * 100)} aria-valuemin="0" aria-valuemax="100"><i style="width:{all ? (done / all) * 100 : 0}%"></i></div>
      <div class="pa">
        {#if next}<a class="hb" href="#l-{next.id}">{done ? "Continue" : "Start"}: {next.t}</a>{:else}<span class="hb">All lessons done</span>{/if}
        <a class="hb2" href="#tool-glossary">Glossary</a>
      </div>
    </section>

    <div class="cols"><div class="main">
    {#if OB.v.packs.length}{@const pk = OB.v.packs[0]}{@const pp = progress(pk)}
      <a class="sec card ob press" href="#welcome"><span class="ri"><Icon name="cap" size={22} /></span><span><b>Your first weeks{pk.st ? " · " + pk.st : ""}</b><small>From {pk.by} · {pp.done} of {pp.total} done</small></span><Icon name="fwd" size={16} /></a>
    {/if}
    {#if tks.length}
      <section class="sec"><div class="sec-h"><h2>Assigned to you</h2><small class="muted">{tks.filter((k) => !taskDone(k)).length} open</small></div>
        <div class="group">{#each tks as k (k)}{@const tk = v.tasks[k]}{@const dn = taskDone(k)}{@const late = !dn && tk.due && tk.due < dayKey()}
          <div class="task"><a href={taskHref(k)}><b>{taskTitle(k)}</b><small>From {tk.by}{tk.due ? " · due " + dueTxt(tk.due) : ""}</small>{#if dn}<small class="ok">Done{tk.sent ? " · sent" : ""}</small>{:else if late}<small class="late">Overdue</small>{/if}</a>
            {#if dn}<Button small kind={tk.sent ? "line" : "pri"} icon="share" onclick={() => sendBack(k)}>{tk.sent ? "Again" : "Send"}</Button>{/if}
            <button class="x" aria-label="Remove task" onclick={() => rmTask(k)}><Icon name="close" size={16} /></button></div>
        {/each}</div></section>
    {/if}

    <section class="sec card pad daily" id="daily">
      <div class="dh"><p class="eyebrow">Card of the day</p>{#if sn}<span class="st">{sn} {sn === 1 ? "day" : "days"} in a row</span>{/if}</div>
      <a class="fact" href="#l-{fl.id}"><span>{fl.k}</span><small>{fl.t} · Module {fm.n}</small></a>
      <p class="dq">{qx[0]}</p>
      <div class="opts">{#each shuf(qx[1].length, today + qm.id + qi) as j}<button disabled={!!d} class:right={!!d && j === qx[2]} class:wrong={!!d && j === d.a && j !== qx[2]} onclick={() => answerDaily(j)}>{qx[1][j]}</button>{/each}</div>
      {#if d}<p class="dres" class:good={d.a === qx[2]}>{d.a === qx[2] ? "Correct. See you tomorrow." : "Not this time. It is added to Repeat mistakes."}</p>
      {:else}<p class="note">Answer every day to keep your streak.</p>{/if}
    </section>

    {#if nMiss}
      <a class="sec card rv press" href="#review"><span class="ri"><Icon name="today" size={22} /></span><span><b>Repeat mistakes</b><small>{missDue().length} due now · {nMiss} in total</small></span><Icon name="fwd" size={16} /></a>
    {/if}

    {#if nPass === LD.mods.length}
      <section class="sec card pad cc"><b>Course complete</b><p class="note">All {LD.mods.length} tests passed. Download your course certificate.</p>
        <div class="cf"><label class="tf"><span>Name on the certificate</span><input bind:value={v.name} onchange={() => LP.save()} placeholder="Your full name" autocomplete="name" /></label><Button kind="pri" icon="pdf" onclick={courseCert}>Certificate PDF</Button></div></section>
    {/if}

    </div><div class="side">
    <section class="sec"><div class="sec-h"><h2>Modules</h2><small class="muted">{LD.mods.length} modules</small></div>
      <ol class="mods">
        {#each LD.mods as m (m.id)}{@const k = modDone(m)}{@const q = v.quiz[m.id]}
          <li class:here={cur === m} class:full={!!q?.pass}>
            <a class="mh press" href="#m-{m.id}">
              <span class="n">{m.n}</span>
              <span class="t">{#if cur === m}<em>You are here</em>{/if}<b>{m.t}</b><small>{k} of {m.L.length} lessons{q?.pass ? ` · test ${q.best}%` : ""}</small>
                <span class="pb"><i style="width:{(k / m.L.length) * 100}%"></i></span></span>
              <Icon name="fwd" size={16} />
            </a>
          </li>
        {/each}
      </ol>
    </section>
    </div></div>
    <a class="sec card rv press chefs" href="#onboard-new"><span class="ri"><Icon name="share" size={20} /></span><span><b>For chefs: onboard a new cook</b><small>One link with tests, recipes and a first-week checklist</small></span><Icon name="fwd" size={16} /></a>
    <p class="note">Progress and test results are saved on this device.</p>
  </LearnLoad>
</div>
<style>
  .head { margin: 22px 0 16px; display: grid; gap: 6px; }
  .prog { display: grid; gap: 14px; background: linear-gradient(90deg, var(--hero) 35%, color-mix(in srgb, var(--hero) 50%, transparent) 65%, transparent 100%), var(--img) right center / auto 100% no-repeat, var(--hero); color: var(--hero-ink); border-radius: 24px; box-shadow: var(--sh-3); }
  .prog small { color: var(--hero-muted); display: block; margin-top: 4px; font-size: 13px; }
  .prog b { font: 700 34px var(--f-display); }
  .bar { height: 6px; background: rgba(255, 255, 255, .14); border-radius: 999px; overflow: hidden; }
  .bar i { display: block; height: 100%; background: var(--accent); border-radius: 999px; }
  .pa { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
  .hb, .hb2 { display: inline-flex; align-items: center; min-height: 40px; padding: 0 16px; border-radius: 999px; font-size: 14px; font-weight: 600; max-width: 100%; }
  .hb { background: var(--hero-ink); color: var(--hero); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .hb2 { color: var(--hero-ink); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .25); }
  .sec { margin-top: 24px; }
  @media (min-width: 980px) { .cols { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); gap: 24px; align-items: start; } }
  .task { display: flex; align-items: center; gap: 8px; padding: 12px 12px 12px 16px; }
  .task a { flex: 1; min-width: 0; display: grid; gap: 2px; color: var(--ink); } .task b { font-weight: 600; } .task small { font-size: 12.5px; color: var(--muted); }
  .task .ok { color: var(--ok); } .task .late { color: var(--warn); }
  .x { width: 34px; height: 34px; border: 0; border-radius: 50%; background: transparent; color: var(--muted); display: grid; place-items: center; flex: none; }
  .daily { display: grid; gap: 12px; }
  .dh { display: flex; justify-content: space-between; align-items: center; }
  .st { font-size: 12.5px; font-weight: 600; color: var(--accent); }
  .fact { display: grid; gap: 4px; padding: 12px 14px; border-radius: var(--r-m); background: var(--sunk); color: var(--ink); }
  .fact span { font-size: 15px; line-height: 1.45; } .fact small { font-size: 12.5px; color: var(--ink-2); font-weight: 500; }
  .dq { font-weight: 600; font-size: 16px; }
  .opts { display: grid; gap: 8px; }
  .opts button { text-align: left; padding: 11px 14px; border: 0; border-radius: var(--r-s); background: var(--sunk); color: var(--ink); font-size: 14.5px; }
  .opts button.right { background: var(--ok-soft); box-shadow: inset 0 0 0 2px var(--ok); }
  .opts button.wrong { background: var(--accent-soft); box-shadow: inset 0 0 0 2px var(--warn); }
  .opts button:disabled { cursor: default; }
  .dres { font-weight: 600; color: var(--warn); } .dres.good { color: var(--ok); }
  .ob { display: flex; align-items: center; gap: 14px; padding: 14px 16px; color: var(--ink); box-shadow: var(--sh-1), inset 3px 0 0 var(--accent); }
  .ob span:nth-child(2) { flex: 1; display: grid; } .ob b { font-weight: 600; } .ob small { font-size: 12.5px; color: var(--muted); }
  .chefs { max-width: 760px; margin-bottom: 12px; }
  .rv { display: flex; align-items: center; gap: 14px; padding: 14px 16px; color: var(--ink); }
  .ri { width: 44px; height: 44px; border-radius: 12px; background: var(--accent-soft); color: var(--accent); display: grid; place-items: center; flex: none; }
  .rv span:nth-child(2) { flex: 1; display: grid; } .rv b { font-weight: 600; } .rv small { font-size: 12.5px; color: var(--muted); }
  .cc { display: grid; gap: 8px; } .cc > b { font-size: 18px; }
  .cf { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; } .cf .tf { flex: 1 1 220px; }
  .mods { list-style: none; margin: 0; padding: 0 0 0 16px; border-left: 1px solid var(--line); display: grid; gap: 10px; }
  .mods li { position: relative; }
  .mods li::before { content: ""; position: absolute; left: -21px; top: 26px; width: 9px; height: 9px; border-radius: 50%; background: var(--bg); border: 1px solid var(--muted); }
  .mods li.full::before { background: var(--ok); border-color: var(--ok); }
  .mods li.here::before { background: var(--accent); border-color: var(--accent); }
  .mh { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: var(--surface); box-shadow: var(--sh-1); border-radius: var(--r-m); color: var(--ink); }
  .n { font: 700 20px var(--f-display); color: var(--muted); width: 26px; flex: none; }
  .t { flex: 1; min-width: 0; display: grid; gap: 2px; } .t b { font-weight: 600; font-size: 15.5px; } .t small { font-size: 12.5px; color: var(--muted); }
  .t em { font-style: normal; font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--accent); }
  .pb { height: 4px; border-radius: 999px; background: var(--sunk); overflow: hidden; margin-top: 6px; } .pb i { display: block; height: 100%; background: var(--ok); }
  .mh :global(svg) { color: var(--muted); flex: none; }
</style>
