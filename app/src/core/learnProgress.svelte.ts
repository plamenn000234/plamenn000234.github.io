// Training progress in bb-learn (same shape as 2.x): lessons done, test results, mistakes to repeat,
// card of the day with a streak, and tasks a chef sends to a cook by link.
import { Persisted, KEYS } from "./store.svelte";
import { LD, type Module } from "./learn";
import { R, type Recipe } from "./catalog";
import { fold } from "./util";
import { pdfDoc, pdfSafe } from "./files";

export interface QuizRes { best: number; pass: boolean; at: number | null; last?: number }
export interface Task { by: string; due: string; at: number; sent?: number }
export interface LearnP {
  done: Record<string, number>; quiz: Record<string, QuizRes>; name: string; chef?: string;
  miss: Record<string, { due: number; n: number }>; streak: { last: string; n: number }; daily?: { d: string; a: number }; tasks: Record<string, Task>;
}
export const LP = new Persisted<LearnP>(KEYS.learn, { done: {}, quiz: {}, name: "", miss: {}, streak: { last: "", n: 0 }, tasks: {} });
{ const v = LP.v; if (!v.done) v.done = {}; if (!v.quiz) v.quiz = {}; if (!v.miss) v.miss = {}; if (!v.streak) v.streak = { last: "", n: 0 }; if (!v.tasks) v.tasks = {}; if (v.name == null) v.name = ""; }

