// Printable files: order list, recipe card, prep list, labels, service cards, allergen matrix, and the CSV.
// Ported from 2.x with the same layouts; colours follow the 3.0 "pro kitchen" style.
import { D, byId, detail, type Recipe, type Detail } from "./catalog";
import { ALG } from "./constants";
import { fmtG, fmtQ, fold, shelf } from "./util";
import { ord, portions, compute } from "./kitchen.svelte";
import { pdfDoc, pdfSafe, fmtD } from "./files";

const INK: [number, number, number] = [20, 23, 27], ACC: [number, number, number] = [217, 72, 15], BAND: [number, number, number] = [241, 243, 245];
const LINE: [number, number, number] = [217, 221, 226], MUTED: [number, number, number] = [106, 114, 124], WARN: [number, number, number] = [201, 42, 42];
const isYield = (n: string) => /^(cooked )?yield/i.test(n);

export interface PrepItem { r: Recipe; l: any; d: Detail | null; p: number }
export async function prepData(): Promise<PrepItem[]> {
  const out: PrepItem[] = [];
  for (const l of ord.v.lines) { const r = byId.get(l.id); if (!r) continue; let d: Detail | null = null; try { d = await detail(r); } catch {} out.push({ r, l, d, p: portions(l) }); }
  return out;
}
/** Semi-finished products the dishes in the order need, in grams. */
export function semiNeeds(P: PrepItem[]) {
  const need = new Map<string, number>();
  P.forEach(({ r, p }) => (r.semis || []).forEach(([id, g]) => need.set(id, (need.get(id) || 0) + g * p)));
  return need;
}
export const orderDishes = () => ord.v.lines.map((l) => byId.get(l.id)).filter(Boolean) as Recipe[];

export async function orderPdf() {
  const c = compute(), o = ord.v; if (!c.count) return null;
  const doc = await pdfDoc(); const W = 210, M = 14; let y: number;
  doc.setFillColor(...INK); doc.rect(0, 0, W, 24, "F"); doc.setFillColor(...ACC); doc.rect(0, 24, W, 1.2, "F"); doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.text(pdfSafe("Order List" + (o.name ? " - " + o.name : "")), M, 11);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
  doc.text(pdfSafe(`${o.date || "no date"}  |  ${o.pax} guests  |  reserve ${o.reserve}%  |  ${o.lines.length} dishes  |  ${c.count} items`), M, 18);
  doc.setTextColor(...INK); y = 33; const page = () => { if (y > 282) { doc.addPage(); y = 16; } };
  c.secs.forEach((s, i) => {
    if (!s.length) return; page();
    doc.setFillColor(...BAND); doc.rect(M, y - 4.2, W - 2 * M, 6, "F"); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...ACC);
    doc.text(pdfSafe(D.sections[i].toUpperCase()), M + 2, y); doc.setTextColor(...INK); y += 6.5;
    s.forEach((it) => {
      page(); doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(pdfSafe(it.name), M + 2, y, { maxWidth: 92 });
      if (it.note) { doc.setFontSize(8); doc.setTextColor(...MUTED); doc.text(pdfSafe(it.note), M + 96, y, { maxWidth: 58 }); doc.setTextColor(...INK); }
      doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text(pdfSafe(fmtQ(it.q) + " " + it.unit), W - M - 2, y, { align: "right" });
      doc.setDrawColor(...LINE); doc.line(M, y + 1.6, W - M, y + 1.6); y += 5.6;
    }); y += 2;
  });
  page(); y += 2; doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("Dishes", M, y); y += 5; doc.setFont("helvetica", "normal"); doc.setFontSize(9);
  o.lines.forEach((l) => { const r = byId.get(l.id); if (!r) return; page(); doc.text(pdfSafe(`${r.name}  -  ${Math.round(portions(l) * 10) / 10} portions`), M + 2, y, { maxWidth: W - 2 * M - 2 }); y += 4.6; });
  if (c.algs.length) { page(); y += 2; doc.text(pdfSafe("Allergens: " + c.algs.map((a) => a + " " + ALG[a]).join(", ")), M, y, { maxWidth: W - 2 * M }); y += 8; }
  if (c.miss.length) { const ls = doc.splitTextToSize(pdfSafe("Not counted (no product data yet): " + c.miss.join(", ")), W - 2 * M); page(); doc.setFontSize(9); doc.setTextColor(...WARN); doc.text(ls, M, y); doc.setTextColor(...INK); y += ls.length * 4.4 + 3; }
  page(); doc.setFontSize(8); doc.setTextColor(...MUTED);
  doc.text("Gross (as-bought) quantities from recipe net weights with standard trim losses, rounded up. Deduct stock on hand. Deep-frying oil not included.", M, y, { maxWidth: W - 2 * M });
  return doc.output("arraybuffer") as ArrayBuffer;
}

