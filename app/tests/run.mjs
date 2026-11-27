// Smoke tests for Chefsheet 3.0. Serve the repo root on PORT (default 8765), then: npm test
// Run in CI on every PR (see .github/workflows/v3.yml).
import { createRequire } from "module";
const { chromium } = createRequire(import.meta.url)("playwright"); // global install locally, npm i in CI
const BASE = `http://localhost:${process.env.PORT || 8765}/v3/`;
const SHOTS = process.env.SHOTS || "";
const results = [];
let failed = 0;
async function test(name, fn) {
  try { await fn(); results.push("ok   " + name); }
  catch (e) { failed++; results.push("FAIL " + name + "\n     " + String(e?.message || e).split("\n")[0]); }
}
const assert = (c, m) => { if (!c) throw new Error(m); };

const b = await chromium.launch();
async function page(opts = {}) {
  const ctx = await b.newContext({ viewport: opts.vp || { width: 390, height: 844 }, deviceScaleFactor: process.env.SHOTS ? 2 : 1, colorScheme: opts.dark ? "dark" : "light" });
  const p = await ctx.newPage();
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(e.message));
  if (opts.init) await p.addInitScript(opts.init);
  return p;
}
const ready = (p) => p.waitForSelector("main .page:not(.boot)", { timeout: 15000 });
const noHScroll = async (p) => { const w = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]); assert(w[0] <= w[1], `horizontal scroll ${w[0]} > ${w[1]}`); };

await test("cold start shows Today without errors", async () => {
  const p = await page(); await p.goto(BASE); await ready(p);
  assert(await p.locator("h1").first().innerText().then((t) => /Good/.test(t)), "no greeting");
  assert(p.errors.length === 0, p.errors.join("; ")); await noHScroll(p);
  if (SHOTS) await p.screenshot({ path: SHOTS + "/today.png" });
});

for (const [h, sel] of [["#tools", "text=Salt & brine"], ["#kitchen", "text=The order is empty"], ["#recipes", "text=Cuisines"], ["#learn", "text=Start Here"], ["#tool-salt", "text=Fine salt"], ["#tool-glossary", "text=English"]]) {
  await test(`screen ${h}`, async () => {
    for (const vp of [{ width: 390, height: 844 }, { width: 1100, height: 800 }]) for (const dark of [false, true]) {
      const p = await page({ vp, dark }); await p.goto(BASE + h); await ready(p); await p.waitForSelector(sel, { timeout: 10000 });
      assert(p.errors.length === 0, p.errors.join("; ")); await noHScroll(p);
      if (SHOTS && vp.width === 390) await p.screenshot({ path: `${SHOTS}/${h.slice(1)}${dark ? "-dark" : ""}.png`, fullPage: false });
      await p.context().close();
    }
  });
}

await test("tools compute: salt 1000 g at 2 % = 20 g", async () => {
  const p = await page(); await p.goto(BASE + "#tool-salt"); await ready(p); await p.waitForSelector("text=Fine salt");
  const ins = p.locator(".tool-body input[type=number]");
  await ins.nth(0).fill("1000"); await ins.nth(1).fill("2");
  const v = await p.locator(".outs b").first().innerText(); assert(/^20\b/.test(v), "got " + v);
});

let rid = "";
await test("recipe workbench: scale, add to order, supplier list", async () => {
  const p = await page(); await p.goto(BASE + "#recipes"); await ready(p);
  await p.fill("input[aria-label='Search recipes']", "risotto"); await p.waitForSelector("a.row");
  const href = await p.locator("a.row").first().getAttribute("href"); rid = href.slice(3);
  await p.goto(BASE + href); await p.waitForSelector(".ing li");
  const before = await p.locator(".ing li b").first().innerText();
  const base = Number(await p.locator(".stp input").inputValue());
  await p.locator(".stp input").fill(String(base * 2)); await p.locator(".stp input").press("Enter"); await p.waitForTimeout(150);
  const after = await p.locator(".ing li b").first().innerText();
  assert(before !== after, `amount did not change: ${before}`);
  await p.click("text=Add to order"); await p.waitForSelector("text=In the order");
  if (SHOTS) await p.screenshot({ path: SHOTS + "/recipe.png" });
  await p.click("nav.tabs.bottom a[href='#kitchen']"); await p.waitForSelector(".ticket li");
  const n = await p.locator(".ticket li").count(); assert(n > 2, "supplier list has " + n);
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem("bb-order")).lines.length); assert(saved === 1, "bb-order not saved");
  if (SHOTS) await p.screenshot({ path: SHOTS + "/kitchen-order.png", fullPage: true });
  assert(p.errors.length === 0, p.errors.join("; "));
});

