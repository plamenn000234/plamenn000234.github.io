// Onboarding a new cook: the chef packs tests, recipes and a first-week checklist into one link.
// The cook opens it: the tests become tasks from the chef (bb-learn), the rest lives in bb-onboard.
import { Persisted, KEYS } from "./store.svelte";
import { LP, passed, dayKey, DAY } from "./learnProgress.svelte";
import { byId } from "./catalog";
import { b64u, unb64u, appBase } from "./util";

export interface Pack { id: string; by: string; st: string; due: string; mods: string[]; recs: string[]; check: string[]; ticks: number[]; known: string[]; at: number }
export const OB = new Persisted<{ packs: Pack[] }>(KEYS.onboard, { packs: [] });
if (!OB.v || !Array.isArray(OB.v.packs)) OB.set({ packs: [] });

export const CHECK = ["Meet the team and the head chef", "Find the fire exits, first aid kit and fire blanket", "Learn where everything is stored in the fridges and the dry store",
  "Read the allergen matrix of the menu", "Learn the cleaning schedule of your section", "Work one full service next to an experienced cook"];

export function packLink(p: Omit<Pack, "id" | "ticks" | "known" | "at">, days: number) {
  const due = days ? dayKey(Date.now() + days * DAY) : "";
  const o = { i: Date.now().toString(36), b: p.by.slice(0, 60), s: p.st.slice(0, 60), d: due, m: p.mods, r: p.recs.filter((id) => byId.has(id) && !byId.get(id)!.mine), c: p.check.map((x) => x.slice(0, 120)).slice(0, 20) };
  return appBase() + "#welcome?d=" + b64u(JSON.stringify(o));
}
/** Stores the pack from a link (once) and turns its tests into tasks from the chef. Returns its id. */
export function takePack(d: string | null) {
  if (!d) return "";
  try {
    const o = JSON.parse(unb64u(d)); if (!o || !o.i || !o.b) return "";
    const s = (x: unknown, n: number) => String(x ?? "").slice(0, n), arr = (x: unknown) => (Array.isArray(x) ? x.map((y) => s(y, 120)) : []);
    const p: Pack = { id: s(o.i, 20), by: s(o.b, 60), st: s(o.s, 60), due: /^\d{4}-\d\d-\d\d$/.test(o.d) ? o.d : "", mods: arr(o.m).slice(0, 20), recs: arr(o.r).slice(0, 40), check: arr(o.c).slice(0, 20), ticks: [], known: [], at: Date.now() };
    if (!OB.v.packs.some((x) => x.id === p.id)) { OB.v.packs.unshift(p); OB.save(); }
    for (const m of p.mods) if (!LP.v.tasks["q:" + m]) LP.v.tasks["q:" + m] = { by: p.by, due: p.due, at: Date.now() };
    LP.save(); return p.id;
  } catch { return ""; }
}
export function progress(p: Pack) {
  const total = p.mods.length + p.recs.length + p.check.length;
  const done = p.mods.filter((m) => passed(m)).length + p.known.filter((r) => p.recs.includes(r)).length + p.ticks.filter((i) => i < p.check.length).length;
  return { done, total };
}
