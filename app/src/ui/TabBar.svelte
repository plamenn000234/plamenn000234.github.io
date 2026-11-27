<script lang="ts">
  import Icon from "./Icon.svelte";
  import { router, type Tab } from "../core/router.svelte";
  import { ord } from "../core/kitchen.svelte";
  let { place = "bottom" }: { place?: "top" | "bottom" } = $props();
  const TABS: [Tab, string, string, string][] = [["today", "Today", "#today", "today"], ["tools", "Tools", "#tools", "calc"], ["kitchen", "Kitchen", "#kitchen", "kitchen"], ["recipes", "Recipes", "#recipes", "book"], ["learn", "Learn", "#learn", "cap"]];
</script>
<nav class="tabs {place}" aria-label="Main">
  {#each TABS as [id, label, href, icon]}
    <a {href} aria-current={router.route.tab === id ? "page" : undefined}><i class="pill"><Icon name={icon} size={22} /></i><span>{label}</span>{#if id === "kitchen" && ord.v.lines.length}<i class="badge">{ord.v.lines.length}</i>{/if}</a>
  {/each}
</nav>
<style>
  .tabs { position: fixed; z-index: 30; left: 12px; right: 12px; bottom: calc(10px + var(--sab)); display: grid; grid-template-columns: repeat(5, 1fr); height: var(--tabh); padding: 0 4px;
    border-radius: 24px; background: color-mix(in srgb, var(--surface) 82%, transparent); backdrop-filter: saturate(1.6) blur(20px); -webkit-backdrop-filter: saturate(1.6) blur(20px);
    box-shadow: var(--sh-3), inset 0 0 0 1px var(--hair); }
  a { position: relative; display: grid; justify-items: center; align-content: center; gap: 2px; color: var(--muted); font-size: 10.5px; font-weight: 500; letter-spacing: .02em; transition: color .2s; -webkit-user-select: none; user-select: none; }
  .pill { display: grid; place-items: center; width: 52px; height: 30px; border-radius: 999px; transition: background .25s var(--ease), transform .25s var(--spring); }
  a:active .pill { transform: scale(.9); }
  a[aria-current="page"] { color: var(--ink); font-weight: 700; }
  a[aria-current="page"] .pill { background: var(--sunk); }
  a[aria-current="page"] .pill :global(svg) { stroke-width: 1.9; }
  .badge { position: absolute; top: 6px; left: calc(50% + 12px); min-width: 17px; height: 17px; padding: 0 5px; border-radius: 999px; background: var(--accent); color: var(--accent-ink); font: 700 10.5px/17px var(--f-body); font-style: normal; box-shadow: 0 0 0 2px var(--surface); }
  .top { display: none; }
  @media (min-width: 981px) {
    .bottom { display: none; }
    .tabs.top { position: static; display: flex; height: auto; padding: 4px; gap: 2px; background: var(--sunk); backdrop-filter: none; box-shadow: none; border-radius: 999px; }
    .top a { display: flex; gap: 6px; padding: 7px 14px 7px 10px; border-radius: 999px; font-size: 13px; letter-spacing: 0; }
    .top .pill { width: auto; height: auto; background: none !important; }
    .top a[aria-current="page"] { background: var(--raised); box-shadow: var(--sh-1); }
    .top .badge { position: static; margin-left: 2px; box-shadow: none; }
  }
</style>
