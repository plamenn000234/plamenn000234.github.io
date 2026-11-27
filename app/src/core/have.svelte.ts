// "What can I cook": the products the cook picked. Kept for this visit only, so going to a recipe and back keeps them.
// The "Without" filter in Recipes keeps its products the same way.
function load(K: string): (number | string)[] { try { const a = JSON.parse(sessionStorage.getItem(K) || "[]"); return Array.isArray(a) ? a.filter((x) => typeof x === "number" || typeof x === "string") : []; } catch { return []; } }
class Pantry {
  v = $state<(number | string)[]>([]);
  constructor(private K: string) { this.v = load(K); }
  set(a: (number | string)[]) { this.v = a; try { sessionStorage.setItem(this.K, JSON.stringify(a)); } catch {} }
  add(i: number | string) { if (!this.v.includes(i)) this.set([...this.v, i]); }
  del(i: number | string) { this.set(this.v.filter((x) => x !== i)); }
}
export const pantry = new Pantry("cs3-have");
export const avoid = new Pantry("cs3-avoid");
