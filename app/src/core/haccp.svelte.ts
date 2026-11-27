// Food safety logs (HACCP): fridge and freezer temperatures, cooling of cooked food, deliveries.
// Off by default; turned on in Settings. Everything lives in bb-haccp on this device and goes into the full backup.
import { Persisted, KEYS } from "./store.svelte";
import { pdfDoc, pdfSafe, fmtD } from "./files";

export type Kind = "fridge" | "freezer" | "hot";
export interface Unit { id: string; name: string; kind: Kind }
export interface Temp { id: string; u: string; t: number; at: number; by: string; note?: string }
export interface Cool { id: string; food: string; t0: number; at: number; t1?: number; at1?: number; t2?: number; at2?: number; by: string; done?: boolean }
export interface Recv { id: string; at: number; sup: string; prod: string; kind: "chilled" | "frozen" | "ambient"; t: number | null; useBy: string; pack: boolean; ok: boolean; by: string; note?: string }
export interface Haccp { on: boolean; by: string; units: Unit[]; temps: Temp[]; cool: Cool[]; recv: Recv[] }

const blank = (): Haccp => ({ on: false, by: "", units: [{ id: "f1", name: "Fridge 1", kind: "fridge" }, { id: "z1", name: "Freezer 1", kind: "freezer" }], temps: [], cool: [], recv: [] });
export const H = new Persisted<Haccp>(KEYS.haccp, blank());
{ const b = blank(), v: any = H.v; if (!v || typeof v !== "object") H.set(b); else for (const k of Object.keys(b) as (keyof Haccp)[]) if (v[k] == null) v[k] = b[k]; }

export const KINDS: [Kind, string, string][] = [["fridge", "Fridge", "0 to 5 °C"], ["freezer", "Freezer", "-18 °C or colder"], ["hot", "Hot holding", "63 °C or hotter"]];
/** true = within the limit. */
export function tempOk(kind: Kind, t: number) { return kind === "fridge" ? t <= 5 && t >= -1 : kind === "freezer" ? t <= -18 : t >= 63; }
// Cooling: from 60 °C to 21 °C within 2 hours, then to 5 °C within 4 more hours (6 hours in all).
export const COOL1 = { t: 21, h: 2 }, COOL2 = { t: 5, h: 6 };
export function coolState(c: Cool): "run" | "ok" | "late" | "fail" {
  const h1 = c.at1 ? (c.at1 - c.at) / 36e5 : null, h2 = c.at2 ? (c.at2 - c.at) / 36e5 : null;
  if (c.t1 != null && (c.t1 > COOL1.t || (h1 ?? 0) > COOL1.h)) return "fail";
  if (c.t2 != null && (c.t2 > COOL2.t || (h2 ?? 0) > COOL2.h)) return "fail";
  if (c.t2 != null) return "ok";
  const now = (Date.now() - c.at) / 36e5;
  if ((c.t1 == null && now > COOL1.h) || now > COOL2.h) return "late";
  return "run";
}
export function recvOk(kind: Recv["kind"], t: number | null) { if (t == null || kind === "ambient") return true; return kind === "chilled" ? t <= 5 : t <= -15; }

const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
const KEEP = 400 * 864e5; // older records are dropped
function prune() { const lim = Date.now() - KEEP; const v = H.v; v.temps = v.temps.filter((x) => x.at > lim); v.cool = v.cool.filter((x) => x.at > lim); v.recv = v.recv.filter((x) => x.at > lim); }
export function addTemp(u: string, t: number, note = "") { H.v.temps.unshift({ id: id(), u, t, at: Date.now(), by: H.v.by.trim(), ...(note ? { note } : {}) }); prune(); H.save(); }
export function startCool(food: string, t0: number) { const c: Cool = { id: id(), food, t0, at: Date.now(), by: H.v.by.trim() }; H.v.cool.unshift(c); prune(); H.save(); return c; }
export function checkCool(cid: string, t: number) {
  const c = H.v.cool.find((x) => x.id === cid); if (!c) return;
  if (c.t1 == null) { c.t1 = t; c.at1 = Date.now(); if (t > COOL1.t) c.done = true; } else { c.t2 = t; c.at2 = Date.now(); c.done = true; }
  H.save();
}
export function addRecv(r: Omit<Recv, "id" | "at" | "by" | "ok">) { const ok = recvOk(r.kind, r.t) && r.pack; H.v.recv.unshift({ ...r, id: id(), at: Date.now(), by: H.v.by.trim(), ok }); prune(); H.save(); return ok; }
export function removeRec(list: "temps" | "cool" | "recv", rid: string) { (H.v as any)[list] = (H.v as any)[list].filter((x: any) => x.id !== rid); H.save(); }
const dayKey = (t: number) => new Date(t).toDateString();
/** Units with no reading yet today. */
export function dueToday() { const today = dayKey(Date.now()); return H.v.units.filter((u) => !H.v.temps.some((x) => x.u === u.id && dayKey(x.at) === today)); }
export const unitOf = (uid: string) => H.v.units.find((u) => u.id === uid);

