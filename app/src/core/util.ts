// Small pure helpers, ported 1:1 from the 2.x app.
export const fold = (s: unknown) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/ı/g, "i").replace(/ø/g, "o").replace(/æ/g, "ae").replace(/œ/g, "oe").replace(/ß/g, "ss");
export const key = (s: unknown) => fold(String(s)).replace(/\s+/g, " ").trim();

export function splitName(n: string): [string, string] {
  const i = n.indexOf(" · ");
  return i < 0 ? [n, ""] : [n.slice(0, i), n.slice(i + 3)];
}
export function fmtG(g: number) {
  if (!isFinite(g) || g <= 0) return "–";
  if (g >= 1000) return (Math.round(g / 10) / 100).toLocaleString("en") + " kg";
  if (g >= 100) return Math.round(g) + " g";
  if (g >= 10) return Math.round(g * 2) / 2 + " g";
  return Math.round(g * 10) / 10 + " g";
}
export function roundQty(q: number, u: string) {
  if (q <= 0) return 0;
  if (u === "pcs") return Math.ceil(q - 1e-9);
  if (q >= 5) return Math.ceil(q * 2 - 1e-9) / 2;
  if (q >= 0.5) return Math.ceil(q * 10 - 1e-9) / 10;
  return Math.ceil(q * 100 - 1e-9) / 100;
}
export function fmtQ(q: number) {
  if (!q) return "–";
  return q < 1 ? q.toFixed(2).replace(/0+$/, "").replace(/\.$/, "") : (Math.round(q * 10) / 10).toString();
}
/** First number in a table cell; a range "60–65" gives its middle. */
export const num = (s: unknown) => {
  const m = String(s).replace(",", ".").match(/\d+(\.\d+)?/g);
  if (!m) return NaN;
  return m.length > 1 && /[–-]/.test(String(s)) ? (parseFloat(m[0]) + parseFloat(m[1])) / 2 : parseFloat(m[0]);
};
export const f1 = (v: number) => (isFinite(v) ? (Math.round(v * 10) / 10).toLocaleString("en") : "–");
export const f0 = (v: number) => (isFinite(v) ? Math.round(v).toLocaleString("en") : "–");
export function fmtT(s: number) {
  s = Math.max(0, Math.ceil(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? h + ":" + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0");
}
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** Times in recipe steps ("simmer 20 min", "2–3 h"), for tap-to-start timers. */
export const TM_RE = /(\d+(?:[.,]\d+)?|½)(?:\s*(?:–|-|to)\s*(\d+(?:[.,]\d+)?))?\s*(hours?|hrs?|h|minutes?|mins?|min|seconds?|secs?|sec|s)(?![\w])/g;
export function tmSec(n: string, u: string) {
  const v = n === "½" ? 0.5 : parseFloat(String(n).replace(",", "."));
  if (/^h/.test(u)) return v * 3600;
  if (/^m/.test(u)) return v * 60;
  return v;
}
/** Splits text into plain parts and timer parts. */
export function timeParts(s: string): Array<{ t: string; sec?: number }> {
  const out: Array<{ t: string; sec?: number }> = [];
  let last = 0;
  for (const m of s.matchAll(TM_RE)) {
    const sec = Math.round(tmSec(m[1], m[3]));
    if (!sec || sec > 172800) continue;
    if (m.index! > last) out.push({ t: s.slice(last, m.index) });
    out.push({ t: m[0], sec });
    last = m.index! + m[0].length;
  }
  if (last < s.length) out.push({ t: s.slice(last) });
  return out;
}
/** Shelf life from a storage note: temperature and duration. */
export function shelf(st: unknown) {
  const s = String(st || "");
  const r: { temp: string; ms: number | null; txt: string } = { temp: "", ms: null, txt: "" };
  const t = s.match(/(−|-)?\d+\s*[–-]\s*\d+\s*°\s*C|[−-]\s*18\s*°\s*C|\d+\s*°\s*C/);
  if (t) r.temp = t[0].replace(/\s+/g, " ");
  if (/same day|day of/i.test(s) && !/\d+\s*(h|days?)\b/i.test(s)) { r.ms = 0; r.txt = "same day"; }
  const d = s.match(/(\d+)(?:\s*[–-]\s*\d+)?\s*(h|hrs?|hours?|days?|d|weeks?|wk|months?)\b/i);
  if (d) {
    const n = +d[1], u = d[2].toLowerCase(), H = 36e5;
    r.ms = u[0] === "h" ? n * H : u[0] === "d" ? n * 24 * H : u[0] === "w" ? n * 7 * 24 * H : n * 30 * 24 * H;
    r.txt = d[0];
  }
  return r;
}

/** URL-safe base64 of UTF-8 text, for data packed into a link. */
export const b64u = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
export const unb64u = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)));
/** This app's own address without the hash, for links that open a screen of it. */
export const appBase = () => location.href.replace(/[#?].*$/, "");
