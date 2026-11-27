// App-wide UI state: theme, toasts, timers, sheets.
import { Persisted, KEYS } from "./store.svelte";

declare global { interface Window { ChefsheetApp?: any; webkitAudioContext?: any } }
export const native = () => !!window.ChefsheetApp;

/* ---------- theme ---------- */
export const THEMES = [["auto", "Like the phone"], ["light", "Light"], ["dark", "Dark"], ["night", "Warm night"]] as const;
export const theme = new Persisted<string>(KEYS.theme, "auto");
export function applyTheme() {
  const t = THEMES.some((x) => x[0] === theme.v) ? theme.v : "auto";
  if (t === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", t);
}
export function nextTheme() { const i = THEMES.findIndex((x) => x[0] === theme.v); theme.set(THEMES[(i + 1) % THEMES.length][0]); applyTheme(); return THEMES[(i + 1) % THEMES.length][1]; }

/* ---------- toast ---------- */
class Toasts { msg = $state(""); n = $state(0); private t: any = 0;
  show(m: string) { this.msg = m; this.n++; clearTimeout(this.t); this.t = setTimeout(() => (this.msg = ""), 2600); } }
export const toast = new Toasts();

/* ---------- timers ---------- */
export interface Timer { id: string; label: string; ctx: string; dur: number; end: number; left: number; run: boolean; fired: boolean }
let actx: AudioContext | null = null;
class Timers {
  list = $state<Timer[]>([]);
  private iv: any = null;
  add(sec: number, label: string, ctx = "") {
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === "suspended") actx.resume(); } catch {}
    const t: Timer = { id: Math.random().toString(36).slice(2), label, ctx, dur: sec, end: Date.now() + sec * 1000, left: sec, run: true, fired: false };
    this.list.push(t); this.native(t, true); this.loop(); toast.show("Timer started: " + label);
  }
  private loop() { if (!this.iv) this.iv = setInterval(() => this.tick(), 500); }
  tick() {
    const now = Date.now(); let any = false;
    for (const t of this.list) {
      if (t.run) { t.left = (t.end - now) / 1000; if (t.left <= 0 && !t.fired) { t.fired = true; t.run = false; t.left = 0; alarm(t); } }
      if (t.run) any = true;
    }
    if (!any && !this.list.some((t) => t.fired)) { clearInterval(this.iv); this.iv = null; }
  }
  pause(id: string) {
    const t = this.list.find((x) => x.id === id); if (!t || t.fired) return;
    if (t.run) { t.run = false; t.left = (t.end - Date.now()) / 1000; this.native(t, false); }
    else { t.run = true; t.end = Date.now() + t.left * 1000; this.native(t, true); this.loop(); }
  }
  remove(id: string) { const t = this.list.find((x) => x.id === id); if (t) this.native(t, false); this.list = this.list.filter((x) => x.id !== id); }
  private native(t: Timer, on: boolean) {
    const A = window.ChefsheetApp; if (!A || !A.setTimer) return;
    try { if (on) A.setTimer(t.id, t.end, t.label + (t.ctx ? " · " + t.ctx : "")); else A.cancelTimer(t.id); } catch {}
  }
}
export const timers = new Timers();
function alarm(t: Timer) {
  try { navigator.vibrate?.([300, 120, 300, 120, 600]); } catch {}
  try {
    if (!actx) return; const now = actx.currentTime;
    for (let i = 0; i < 3; i++) { const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(0.0001, now + i * 0.45); g.gain.exponentialRampToValueAtTime(0.4, now + i * 0.45 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.45 + 0.35); o.connect(g).connect(actx.destination); o.start(now + i * 0.45); o.stop(now + i * 0.45 + 0.4); }
  } catch {}
  toast.show("Time is up: " + t.label);
}

/* ---------- share / copy ---------- */
export async function copyText(t: string, msg = "Copied") {
  if (window.ChefsheetApp?.copyText) { try { window.ChefsheetApp.copyText(t); toast.show(msg); return; } catch {} }
  try { await navigator.clipboard.writeText(t); toast.show(msg); } catch { toast.show("Could not copy"); }
}
export async function shareText(title: string, text: string) {
  if (window.ChefsheetApp?.shareText) { try { window.ChefsheetApp.shareText(title, text); return; } catch {} }
  if (navigator.share) { try { await navigator.share({ title, text }); return; } catch (e: any) { if (e?.name === "AbortError") return; } }
  copyText(text, "Copied. Paste it into any chat or email");
}
