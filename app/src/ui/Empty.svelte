<script lang="ts">
  import type { Snippet } from "svelte";
  import { ROOT } from "../core/catalog";
  let { art = "", title, children }: { art?: string; title: string; children?: Snippet } = $props();
</script>
<div class="empty">
  {#if art}<img src="{ROOT}img/empty/{art}.webp" alt="" width="140" height="140" />{/if}
  <b>{title}</b>
  <div class="tx">{@render children?.()}</div>
</div>
<style>
  .empty { text-align: center; padding: 28px 18px; display: grid; gap: 6px; justify-items: center; color: var(--muted); font-size: 14px; }
  img { width: 140px; height: 140px; object-fit: contain; }
  b { font-family: var(--f-display); font-size: 18px; color: var(--ink); font-weight: 600; }
  .tx { max-width: 420px; }
</style>
