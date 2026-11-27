<script lang="ts">
  import Icon from "./Icon.svelte";
  import { timers } from "../core/ui.svelte";
  import { fmtT } from "../core/util";
</script>
{#if timers.list.length}
  <div class="tbar" role="status">
    {#each timers.list as t (t.id)}
      <div class="t" class:fired={t.fired} class:paused={!t.run && !t.fired}>
        <Icon name="timer" size={18} />
        <span class="tx"><b class="num">{fmtT(t.left)}</b><small>{t.label}{t.ctx ? " · " + t.ctx : ""}</small></span>
        {#if !t.fired}<button onclick={() => timers.pause(t.id)} aria-label={t.run ? "Pause" : "Resume"}><Icon name={t.run ? "pause" : "play"} size={16} /></button>{/if}
        <button onclick={() => timers.remove(t.id)} aria-label={t.fired ? "Dismiss" : "Cancel timer"}><Icon name="close" size={16} /></button>
      </div>
    {/each}
  </div>
{/if}
<style>
  .tbar { position: fixed; z-index: 25; left: 12px; right: 12px; bottom: calc(var(--tabh) + var(--sab) + 20px); display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; }
  .t { flex: none; display: flex; align-items: center; gap: 8px; padding: 6px 6px 6px 14px; background: var(--hero); color: var(--hero-ink); border-radius: 999px; box-shadow: var(--sh-3); min-width: 200px; max-width: 280px; animation: up .25s var(--ease); }
  .t.fired { background: var(--accent); color: var(--accent-ink); animation: pulse 1s infinite; }
  .t.paused { opacity: .75; }
  .tx { flex: 1; min-width: 0; display: grid; line-height: 1.2; }
  b { font: 600 18px var(--f-display); }
  small { font-size: 11.5px; opacity: .8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  button { width: 34px; height: 34px; border: 0; border-radius: 50%; background: transparent; color: inherit; display: grid; place-items: center; }
  @keyframes up { from { transform: translateY(10px); opacity: 0; } }
  @keyframes pulse { 50% { filter: brightness(1.15); } }
  @media (min-width: 981px) { .tbar { left: auto; right: 20px; bottom: 20px; flex-direction: column; } }
</style>
