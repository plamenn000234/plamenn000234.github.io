// One door to everything saved on the device.
// 2.x and 3.0 run on the same site and share these bb-* keys, so every change here must stay readable by 2.x:
// add fields, never rename or remove them.
export const KEYS = {
  theme: "bb-theme", favs: "bb-favs", recent: "bb-recent", order: "bb-order", saved: "bb-saved", menus: "bb-menus",
  mine: "bb-mine", prices: "bb-prices", cur: "bb-cur", sup: "bb-sup", learn: "bb-learn", toolfav: "bb-toolfav",
  schema: "bb-schema", tools: "bb-tools3",
} as const;
export type Key = (typeof KEYS)[keyof typeof KEYS];

export function read<T>(k: Key, d: T): T {
  try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v == null ? d : v; } catch { return d; }
}
export function write(k: Key, v: unknown) {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
}

/** A saved value that the UI can read reactively. Changes, also nested ones, are written back on their own. */
export class Persisted<T> {
  v = $state() as T;
  private last = "";
  constructor(public k: Key, d: T) {
    this.v = read(k, d);
    this.last = JSON.stringify(this.v);
    $effect.root(() => { $effect(() => { const s = JSON.stringify(this.v); if (s !== this.last) { this.last = s; write(this.k, JSON.parse(s)); } }); });
  }
  set(v: T) { this.v = v; this.save(); }
  save() { this.last = JSON.stringify(this.v); write(this.k, JSON.parse(this.last)); }
  reload(d: T) { this.v = read(this.k, d); this.last = JSON.stringify(this.v); }
}

/* ---------- schema versions and migrations ---------- */
export const SCHEMA = 1;
type Rec = { id?: string; updatedAt?: number; up?: number; deleted?: boolean };
const MIGRATIONS: Array<() => void> = [
  // 0 → 1: every list record gets an id and updatedAt, so it can sync with the server later.
  () => {
    const now = Date.now();
    for (const k of [KEYS.saved, KEYS.menus, KEYS.mine] as Key[]) {
      const a = read<Rec[]>(k, []);
      if (!Array.isArray(a)) continue;
      let changed = false;
      a.forEach((x, i) => {
        if (!x || typeof x !== "object") return;
        if (!x.id) { x.id = "x" + now.toString(36) + i; changed = true; }
        if (!x.updatedAt) { x.updatedAt = x.up || now; changed = true; }
      });
      if (changed) write(k, a);
    }
  },
];
export function migrate() {
  let v = read<number>(KEYS.schema, 0);
  if (typeof v !== "number" || v < 0) v = 0;
  for (; v < SCHEMA; v++) {
    try { MIGRATIONS[v](); } catch (e) { console.warn("migration", v, e); break; }
    write(KEYS.schema, v + 1);
  }
  return read<number>(KEYS.schema, 0);
}

/** Everything in one file, for the "Back up everything" button. */
export function backup() {
  const o: Record<string, unknown> = { app: "chefsheet", v: 3, at: new Date().toISOString(), data: {} };
  for (const k of Object.values(KEYS)) { const raw = localStorage.getItem(k); if (raw != null) (o.data as any)[k] = JSON.parse(raw); }
  return o;
}
export function restore(o: any) {
  if (!o || o.app !== "chefsheet" || typeof o.data !== "object") throw new Error("Not a Chefsheet backup");
  const allowed = new Set<string>(Object.values(KEYS));
  let n = 0;
  for (const [k, v] of Object.entries(o.data)) if (allowed.has(k)) { write(k as Key, v); n++; }
  return n;
}
