// Every tool has the same shape, so search, Today, pins and the recipe tool strip pick it up on their own.
import type { Component } from "svelte";
import type { Recipe, Detail } from "../core/catalog";

export interface FromRecipe { r: Recipe; d: Detail | null; portions: number; raw: number; cooked: number | null; costPortion: number | null }
export interface ToolDef {
  id: string; name: string; group: string; icon: string; desc: string; kw: string;
  load: () => Promise<{ default: Component<any> }>;
  learn?: boolean;               // needs learn.json tables
  fromRecipe?: (x: FromRecipe) => Record<string, any> | null;
}
export const TOOL_GROUPS = ["Calculate", "Heat & time", "Salt & texture", "Money", "Safety", "Reference"];

export const TOOLS: ToolDef[] = [
  { id: "yield", name: "Yield", group: "Calculate", icon: "tool-yield", desc: "Raw to cooked, cooked to raw", kw: "loss shrink raw cooked trim weight", learn: true,
    load: () => import("./Yield.svelte"), fromRecipe: (x) => ({ raw: x.raw || 1000, need: "" }) },
  { id: "bakers", name: "Baker's percentage", group: "Calculate", icon: "wheat", desc: "Dough from pieces × weight", kw: "bread pizza pasta dough flour hydration", learn: true,
    load: () => import("./Bakers.svelte") },
  { id: "buffet", name: "Buffet planner", group: "Calculate", icon: "buffet", desc: "Guests × grams × K", kw: "guests grams per person banquet quantity", learn: true,
    load: () => import("./Buffet.svelte") },
  { id: "doneness", name: "Doneness & resting", group: "Heat & time", icon: "thermo", desc: "Pull temperatures and resting times", kw: "steak temperature core rare medium well rest probe pork chicken poultry duck fish salmon tuna", learn: true,
    load: () => import("./Doneness.svelte") },
  { id: "sousvide", name: "Sous-vide", group: "Heat & time", icon: "tool-sousvide", desc: "Bath, time and salt by product", kw: "water bath vacuum bag low temperature", learn: true,
    load: () => import("./SousVide.svelte"), fromRecipe: (x) => ({ w: x.raw || 1000 }) },
  { id: "salt", name: "Salt & brine", group: "Salt & texture", icon: "tool-salt", desc: "Dry salt, brines and salt by dish", kw: "brine cure seasoning percent", learn: true,
    load: () => import("./Salt.svelte"), fromRecipe: (x) => ({ m: 1, i: 0, w: x.cooked || x.raw || 1000 }) },
  { id: "cost", name: "Food cost & price", group: "Money", icon: "tool-price", desc: "Menu price from cost and target %", kw: "food cost menu price margin vat profit",
    load: () => import("./Cost.svelte"), fromRecipe: (x) => (x.costPortion ? { c: Math.round(x.costPortion * 100) / 100 } : null) },
  { id: "glossary", name: "Kitchen glossary", group: "Reference", icon: "learn-glossary", desc: "EN · BG · RU terms", kw: "translate bulgarian russian terms dictionary", learn: true,
    load: () => import("./Glossary.svelte") },
];
export const toolById = (id: string) => TOOLS.find((t) => t.id === id);

/** Live inputs of each tool for this session, plus where they came from. */
export const TS: Record<string, any> = $state({});
export function openWith(id: string, x: FromRecipe) {
  const t = toolById(id); if (!t) return;
  const s = (TS[id] = TS[id] || {});
  Object.assign(s, t.fromRecipe?.(x) || {});
  s.from = x.r.id; s.fromLabel = x.r.t + " · " + x.portions + " portions";
}