export function orderCsv() {
  const c = compute(); const q = (v: unknown) => '"' + String(v).replace(/"/g, '""') + '"';
  return "﻿Section,Item,Unit,Qty,Note\n" + c.secs.flatMap((s, i) => s.map((it) => [D.sections[i], it.name, it.unit, fmtQ(it.q).replace("–", "0"), it.note || ""].map(q).join(","))).join("\n");
}

export async function recipePdf(r: Recipe, d: Detail, n: number, note = "") {
  const doc = await pdfDoc(); const W = 210, M = 14, f = n / r.N; let y = 16;
  const page = (h = 0) => { if (y + h > 284) { doc.addPage(); y = 16; } };
  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...ACC); doc.text(pdfSafe((D.folders[r.f][0] + (r.sub ? " / " + r.sub : "")).toUpperCase()), M, y); y += 7;
  doc.setTextColor(...INK); doc.setFontSize(18); const tl = doc.splitTextToSize(pdfSafe(r.t), W - 2 * M); doc.text(tl, M, y); y += tl.length * 7;
  if (r.s) { doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(...MUTED); const sl = doc.splitTextToSize(pdfSafe(r.s), W - 2 * M); doc.text(sl, M, y); y += sl.length * 5 + 1; }
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(...INK);
  doc.text(pdfSafe(`${n} portions${r.pg ? " x " + r.pg + " " + (r.pu || "g") : ""}   |   ${r.kcal ? r.kcal + " kcal / portion   |   " : ""}Allergens: ${r.algs.length ? r.algs.map((a) => a + " " + ALG[a]).join(", ") : "none"}`), M, y + 2, { maxWidth: W - 2 * M }); y += 10;
  d.c.forEach((c) => {
    page(14); doc.setFillColor(...BAND); doc.rect(M, y - 4.2, W - 2 * M, 6, "F"); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...ACC); doc.text(pdfSafe(c[0] || "Ingredients"), M + 2, y); doc.setTextColor(...INK); y += 6.5;
    doc.setFontSize(10);
    c[2].forEach((x) => { page(6); doc.setFont("helvetica", "normal"); doc.text(pdfSafe(x[0]), M + 2, y, { maxWidth: 140 }); doc.setFont("helvetica", "bold"); doc.text(pdfSafe(typeof x[1] === "number" ? fmtG(x[1] * f) : String(x[1])), W - M - 2, y, { align: "right" }); doc.setDrawColor(...LINE); doc.line(M, y + 1.6, W - M, y + 1.6); y += 5.6; });
    y += 2; doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
    c[3].forEach((s, i) => { const ls = doc.splitTextToSize(pdfSafe(s), W - 2 * M - 8); page(ls.length * 4.4 + 1); doc.setFont("helvetica", "bold"); doc.text(String(i + 1) + ".", M + 2, y); doc.setFont("helvetica", "normal"); doc.text(ls, M + 8, y); y += ls.length * 4.4 + 1.4; });
    y += 4;
  });
  if (note) { const ls = doc.splitTextToSize(pdfSafe("Notes: " + note), W - 2 * M); page(ls.length * 4.4); doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.text(ls, M, y); doc.setFont("helvetica", "normal"); y += ls.length * 4.4 + 2; }
  if (d.st) { const ls = doc.splitTextToSize(pdfSafe("Storage: " + d.st), W - 2 * M); page(ls.length * 4.4); doc.setFontSize(9.5); doc.text(ls, M, y); y += ls.length * 4.4 + 2; }
  if (d.nu?.p) { page(6); doc.text(pdfSafe(`Nutrition per portion: protein ${d.nu.p[0]} g, fat ${d.nu.p[1]} g, carbs ${d.nu.p[2]} g, ${d.nu.p[3]} kcal`), M, y); y += 6; }
  page(6); doc.setFontSize(8); doc.setTextColor(...MUTED); doc.text("Made with Chefsheet. Check product labels for allergens.", M, y);
  return doc.output("arraybuffer") as ArrayBuffer;
}

