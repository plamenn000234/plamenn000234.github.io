<script lang="ts">
  import Icon from "./Icon.svelte";
  import type { ToolDef } from "../tools/registry.svelte";
  let { t, compact = false }: { t: ToolDef; compact?: boolean } = $props();
</script>
<a class="tile" class:compact href="#tool-{t.id}">
  <span class="ic"><Icon name={t.icon} size={compact ? 24 : 30} /></span>
  <span><b>{t.name}</b>{#if !compact}<small>{t.desc}</small>{/if}</span>
</a>
<style>
.tile { display: grid; align-content: space-between; gap: 18px; padding: 16px; min-height: 148px; background: var(--surface); border-radius: var(--r); box-shadow: var(--sh-1); color: var(--ink);
    transition: transform .2s var(--ease), box-shadow .25s var(--ease); }
  @media (hover: hover) { .tile:hover { box-shadow: var(--sh-2); transform: translateY(-2px); } }
  .tile:active { transform: scale(.97); }
  .tile.compact { min-height: 112px; gap: 14px; }
  .ic { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 14px; background: var(--sunk); color: var(--ink); }
  .compact .ic { width: 42px; height: 42px; border-radius: 12px; }
  b { font: 600 16px/1.25 var(--f-display); letter-spacing: .01em; display: block; }
  small { display: block; margin-top: 3px; font-size: 12.5px; color: var(--muted); line-height: 1.4; }
</style>