await test("tool opens from the recipe with the batch filled in", async () => {
  const p = await page(); await p.goto(BASE + "#r-" + rid); await p.waitForSelector(".ing li");
  await p.click(".strip button:has-text('Salt')"); await p.waitForSelector("text=Fine salt");
  assert(await p.locator("text=For ").count() > 0, "no 'For recipe' tag");
  const w = Number(await p.locator(".tool-body input[type=number]").first().inputValue()); assert(w > 0 && w !== 1000, "weight not from recipe: " + w);
});

await test("2.x data is kept and migrated", async () => {
  const p = await page({ init: () => { if (!sessionStorage.x) { sessionStorage.x = 1; localStorage.clear();
    localStorage.setItem("bb-saved", JSON.stringify([{ id: "l1", kind: "order", name: "Old", pax: 20, reserve: 10, lines: [] }]));
    localStorage.setItem("bb-favs", JSON.stringify(["zzz"])); localStorage.setItem("bb-theme", JSON.stringify("night")); } } });
  await p.goto(BASE); await ready(p);
  const s = await p.evaluate(() => ({ saved: JSON.parse(localStorage.getItem("bb-saved")), schema: localStorage.getItem("bb-schema"), favs: localStorage.getItem("bb-favs"), theme: document.documentElement.dataset.theme }));
  assert(s.schema === "1", "schema " + s.schema); assert(s.saved[0].updatedAt > 0 && s.saved[0].name === "Old", "saved not migrated");
  assert(s.favs === '["zzz"]', "favs changed"); assert(s.theme === "night", "theme not applied");
});

await test("old links: #order → #kitchen, #fav → favourites", async () => {
  const p = await page(); await p.goto(BASE + "#order"); await ready(p); assert((await p.evaluate(() => location.hash)) === "#kitchen", "no redirect");
  await p.goto(BASE + "#fav"); await p.waitForSelector("h1:has-text('Favourites')");
});

await test("global search finds tools and recipes", async () => {
  const p = await page(); await p.goto(BASE); await ready(p);
  await p.click(".sbtn"); await p.fill(".panel input", "brine"); await p.waitForSelector(".panel a[href='#tool-salt']");
  await p.fill(".panel input", "risotto"); await p.waitForSelector(".panel a.row");
  if (SHOTS) await p.screenshot({ path: SHOTS + "/search.png" });
});

await test("timer starts from a recipe step", async () => {
  const p = await page(); await p.goto(BASE + "#r-" + rid); await p.waitForSelector(".steps li");
  const tm = p.locator(".steps .tm").first();
  if (await tm.count()) { await tm.click(); await p.waitForSelector(".tbar .t"); }
});

// An order with two dishes, shared by the kitchen tests below.
async function withOrder() {
  const p = await page(); await p.goto(BASE + "#recipes"); await ready(p);
  await p.fill("input[aria-label='Search recipes']", "salmon"); await p.waitForSelector("a.row");
  const ids = await p.$$eval("a.row", (a) => a.slice(0, 2).map((x) => x.getAttribute("href").slice(3)));
  await p.evaluate((ids) => { localStorage.setItem("bb-order", JSON.stringify({ name: "Test banquet", date: "2026-12-05", pax: 40, reserve: 10, sid: null,
    lines: ids.map((id) => ({ id, pax: null, mode: "plated", gpg: null, pre: null, k: 1 })) })); }, ids);
  return { p, ids };
}
const download = async (p, click) => { const [d] = await Promise.all([p.waitForEvent("download", { timeout: 20000 }), click()]); return d.suggestedFilename(); };

