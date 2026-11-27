// Stock on hand and write-offs. Off by default; turned on in Settings.
// Quantities are in the product's own unit (kg, l, pcs), the same unit the order list uses.
// Everything lives in bb-stock on this device and goes into the full backup.
import { Persisted, KEYS } from "./store.svelte";
import { D } from "./catalog";
import { prices, money } from "./kitchen.svelte";
import { pdfDoc, pdfSafe, fmtD } from "./files";
import { fmtQ } from "./util";

export type MoveKind = "in" | "use" | "waste" | "count";
/** One change. q is the change for in/use/waste and the new level for count; was = level before. */
export interface Move { id: string; at: number; k: MoveKind; p: string; u: string; q: number; was: number; why?: string; note?: string; ref?: string; by: string }
export interface Item { q: number; u: string; min?: number }
export interface Stock { on: boolean; by: string; have: Record<string, Item>; log: Move[] }

const blank = (): Stock => ({ on: false, by: "", have: {}, log: [] });
export const S = new Persisted<Stock>(KEYS.stock, blank());
{ const b = blank(), v: any = S.v; if (!v || typeof v !== "object") S.set(b); else for (const k of Object.keys(b) as (keyof Stock)[]) if (v[k] == null) v[k] = b[k]; }

export const WHY = ["Spoiled", "Past use-by", "Damaged", "Overproduction", "Returned by guest", "Staff meal", "Tasting or training", "Other"];
export const KIND_LABEL: Record<MoveKind, string> = { in: "Received", use: "Used", waste: "Written off", count: "Counted" };

const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const r3 = (n: number) => Math.round(n * 1000) / 1000;
const KEEP = 400 * 864e5;
let PU: Map<string, string> | null = null;
/** The unit of a library product, or kg for a new one. */
export function unitOf(name: string) {
  if (!PU) { PU = new Map(); for (const p of D.products) if (!PU.has(p[0].toLowerCase())) PU.set(p[0].toLowerCase(), p[2]); }
  return S.v.have[name]?.u || PU.get(name.toLowerCase()) || "kg";
}
/** The library spelling of a product name, so "butter" and "Butter" are one item. */
export function canon(name: string) {
  const n = name.trim(), lo = n.toLowerCase();
  const k = Object.keys(S.v.have).find((x) => x.toLowerCase() === lo); if (k) return k;
  const p = D.products.find((x) => x[0].toLowerCase() === lo); return p ? p[0] : n;
}
export const level = (name: string) => S.v.have[name]?.q ?? 0;
export const priceFor = (name: string) => { const v = prices.v[name]; return typeof v === "number" && v > 0 ? v : null; };

function log(k: MoveKind, p: string, u: string, q: number, was: number, extra: Partial<Move> = {}) {
  S.v.log.unshift({ id: id(), at: Date.now(), k, p, u, q: r3(q), was: r3(was), by: S.v.by.trim(), ...extra });
  const lim = Date.now() - KEEP; S.v.log = S.v.log.filter((x) => x.at > lim);
}
function item(name: string) { return (S.v.have[name] ||= { q: 0, u: unitOf(name) }); }

/** Adds a delivery. */
export function receive(name: string, q: number, ref = "") {
  name = canon(name); if (!name || !(q > 0)) return false;
  const it = item(name), was = it.q; it.q = r3(was + q); log("in", name, it.u, q, was, ref ? { ref } : {}); S.save(); return true;
}
/** Takes products out; never below zero. kind "use" = cooked, "waste" = written off. Returns what was actually taken. */
export function take(name: string, q: number, kind: "use" | "waste" = "use", extra: Partial<Move> = {}) {
  name = canon(name); if (!name || !(q > 0)) return 0;
  const tracked = !!S.v.have[name];
  if (!tracked && kind === "use") return 0;
  if (!tracked) { log("waste", name, unitOf(name), q, 0, extra); S.save(); return q; }
  const it = S.v.have[name], was = it.q, out = kind === "waste" ? q : Math.min(q, was);
  it.q = r3(Math.max(0, was - q)); log(kind, name, it.u, out, was, extra); S.save(); return out;
}
/** A stocktake: sets the real level. */
export function count(name: string, q: number) {
  name = canon(name); if (!name || !(q >= 0)) return false;
  const it = item(name), was = it.q; it.q = r3(q); log("count", name, it.u, q, was); S.save(); return true;
}
export function setMin(name: string, min: number | null) { const it = S.v.have[name]; if (!it) return; if (min == null || !(min > 0)) delete it.min; else it.min = min; S.save(); }
export function drop(name: string) { delete S.v.have[name]; S.save(); }
export function undo(mid: string) {
  const m = S.v.log.find((x) => x.id === mid); if (!m) return false;
  const it = S.v.have[m.p];
  if (it) it.q = r3(m.k === "count" ? m.was : m.k === "in" ? Math.max(0, it.q - m.q) : it.q + (m.k === "waste" ? Math.min(m.q, m.was) : m.q));
  S.v.log = S.v.log.filter((x) => x.id !== mid); S.save(); return true;
}
export const low = () => Object.entries(S.v.have).filter(([, it]) => it.min != null && it.q < it.min).map(([n]) => n).sort();
export const items = () => Object.entries(S.v.have).sort((a, b) => a[0].localeCompare(b[0]));

/** Order list items with stock on hand and what is left to buy. */
export function toBuy(name: string, need: number) { const h = level(name); return { have: h, buy: Math.max(0, need - h), tracked: !!S.v.have[name] }; }
type OItem = { name: string; unit: string; q: number };
export function receiveAll(list: OItem[], ref: string) { let n = 0; for (const it of list) if (receive(it.name, it.q, ref)) n++; return n; }
export function useAll(list: OItem[], ref: string) { let n = 0; for (const it of list) if (take(it.name, it.q, "use", { ref }) > 0) n++; return n; }

