<script lang="ts">
  // Line icons on a 24 px grid, 1.6 stroke, so every glyph has the same weight.
  import { ROOT } from "../core/catalog";
  let { name, size = 20 }: { name: string; size?: number } = $props();
  const INK = new Set<string>();
  const P: Record<string, string> = {
    back: "M15 5l-7 7 7 7", fwd: "M9 5l7 7-7 7", close: "M6 6l12 12M18 6L6 18", plus: "M12 5v14M5 12h14", minus: "M5 12h14", check: "M5 12.5l4.5 4.5L19 7",
    search: "M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13zM15.5 15.5L20 20",
    star: "M12 4l2.4 5 5.4.7-4 3.8 1 5.4L12 16.3 7.2 18.9l1-5.4-4-3.8 5.4-.7z",
    timer: "M12 8v5l3 2M9 3h6M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", pause: "M9 6v12M15 6v12", play: "M8 5l11 7-11 7z",
    share: "M12 4v11M8 8l4-4 4 4M5 13v6h14v-6", copy: "M9 9h10v10H9zM5 15V5h10", pdf: "M7 3h7l4 4v14H7zM14 3v4h4",
    today: "M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8z",
    kitchen: "M4 10h16v5.5A4.5 4.5 0 0 1 15.5 20h-7A4.5 4.5 0 0 1 4 15.5zM2 10h20M9.5 7c0-1.2 1-1.6 1-3M14 7c0-1.2 1-1.6 1-3",
    calc: "M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.5 7h7v3h-7zM8.5 14h.01M12 14h.01M15.5 14h.01M8.5 17.5h.01M12 17.5h.01M15.5 17.5h.01",
    book: "M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2zM12 6.5v13",
    cap: "M2.5 9L12 4.5 21.5 9 12 13.5zM6.5 11v4.5c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3V11M21.5 9v5.5",
    tools: "M4 20l7-7M14 4a4 4 0 0 0-3 6.5L4 17.5M14 4l-2 3 2 2 3-2a4 4 0 0 1-6 4",
    gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
    theme: "M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9z", more: "M5 12h.01M12 12h.01M19 12h.01", edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
    trash: "M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13", leaf: "M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19l7-7", flame: "M12 3c3 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 1 3 3 4 0-3-1-5 0-8z",
    wheat: "M12 21V7M12 7c-2-1-3-3-3-5 2 0 3 2 3 5zM12 7c2-1 3-3 3-5-2 0-3 2-3 5zM12 12c-2-1-4-2-4-5 2 0 4 2 4 5zM12 12c2-1 4-2 4-5-2 0-4 2-4 5zM12 17c-2-1-4-2-4-5 2 0 4 2 4 5zM12 17c2-1 4-2 4-5-2 0-4 2-4 5z",
    thermo: "M14 14.5V5a2 2 0 1 0-4 0v9.5a4 4 0 1 0 4 0zM12 10v7", buffet: "M3 18h18M5 18a7 7 0 0 1 14 0M12 8V6M10 6h4",
    "tool-yield": "M4 19h16M6 19l1.5-9h9L18 19M9 10V7a3 3 0 0 1 6 0v3", "tool-salt": "M8 9h8l-1 11H9zM9 9l1-5h4l1 5M11 6.5h.01M13 6.5h.01",
    "tool-sousvide": "M5 4h14v16H5zM5 9h14M9 13c1 1 2 1 3 0s2-1 3 0M9 16.5c1 1 2 1 3 0s2-1 3 0", "tool-price": "M4 12V4h8l8 8-8 8zM8.5 8.5h.01",
    "tool-prep": "M8 4h8v3H8zM6 5.5H5v15h14v-15h-1M8.5 11h7M8.5 14.5h7M8.5 18h4", "tool-timer": "M12 8v5l3 2M9 3h6M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z",
    "stock": "M3 8l9-4 9 4v10l-9 4-9-4zM3 8l9 4 9-4M12 12v10M7.5 6l9 4",
    "tool-menu": "M4 4v16h16M8 16v-4M12 16V8M16 16v-6M20 16V6",
    "tool-gel": "M5 20h14l-1.5-8h-11zM6.5 12c0-3.5 2.5-6 5.5-6s5.5 2.5 5.5 6M12 6V3.5M10 15.5h.01M14 16.5h.01",
    "tool-label": "M4 12V4h8l8 8-8 8zM8.5 8.5h.01", "tool-allergen": "M12 3l8 4v5c0 4.5-3.5 8-8 9-4.5-1-8-4.5-8-9V7zM9 12l2 2 4-4",
    "learn-quiz": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01",
    "learn-cert": "M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.5 13.5L7 21l5-2.5 5 2.5-1.5-7.5", "learn-glossary": "M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11M9 8h6",
    "learn-module": "M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2zM12 6.5v13",
    "tab-recipes": "M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2zM12 6.5v13", "tab-learn": "M2.5 9L12 4.5 21.5 9 12 13.5zM6.5 11v4.5c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3V11M21.5 9v5.5",
    "tab-fav": "M12 4l2.4 5 5.4.7-4 3.8 1 5.4L12 16.3 7.2 18.9l1-5.4-4-3.8 5.4-.7z", "tab-order": "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3", "tab-orders": "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3",
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
