<script lang="ts">
  // Suppliers: name and phone. In the order list, "By supplier" groups products and opens WhatsApp or Viber.
  import Icon from "../ui/Icon.svelte";
  import Button from "../ui/Button.svelte";
  import { sup } from "../core/kitchen.svelte";
  import { toast } from "../core/ui.svelte";
  let name = $state(""), phone = $state("");
  const s = sup.v;
  function add() {
    const n = name.trim(); if (!n) { toast.show("Add a supplier name"); return; }
    s.list.push({ id: "s" + Date.now().toString(36), name: n, phone: phone.trim() }); sup.save(); name = ""; phone = ""; toast.show("Supplier added");
  }
  function remove(id: string) {
    s.list = s.list.filter((x) => x.id !== id);
    for (const k of Object.keys(s.map)) if (s.map[k] === id) delete s.map[k];
    sup.save(); toast.show("Supplier deleted");
  }
  const linked = $derived(Object.keys(s.map).length);
</script>
<div class="page">
  <a class="back" href="#kitchen"><Icon name="back" size={16} />Kitchen</a>
  <div class="sub-h"><div><p class="eyebrow">Kitchen</p><h1>Suppliers</h1></div></div>
  <p class="note">Saved on this device. Write the phone in international format, e.g. +359 88 123 4567, so WhatsApp opens the right chat. Then in the order list switch to “By supplier” and pick a supplier for each product. The app remembers it for every next order.</p>
  <div class="group list">
    {#each s.list as x (x.id)}
      <div class="row"><input aria-label="Supplier name" bind:value={x.name} onchange={() => sup.save()} placeholder="Supplier name" /><input aria-label="Phone" type="tel" bind:value={x.phone} onchange={() => sup.save()} placeholder="Phone" />
        <button class="x" aria-label="Delete {x.name}" onclick={() => remove(x.id)}><Icon name="trash" size={18} /></button></div>
    {/each}
    <div class="row new"><input aria-label="New supplier" bind:value={name} placeholder="New supplier, e.g. Metro" maxlength="60" onkeydown={(e) => e.key === "Enter" && add()} /><input aria-label="New supplier phone" type="tel" bind:value={phone} placeholder="Phone (optional)" onkeydown={(e) => e.key === "Enter" && add()} />
      <button class="x add" aria-label="Add supplier" onclick={add}><Icon name="plus" size={18} /></button></div>
  </div>
  {#if s.list.length}<p class="note">{linked} product{linked === 1 ? " has" : "s have"} a supplier.</p>{/if}
  <div class="acts" style="margin-top:16px"><Button href="#kitchen" kind="pri" icon="kitchen">Back to the order</Button></div>
</div>
<style>
  .list { margin-top: 16px; }
  .row { display: grid; grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr) 40px; gap: 8px; padding: 10px 12px; align-items: center; }
  .row input { min-width: 0; border: 0; border-radius: var(--r-s); background: var(--sunk); padding: 10px 12px; font-size: 15px; outline: none; }
  .row input:focus { box-shadow: inset 0 0 0 2px var(--ink); background: var(--raised); }
  .x { width: 40px; height: 40px; border: 0; border-radius: 50%; background: transparent; color: var(--muted); display: grid; place-items: center; }
  .x.add { background: var(--pri); color: var(--pri-ink); }
  .note { margin-top: 10px; }
</style>
