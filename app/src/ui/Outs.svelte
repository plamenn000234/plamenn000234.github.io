<script lang="ts">
  // Results row of a tool: label over a big number.
  let { items }: { items: [string, string, string?][] } = $props();
</script>
<div class="outs" class:odd={items.length > 1 && items.length % 2 === 1}>
  {#each items as [l, v, u]}<div><small>{l}</small><b class="num">{v}<span>{u || ""}</span></b></div>{/each}
</div>
<style>
.outs { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1px; background: rgba(255, 245, 230, .1); border-radius: var(--r-m); overflow: hidden; box-shadow: var(--sh-2); }
  .outs div { background: var(--hero); color: var(--hero-ink); padding: 16px 18px 14px; display: grid; gap: 4px; }
  small { font-size: 11px; color: var(--hero-muted); letter-spacing: .08em; text-transform: uppercase; }
  b { font-family: var(--f-display); font-size: 30px; font-weight: 600; line-height: 1.1; font-variant-numeric: tabular-nums; }
  span { font-size: 15px; color: var(--hero-muted); font-weight: 500; margin-left: 3px; font-family: var(--f-body); }
  @media (max-width: 560px) { .odd div:last-child { grid-column: 1 / -1; } }
</style>