/* ---------- monthly PDF for an inspection ---------- */
const INK: [number, number, number] = [20, 23, 27], ACC: [number, number, number] = [194, 65, 12], BAND: [number, number, number] = [241, 243, 245], LINE: [number, number, number] = [217, 221, 226], WARN: [number, number, number] = [201, 42, 42], MUTED: [number, number, number] = [106, 114, 124];
const hm = (t: number) => { const d = new Date(t); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); };
export async function haccpPdf(year: number, month: number, kitchen = "") {
  const from = new Date(year, month, 1).getTime(), to = new Date(year, month + 1, 1).getTime(), inM = (t: number) => t >= from && t < to;
  const temps = H.v.temps.filter((x) => inM(x.at)).sort((a, b) => a.at - b.at), cool = H.v.cool.filter((x) => inM(x.at)).sort((a, b) => a.at - b.at), recv = H.v.recv.filter((x) => inM(x.at)).sort((a, b) => a.at - b.at);
  if (!temps.length && !cool.length && !recv.length) return null;
  const doc = await pdfDoc(); const W = 210, M = 14; let y = 16;
  const title = new Date(year, month, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const page = (h = 6) => { if (y + h > 284) { doc.addPage(); y = 16; } };
  const head = (t: string, cols: [string, number][]) => {
    page(16); y += 3; doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...ACC); doc.text(pdfSafe(t), M, y); y += 6;
    doc.setFillColor(...BAND); doc.rect(M, y - 4.2, W - 2 * M, 6, "F"); doc.setFontSize(8.5); doc.setTextColor(...INK);
    cols.forEach(([c, x]) => doc.text(pdfSafe(c), M + x, y)); y += 6;
  };
  const row = (cells: [string, number][], bad: boolean) => {
    page(); doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...(bad ? WARN : INK));
    cells.forEach(([c, x]) => doc.text(pdfSafe(c), M + x, y, { maxWidth: 60 })); doc.setDrawColor(...LINE); doc.line(M, y + 1.6, W - M, y + 1.6); y += 5.4;
  };
  doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.setTextColor(...INK); doc.text(pdfSafe("Food safety log - " + title), M, y); y += 6;
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...MUTED);
  doc.text(pdfSafe((kitchen ? kitchen + "   |   " : "") + "Limits: fridge 0-5 C, freezer -18 C or colder, hot holding 63 C or hotter. Cooling 60 -> 21 C in 2 h, -> 5 C in 6 h. Red = outside the limit."), M, y, { maxWidth: W - 2 * M }); y += 8;
  if (temps.length) {
    head("Temperatures", [["Date", 2], ["Time", 26], ["Unit", 42], ["C", 100], ["Checked by", 116], ["Note", 146]]);
    temps.forEach((x) => { const u = unitOf(x.u); row([[fmtD(x.at), 2], [hm(x.at), 26], [u?.name || "Removed unit", 42], [String(x.t), 100], [x.by || "-", 116], [x.note || "", 146]], !!u && !tempOk(u.kind, x.t)); });
  }
  if (cool.length) {
    head("Cooling", [["Date", 2], ["Food", 26], ["Start", 84], ["2 h check", 108], ["Final", 140], ["By", 168]]);
    cool.forEach((c) => { const st = coolState(c); row([[fmtD(c.at), 2], [c.food, 26], [hm(c.at) + "  " + c.t0 + " C", 84], [c.t1 != null ? hm(c.at1!) + "  " + c.t1 + " C" : "-", 108], [c.t2 != null ? hm(c.at2!) + "  " + c.t2 + " C" : st === "late" ? "not checked" : "-", 140], [c.by || "-", 168]], st === "fail" || st === "late"); });
  }
  if (recv.length) {
    head("Deliveries", [["Date", 2], ["Supplier", 26], ["Product", 66], ["C", 112], ["Use by", 124], ["Pack", 148], ["Result", 160], ["By", 178]]);
    recv.forEach((r) => row([[fmtD(r.at), 2], [r.sup || "-", 26], [r.prod, 66], [r.t == null ? "-" : String(r.t), 112], [r.useBy ? fmtD(new Date(r.useBy + "T12:00").getTime()) : "-", 124], [r.pack ? "OK" : "Damaged", 148], [r.ok ? "Accepted" : "Rejected", 160], [r.by || "-", 178]], !r.ok));
  }
  page(14); y += 6; doc.setFontSize(9); doc.setTextColor(...INK); doc.text("Reviewed by (name, signature, date): ______________________________________", M, y);
  y += 6; doc.setFontSize(7.5); doc.setTextColor(...MUTED); doc.text("Made with Chefsheet. Follow your own HACCP plan and local rules; these limits are common defaults.", M, y);
  return doc.output("arraybuffer") as ArrayBuffer;
}
