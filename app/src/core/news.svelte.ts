// "What's new": one short card on Today after an update, until the cook taps "Got it". The full list is in Settings.
// Add new entries at the top; the first entry's id is what the card compares with bb-news3.
import { Persisted, KEYS, read } from "./store.svelte";
export interface News { id: string; date: string; items: [title: string, text: string, href: string][] }
export const NEWS: News[] = [
  { id: "2026-11-27", date: "27 November 2026", items: [
    ["Make it mine", "Copy any library recipe and change grams, steps and serving.", "#recipes"],
    ["My notes", "Add your kitchen's notes to any recipe. They show in cook mode and in the PDF.", "#recipes"],
    ["Gels & thickeners", "Gelatin sheets or powder by bloom, agar, starch, roux and xanthan.", "#tool-gel"],
    ["Recipes without…", "Filters → Without: hide recipes with mushrooms, pork or anything else.", "#recipes"],
  ] },
];
const seen = new Persisted<string>(KEYS.news, "");
// A first start gets the welcome tour instead, so it starts with everything marked as seen.
if (!seen.v && !read<number>(KEYS.tour, 0)) seen.set(NEWS[0].id);
class NewsState {
  show = $state(seen.v !== NEWS[0].id);
  done() { this.show = false; seen.set(NEWS[0].id); }
}
export const news = new NewsState();
