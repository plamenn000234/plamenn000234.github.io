<script lang="ts">
  import type { Snippet } from "svelte";
  import Icon from "./Icon.svelte";
  let { kind = "line", icon, href, pressed, label, onclick, children, small = false, disabled = false, id }:
    { kind?: "pri" | "line" | "ghost"; icon?: string; href?: string; pressed?: boolean; label?: string; onclick?: (e: MouseEvent) => void; children?: Snippet; small?: boolean; disabled?: boolean; id?: string } = $props();
</script>
{#if href}
  <a class="btn {kind}" class:small {href} aria-label={label} {id}>{#if icon}<Icon name={icon} size={small ? 16 : 18} />{/if}{@render children?.()}</a>
{:else}
  <button class="btn {kind}" class:small class:on={pressed} aria-pressed={pressed} aria-label={label} {onclick} {disabled} {id}>{#if icon}<Icon name={icon} size={small ? 16 : 18} />{/if}{@render children?.()}</button>
{/if}
<style>
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 46px; padding: 0 18px; border-radius: 999px; border: 0;
    background: var(--surface); color: var(--ink); box-shadow: var(--sh-1), inset 0 0 0 1px var(--hair); font-size: 14.5px; font-weight: 500; letter-spacing: .01em; white-space: nowrap; text-decoration: none;
    transition: transform .18s var(--ease), background .2s, box-shadow .2s, color .2s; -webkit-user-select: none; user-select: none; }
  .btn:active { transform: scale(.96); }
  @media (hover: hover) { .btn:hover { box-shadow: var(--sh-2), inset 0 0 0 1px var(--hair); } }
  .btn.pri { background: var(--pri); color: var(--pri-ink); box-shadow: 0 6px 18px rgba(26, 25, 23, .22); }
  .btn.ghost { background: transparent; box-shadow: none; }
  .btn.on { color: var(--accent); background: var(--accent-soft); box-shadow: none; }
  .btn.on :global(path) { fill: currentColor; }
  .btn.small { min-height: 36px; padding: 0 14px; font-size: 13.5px; }
  .btn:disabled { opacity: .45; pointer-events: none; }
</style>