await test("prep list, labels and order PDF, CSV", async () => {
  const { p } = await withOrder(); await p.goto(BASE + "#prep"); await p.reload(); await p.waitForSelector(".pd li");
  await p.locator(".pd li button").first().click(); assert(await p.locator(".pd li.got").count() === 1, "tick did not work");
  if (SHOTS) await p.screenshot({ path: SHOTS + "/prep.png" });
  let f = await download(p, () => p.click("button:has-text('PDF')")); assert(/^Prep_List_Test_banquet_2026-12-05\.pdf$/.test(f), f);
  f = await download(p, () => p.click("button:has-text('Labels')")); assert(/^Labels_.*\.pdf$/.test(f), f);
  await p.goto(BASE + "#kitchen"); await p.waitForSelector(".ticket li");
  f = await download(p, () => p.click(".acts button:has-text('PDF')")); assert(/^Order_List_.*\.pdf$/.test(f), f);
  f = await download(p, () => p.click(".acts button:has-text('CSV')")); assert(/\.csv$/.test(f), f);
  f = await download(p, () => p.click(".acts button:has-text('Service cards')")); assert(/^Service_Cards_/.test(f), f);
  await p.click(".acts button:has-text('Allergen matrix')"); await p.waitForSelector(".mx tbody tr");
  f = await download(p, () => p.click(".mx button:has-text('PDF')")); assert(/^Allergen_Matrix_/.test(f), f);
  assert(p.errors.length === 0, p.errors.join("; "));
});

await test("suppliers: add one, assign a product, order grouped by supplier", async () => {
  const { p } = await withOrder(); await p.goto(BASE + "#suppliers"); await p.reload(); await ready(p);
  await p.fill("input[aria-label='New supplier']", "Metro"); await p.fill("input[aria-label='New supplier phone']", "+359 88 123 4567"); await p.click("button[aria-label='Add supplier']");
  await p.waitForSelector("input[aria-label='Supplier name']");
  await p.goto(BASE + "#kitchen"); await p.waitForSelector(".ticket li"); await p.click(".ticket button:has-text('By supplier')");
  await p.waitForSelector("h3:has-text('No supplier')"); await p.locator(".si select").first().selectOption({ label: "Metro" });
  await p.waitForSelector("h3:has-text('Metro')"); assert(await p.locator("a[href^='https://wa.me/359881234567']").count() === 1, "no WhatsApp link");
  if (SHOTS) await p.screenshot({ path: SHOTS + "/kitchen-suppliers.png", fullPage: true });
  const s = await p.evaluate(() => JSON.parse(localStorage.getItem("bb-sup"))); assert(s.list.length === 1 && Object.keys(s.map).length === 1, "bb-sup " + JSON.stringify(s));
});

await test("prices: set a price, food cost appears; save as menu and delete it", async () => {
  const { p } = await withOrder(); await p.goto(BASE + "#prices"); await p.reload(); await ready(p);
  await p.waitForSelector(".pr input"); const inp = p.locator(".pr input").first(); await inp.fill("4.5"); await inp.press("Tab");
  const pr = await p.evaluate(() => JSON.parse(localStorage.getItem("bb-prices"))); assert(Object.values(pr)[0] === 4.5, "price not saved");
  await p.goto(BASE + "#kitchen"); await p.waitForSelector("text=Food cost");
  await p.click("button:has-text('Save as menu')"); await p.goto(BASE + "#kitchen-saved"); await p.waitForSelector("text=Test banquet");
  const del = p.locator("button[aria-label='Delete menu Test banquet']"); await del.click(); await del.click();
  await p.waitForTimeout(200); assert((await p.evaluate(() => JSON.parse(localStorage.getItem("bb-menus")).length)) === 0, "menu not deleted");
});

await test("recipe PDF and service card", async () => {
  const { p, ids } = await withOrder(); await p.goto(BASE + "#r-" + ids[0]); await p.waitForSelector(".ing li");
  let f = await download(p, () => p.click("button[aria-label='PDF']")); assert(/p\.pdf$/.test(f), f);
  f = await download(p, () => p.click("button[aria-label='Service card']")); assert(/^Service_Card_/.test(f), f);
});

