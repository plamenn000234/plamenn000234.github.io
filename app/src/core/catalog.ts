// The recipe library: index.json, the per-collection r/*.json files, and the cook's own recipes (bb-mine).
// Logic ported from the 2.x app so numbers stay identical.
import { fold, key, splitName } from "./util";
import { read, write, KEYS } from "./store.svelte";

export const ROOT = new URL("../", location.href.replace(/[#?].*$/, "").replace(/[^/]*$/, "")).href; // site root, one level above /v3/
export type Product = [name: string, sec: number, unit: string, k: number, per: number, note: string];
export interface Recipe {
  id: string; name: string; t: string; s: string; f: number; sub: string; N: number; pg: number; pu: string;
  algs: number[]; kcal: number; also: number[]; lines: [number, number][]; diet: number;
  hay: string; tl: string; ty: [number, string]; tg: [course: number, main: number, cuisine: number];
  mine?: boolean; semi?: boolean; y?: number; semis?: [string, number][];
}
export interface Detail { yl?: string; c: [string, string[], [string, number | string][], string[]][]; st?: string; al?: string; nu?: { p?: number[]; h?: number[] } | null }
export interface Mine { id: string; name: string; N: number; pg?: number; kcal?: number; diet?: number; algs: number[]; ing: [string, number | string][]; steps: string[]; st?: string; semi?: boolean; y?: number; up?: number; updatedAt?: number; from?: string }

export const MINE_SLUG = "__mine", OTHER_SEC = "Other (my products)";
export const D = { v: "", sections: [] as string[], folders: [] as [string, string][], products: [] as Product[] };
export let R: Recipe[] = [];
export const byId = new Map<string, Recipe>();
export let folderCount: number[] = [];
export const courseCount = (c: number) => R.reduce((n, r) => n + (r.tg[0] === c ? 1 : 0), 0);
let prodHay: string[] = [];
let MINE_F = -1;
let mine: Mine[] = [];
const userProd = new Map<string, number>();
let PNAME: Map<string, number> | null = null;
let SEMI = new Map<string, Mine>();
const cache = new Map<string, Promise<Record<string, Detail>>>();

export const mineFolder = () => MINE_F;
export const mineList = () => mine;

export async function load() {
  const res = await fetch(ROOT + "index.json");
  if (!res.ok) throw new Error("index.json " + res.status);
  const j = await res.json();
  D.v = j.v; D.sections = j.sections; D.folders = j.folders; D.products = j.products;
  folderCount = D.folders.map(() => 0);
  prodHay = D.products.map((p) => fold(p[0]));
  R = j.r.map((a: any[]) => {
    const [t, s] = splitName(a[1]);
    const o: Recipe = { id: a[0], name: a[1], t, s, f: a[2], sub: a[3], N: a[4] || 1, pg: a[5], pu: a[6], algs: a[7], kcal: a[8], also: a[9], lines: a[10], diet: a[11], hay: "", tl: "", ty: [0, ""], tg: a[12] || [-1, -1, -1] };
    o.hay = fold(a[1] + " " + a[3] + " " + D.folders[a[2]][0]); o.tl = fold(t);
    folderCount[a[2]]++; o.also.forEach((x) => folderCount[x]++); o.ty = dishType(o);
    byId.set(o.id, o); return o;
  });
  MINE_F = D.folders.findIndex((f) => f[0] === "My recipes");
  if (MINE_F < 0) { D.folders.push(["My recipes", MINE_SLUG]); MINE_F = D.folders.length - 1; folderCount.push(0); }
  if (!D.sections.includes(OTHER_SEC)) D.sections.push(OTHER_SEC);
  mineSync();
}

export function prodIndex(name: string) {
  if (!PNAME) { PNAME = new Map(); D.products.forEach((p, i) => { const k = fold(p[0]); if (!PNAME!.has(k)) PNAME!.set(k, i); }); }
  const f = key(name); if (!f) return -1;
  for (const v of [f, f.replace(/\s*\([^)]*\)/g, "").trim(), f.split(",")[0].trim()]) if (PNAME.has(v)) return PNAME.get(v)!;
  if (userProd.has(f)) return userProd.get(f)!;
  D.products.push([name.trim(), D.sections.indexOf(OTHER_SEC), "kg", 1, 1000, "My product"]); prodHay.push(f);
  const i = D.products.length - 1; userProd.set(f, i); PNAME.set(f, i); return i;
}

/* ---------- own recipes and semi-finished products ---------- */
export function semiYield(u: Mine) { if (Number(u.y) > 0) return Number(u.y); let t = 0; for (const [, q] of u.ing) if (typeof q === "number" && q > 0) t += q; return t; }
function semiOf(n: string, self: string) { const s = SEMI.get(key(n)); return s && s.id !== self ? s : null; }
function mineExpand(u: Mine, k: number, acc: Map<number, number>, info: any, depth: number, seen: Set<string>) {
  for (const [n, q] of u.ing) {
    if (!(typeof q === "number" && q > 0)) continue;
    const sm = depth < 3 ? semiOf(String(n), u.id) : null;
    if (sm && !seen.has(sm.id)) {
      const y = semiYield(sm); if (!(y > 0)) continue;
      sm.algs.forEach((a) => info.algs.add(a)); info.diet = Math.min(info.diet, Number(sm.diet) || 0);
      if (!depth) info.semis.push([sm.id, q]);
      seen.add(sm.id); mineExpand(sm, (k * q) / y, acc, info, depth + 1, seen); seen.delete(sm.id); continue;
    }
    const pi = prodIndex(String(n)); if (pi < 0) continue; acc.set(pi, (acc.get(pi) || 0) + q * k);
  }
}
function mineToR(u: Mine): Recipe {
  const N = Math.max(1, Number(u.N) || 1), acc = new Map<number, number>(), info = { algs: new Set(u.algs), diet: Number(u.diet) || 0, semis: [] as [string, number][] };
  mineExpand(u, 1 / N, acc, info, 0, new Set([u.id]));
  const [t, s0] = splitName(u.name);
  const o: Recipe = { id: u.id, name: u.name, t, s: s0, f: MINE_F, sub: u.semi ? "Semi-finished" : "", N, pg: Number(u.pg) || 0, pu: "g",
    algs: [...info.algs].sort((a, b) => a - b), kcal: Number(u.kcal) || 0, also: [], lines: [...acc].map(([pi, g]) => [pi, g] as [number, number]), diet: info.diet, mine: true,
    semi: !!u.semi, y: u.semi ? semiYield(u) : 0, semis: info.semis.map(([id, q]) => [id, q / N] as [string, number]), hay: "", tl: "", ty: [0, ""], tg: [u.semi ? 7 : -1, -1, -1] };
  o.hay = fold(u.name + " My recipes " + (u.semi ? "semi-finished prep " : "") + u.ing.map((x) => x[0]).join(" ")); o.tl = fold(t); o.ty = dishType(o);
  return o;
}
export function mineSync() {
  mine = read<Mine[]>(KEYS.mine, []).filter((u) => u && u.id && u.name && Array.isArray(u.ing));
  SEMI = new Map(); for (const u of mine) if (u.semi) SEMI.set(key(u.name), u);
  R = R.filter((r) => !r.mine); for (const [id, r] of byId) if (r.mine) byId.delete(id);
  for (const u of mine) { const o = mineToR(u); R.push(o); byId.set(o.id, o); }
  folderCount[MINE_F] = mine.length;
}

export async function detail(r: Recipe): Promise<Detail> {
  const slug = D.folders[r.f][1];
  if (slug === MINE_SLUG) {
    const u = mine.find((x) => x.id === r.id); if (!u) return { c: [] };
    return { yl: "", c: u.ing.length || u.steps.length ? [["", [], u.ing.map((x) => [x[0], x[1]] as [string, number | string]), u.steps]] : [], st: u.st || "", al: "", nu: null };
  }
  if (!cache.has(slug)) cache.set(slug, fetch(ROOT + "r/" + slug + ".json").then((x) => { if (!x.ok) throw new Error("http"); return x.json(); }).catch((e) => { cache.delete(slug); throw e; }));
  const all = await cache.get(slug)!; return all[r.id];
}

/* ---------- search ---------- */
export const inColl = (r: Recipe, c: number) => r.f === c || r.also.includes(c);
export interface Filter { q: string; coll: number; diet: number; free: Set<number>; low: boolean; sort: "rel" | "az" | "kcal"; only?: Set<string> | null; not?: Set<number> | null; course?: number; main?: number; cui?: number }
export function filtered(ui: Filter): Recipe[] {
  const toks = fold(ui.q).split(/[^\p{L}\p{N}%]+/u).filter((t) => t.length > 1 || /\d/.test(t));
  const out: [Recipe, number][] = [];
  for (const r of R) {
    if (ui.only && !ui.only.has(r.id)) continue;
    if (ui.coll >= 0 && !inColl(r, ui.coll)) continue;
    if (ui.course != null && ui.course >= 0 && r.tg[0] !== ui.course) continue;
    if (ui.main != null && ui.main >= 0 && r.tg[1] !== ui.main) continue;
    if (ui.cui != null && ui.cui > -2 && r.tg[2] !== ui.cui) continue; // -2 any cuisine, -1 international
    if (ui.diet && r.diet < ui.diet) continue;
    if (ui.free.size && r.algs.some((a) => ui.free.has(a))) continue;
    if (ui.low && !(r.kcal > 0 && r.kcal <= 400)) continue;
    if (ui.not?.size && r.lines.some((l) => ui.not!.has(l[0]))) continue;
    let score = 0;
    if (toks.length) {
      let ok = true;
      for (const t of toks) {
        if (r.tl.startsWith(t)) score += 6; else if (r.tl.includes(t)) score += 4; else if (r.hay.includes(t)) score += 2;
        else if (r.lines.some((l) => prodHay[l[0]].includes(t))) score += 1; else { ok = false; break; }
      }
      if (!ok) continue;
    }
    out.push([r, score]);
  }
  if (ui.sort === "az") out.sort((a, b) => a[0].t.localeCompare(b[0].t));
  else if (ui.sort === "kcal") out.sort((a, b) => (a[0].kcal || 9999) - (b[0].kcal || 9999));
  else if (toks.length) out.sort((a, b) => b[1] - a[1] || a[0].t.localeCompare(b[0].t));
  else out.sort((a, b) => a[0].t.localeCompare(b[0].t));
  return out.map((x) => x[0]);
}

/* ---------- what can I cook: search by the products you have ---------- */
const STAPLE = new Set(["salt", "sugar", "black pepper, ground", "olive oil", "sunflower oil", "water"]);
/** Products whose name matches the text, the most used first. */
let use: number[] | null = null;
export function findProducts(q: string, n = 8): number[] {
  const t = fold(q).trim(); if (t.length < 2) return [];
  if (!use) { use = D.products.map(() => 0); for (const r of R) for (const [pi] of r.lines) use[pi] = (use[pi] || 0) + 1; }
  const out: number[] = [];
  prodHay.forEach((h, i) => { if ((use![i] || 0) > 0 && (h.startsWith(t) || h.includes(" " + t) || h.includes(t))) out.push(i); });
  const st = (i: number) => (prodHay[i].startsWith(t) ? 0 : prodHay[i].includes(" " + t) ? 1 : 2);
  return out.sort((a, b) => st(a) - st(b) || use![b] - use![a]).slice(0, n);
}
export const isStaple = (pi: number) => STAPLE.has(fold(D.products[pi]?.[0] || ""));
export interface Have { r: Recipe; hit: number; miss: number }
export type Pick = number | string; // one product, or a word that stands for every product with it in the name
/** Product indexes a pick stands for. */
export function pickSet(k: Pick): Set<number> {
  if (typeof k === "number") return new Set([k]);
  const t = fold(k).trim(), out = new Set<number>();
  prodHay.forEach((h, i) => { if (h.startsWith(t) || h.includes(" " + t)) out.add(i); });
  return out;
}
/** The whole word a typed start stands for: "chick" → "chicken", "mushr" → "mushroom". */
export function completeWord(q: string) {
  const t = fold(q).trim(); if (t.length < 3) return "";
  const n = new Map<string, number>();
  for (const h of prodHay) for (const w of h.split(/[^\p{L}]+/u)) if (w.startsWith(t)) { const b = w.length > 3 && w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w; n.set(b, (n.get(b) || 0) + 1); }
  let best = "", bn = 0; for (const [w, c] of n) if (c > bn || (c === bn && w.length < best.length)) { best = w; bn = c; }
  return best;
}
export const pickName = (k: Pick) => (typeof k === "number" ? D.products[k]?.[0] || "" : "Any " + k);
/** Recipes that use the picks. Most picks used first, then the fewest products still to buy (salt, sugar, pepper and oils do not count). */
export function byProducts(picks: Pick[], base: Recipe[]): Have[] {
  if (!picks.length) return [];
  const sets = picks.map(pickSet), all = new Set<number>(); sets.forEach((x) => x.forEach((i) => all.add(i)));
  const out: Have[] = [];
  for (const r of base) {
    let miss = 0; const ids = new Set<number>();
    for (const [pi] of r.lines) { ids.add(pi); if (!all.has(pi) && !isStaple(pi)) miss++; }
    let hit = 0; for (const st of sets) { for (const i of st) if (ids.has(i)) { hit++; break; } }
    if (hit) out.push({ r, hit, miss });
  }
  return out.sort((a, b) => b.hit - a.hit || a.miss - b.miss || a.r.t.localeCompare(b.r.t));
}

/* ---------- dish picture ---------- */
export function dishType(r: Recipe): [number, string] {
  if(r.semi)return [30,"semi"];
  const f=D.folders[r.f][0], t=" "+fold(r.t)+" ";
  const sec=[0,0,0,0,0,0,0,0];for(const [pi,g] of r.lines){const p=D.products[pi];if(p[2]!=="pcs")sec[p[1]]+=g}
  const W=(re: string)=>new RegExp("\\b("+re+")","i").test(t);
  if(f==="Drinks"||f==="Bar & Lounge"||W("cocktail|smoothie|lemonade|spritz|mocktail|punch|juice|negroni|martini|mojito|sangria|liqueur"))return W("coffee|espresso|latte|chai|tea|cocoa|chocolate|lassi|ayran")?[28,"coffee"]:[265,"glass"];
  if(f==="Desserts")return W("ice cream|gelato|sorbet|semifreddo|granita|affogato|popsicle|kulfi")?[300,"ice"]:[335,"cake"];
  if(f==="Soups"||W("soup|chorba|veloute|bisque|shorba|ramen|pho|chowder|gazpacho|consomme|minestrone|borscht|tarator"))return [36,"soup"];
  if(W("burger|slider"))return [26,"burger"];
  if(W("taco|burrito|quesadilla|nacho|enchilada|tostada|fajita"))return [48,"taco"];
  if(W("risotto|pilaf|paella|biryani|fried rice|rice|pulao|jollof|congee|arancini"))return [44,"rice"];
  if(W("noodle|udon|soba|pad thai|chow mein|lo mein|japchae"))return [0,"noodle"];
  if(W("pizza|calzone|pinsa|pide|lahmacun"))return [8,"pizza"];
  if(W("pasta|tagliolini|taglierini|bucatini|trofie|orecchiette|pici|paccheri|ziti|farfalle|conchiglie|fusilli|cannelloni|spaghetti|penne|tagliatelle|linguine|lasagn|ravioli|tortellini|gnocchi|risotto|noodle|orzo|macaroni|fettuccine|pappardelle|rigatoni|carbonara"))return [44,"pasta"];
  if(W("skewer|kebab|souvlaki|yakitori|satay|brochette|shish"))return [16,"skewer"];
  if(W("canape|crostini|bruschetta|tapas|pintxo|mezze"))return [285,"tapas"];
  if(f==="Sauces"||f==="Marinades"||f==="Fermentation & Pickling")return [f==="Fermentation & Pickling"?95:18,"jar"];
  if(sec[1]>=sec[0]&&sec[1]>15)return [W("shrimp|prawn|lobster|crab|mussel|clam|oyster|squid|octopus|scallop|calamari")?14:205,"fish"];
  if(sec[0]>15)return [W("chicken|duck|turkey|poultry|quail|goose|pheasant")?30:8,"meat"];
  if(W("sauce|dressing|marinade|vinaigrette|pesto|salsa|chutney|relish|aioli|mayonnaise|jus|gravy|coulis|stock|pickle|pickled|ferment|kimchi|sauerkraut|brine|rub"))return [W("pickle|pickled|ferment|kimchi|sauerkraut|brine")||f==="Fermentation & Pickling"?95:18,"jar"];
  if(/(\b(cake|tart|tarte|mousse|ice cream|gelato|sorbet|cookies?|biscuits?|pudding|panna cotta|tiramisu|brownies?|meringue|macarons?|cheesecake|baklava|praline|ganache|caramel|truffles?|eclairs?|profiteroles?|churros|donuts?|doughnuts?|halva|fudge|parfait|creme brulee|crepes?|compote|jam|tres leches|dacquoise|sponge)\b)|torte\b|kaka\b/.test(t))return [335,"cake"];
  if(f==="Bakery & Bread"||W("bread|focaccia|brioche|baguette|loaf|sourdough|dough|buns?|rolls?|pita|naan|flatbread|croissant|bagel|muffin|scone|pretzel|banitsa|pie|tortilla|pizza|toast|sandwich|crostini|bruschetta"))return [32,"bread"];
  if(f==="Breakfast"||W("uova|huevos|oeufs|omelette|omelet|benedict|shakshuka|frittata|scrambled|eggs?|pancake|waffle|porridge|granola|oats"))return [46,"egg"];
  if(W("cheese|burrata|halloumi|feta|camembert|brie|fondue|raclette|mozzarella|labneh"))return [50,"cheese"];
  if(f==="Salads"||W("salad|slaw|tabbouleh|ceviche|carpaccio"))return [108,"leaf"];
  if(W("curry|stew|tagine|ragout|ragu|goulash|chili|casserole|braise|kapama|moussaka|dal|daal"))return [22,"pot"];
  return [r.diet===2?140:120,"leaf"];
}
import { DISH, DISHA, FST, ALG } from "./constants";
export const dishImg = (k: string) => { const d = DISH.includes(k) ? k : DISHA[k] || null; return d ? ROOT + "img/dish/" + d + ".webp" : ROOT + "img/dish/pot.webp"; };
export const folderStyle = (i: number): [number, string] => FST[D.folders[i]?.[0]] || [150, "pot"];

/* ---------- the cook's own recipes: save, delete, backup ---------- */
export function mineSave(u: Mine) {
  const a = read<Mine[]>(KEYS.mine, []); const i = a.findIndex((x) => x.id === u.id); u.up = Date.now(); u.updatedAt = u.up;
  if (i >= 0) a[i] = u; else a.unshift(u); write(KEYS.mine, a); mineSync();
}
export function mineRemove(id: string) { write(KEYS.mine, read<Mine[]>(KEYS.mine, []).filter((x) => x.id !== id)); mineSync(); }
export const mineBackup = () => JSON.stringify({ app: "chefsheet", kind: "my-recipes", v: 1, recipes: read<Mine[]>(KEYS.mine, []) }, null, 1);
/** Restores a backup file; recipes with the same id are replaced. Returns how many were read, or -1 if the file is not a backup. */
export function mineRestore(text: string) {
  try {
    const j = JSON.parse(text); const list = Array.isArray(j) ? j : j.recipes; if (!Array.isArray(list)) return -1;
    const a = read<Mine[]>(KEYS.mine, []); let n = 0;
    for (const u of list) {
      if (!u || !u.name || !Array.isArray(u.ing)) continue;
      u.id = String(u.id || "u" + Date.now().toString(36) + n); u.algs = Array.isArray(u.algs) ? u.algs.map(Number).filter((x: number) => ALG[x]) : []; u.steps = Array.isArray(u.steps) ? u.steps.map(String) : [];
      const i = a.findIndex((x) => x.id === u.id); if (i >= 0) a[i] = u; else a.push(u); n++;
    }
    write(KEYS.mine, a); mineSync(); return n;
  } catch { return -1; }
}

/** A library recipe as a draft of the cook's own recipe ("Make it mine"). Components are flattened, yield lines and component references are left out. */
export function mineDraft(r: Recipe, d: Detail): Omit<Mine, "id"> {
  const ing: [string, number | string][] = [], steps: string[] = [], many = d.c.length > 1;
  const comps = new Set(d.c.map((c) => fold(c[0] || "")).filter(Boolean)); // a component used in another one is already counted by its own lines
  for (const c of d.c) {
    for (const x of c[2]) { if (/^(cooked |total )?yield/i.test(x[0]) || /\([A-Z]\)\s*$/.test(x[0]) || (many && comps.has(fold(x[0].replace(/\s*\([^)]*\)\s*$/, ""))))) continue; ing.push([x[0], x[1]]); }
    for (const st of c[3]) steps.push(many && c[0] ? c[0] + ": " + st : st);
  }
  return { name: r.name, N: r.N, pg: r.pu === "g" || !r.pu ? r.pg || 0 : 0, kcal: r.kcal || 0, diet: r.diet || 0, algs: [...r.algs], ing, steps, st: d.st || "", from: r.id };
}
