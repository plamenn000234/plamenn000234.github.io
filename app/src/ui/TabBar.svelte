<script lang="ts">
  import Icon from "./Icon.svelte";
  import { router, type Tab } from "../core/router.svelte";
  import { ord } from "../core/kitchen.svelte";
  let { place = "bottom" }: { place?: "top" | "bottom" } = $props();
  const TABS: [Tab, string, string, string][] = [["today", "Today", "#today", "today"], ["tools", "Tools", "#tools", "tools"], ["kitchen", "Kitchen", "#kitchen", "tab-order"], ["recipes", "Recipes", "#recipes", "tab-recipes"], ["learn", "Learn", "#learn", "tab-learn"]];
</script>
<nav class="tabs {place}" aria-label="Main">
  {#each TABS as [id, label, href, icon]}
    <a {href} aria-current={router.route.tab === id ? "page" : undefined}><Icon name={icon} size={22} /><span>{label}</span>{#if id === "kitchen" && ord.v.lines.length}<i class="badge">{ord.v.lines.length}</i>{/if}</a>
  {/each}
</nav>
<style>
  .tabs { position: fixed; z-index: 30; left: 0; right: 0; bottom: 0; display: grid; grid-template-columns: repeat(5, 1fr); height: calc(var(--tabh) + var(--sab)); padding-bottom: var(--sab);
    background: color-mix(in srgb, var(--bg) 94%, transparent); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-top: 1px solid var(--line-2); }
  a { position: relative; display: grid; justify-items: center; align-content: center; gap: 3px; color: var(--muted); font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; font-weight: 500; transition: color .15s; }
  a[aria-current="page"] { color: var(--ink); font-weight: 700; }
  a[aria-current="page"]::before { content: ""; position: absolute; top: 0; left: 50%; width: 18px; height: 2px; background: var(--accent); transform: translateX(-50%); }
  .badge { position: absolute; top: 6px; left: calc(50% + 10px); min-width: 17px; height: 17px; padding: 0 4px; border-radius: 2px; background: var(--accent); color: var(--accent-ink); font: 700 10.5px/17px var(--f-body); letter-spacing: 0; font-style: normal; }
  .top { display: none; }
  @media (min-width: 981px) {
    .bottom { display: none; }
    .tabs.top { position: static; display: flex; height: auto; padding: 0; background: none; backdrop-filter: none; border: 0; gap: 4px; }
    a { display: flex; gap: 7px; padding: 10px 12px; font-size: 12px; }
    a[aria-current="page"]::before { top: auto; bottom: 0; width: calc(100% - 24px); }
    .badge { position: static; margin-left: 2px; }
  }
</style>
