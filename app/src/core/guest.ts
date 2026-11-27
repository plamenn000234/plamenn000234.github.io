// Allergens for guests: the dishes of a menu packed into a link (and a QR code). No server: the link holds the menu,
// library dishes by id (the guest's phone reads their allergens from index.json), own recipes with their allergens inline.
import qrcode from "qrcode-generator";
import { byId, type Recipe } from "./catalog";
import { pdfDoc, pdfSafe } from "./files";

export interface GuestDish { t: string; s: string; algs: number[]; diet: number }
import { b64u as b64, unb64u as unb64, appBase } from "./util";

export function guestLink(name: string, dishes: Recipe[]) {
  const d = dishes.map((r) => (r.mine ? [r.t, r.algs, r.diet] : r.id));
  return appBase() + "#guest?d=" + b64(JSON.stringify({ n: name.slice(0, 60), d }));
}
export function readGuest(q: string | null): { name: string; dishes: GuestDish[] } | null {
  if (!q) return null;
  try {
    const o = JSON.parse(unb64(q)); if (!o || !Array.isArray(o.d)) return null;
    const dishes: GuestDish[] = [];
    for (const x of o.d) {
      if (typeof x === "string") { const r = byId.get(x); if (r) dishes.push({ t: r.t, s: r.s, algs: r.algs, diet: r.diet }); }
      else if (Array.isArray(x) && typeof x[0] === "string") dishes.push({ t: String(x[0]).slice(0, 120), s: "", algs: (Array.isArray(x[1]) ? x[1] : []).map(Number).filter((a: number) => a >= 1 && a <= 14), diet: Number(x[2]) || 0 });
    }
    return { name: String(o.n || "").slice(0, 60), dishes };
  } catch { return null; }
}
/** The QR code as SVG markup (dark modules on white, with a quiet zone). */
export function qrSvg(text: string, px = 220) {
  const q = qrcode(0, "M"); q.addData(text); q.make();
  const n = q.getModuleCount(), m = 4, s = n + m * 2; let path = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) path += `M${c + m} ${r + m}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" width="${px}" height="${px}" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="${s}" height="${s}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}
/** A4 sheet with 4 table cards (A6): menu name, QR, "Scan to see the allergens". */
export async function guestPdf(name: string, link: string) {
  const q = qrcode(0, "M"); q.addData(link); q.make(); const n = q.getModuleCount();
  const doc = await pdfDoc(); const CW = 105, CH = 148.5;
  for (let i = 0; i < 4; i++) {
    const x0 = (i % 2) * CW, y0 = Math.floor(i / 2) * CH, size = 70, cell = size / n, qx = x0 + (CW - size) / 2, qy = y0 + 40;
    doc.setDrawColor(200, 200, 200); doc.setLineDashPattern([1, 1.5], 0); doc.rect(x0 + 0.5, y0 + 0.5, CW - 1, CH - 1); doc.setLineDashPattern([], 0);
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(194, 65, 12); doc.text("ALLERGENS", x0 + CW / 2, y0 + 18, { align: "center" });
    doc.setFontSize(15); doc.setTextColor(20, 23, 27); doc.text(doc.splitTextToSize(pdfSafe(name || "Our menu"), CW - 20), x0 + CW / 2, y0 + 27, { align: "center" });
    doc.setFillColor(0, 0, 0);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) doc.rect(qx + c * cell, qy + r * cell, cell + 0.02, cell + 0.02, "F");
    doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.text("Scan with your phone camera", x0 + CW / 2, qy + size + 10, { align: "center" });
    doc.setFontSize(8.5); doc.setTextColor(106, 114, 124); doc.text(doc.splitTextToSize("to see the 14 allergens in each dish. Please tell your server about any allergy.", CW - 24), x0 + CW / 2, qy + size + 16, { align: "center" });
  }
  return doc.output("arraybuffer") as ArrayBuffer;
}
