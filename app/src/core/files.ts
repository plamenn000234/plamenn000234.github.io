// Files: safe names, saving through the Android bridge or a download, and the PDF library (loaded on first use).
import { toast } from "./ui.svelte";

const CYR: Record<string, string> = { "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo", "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "h", "ц": "ts", "ч": "ch", "ш": "sh", "щ": "sht", "ъ": "a", "ы": "y", "ь": "y", "э": "e", "ю": "yu", "я": "ya" };
const EXTRA: Record<string, string> = { "ı": "i", "ł": "l", "ő": "o", "ű": "u", "œ": "oe", "Œ": "OE" };

/** The built-in PDF fonts only know Latin-1, so other characters are spelled out. */
export function pdfSafe(s: unknown) {
  return String(s ?? "").replace(/≈/g, "~").replace(/[–—]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/×/g, "x").replace(/·/g, "-").replace(/…/g, "...")
    .replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/→/g, "->")
    .replace(/[а-яёА-ЯЁ]/g, (ch) => { const lo = ch.toLowerCase(), t = CYR[lo]; if (t == null) return ""; return ch === lo ? t : t.charAt(0).toUpperCase() + t.slice(1); })
    .replace(/[^\x00-\xFF]/g, (ch) => { const b = ch.normalize("NFD")[0]; return b.charCodeAt(0) < 256 ? b : EXTRA[ch] || ""; });
}
export function fileBase(s: unknown) {
  return pdfSafe(s || "file").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 80);
}
const typeOf = (f: string) => /\.pdf$/i.test(f) ? "application/pdf" : /\.csv$/i.test(f) ? "text/csv" : /\.json$/i.test(f) ? "application/json" : "application/octet-stream";

export async function saveFile(filename: string, data: ArrayBuffer | string) {
  const A = window.ChefsheetApp;
  if (A?.saveFile) {
    try {
      const by = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
      let bin = ""; for (let i = 0; i < by.length; i += 32768) bin += String.fromCharCode.apply(null, by.subarray(i, i + 32768) as any);
      if (A.saveFile(filename, typeOf(filename), btoa(bin)) === "ok") return true;
    } catch {}
    toast.show("Could not save the file. Use Copy."); return false;
  }
  try {
    const u = URL.createObjectURL(new Blob([data], { type: typeOf(filename) }));
    const a = document.createElement("a"); a.href = u; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000); toast.show("Saved " + filename); return true;
  } catch { toast.show("Could not save the file. Use Copy."); return false; }
}

let lib: Promise<any> | null = null;
/** A4 jsPDF document; the library is a separate chunk, so it only loads when a PDF is made. */
export async function pdfDoc(landscape = false) {
  lib ||= import("jspdf").then((m) => m.jsPDF).catch((e) => { lib = null; throw e; });
  const J = await lib;
  return new J({ unit: "mm", format: "a4", orientation: landscape ? "landscape" : "portrait" });
}
/** Runs a PDF builder and saves the result, with one message for every failure. */
export async function makePdf(name: string, build: () => Promise<ArrayBuffer | null> | ArrayBuffer | null) {
  toast.show("Making the PDF…");
  try { const b = await build(); if (!b) { toast.show("Nothing to put in the PDF"); return; } await saveFile(name, b); }
  catch { toast.show("The PDF tool did not load. Check the connection and try again."); }
}
export const today = () => new Date().toISOString().slice(0, 10);
export function fmtD(t: number, withTime = false) {
  const d = new Date(t), p = (n: number) => String(n).padStart(2, "0");
  return p(d.getDate()) + "." + p(d.getMonth() + 1) + "." + d.getFullYear() + (withTime ? " " + p(d.getHours()) + ":" + p(d.getMinutes()) : "");
}
