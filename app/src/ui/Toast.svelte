<script lang="ts">
  import { toast } from "../core/ui.svelte";
</script>
{#if toast.msg}{#key toast.n}<div class="toast" role="status">{toast.msg}</div>{/key}{/if}
<style>
  .toast { position: fixed; z-index: 60; left: 50%; bottom: calc(var(--tabh) + var(--sab) + 84px); transform: translateX(-50%); max-width: calc(100% - 32px); padding: 12px 20px; border-radius: 999px;
    background: var(--hero); color: var(--hero-ink); font-size: 14px; font-weight: 500; box-shadow: var(--sh-3); animation: t .25s var(--ease); }
  @keyframes t { from { opacity: 0; transform: translate(-50%, 8px); } }
</style>
