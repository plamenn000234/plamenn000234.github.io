// learn.json: modules, lessons, tables (several tools read their numbers from lesson tables) and the glossary.
import { ROOT } from "./catalog";
export interface Table { c: string; h: string[]; r: string[][] }
export interface Lesson { id: string; t: string; k: string; p?: string[]; tb: Table[]; x?: string[]; q?: string; tool?: string }
export interface Module { id: string; n: number; t: string; ic: string; free?: boolean; L: Lesson[]; quiz: [string, string[], number][] }
export const LD = { ready: false, mods: [] as Module[], gloss: [] as [string, string[][]][], byL: new Map<string, { m: Module; l: Lesson; li: number }>() };
let p: Promise<typeof LD> | null = null;
export function loadLearn() {
  if (!p) p = fetch(ROOT + "learn.json").then((r) => { if (!r.ok) throw new Error("learn " + r.status); return r.json(); }).then((j) => {
    LD.mods = j.mods; LD.gloss = j.gloss; for (const m of LD.mods) m.L.forEach((l, li) => LD.byL.set(l.id, { m, l, li })); LD.ready = true; return LD;
  }).catch((e) => { p = null; throw e; });
  return p;
}
export const rowsOf = (lessonId: string, ti: number) => { const e = LD.byL.get(lessonId); return e && e.l.tb[ti] ? e.l.tb[ti].r : []; };
