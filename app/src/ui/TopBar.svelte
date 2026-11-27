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
    <button class="sbtn" onclick={onsearch} aria-label="Search tools, recipes, lessons"><Icon name="search" size={18} /><span>Search</span></button>
    <button class="ib" onclick={() => toast.show("Theme: " + nextTheme())} aria-label="Change theme"><Icon name="theme" size={18} /></button>
  </div>
</header>
<style>
  .top { position: sticky; top: 0; z-index: 20; padding-top: var(--sat); background: color-mix(in srgb, var(--bg) 80%, transparent); backdrop-filter: saturate(1.6) blur(20px); -webkit-backdrop-filter: saturate(1.6) blur(20px); box-shadow: 0 1px 0 var(--hair); }
  .in { max-width: var(--maxw); margin: 0 auto; padding: 10px var(--gap); display: flex; align-items: center; gap: 12px; }
  .logo { display: flex; align-items: center; gap: 8px; color: var(--ink); flex: none; }
  .logo i { width: 10px; height: 10px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 4px var(--accent-soft); }
  .logo b { font: 600 20px var(--f-display); letter-spacing: .03em; }
  .logo small { font-size: 9px; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); border: 1px solid var(--line); border-radius: 999px; padding: 2px 7px; }
  .nav { display: none; }
  .sbtn { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; height: 40px; border: 0; border-radius: 999px; background: var(--sunk); color: var(--muted); padding: 0 14px; font-size: 14px; text-align: left; transition: box-shadow .2s; }
  .sbtn:active { box-shadow: inset 0 0 0 2px var(--ink); }
  .sbtn span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ib { width: 40px; height: 40px; border-radius: 50%; border: 0; background: var(--sunk); color: var(--ink); display: grid; place-items: center; flex: none; transition: transform .15s var(--ease); }
  .ib:active { transform: scale(.9); }
  @media (max-width: 520px) { .logo small { display: none; } }
  @media (min-width: 981px) { .nav { display: block; } .sbtn { max-width: 280px; margin-left: auto; } }
</style>
