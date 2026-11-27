<script lang="ts">
  import { toast } from "../core/ui.svelte";
</script>
{#if toast.msg}{#key toast.n}<div class="toast" role="status">{toast.msg}</div>{/key}{/if}
<style>
  .toast { position: fixed; z-index: 60; left: 50%; bottom: calc(var(--tabh) + var(--sab) + 70px); transform: translateX(-50%); max-width: calc(100% - 32px); padding: 10px 16px; border-radius: 3px;
    background: var(--ink); color: var(--bg); font-size: 14px; box-shadow: 0 6px 24px rgba(0,0,0,.18); animation: t .25s var(--ease); }
  @keyframes t { from { opacity: 0; transform: translate(-50%, 8px); } }
</style>
