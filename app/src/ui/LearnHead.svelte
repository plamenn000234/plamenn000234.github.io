<script lang="ts">
  // Dark header card for module, lesson, test and review screens.
  import type { Snippet } from "svelte";
  let { crumb, title, stats = [], children }: { crumb: string; title: string; stats?: [string, string | number][]; children?: Snippet } = $props();
</script>
<header class="lh">
  <p class="eyebrow">{crumb}</p>
  <h1>{title}</h1>
  {#if stats.length}<dl>{#each stats as [k, v]}<div><dt>{k}</dt><dd class="num">{v}</dd></div>{/each}</dl>{/if}
  {#if children}<div class="la">{@render children()}</div>{/if}
</header>
<style>
  .lh { position: relative; overflow: hidden; display: grid; gap: 10px; padding: 22px 22px 20px; border-radius: 24px; background: var(--hero); color: var(--hero-ink); box-shadow: var(--sh-3); }
  .lh::after { content: ""; position: absolute; left: 0; right: 0; top: 0; height: 3px; background: var(--accent); }
  .eyebrow { color: var(--hero-muted); }
  h1 { font-size: 28px; color: var(--hero-ink); }
  dl { display: flex; flex-wrap: wrap; gap: 24px; margin: 6px 0 0; }
  dt { font-size: 12px; color: var(--hero-muted); } dd { margin: 2px 0 0; font: 700 20px var(--f-display); }
  .la { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 6px; }
  .la :global(.btn:not(.pri)) { background: transparent; color: var(--hero-ink); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .25); }
  .la :global(.btn.pri) { background: var(--hero-ink); color: var(--hero); box-shadow: none; }
</style>
