<script lang="ts">
  import Icon from "./Icon.svelte";
  import type { ToolDef } from "../tools/registry.svelte";
  let { t, compact = false }: { t: ToolDef; compact?: boolean } = $props();
</script>
<a class="tile" class:compact href="#tool-{t.id}">
  <span class="ic"><Icon name={t.icon} size={compact ? 24 : 30} /></span>
  <b>{t.name}</b>
  {#if !compact}<small>{t.desc}</small>{/if}
</a>
<style>
  .tile { display: grid; align-content: start; gap: 6px; padding: 14px; min-height: 128px; background: var(--surface); border: 1px solid var(--line-2); border-radius: var(--r); color: var(--ink); transition: border-color .15s, transform .15s; }
  .tile:hover { border-color: var(--line); }
  .tile:active { transform: scale(.98); }
  .tile.compact { min-height: 0; padding: 12px; }
  .ic { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 50%; background: var(--sunk); color: var(--ink); margin-bottom: 4px; }
  .compact .ic { width: 38px; height: 38px; }
  b { font: 600 15px/1.25 var(--f-display); letter-spacing: .02em; }
  small { font-size: 12.5px; color: var(--muted); line-height: 1.35; }
</style>
