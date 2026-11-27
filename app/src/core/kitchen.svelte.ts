// The cook's working data: favourites, recent, the current order, prices, pinned tools.
import { Persisted, KEYS, read, write } from "./store.svelte";
import { D, byId, type Recipe } from "./catalog";
import { CURS, ALG } from "./constants";
import { roundQty, fmtQ } from "./util";

export interface Line { id: string; pax: number | null | ""; mode: "buffet" | "plated"; gpg: number | null; pre: string | null; k: number }
export interface Order { name: string; date: string; pax: number; reserve: number; lines: Line[]; sid: string | null }
export const blankOrder = (): Order => ({ name: "", date: "", pax: 50, reserve: 10, lines: [], sid: null });

export const favs = new Persisted<string[]>(KEYS.favs, []);
export const recent = new Persisted<string[]>(KEYS.recent, []);
export const ord = new Persisted<Order>(KEYS.order, blankOrder());
export const prices = new Persisted<Record<string, number>>(KEYS.prices, {});
export const cur = new Persisted<string>(KEYS.cur, "EUR");
export const toolFavs = new Persisted<string[]>(KEYS.toolfav, []);
if (!ord.v || !Array.isArray(ord.v.lines)) ord.set(blankOrder());

export const curSym = () => (CURS.find((c) => c[0] === cur.v) || CURS[0])[1];
export const money = (v: number) => curSym() + " " + (Math.round(v * 100) / 100).toFixed(2);

export function toggleFav(id: string) {
  favs.set(favs.v.includes(id) ? favs.v.filter((x) => x !== id) : [id, ...favs.v]);
  return favs.v.includes(id);
}
export function seen(id: string) { recent.set([id, ...recent.v.filter((x) => x !== id)].slice(0, 12)); }
export function toggleTool(id: string) {
  toolFavs.set(toolFavs.v.includes(id) ? toolFavs.v.filter((x) => x !== id) : [...toolFavs.v, id]);
  return toolFavs.v.includes(id);
}

/* ---------- cost ---------- */
export function priceOf(pi: number) { const v = prices.v[D.products[pi][0]]; return typeof v === "number" && v > 0 ? v : null; }
export function recipeCost(r: Recipe) {
  let sum = 0, n = 0;
  for (const [pi, g] of r.lines) { const pr = D.products[pi], pv = priceOf(pi); if (pv != null) { sum += (g * pr[3]) / pr[4] * pv; n++; } }
  return { sum, n, of: r.lines.length };
}