export async function mxPdf() {
  const ds = orderDishes(); if (!ds.length) return null; const o = ord.v;
  const doc = await pdfDoc(true); const W = 297, M = 12, K = Object.keys(ALG).map(Number), cw = 13.2, dw = W - 2 * M - cw * K.length; let y = 14;
  doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...INK); doc.text(pdfSafe("Allergen matrix" + (o.name ? " - " + o.name : "")), M, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...MUTED); doc.text(pdfSafe((o.date || "") + (o.date ? "   " : "") + "The 14 allergens (EU 1169/2011). X = contains, from the listed ingredients."), M, y + 6); y += 14;
  const head = () => {
    doc.setFillColor(...BAND); doc.rect(M, y - 5, W - 2 * M, 16, "F"); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...INK); doc.text("Dish", M + 2, y + 4);
    K.forEach((k, i) => { const x = M + dw + i * cw + cw / 2; doc.text(String(k), x, y, { align: "center" }); doc.setFont("helvetica", "normal"); doc.setFontSize(5.6); doc.text(doc.splitTextToSize(ALG[k], cw - 1), x, y + 3.5, { align: "center" }); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); });
    y += 15; doc.setTextColor(...INK);
  };
  head();
  ds.forEach((r, ri) => {
    const ls = doc.splitTextToSize(pdfSafe(r.t), dw - 4), rh = Math.max(7, ls.length * 4 + 3); if (y + rh > 200) { doc.addPage(); y = 16; head(); }
    if (ri % 2) { doc.setFillColor(248, 249, 250); doc.rect(M, y - 4.5, W - 2 * M, rh, "F"); }
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.text(ls, M + 2, y);
    doc.setFont("helvetica", "bold"); doc.setTextColor(...ACC); K.forEach((k, i) => { if (r.algs.includes(k)) doc.text("X", M + dw + i * cw + cw / 2, y, { align: "center" }); }); doc.setTextColor(...INK);
    doc.setDrawColor(...LINE); doc.line(M, y - 4.5 + rh, W - M, y - 4.5 + rh); y += rh;
  });
  y += 6; if (y > 196) { doc.addPage(); y = 16; } doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...MUTED);
  doc.text("Made with Chefsheet. Allergens come from the listed ingredients; always check the labels of the products you buy and cross-contact in your kitchen.", M, y, { maxWidth: W - 2 * M });
  return doc.output("arraybuffer") as ArrayBuffer;
}

export async function prepPdf() {
  const P = await prepData(); if (!P.length) return null; const o = ord.v;
  const doc = await pdfDoc(); const W = 210, M = 14; let y = 16; const page = (h = 0) => { if (y + h > 284) { doc.addPage(); y = 16; } };
  doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(...INK); doc.text(pdfSafe("Prep list" + (o.name ? " - " + o.name : "")), M, y); y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(...MUTED); doc.text(pdfSafe(`${o.date || "no date"}  |  ${o.pax} guests  |  reserve ${o.reserve}%`), M, y); y += 8; doc.setTextColor(...INK);
  const need = semiNeeds(P);
  if (need.size) {
    page(14); doc.setFont("helvetica", "bold"); doc.setFontSize(12.5); doc.text("Semi-finished to make first", M, y); y += 6; doc.setFontSize(9.5);
    need.forEach((g, id) => { const s = byId.get(id); if (!s) return; page(5); doc.setFont("helvetica", "normal"); doc.rect(M + 2, y - 3, 3, 3); doc.text(pdfSafe(s.t), M + 8, y, { maxWidth: 130 }); doc.setFont("helvetica", "bold"); doc.text(pdfSafe(fmtG(g)), W - M - 2, y, { align: "right" }); y += 5; });
    y += 5;
  }
  P.forEach(({ r, d, p }) => {
    const f = p / r.N; page(16); doc.setFont("helvetica", "bold"); doc.setFontSize(12.5); doc.text(pdfSafe(r.t), M, y, { maxWidth: W - 2 * M }); y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...MUTED); doc.text(pdfSafe(`${Math.round(p * 10) / 10} portions${r.pg ? " x " + r.pg + " " + (r.pu || "g") : ""}`), M, y); doc.setTextColor(...INK); y += 5;
    (d?.c || []).forEach((c) => {
      page(12); doc.setFillColor(...BAND); doc.rect(M, y - 4, W - 2 * M, 5.6, "F"); doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...ACC); doc.text(pdfSafe(c[0] || "Ingredients"), M + 2, y); doc.setTextColor(...INK); y += 5.5;
      c[2].forEach((x) => { const yl = isYield(x[0]); page(5); doc.setFont("helvetica", yl ? "italic" : "normal"); doc.setFontSize(9.5); if (!yl) doc.rect(M + 2, y - 3, 3, 3); doc.text(pdfSafe(x[0]), M + (yl ? 2 : 8), y, { maxWidth: 130 }); doc.setFont("helvetica", "bold"); doc.text(pdfSafe(typeof x[1] === "number" ? fmtG(x[1] * f) : String(x[1])), W - M - 2, y, { align: "right" }); y += 5; });
      y += 1.5;
    });
    if (d?.st) { const ls = doc.splitTextToSize(pdfSafe("Storage: " + d.st), W - 2 * M); page(ls.length * 4); doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...MUTED); doc.text(ls, M, y); doc.setTextColor(...INK); y += ls.length * 4; }
    y += 5;
  });
  return doc.output("arraybuffer") as ArrayBuffer;
}

