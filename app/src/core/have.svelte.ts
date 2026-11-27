// "What can I cook": the products the cook picked. Kept for this visit only, so going to a recipe and back keeps them.
const K = "cs3-have";
function load(): (number | string)[] { try { const a = JSON.parse(sessionStorage.getItem(K) || "[]"); return Array.isArray(a) ? a.filter((x) => typeof x === "number" || typeof x === "string") : []; } catch { return []; } }
class Pantry {
  v = $state<(number | string)[]>(load());
  set(a: (number | string)[]) { this.v = a; try { sessionStorage.setItem(K, JSON.stringify(a)); } catch {} }
  add(i: number | string) { if (!this.v.includes(i)) this.set([...this.v, i]); }
  del(i: number | string) { this.set(this.v.filter((x) => x !== i)); }
}
export const pantry = new Pantry();
