<script lang="ts">
  // Ink icons from img/ui/*.png (masked, so they take the text colour), plus a few simple line glyphs.
  import { ROOT } from "../core/catalog";
  let { name, size = 20 }: { name: string; size?: number } = $props();
  const INK = new Set(["tab-recipes", "tab-learn", "tab-fav", "tab-order", "tab-orders", "tool-salt", "tool-yield", "tool-sousvide", "tool-price", "tool-timer", "tool-label", "tool-prep", "tool-allergen", "learn-quiz", "learn-cert", "learn-glossary", "learn-module"]);
  const P: Record<string, string> = {
    back: "M15 5l-7 7 7 7", fwd: "M9 5l7 7-7 7", close: "M6 6l12 12M18 6L6 18", plus: "M12 5v14M5 12h14", minus: "M5 12h14", check: "M5 12.5l4.5 4.5L19 7",
    search: "M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM15.5 15.5L20 20",
    star: "M12 4l2.4 5 5.4.7-4 3.8 1 5.4L12 16.3 7.2 18.9l1-5.4-4-3.8 5.4-.7z",
    timer: "M12 8v5l3 2M9 3h6M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", pause: "M9 6v12M15 6v12", play: "M8 5l11 7-11 7z",
    share: "M12 4v11M8 8l4-4 4 4M5 13v6h14v-6", copy: "M9 9h10v10H9zM5 15V5h10", pdf: "M7 3h7l4 4v14H7zM14 3v4h4",
    today: "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z",
    kitchen: "M5 10h14l-1 9H6zM8 10V8a4 4 0 0 1 8 0v2M3 10h18",
    tools: "M4 20l7-7M14 4a4 4 0 0 0-3 6.5L4 17.5M14 4l-2 3 2 2 3-2a4 4 0 0 1-6 4",
    theme: "M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z", more: "M5 12h.01M12 12h.01M19 12h.01", edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
    trash: "M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13", leaf: "M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19l7-7", flame: "M12 3c3 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 1 3 3 4 0-3-1-5 0-8z",
    wheat: "M12 21V7M12 7c-2-1-3-3-3-5 2 0 3 2 3 5zM12 7c2-1 3-3 3-5-2 0-3 2-3 5zM12 12c-2-1-4-2-4-5 2 0 4 2 4 5zM12 12c2-1 4-2 4-5-2 0-4 2-4 5zM12 17c-2-1-4-2-4-5 2 0 4 2 4 5zM12 17c2-1 4-2 4-5-2 0-4 2-4 5z",
    thermo: "M14 14.5V5a2 2 0 1 0-4 0v9.5a4 4 0 1 0 4 0zM12 10v7", buffet: "M3 18h18M5 18a7 7 0 0 1 14 0M12 8V6M10 6h4",
    cook: "M4 11h16M6 11v6a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-6M9 4c0 2 2 2 2 4M14 4c0 2 2 2 2 4",
  };
  const ink = $derived(INK.has(name));
</script>
{#if ink}
  <span class="ic ink" style="--u:url({ROOT}img/ui/{name}.png);width:{size}px;height:{size}px" aria-hidden="true"></span>
{:else}
  <svg class="ic" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d={P[name] || P.more} /></svg>
{/if}
<style>
  .ic { display: inline-block; flex: none; vertical-align: -0.2em; }
  svg.ic { fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
  .ink { background: currentColor; -webkit-mask: var(--u) center/contain no-repeat; mask: var(--u) center/contain no-repeat; }
</style>