await test("editor: semi-finished, a dish that uses it, edit and delete", async () => {
  const p = await page(); await p.goto(BASE + "#new-semi"); await ready(p);
  await p.fill("#ed-name", "House demi-glace"); await p.fill("input[aria-label='Ingredient 1']", "Butter"); await p.fill("input[aria-label='Amount 1']", "500");
  await p.click("button:has-text('Save recipe')"); await p.waitForSelector("h1:has-text('House demi-glace')");
  await p.goto(BASE + "#new"); await p.waitForSelector("#ed-name");
  await p.fill("#ed-name", "Steak with demi"); await p.fill("input[aria-label='Ingredient 1']", "House demi-glace"); await p.fill("input[aria-label='Amount 1']", "200");
  await p.click(".chip:has-text('Milk')"); await p.click("button:has-text('Save recipe')"); await p.waitForSelector("h1:has-text('Steak with demi')");
  const m = await p.evaluate(() => JSON.parse(localStorage.getItem("bb-mine"))); assert(m.length === 2 && m[1].semi === true && m[0].algs.includes(7), "bb-mine " + JSON.stringify(m));
  const id = m[0].id; await p.goto(BASE + "#edit-" + id); await p.waitForSelector("#ed-name");
  assert((await p.inputValue("#ed-name")) === "Steak with demi", "editor not filled");
  if (SHOTS) await p.screenshot({ path: SHOTS + "/editor.png", fullPage: true });
  await p.click("button:has-text('Delete')"); await p.click("button:has-text('Tap again')"); await p.waitForURL(/#c-/);
  assert((await p.evaluate(() => JSON.parse(localStorage.getItem("bb-mine")).length)) === 1, "not deleted");
  assert(p.errors.length === 0, p.errors.join("; "));
});

await test("learn: lesson with diagram, mark done, test, mistakes, card of the day, task link", async () => {
  const p = await page(); await p.goto(BASE + "#learn"); await ready(p); await p.waitForSelector(".mods li");
  const mid = await p.$eval(".mods a", (a) => a.getAttribute("href").slice(3));
  await p.click(".mods a"); await p.waitForSelector(".ls a");
  await p.goto(BASE + "#l-standard-cuts?by=Chef%20Ivan&due=2030-01-01"); await p.waitForSelector(".lart svg");
  assert((await p.evaluate(() => location.hash)) === "#l-standard-cuts", "query not stripped");
  await p.waitForSelector("text=From Chef Ivan");
  if (SHOTS) await p.screenshot({ path: SHOTS + "/lesson.png", fullPage: true });
  await p.click("button:has-text('Mark as done')"); await p.waitForTimeout(300);
  const lp = await p.evaluate(() => JSON.parse(localStorage.getItem("bb-learn")));
  assert(lp.done["standard-cuts"] > 0 && lp.tasks["l:standard-cuts"].by === "Chef Ivan", "bb-learn " + JSON.stringify(lp).slice(0, 200));
  await p.goto(BASE + "#quiz-" + mid); await p.waitForSelector(".qz li");
  const n = await p.locator(".qz li").count();
  for (let i = 0; i < n; i++) await p.locator(".qz li").nth(i).locator(".opts button").first().click();
  await p.click("button:has-text('Check answers')"); await p.waitForSelector(".res");
  const q = await p.evaluate((mid) => JSON.parse(localStorage.getItem("bb-learn")).quiz[mid], mid); assert(q && typeof q.best === "number", "quiz not saved");
  if (SHOTS) await p.screenshot({ path: SHOTS + "/quiz.png" });
  await p.goto(BASE + "#learn"); await p.waitForSelector("#daily .opts button");
  await p.locator("#daily .opts button").first().click(); await p.waitForSelector(".dres");
  if (SHOTS) await p.screenshot({ path: SHOTS + "/learn.png", fullPage: true });
  const miss = await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("bb-learn")).miss).length);
  if (miss) { await p.goto(BASE + "#review"); await p.waitForSelector(".qz li"); }
  assert(p.errors.length === 0, p.errors.join("; "));
});

await test("offline: service worker caches 3.0 and it opens without internet", async () => {
  const p = await page(); await p.goto(BASE); await ready(p);
  await p.evaluate(async () => { await navigator.serviceWorker.ready; });
  await p.reload(); await ready(p);
  assert(await p.evaluate(() => !!navigator.serviceWorker.controller), "no controller");
  await p.context().setOffline(true);
  await p.reload(); await ready(p); await p.goto(BASE + "#learn"); await p.waitForSelector(".mods li", { timeout: 10000 });
  await p.goto(BASE + "#tool-salt"); await p.waitForSelector("text=Fine salt");
  await p.context().setOffline(false);
});

await b.close();
console.log(results.join("\n"));
console.log(failed ? `\n${failed} failed` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
