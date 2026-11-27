// The cook's own notes on any recipe, library or own (bb-notes: { recipeId: { t, updatedAt } }).
import { Persisted, KEYS } from "./store.svelte";
export interface Note { t: string; updatedAt: number }
export const notes = new Persisted<Record<string, Note>>(KEYS.notes, {});
if (!notes.v || typeof notes.v !== "object" || Array.isArray(notes.v)) notes.set({});
export const noteOf = (id: string) => (notes.v[id]?.t || "").trim();
export function setNote(id: string, t: string) {
  const v = t.trim(); const n = { ...notes.v };
  if (v) n[id] = { t: v, updatedAt: Date.now() }; else delete n[id];
  notes.set(n);
}
