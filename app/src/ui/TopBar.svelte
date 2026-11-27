<script lang="ts">
  import Icon from "./Icon.svelte";
  import TabBar from "./TabBar.svelte";
  import { nextTheme, toast } from "../core/ui.svelte";
  let { onsearch }: { onsearch: () => void } = $props();
</script>
<header class="top">
  <div class="in">
    <a class="logo" href="#today"><i></i><b>Chefsheet</b><small>3.0 alpha</small></a>
    <div class="nav"><TabBar place="top" /></div>
    <button class="sbtn" onclick={onsearch} aria-label="Search tools, recipes, lessons"><Icon name="search" size={18} /><span>Search tools, recipes, lessons</span></button>
    <button class="ib" onclick={() => toast.show("Theme: " + nextTheme())} aria-label="Change theme"><Icon name="theme" size={18} /></button>
  </div>
</header>
<style>
  .top { position: sticky; top: 0; z-index: 20; padding-top: var(--sat); background: color-mix(in srgb, var(--bg) 92%, transparent); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-bottom: 1px solid var(--line-2); }
  .in { max-width: var(--maxw); margin: 0 auto; padding: 8px var(--gap); display: flex; align-items: center; gap: 10px; }
  .logo { display: flex; align-items: baseline; gap: 7px; color: var(--ink); flex: none; }
  .logo i { width: 11px; height: 11px; border-radius: 50%; background: var(--accent); align-self: center; }
  .logo b { font: 600 19px var(--f-display); letter-spacing: .04em; }
  .logo small { font-size: 9.5px; letter-spacing: .16em; text-transform: uppercase; color: var(--accent); }
  .nav { display: none; }
  .sbtn { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; height: 38px; border: 0; border-bottom: 1px solid var(--muted); background: transparent; color: var(--muted); padding: 0 2px; font-size: 13.5px; text-align: left; }
  .sbtn span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ib { width: 38px; height: 38px; border-radius: 50%; border: 1px solid var(--line); background: transparent; display: grid; place-items: center; flex: none; }
  @media (min-width: 981px) { .nav { display: block; } .sbtn { max-width: 300px; margin-left: auto; } }
</style>
