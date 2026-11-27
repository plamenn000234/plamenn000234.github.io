<script lang="ts" module>
  import { LP as P, certPdf as cert } from "../core/learnProgress.svelte";
  import { LD as L } from "../core/learn";
  import { shareText as share, toast as t } from "../core/ui.svelte";
  import { saveFile as save, fileBase as fb } from "../core/files";
  /** The cook reports back: a message for a lesson, the certificate PDF and a message for a test. */
  export async function sendBack(k: string) {
    const tk = P.v.tasks[k]; if (!tk) return; const i = k.indexOf(":"), ty = k.slice(0, i), id = k.slice(i + 1);
    if (ty === "l") { const e = L.byL.get(id); if (!e) return; tk.sent = Date.now(); P.save(); share("Lesson done", `${tk.by}, I have read the lesson “${e.l.t}” (Module ${e.m.n}) in Chefsheet on ${new Date(P.v.done[id] || Date.now()).toLocaleDateString("en-GB")}.${P.v.name ? "\n" + P.v.name : ""}`); return; }
    if (!P.v.name) { t.show("Add your name for the certificate first"); location.hash = "#quiz-" + id; return; }
    const m = L.mods.find((x) => x.id === id); if (!m) return;
    let b: ArrayBuffer | null = null; try { b = await cert(id); } catch { t.show("The PDF tool did not load"); return; } if (!b) return;
    const fn = "Certificate_" + fb(P.v.name) + "_Module_" + m.n + ".pdf", txt = `${tk.by}, I passed the test “Module ${m.n}: ${m.t}” in Chefsheet with ${P.v.quiz[id].best}%. ${P.v.name}`;
    tk.sent = Date.now(); P.save();
    try { const f = new File([b], fn, { type: "application/pdf" }); const n: any = navigator; if (!window.ChefsheetApp && n.canShare && n.canShare({ files: [f] })) { await n.share({ files: [f], title: "Certificate", text: txt }); return; } } catch (e: any) { if (e?.name === "AbortError") return; }
    await save(fn, b); t.show("Certificate saved. Attach it to the message."); setTimeout(() => share("Certificate", txt + "\nThe certificate PDF is attached."), 900);
  }
</script>
<script lang="ts">
  // "Send to a cook": a chef shares a lesson or a test as a link with a due date. And the banner the cook sees.
  import Button from "./Button.svelte";
  import { LP, taskLink, taskDone, dueTxt } from "../core/learnProgress.svelte";
  import { shareText, toast } from "../core/ui.svelte";
  let { k, mode = "send" }: { k: string; mode?: "send" | "banner" } = $props();
  let open = $state(false), by = $state(LP.v.chef || LP.v.name || ""), days = $state(7);
  function send() {
    const n = by.trim(); if (!n) { toast.show("Add your name first"); return; }
    LP.v.chef = n; LP.save(); shareText("Chefsheet training", taskLink(k, n, days)); open = false;
  }
  const tk = $derived(LP.v.tasks[k]);
  const done = $derived.by(() => { void JSON.stringify(LP.v.done); void JSON.stringify(LP.v.quiz); return taskDone(k); });
</script>
{#if mode === "send"}
  {#if !open}<Button small icon="share" onclick={() => (open = true)}>Send to a cook</Button>
  {:else}
    <div class="af card pad">
      <b>Send to a cook</b>
      <p class="note">The cook opens the link, {k[0] === "q" ? "takes the test and sends you the certificate" : "reads the lesson and tells you when it is done"}. No account needed.</p>
      <div class="g2">
        <label class="tf"><span>Your name</span><input bind:value={by} placeholder="e.g. Chef Ivan" autocomplete="name" maxlength="60" /></label>
        <label class="tf"><span>Due</span><select bind:value={days}><option value={0}>No date</option><option value={1}>Tomorrow</option><option value={3}>In 3 days</option><option value={7}>In a week</option><option value={14}>In 2 weeks</option></select></label>
      </div>
      <div class="acts"><Button kind="pri" icon="share" onclick={send}>Share link</Button><Button onclick={() => (open = false)}>Cancel</Button></div>
    </div>
  {/if}
{:else if tk}
  <div class="ban"><span>From <b>{tk.by}</b>{tk.due ? " · due " + dueTxt(tk.due) : ""}</span>
    {#if done}<Button small kind="pri" icon="share" onclick={() => sendBack(k)}>{k[0] === "q" ? "Send certificate" : "Tell " + tk.by}</Button>{/if}</div>
{/if}
<style>
  .af { display: grid; gap: 12px; margin-top: 12px; }
  .ban { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; padding: 12px 16px; border-radius: var(--r-m); background: var(--accent-soft); color: var(--ink); margin-bottom: 14px; }
</style>
