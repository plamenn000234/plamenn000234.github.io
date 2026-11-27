<script lang="ts" module>
  import type { Component } from "svelte";
  type Loader = () => Promise<{ default: Component<any> }>;
  const done = new Map<Loader, Component<any>>();
</script>
<script lang="ts">
  // A screen that loads its code the first time it opens, so the app starts faster.
  let { load, ...rest }: { load: Loader; [k: string]: any } = $props();
  // svelte-ignore state_referenced_locally
  let C = $state<Component<any> | null>(done.get(load) || null), failed = $state(false);
  $effect(() => { const l = load; if (done.has(l)) { C = done.get(l)!; return; } l().then((m) => { done.set(l, m.default); C = m.default; }).catch(() => (failed = true)); });
</script>
{#if C}<C {...rest} />{:else if failed}<div class="page"><p class="note" style="margin-top:40px">Could not open this screen. Check your connection and try again.</p></div>{/if}
