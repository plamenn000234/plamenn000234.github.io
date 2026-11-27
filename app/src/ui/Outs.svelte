<script lang="ts">
  // Results row of a tool: label over a big number.
  let { items }: { items: [string, string, string?][] } = $props();
</script>
<div class="outs">
  {#each items as [l, v, u]}<div><small>{l}</small><b class="num">{v}<span>{u || ""}</span></b></div>{/each}
</div>
<style>
  .outs { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 1px; background: var(--line-2); border: 1px solid var(--line-2); border-radius: var(--r); overflow: hidden; }
  .outs div { background: var(--paper); padding: 12px 14px; display: grid; gap: 2px; }
  small { font-size: 11.5px; color: var(--muted); letter-spacing: .04em; }
  b { font-family: var(--f-display); font-size: 24px; font-weight: 600; line-height: 1.15; }
  span { font-size: 14px; color: var(--muted); font-weight: 500; margin-left: 2px; }
</style>
