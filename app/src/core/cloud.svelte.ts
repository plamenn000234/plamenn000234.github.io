// The optional account and the server (Cloudflare Worker, see server/worker.js).
// Without an account the app works as before. Signed in: a cloud copy, shared kitchens with roles,
// a live prep board, verifiable certificates and community recipes.
// The session token is kept in its own key, outside bb-*, so it never lands in a backup file.
import { backup, restore } from "./store.svelte";
import { toast } from "./ui.svelte";

const DEFAULT_API = "https://patient-firefly-eed2.plamenn000234.workers.dev";
export const API = (() => { try { return localStorage.getItem("cs-api") || DEFAULT_API; } catch { return DEFAULT_API; } })();
const AK = "cs-account";

export interface User { id: string; email: string; name: string }
export interface KitchenRef { id: string; name: string; role: "owner" | "chef" | "cook" }
interface Acct { token: string; user: User | null; kitchens: KitchenRef[]; syncAt: number; auto: boolean; stats: boolean }
const blank = (): Acct => ({ token: "", user: null, kitchens: [], syncAt: 0, auto: true, stats: true });
function load(): Acct { try { return { ...blank(), ...JSON.parse(localStorage.getItem(AK) || "{}") }; } catch { return blank(); } }

class Cloud {
  a = $state<Acct>(load());
  google = $state<string | null>(null); // the Google client id from the server, "" = not set up yet, null = not asked
  online = $state(true);
  busy = $state(false);
  get signed() { return !!this.a.token && !!this.a.user; }
  save() { try { localStorage.setItem(AK, JSON.stringify(this.a)); } catch {} }
}
export const cloud = new Cloud();

export class ApiError extends Error { constructor(public status: number, public code: string) { super(code); } }
export async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  let r: Response;
  try {
    r = await fetch(API + path, { method, headers: { "Content-Type": "application/json", ...(cloud.a.token ? { Authorization: "Bearer " + cloud.a.token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch { cloud.online = false; throw new ApiError(0, "offline"); }
  cloud.online = true;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401 && j.error === "sign_in" && cloud.a.token) { cloud.a = { ...blank(), auto: cloud.a.auto, stats: cloud.a.stats }; cloud.save(); }
    throw new ApiError(r.status, j.error || "server");
  }
  return j as T;
}
const MSG: Record<string, string> = {
  offline: "No connection. Try again when you are online", sign_in: "Sign in first", bad_code: "No kitchen with this code", role: "Your role can't do this",
  limit: "Daily limit reached. Try again tomorrow", too_big: "Too big to save", not_found: "Not found", full: "This kitchen is full", bad_audience: "Sign-in is not set up yet",
};
export const errText = (e: unknown) => (e instanceof ApiError ? MSG[e.code] || "Something went wrong (" + e.code + ")" : "Something went wrong");
/** Runs a call and shows a toast if it fails. */
export async function tryApi<T>(f: () => Promise<T>): Promise<T | null> { try { return await f(); } catch (e) { toast.show(errText(e)); return null; } }

/* ---------- sign in ---------- */
export async function serverInfo() {
  if (cloud.google != null) return cloud.google;
  try { const j = await api<{ google: string | boolean }>("GET", "/"); cloud.google = typeof j.google === "string" ? j.google : ""; } catch { cloud.google = null; }
  return cloud.google;
}
export async function signInWith(credential: string) {
  const j = await api<{ token: string; user: User }>("POST", "/auth/google", { credential });
  cloud.a.token = j.token; cloud.a.user = j.user; cloud.save(); await refresh(); return j.user;
}
let gis: Promise<any> | null = null;
function loadGis() {
  gis ||= new Promise((ok, no) => { const s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.onload = () => ok((window as any).google); s.onerror = () => { gis = null; no(new Error("gis")); }; document.head.appendChild(s); });
  return gis;
}
/** Draws the Google button into el. Returns false where Google sign-in can't run (no client id, offline, the Android app). */
export async function googleButton(el: HTMLElement, done: (u: User) => void) {
  const id = await serverInfo(); if (!id) return false;
  const A: any = (window as any).ChefsheetApp;
  if (A?.googleSignIn) { // the Android app signs in natively and hands back the ID token
    const b = document.createElement("button"); b.className = "gbtn"; b.textContent = "Sign in with Google";
    b.onclick = () => { (window as any).chefsheetGoogle = (tok: string) => tok && signInWith(tok).then(done).catch((e) => toast.show(errText(e))); A.googleSignIn(id); };
    el.replaceChildren(b); return true;
  }
  if (document.documentElement.classList.contains("native")) return false;
  try {
    const g = await loadGis();
    g.accounts.id.initialize({ client_id: id, callback: (r: any) => signInWith(r.credential).then(done).catch((e) => toast.show(errText(e))) });
    g.accounts.id.renderButton(el, { theme: "outline", size: "large", shape: "pill", text: "signin_with", width: 260 });
    return true;
  } catch { return false; }
}
export async function signOut() {
  try { await api("POST", "/auth/logout"); } catch {}
  cloud.a = { ...blank(), auto: cloud.a.auto, stats: cloud.a.stats }; cloud.save();
}
export async function deleteAccount() { await api("DELETE", "/me"); cloud.a = { ...blank(), stats: cloud.a.stats }; cloud.save(); }
export async function refresh() {
  if (!cloud.a.token) return null;
  const j = await api<{ user: User; kitchens: KitchenRef[]; sync: { at: number } | null }>("GET", "/me");
  cloud.a.user = j.user; cloud.a.kitchens = j.kitchens; cloud.save(); return j;
}

/* ---------- cloud copy ---------- */
export async function pushCopy() { const j = await api<{ at: number }>("PUT", "/sync", { data: backup() }); cloud.a.syncAt = j.at; cloud.save(); return j.at; }
export async function pullCopy() {
  const j = await api<{ at: number; data: any }>("GET", "/sync"); if (!j.data) return -1;
  const n = restore(j.data); cloud.a.syncAt = j.at; cloud.save(); return n;
}
let lastPush = 0;
/** Saves the cloud copy when the app goes to the background, at most every 5 minutes. */
export function autoCopy() {
  addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "hidden" || !cloud.signed || !cloud.a.auto || Date.now() - lastPush < 300e3) return;
    lastPush = Date.now(); pushCopy().catch(() => {});
  });
}

/* ---------- anonymous usage counts: event names only, no ids, can be turned off ---------- */
const evq: string[] = [];
export function track(ev: string) { if (cloud.a.stats && evq.length < 40) evq.push(ev); }
function flush() {
  if (!evq.length || !cloud.a.stats) return;
  const body = JSON.stringify({ v: __APP_VERSION__, ev: evq.splice(0) });
  try { if (!navigator.sendBeacon?.(API + "/ev", new Blob([body], { type: "text/plain" }))) fetch(API + "/ev", { method: "POST", body, keepalive: true }).catch(() => {}); } catch {}
}
export function startStats() { track("open"); addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flush()); addEventListener("pagehide", flush); }

/* ---------- verifiable certificates ---------- */
export const certUrl = (id: string) => API + "/c/" + id;
/** Registers a certificate when signed in, so the PDF can carry a QR anyone can check. */
export async function registerCert(c: { name: string; title: string; score: number; date: string }) {
  if (!cloud.signed) return null;
  try { return (await api<{ id: string }>("POST", "/certs", c)).id; } catch { return null; }
}