/** Labels for an A4 sheet of 14 (2 x 7, 99.1 x 38.1 mm, Avery L7163 and the like). */
export async function labelsPdf() {
  const P = await prepData(); if (!P.length) return null;
  const doc = await pdfDoc(); const L: { t: string; c: string; q: number; sh: ReturnType<typeof shelf>; al: string }[] = []; const now = Date.now();
  P.forEach(({ r, d, p }) => {
    const f = p / r.N, sh = shelf(d?.st), al = r.algs.length ? r.algs.map((a) => ALG[a]).join(", ") : "none of the 14";
    const comps: Detail["c"] = d?.c?.length ? d.c : [["", [], [], []]];
    comps.forEach((c) => {
      const yl = c[2].find((x) => isYield(x[0])); let tot = 0; c[2].forEach((x) => { if (typeof x[1] === "number" && !isYield(x[0])) tot += x[1]; });
      const q = yl && typeof yl[1] === "number" ? yl[1] * f : tot * f;
      L.push({ t: r.t, c: comps.length > 1 ? c[0] : "", q, sh, al });
    });
  });
  const LW = 99.1, LH = 38.1, X0 = 4.65, Y0 = 15.15, GX = 2.5;
  L.forEach((l, i) => {
    const k = i % 14; if (i && !k) doc.addPage(); const x = X0 + (k % 2) * (LW + GX), y = Y0 + Math.floor(k / 2) * LH;
    doc.setDrawColor(...LINE); doc.roundedRect(x + 1, y + 1, LW - 2, LH - 2, 2, 2);
    let ty = y + 7; doc.setTextColor(...INK); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    const tl = doc.splitTextToSize(pdfSafe(l.t), LW - 8).slice(0, l.c ? 1 : 2); doc.text(tl, x + 4, ty); ty += tl.length * 4.4;
    if (l.c) { doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.text(doc.splitTextToSize(pdfSafe(l.c), LW - 8)[0], x + 4, ty); ty += 4.2; }
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    doc.text(pdfSafe("Made: " + fmtD(now) + "     By: ____________" + (l.q > 0 ? "     Qty: " + fmtG(l.q) : "")), x + 4, ty + 0.6); ty += 4.6;
    doc.setFont("helvetica", "bold"); doc.text(pdfSafe("Use by: " + (l.sh.ms != null ? fmtD(now + l.sh.ms, l.sh.ms < 48 * 36e5 && l.sh.ms > 0) + "  (" + l.sh.txt + ")" : "______________")), x + 4, ty + 0.6); ty += 4.6;
    doc.setFont("helvetica", "normal"); if (l.sh.temp) { doc.text(pdfSafe("Store: " + l.sh.temp), x + 4, ty + 0.6); ty += 4.4; }
    doc.setFontSize(7.8); doc.setTextColor(...WARN); doc.text(doc.splitTextToSize(pdfSafe("Allergens: " + l.al), LW - 8).slice(0, 2), x + 4, ty + 0.6); doc.setTextColor(...INK);
  });
  return doc.output("arraybuffer") as ArrayBuffer;
}

