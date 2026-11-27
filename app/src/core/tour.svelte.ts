// The welcome tour: shown once on the first start, and again from Settings.
import { Persisted, KEYS } from "./store.svelte";
const seen = new Persisted<number>(KEYS.tour, 0);
class Tour {
  on = $state(!seen.v);
  open() { this.on = true; }
  close() { this.on = false; seen.set(1); }
}
export const tour = new Tour();
