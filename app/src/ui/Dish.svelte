<script lang="ts">
  // Ink dish illustration on a paper disc.
  import { dishImg } from "../core/catalog";
  let { kind, size = 56 }: { kind: string; size?: number } = $props();
</script>
<span class="dish" style="width:{size}px;height:{size}px"><img src={dishImg(kind)} alt="" width={size} height={size} loading="lazy" decoding="async" /></span>
<style>
.dish { flex: none; display: grid; place-items: center; border-radius: 50%; background: var(--ill-bg); box-shadow: inset 0 0 0 1px var(--hair); }
  img { width: 86%; height: 86%; object-fit: contain; }
</style>