function svcIngr(d: Detail | null) {
  const seen = new Set<string>(), out: string[] = [];
  (d?.c || []).forEach((c) => c[2].forEach((x) => {
    const n = String(x[0]).trim(); if (!n || /^(cooked |total )?yield/i.test(n) || /\([A-Z]\)\s*$/.test(n) || /^(water|ice|salt)\b/i.test(n)) return;
    const base = n.replace(/\s*\([^)]*\)/g, "").split(",")[0]; const k = fold(base); if (seen.has(k)) return; seen.add(k); out.push(base.trim());
  }));
  return out;
}
function svcCard(doc: any, r: Recipe, d: Detail | null, top: number) {
  const W = 210, M = 16, H = 148.5; let y = top + 16;
  doc.setTextColor(...ACC); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.text(pdfSafe((D.folders[r.f][0] + (r.sub ? " / " + r.sub : "")).toUpperCase()), M, y); y += 8;
  doc.setTextColor(...INK); doc.setFontSize(20); const tl = doc.splitTextToSize(pdfSafe(r.t), W - 2 * M).slice(0, 2); doc.text(tl, M, y); y += tl.length * 7.5;
  if (r.s) { doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(...MUTED); const sl = doc.splitTextToSize(pdfSafe(r.s), W - 2 * M).slice(0, 2); doc.text(sl, M, y); y += sl.length * 5 + 1; }
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...INK);
  const facts = [r.diet === 2 ? "Vegan" : r.diet === 1 ? "Vegetarian" : "", r.pg ? "Portion " + r.pg + " " + (r.pu || "g") : "", r.kcal ? r.kcal + " kcal per portion" : ""].filter(Boolean).join("   |   ");
  if (facts) { doc.text(pdfSafe(facts), M, y + 1); y += 8; }
  const has = r.algs.length > 0, al = has ? r.algs.map((a) => ALG[a]).join(", ") : "";
  if (has) doc.setFillColor(252, 233, 222); else doc.setFillColor(226, 241, 231);
  const al2 = doc.splitTextToSize(pdfSafe(al || "No allergens from the list of 14"), W - 2 * M - 8); const bh = 8 + al2.length * 5.6; doc.roundedRect(M, y - 2, W - 2 * M, bh, 2.5, 2.5, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); if (has) doc.setTextColor(...ACC); else doc.setTextColor(46, 125, 79); doc.text("ALLERGENS", M + 4, y + 3.4); doc.setFontSize(12.5); doc.text(al2, M + 4, y + 9.2); y += bh + 5;
  const ing = svcIngr(d);
  if (ing.length) { doc.setTextColor(...INK); doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.text("CONTAINS", M, y); y += 4.6; doc.setFont("helvetica", "normal"); doc.setFontSize(10); const il = doc.splitTextToSize(pdfSafe(ing.join(", ")), W - 2 * M); const room = Math.max(1, Math.floor((top + H - 34 - y) / 4.6)); doc.text(il.slice(0, room), M, y); y += Math.min(il.length, room) * 4.6 + 3; }
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...INK); const ny = Math.max(y + 2, top + H - 28); doc.text("NOTES FOR SERVICE", M, ny); doc.setDrawColor(...LINE); [0, 1].forEach((i) => doc.line(M, ny + 7 + i * 7, W - M, ny + 7 + i * 7));
  doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...MUTED); doc.text("Allergens from the listed ingredients. Ask the kitchen about cross-contact. Made with Chefsheet.", M, top + H - 6);
}
/** Front-of-house cards, two per A4 page. */
export async function svcPdf(list: Recipe[]) {
  if (!list.length) return null; const doc = await pdfDoc();
  for (let i = 0; i < list.length; i++) {
    const r = list[i]; let d: Detail | null = null; try { d = await detail(r); } catch {}
    if (i && i % 2 === 0) doc.addPage(); const top = i % 2 ? 148.5 : 0;
    if (i % 2) { doc.setDrawColor(190, 190, 190); doc.setLineDashPattern([2, 2], 0); doc.line(8, 148.5, 202, 148.5); doc.setLineDashPattern([], 0); }
    svcCard(doc, r, d, top);
  }
  return doc.output("arraybuffer") as ArrayBuffer;
}
