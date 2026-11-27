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
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 40px; padding: 0 14px; border-radius: 3px; border: 1px solid var(--line);
    background: transparent; color: var(--ink); font-size: 14px; font-weight: 500; letter-spacing: .02em; white-space: nowrap; text-decoration: none; transition: background .15s, border-color .15s, transform .1s; }
  .btn:active { transform: scale(.98); }
  .btn:hover { border-color: var(--muted); }
  .btn.pri { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
  .btn.pri:hover { filter: brightness(1.05); }
  .btn.ghost { border-color: transparent; }
  .btn.on { border-color: var(--accent); color: var(--accent); background: var(--accent-soft); }
  .btn.small { min-height: 32px; padding: 0 10px; font-size: 13px; }
  .btn:disabled { opacity: .45; pointer-events: none; }
</style>