export const DAY = 864e5;
export const dayKey = (t?: number) => { const d = new Date(t || Date.now()); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
/** The same answer order every time for a given seed, so the card of the day does not reshuffle. */
export function shuf(n: number, seed: string) {
  const a = [...Array(n).keys()]; let h = 0; for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  for (let k = n - 1; k > 0; k--) { h = (h * 1103515245 + 12345) >>> 0; const r = h % (k + 1); [a[k], a[r]] = [a[r], a[k]]; }
  return a;
}
export const modDone = (m: Module) => m.L.filter((l) => LP.v.done[l.id]).length;
export const passed = (id: string) => !!LP.v.quiz[id]?.pass;

/* ---------- card of the day ---------- */
type Q = [Module, number, [string, string[], number]];
const allQs = (): Q[] => LD.mods.flatMap((m) => ((m as any).quiz as any[]).map((x, i) => [m, i, x] as Q));
export function dailyPick() {
  const n = Math.floor((Date.now() - new Date().getTimezoneOffset() * 6e4) / DAY);
  const Q = allQs(), Ls = LD.mods.flatMap((m) => m.L.filter((l) => l.k).map((l) => [m, l] as const));
  return { q: Q[(n * 7919) % Q.length], f: Ls[(n * 104729) % Ls.length] };
}
export function streakNow() { const t = dayKey(), y = dayKey(Date.now() - DAY), s = LP.v.streak; return s.last === t || s.last === y ? s.n : 0; }
export function answerDaily(j: number) {
  const { q: [m, i, x] } = dailyPick(), today = dayKey(), v = LP.v; if (v.daily && v.daily.d === today) return;
  v.daily = { d: today, a: j };
  v.streak = { last: today, n: (v.streak.last === dayKey(Date.now() - DAY) ? v.streak.n : 0) + 1 };
  if (j !== x[2]) addMiss(m.id, i); else delete v.miss[m.id + ":" + i];
  LP.save();
}

/* ---------- mistakes come back after a day ---------- */
export function addMiss(mid: string, i: number) { const k = mid + ":" + i, e = LP.v.miss[k]; LP.v.miss[k] = { due: Date.now() + DAY, n: e ? e.n + 1 : 1 }; }
export const missDue = () => Object.entries(LP.v.miss).filter(([, v]) => v.due <= Date.now()).map(([k]) => k);

/* ---------- tests ---------- */
export function submitQuiz(m: Module, answers: Record<number, number>) {
  const quiz = (m as any).quiz as [string, string[], number][];
  const sc = Math.round(quiz.filter((x, i) => answers[i] === x[2]).length / quiz.length * 100);
  const prev = LP.v.quiz[m.id] || { best: 0, pass: false, at: null };
  LP.v.quiz[m.id] = { best: Math.max(prev.best, sc), pass: prev.pass || sc >= 80, at: sc >= 80 && !prev.pass ? Date.now() : prev.at || null, last: sc };
  quiz.forEach((x, i) => { if (answers[i] !== x[2]) addMiss(m.id, i); else delete LP.v.miss[m.id + ":" + i]; });
  LP.save(); return sc;
}

/* ---------- tasks from a chef: #l-<id>?by=Name&due=YYYY-MM-DD or #quiz-<id>?by=… ---------- */
export const SITE = "https://plamenn000234.github.io/";
const tParts = (k: string) => { const i = k.indexOf(":"); return [k.slice(0, i), k.slice(i + 1)]; };
export function taskTitle(k: string) {
  const [ty, id] = tParts(k);
  if (ty === "q") { const m = LD.mods.find((x) => x.id === id); return m ? `Test · Module ${m.n}: ${m.t}` : null; }
  const e = LD.byL.get(id); return e ? `Lesson · ${e.l.t}` : null;
}
export const taskDone = (k: string) => { const [ty, id] = tParts(k); return ty === "q" ? passed(id) : !!LP.v.done[id]; };
export const taskHref = (k: string) => { const [ty, id] = tParts(k); return ty === "q" ? "#quiz-" + id : "#l-" + id; };
export const dueTxt = (d: string) => d ? new Date(d + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
/** Stores a task from the link and returns who sent it. */
export function takeTask(view: "lesson" | "quiz", id: string, q: URLSearchParams) {
  const by = (q.get("by") || "").trim().slice(0, 60), due = (q.get("due") || "").slice(0, 10); if (!by) return "";
  LP.v.tasks[(view === "quiz" ? "q:" : "l:") + id] = { by, due: /^\d{4}-\d\d-\d\d$/.test(due) ? due : "", at: Date.now() }; LP.save(); return by;
}
export function taskLink(k: string, by: string, days: number) {
  const due = days ? dayKey(Date.now() + days * DAY) : "", t = taskTitle(k) || "";
  const link = SITE + taskHref(k) + "?by=" + encodeURIComponent(by) + (due ? "&due=" + due : "");
  const q = k[0] === "q";
  return `${by} asks you to ${q ? "pass the test" : "read the lesson"} “${t.replace(/^\w+ · /, "")}” in Chefsheet${due ? " by " + dueTxt(due) : ""}.\n${q ? "When you pass, tap “Send certificate” and send it back." : "When you finish, tap “Tell " + by + "” and send it back."}\n${link}`;
}

/* ---------- recipes to practise after a lesson ---------- */
const LREC: Record<string, string> = { "pass-language": "plated", "knife-safety": "julienne", "mise-en-place": "salad", "allergy-orders": "gluten free", "service-flow": "canape", "culinary-systems": "roasted", "food-cost": "yield test", "kitchen-economics": "stew", "inventory": "stock", "quality": "sauce", "training-team": "omelette" };
export function lessonRecipes(l: { id: string; q?: string }) {
  const q = l.q || LREC[l.id]; if (!q) return { q: "", n: 0, top: [] as Recipe[] };
  const toks = fold(q).split(/[^\p{L}\p{N}%]+/u).filter((t) => t.length > 1); if (!toks.length) return { q, n: 0, top: [] as Recipe[] };
  const wm = (w: string, t: string) => w === t || w === t + "s" || w === t + "es" || (t.length >= 5 && w.startsWith(t));
  const T: Recipe[] = [], H: Recipe[] = [];
  for (const r of R) {
    if (r.mine) continue; const ws = r.tl.split(/[^\p{L}\p{N}]+/u);
    if (toks.every((t) => ws.some((w) => wm(w, t)))) T.push(r); else if (toks.every((t) => r.tl.includes(t) || r.hay.includes(t))) H.push(r);
  }
  T.sort((a, b) => a.t.length - b.t.length);
  const all = [...T, ...H], seen = new Set<string>(), top: Recipe[] = [];
  for (const r of all) { const k = fold(r.t).slice(0, 14); if (seen.has(k)) continue; seen.add(k); top.push(r); if (top.length >= 4) break; }
  return { q, n: all.length, top };
}

/* ---------- certificate ---------- */
import qrcode from "qrcode-generator";
import { registerCert, certUrl } from "./cloud.svelte";
export async function certPdf(id: string) {
  const all = id === "all", m = all ? null : LD.mods.find((x) => x.id === id); if (!all && !m) return null;
  const v = LP.v, doc = await pdfDoc(true), W = 297, H = 210;
  doc.setFillColor(250, 250, 251); doc.rect(0, 0, W, H, "F"); doc.setDrawColor(217, 72, 15); doc.setLineWidth(1.4); doc.rect(10, 10, W - 20, H - 20); doc.setLineWidth(0.3); doc.rect(14, 14, W - 28, H - 28);
  doc.setTextColor(217, 72, 15); doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("C H E F S H E E T   K I T C H E N   T R A I N I N G", W / 2, 38, { align: "center" });
  doc.setTextColor(20, 23, 27); doc.setFont("helvetica", "bold"); doc.setFontSize(32); doc.text(all ? "Certificate of Completion" : "Certificate of Achievement", W / 2, 60, { align: "center" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(106, 114, 124); doc.text("This certifies that", W / 2, 78, { align: "center" });
  doc.setFont("times", "bolditalic"); doc.setFontSize(30); doc.setTextColor(20, 23, 27); doc.text(pdfSafe(v.name || "—"), W / 2, 96, { align: "center" });
  doc.setDrawColor(200, 200, 200); doc.line(W / 2 - 70, 100, W / 2 + 70, 100);
  doc.setFont("helvetica", "normal"); doc.setFontSize(12); doc.setTextColor(106, 114, 124);
  doc.text(all ? "has completed all modules and passed every test of" : "has completed the module and passed the test", W / 2, 112, { align: "center" });
  doc.setFont("helvetica", "bold"); doc.setFontSize(19); doc.setTextColor(20, 23, 27);
  const ttl = all ? "Professional Kitchen Foundations" : `Module ${m!.n}: ${m!.t}`; doc.text(doc.splitTextToSize(pdfSafe(ttl), 220), W / 2, 126, { align: "center" });
  const sc = all ? Math.round(LD.mods.reduce((a, x) => a + (v.quiz[x.id] ? v.quiz[x.id].best : 0), 0) / LD.mods.length) : v.quiz[m!.id]?.best || 0;
  const ln = all ? LD.mods.reduce((a, x) => a + x.L.length, 0) : m!.L.length;
  doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(106, 114, 124);
  doc.text(pdfSafe(all ? `${LD.mods.length} modules  |  ${ln} lessons  |  average test score ${sc}%` : `${ln} lessons  |  test score ${sc}%  |  pass mark 80%`), W / 2, 142, { align: "center" });
  const dt = new Date(all ? Date.now() : v.quiz[m!.id]?.at || Date.now()).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  doc.setFontSize(10); doc.text("Date", 70, 172, { align: "center" }); doc.text("Certificate no.", W - 70, 172, { align: "center" });
  doc.setTextColor(20, 23, 27); doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text(dt, 70, 165, { align: "center" });
  // Signed in: the certificate is registered on the server and carries a QR anyone can check.
  const vid = await registerCert({ name: v.name || "", title: ttl, score: sc, date: dt });
  const no = vid ? vid.toUpperCase() : "CS-" + (all ? "ALL" : m!.id.toUpperCase()) + "-" + (Math.abs([...(v.name || "x") + dt].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % 1e6).toString().padStart(6, "0");
  if (vid) {
    const q = qrcode(0, "M"); q.addData(certUrl(vid)); q.make(); const n = q.getModuleCount(), size = 26, cell = size / n, qx = W - 14 - 6 - size, qy = 22;
    doc.setFillColor(255, 255, 255); doc.rect(qx - 2, qy - 2, size + 4, size + 4, "F"); doc.setFillColor(20, 23, 27);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) doc.rect(qx + c * cell, qy + r * cell, cell + 0.02, cell + 0.02, "F");
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(106, 114, 124); doc.text("Scan to check", qx + size / 2, qy + size + 5, { align: "center" });
  }
  doc.text(no, W - 70, 165, { align: "center" }); doc.setDrawColor(200, 200, 200); doc.line(40, 168, 100, 168); doc.line(W - 100, 168, W - 40, 168);
  doc.setFillColor(217, 72, 15); doc.circle(W / 2, 166, 11, "F"); doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.text(all ? "COURSE" : "PASSED", W / 2, 167.2, { align: "center" });
  return doc.output("arraybuffer") as ArrayBuffer;
}
