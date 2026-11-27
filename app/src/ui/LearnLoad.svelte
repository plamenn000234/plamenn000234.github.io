<script lang="ts">
  // Loads learn.json once, then shows the screen.
  import type { Snippet } from "svelte";
  import { LD, loadLearn } from "../core/learn";
  let { children }: { children: Snippet } = $props();
  let ready = $state(LD.ready), err = $state(false);
  $effect(() => { if (!LD.ready) loadLearn().then(() => (ready = true)).catch(() => (err = true)); });
</script>
{#if err}<div class="empty"><b>Lessons did not load</b><p class="note">Check your connection and open Learn again.</p></div>
{:else if !ready}<p class="note" style="margin-top:24px">Loading lessons…</p>
{:else}{@render children()}{/if}