/* ---------- order ---------- */
export function course(r: Recipe): [string, number] {
  const f = D.folders[r.f][0], s = (r.sub || "").toLowerCase(), n = r.name.toLowerCase();
  if (f === "Soups" || /soup/.test(s) || /\bsoup\b|chorba|broth|velout|shorba/.test(n)) return ["Soup", 100];
  if (/pasta|spaghetti|penne|tagliatelle|lasagne|risotto|gnocchi/.test(s + " " + n)) return ["Pasta", 50];
  if (f === "Salads" || f === "Starters" || /cold|salad|starter|mezze|antipast/.test(s)) return ["Cold", 50];
  if (f === "Sides" || /garnish|side/.test(s)) return ["Garnish", 50];
  return ["Main", 90];
}
export const inOrder = (id: string) => ord.v.lines.some((l) => l.id === id);
export function addLine(id: string) {
  const r = byId.get(id); if (!r) return false;
  if (inOrder(id)) { ord.v.lines = ord.v.lines.filter((l) => l.id !== id); ord.save(); return false; }
  const c = course(r), buf = !!r.pg && (r.pu === "g" || !r.pu);
  ord.v.lines.push({ id, pax: null, mode: buf ? "buffet" : "plated", gpg: buf ? c[1] : null, pre: buf ? c[0] : null, k: 1 });
  ord.save(); return true;
}
export const linePax = (l: Line) => (l.pax === null || l.pax === "" || isNaN(l.pax as number) ? Number(ord.v.pax) || 0 : Number(l.pax));
export function portions(l: Line) {
  const r = byId.get(l.id); if (!r) return 0;
  let p = linePax(l);
  if (l.mode === "buffet") { p *= Number(l.k) || 1; if (l.gpg && r.pg) p *= Number(l.gpg) / r.pg; }
  return p * (1 + (Number(ord.v.reserve) || 0) / 100);
}
export interface Item { name: string; sec: number; unit: string; note: string; q: number; cost?: number }
export function compute() {
  const acc = new Map<string, Item>(), algs = new Set<number>();
  for (const l of ord.v.lines) {
    const r = byId.get(l.id); if (!r) continue;
    const p = portions(l); r.algs.forEach((a) => algs.add(a));
    for (const [pi, g] of r.lines) {
      const pr = D.products[pi], k = pr[0] + "|" + pr[2], q = (g * p * pr[3]) / pr[4];
      const e = acc.get(k) || { name: pr[0], sec: pr[1], unit: pr[2], note: pr[5], q: 0 }; e.q += q; acc.set(k, e);
    }
  }
  const secs: Item[][] = D.sections.map(() => []);
  for (const e of acc.values()) { const q = roundQty(e.q, e.unit); if (q > 0) secs[e.sec].push({ ...e, q }); }
  secs.forEach((s) => s.sort((a, b) => a.name.localeCompare(b.name)));
  const miss = ord.v.lines.map((l) => byId.get(l.id)).filter((r) => r && !r.lines.length).map((r) => r!.name);
  const cost = { sum: 0, n: 0 };
  for (const s of secs) for (const it of s) { const pv = prices.v[it.name]; if (typeof pv === "number" && pv > 0) { it.cost = it.q * pv; cost.sum += it.cost; cost.n++; } }
  return { secs, algs: [...algs].sort((a, b) => a - b), count: secs.reduce((a, s) => a + s.length, 0), miss, cost };
}
export interface Saved { id: string; kind?: string; name: string; date?: string; pax: number; reserve: number; lines: Line[]; updatedAt: number; deleted?: boolean }
export const savedOrders = () => read<Saved[]>(KEYS.saved, []).filter((x) => x && Array.isArray(x.lines) && !x.deleted);
export const savedMenus = () => read<Saved[]>(KEYS.menus, []).filter((x) => x && Array.isArray(x.lines) && !x.deleted);
export function saveOrder() {
  if (!ord.v.lines.length) return null;
  const o = ord.v, s = read<Saved[]>(KEYS.saved, []);
  if (!o.sid) o.sid = "l" + Date.now().toString(36);
  const rec: Saved = { kind: "order", id: o.sid, name: o.name || "Untitled order", date: o.date || "", pax: Number(o.pax) || 0, reserve: Number(o.reserve) || 0,
    lines: o.lines.map((l) => ({ id: l.id, pax: l.pax, mode: l.mode, gpg: l.gpg, pre: l.pre || null, k: Number(l.k) || 1 })), updatedAt: Date.now() };
  const i = s.findIndex((x) => x.id === o.sid); if (i >= 0) s[i] = rec; else s.unshift(rec);
  write(KEYS.saved, s); ord.save(); return rec;
}
export function openSaved(id: string, menu = false) {
  const o = (menu ? savedMenus() : savedOrders()).find((x) => x.id === id); if (!o) return false;
  ord.set({ name: o.name || "", date: menu ? "" : o.date || "", pax: o.pax || (menu ? ord.v.pax : 0), reserve: o.reserve ?? 10,
    lines: (o.lines || []).filter((l) => byId.has(l.id)).map((l) => ({ ...l })), sid: menu ? null : id });
  return true;
}
export function orderText(c = compute()) {
  const o = ord.v;
  let t = `ORDER LIST${o.name ? " · " + o.name : ""}\n${o.date || "no date"} · ${o.pax} guests · reserve ${o.reserve}%\n`;
  c.secs.forEach((s, i) => { if (!s.length) return; t += `\n${D.sections[i].toUpperCase()}\n`; s.forEach((it) => (t += `${it.name} — ${fmtQ(it.q)} ${it.unit}\n`)); });
  t += `\nDishes:\n` + o.lines.map((l) => { const r = byId.get(l.id); return r ? `- ${r.name} (${Math.round(portions(l) * 10) / 10} portions)` : ""; }).join("\n");
  if (c.algs.length) t += `\nAllergens: ${c.algs.map((a) => a + " " + ALG[a]).join(", ")}`;
  if (c.miss.length) t += `\nNot counted (no product data yet): ${c.miss.join(", ")}`;
  if (c.cost.n) t += `\nFood cost: ${money(c.cost.sum)}${c.cost.n < c.count ? ` (prices for ${c.cost.n} of ${c.count} products)` : ""}`;
  return t;
}