/* ---------- write-off report ---------- */
export function wasteOf(year: number, month: number) {
  const from = new Date(year, month, 1).getTime(), to = new Date(year, month + 1, 1).getTime();
  const rows = S.v.log.filter((m) => m.k === "waste" && m.at >= from && m.at < to);
  const byWhy = new Map<string, { n: number; cost: number }>(), byP = new Map<string, { q: number; u: string; cost: number }>();
  let cost = 0, priced = 0;
  for (const m of rows) {
    const pv = priceFor(m.p), c = pv != null ? pv * m.q : 0; if (pv != null) { cost += c; priced++; }
    const w = byWhy.get(m.why || "Other") || { n: 0, cost: 0 }; w.n++; w.cost += c; byWhy.set(m.why || "Other", w);
    const p = byP.get(m.p) || { q: 0, u: m.u, cost: 0 }; p.q += m.q; p.cost += c; byP.set(m.p, p);
  }
  return { rows, cost, priced, byWhy: [...byWhy].sort((a, b) => b[1].cost - a[1].cost || b[1].n - a[1].n), byP: [...byP].sort((a, b) => b[1].cost - a[1].cost || b[1].q - a[1].q) };
}

const INK: [number, number, number] = [20, 23, 27], ACC: [number, number, number] = [194, 65, 12], BAND: [number, number, number] = [241, 243, 245], LINE: [number, number, number] = [217, 221, 226], MUTED: [number, number, number] = [106, 114, 124];
export async function stockPdf(year: number, month: number) {
  const from = new Date(year, month, 1).getTime(), to = new Date(year, month + 1, 1).getTime();
  const moves = S.v.log.filter((m) => m.at >= from && m.at < to).sort((a, b) => a.at - b.at);
  const w = wasteOf(year, month), list = items();
  if (!moves.length && !list.length) return null;
  const doc = await pdfDoc(); const W = 210, M = 14; let y = 16;
  const title = new Date(year, month, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const page = (h = 6) => { if (y + h > 284) { doc.addPage(); y = 16; } };
  const head = (t: string, cols: [string, number][]) => {
    page(16); y += 3; doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...ACC); doc.text(pdfSafe(t), M, y); y += 6;
    doc.setFillColor(...BAND); doc.rect(M, y - 4.2, W - 2 * M, 6, "F"); doc.setFontSize(8.5); doc.setTextColor(...INK);
    cols.forEach(([c, x]) => doc.text(pdfSafe(c), M + x, y)); y += 6;
  };
  const row = (cells: [string, number][]) => {
    page(); doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...INK);
    cells.forEach(([c, x]) => doc.text(pdfSafe(c), M + x, y, { maxWidth: 62 })); doc.setDrawColor(...LINE); doc.line(M, y + 1.6, W - M, y + 1.6); y += 5.4;
  };
  doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(...INK); doc.text(pdfSafe("Stock and write-offs - " + title), M, y); y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...MUTED);
  doc.text(pdfSafe("Write-offs this month: " + w.rows.length + (w.priced ? "   |   value " + money(w.cost) + (w.priced < w.rows.length ? " (prices for " + w.priced + " of " + w.rows.length + ")" : "") : "")), M, y); y += 6;
  if (w.byWhy.length) {
    head("Write-offs by reason", [["Reason", 2], ["Records", 90], ["Value", 130]]);
    w.byWhy.forEach(([k, v]) => row([[k, 2], [String(v.n), 90], [v.cost ? money(v.cost) : "-", 130]]));
  }
  if (w.rows.length) {
    head("Write-offs", [["Date", 2], ["Product", 26], ["Qty", 92], ["Reason", 116], ["Value", 156], ["By", 178]]);
    w.rows.slice().reverse().forEach((m) => { const pv = priceFor(m.p); row([[fmtD(m.at), 2], [m.p, 26], [fmtQ(m.q) + " " + m.u, 92], [(m.why || "Other") + (m.note ? ": " + m.note : ""), 116], [pv != null ? money(pv * m.q) : "-", 156], [m.by || "-", 178]]); });
  }
  if (list.length) {
    head("On hand now", [["Product", 2], ["Qty", 92], ["Min", 120], ["Value", 150]]);
    list.forEach(([n, it]) => { const pv = priceFor(n); row([[n, 2], [fmtQ(it.q) + " " + it.u, 92], [it.min ? fmtQ(it.min) + " " + it.u : "-", 120], [pv != null ? money(pv * it.q) : "-", 150]]); });
  }
  if (moves.length) {
    head("All changes", [["Date", 2], ["Product", 26], ["Change", 92], ["Level", 124], ["Note", 150]]);
    moves.forEach((m) => { const nw = m.k === "count" ? m.q : m.k === "in" ? m.was + m.q : Math.max(0, m.was - m.q);
      row([[fmtD(m.at), 2], [m.p, 26], [KIND_LABEL[m.k] + " " + (m.k === "count" ? "" : m.k === "in" ? "+" : "-") + fmtQ(m.q), 92], [fmtQ(m.was) + " -> " + fmtQ(nw) + " " + m.u, 124], [m.ref || m.why || "", 150]]); });
  }
  page(14); y += 6; doc.setFontSize(9); doc.setTextColor(...INK); doc.text("Checked by (name, signature, date): ______________________________________", M, y);
  y += 6; doc.setFontSize(7.5); doc.setTextColor(...MUTED); doc.text("Made with Chefsheet. Values use the prices saved on this device, without VAT.", M, y);
  return doc.output("arraybuffer") as ArrayBuffer;
}
