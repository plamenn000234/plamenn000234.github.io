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
  if (!opts.tour) await p.addInitScript(() => localStorage.setItem("bb-tour3", "1"));
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

await test("make it mine: copy a library recipe, note carried over; notes show in cook mode", async () => {
  const p = await page(); await p.goto(BASE + "#r-" + rid); await p.waitForSelector(".ing li");
  await p.click("button:has-text('Add a note')"); await p.fill(".notes textarea", "Plate on 28 cm."); await p.click("button:has-text('Save note')");
  await p.waitForSelector(".notes .nt:has-text('Plate on 28 cm.')");
  const n = await p.evaluate((rid) => JSON.parse(localStorage.getItem("bb-notes"))[rid].t, rid); assert(n === "Plate on 28 cm.", "bb-notes " + n);
  await p.goto(BASE + "#cook-" + rid); await p.waitForSelector(".cn:has-text('Plate on 28 cm.')");
  await p.goto(BASE + "#r-" + rid); await p.waitForSelector(".ing li");
  const nIng = await p.locator(".ing li:not(.yl)").count();
  await p.click("a[aria-label='Make it mine']"); await p.waitForSelector("h1:has-text('Make it mine')");
  await p.waitForFunction(() => document.querySelector("#ed-name").value.length > 0);
  const rows = await p.locator(".ir").count(); assert(rows > 0 && rows <= nIng, `rows ${rows} vs ${nIng}`);
  if (SHOTS) await p.screenshot({ path: SHOTS + "/make-mine.png", fullPage: true });
  await p.click("button:has-text('Save recipe')"); await p.waitForURL(/#r-u/);
  const m = await p.evaluate(() => JSON.parse(localStorage.getItem("bb-mine"))[0]); assert(m.from === rid && m.ing.length === rows, "bb-mine " + JSON.stringify(m).slice(0, 200));
  await p.waitForSelector(".notes .nt:has-text('Plate on 28 cm.')");
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

await test("cook mode: steps, swipe keys, ingredients, exit", async () => {
  const p = await page(); await p.goto(BASE + "#recipes"); await ready(p);
  await p.fill("input[aria-label='Search recipes']", "risotto"); await p.waitForSelector("a.row");
  const id = (await p.locator("a.row").first().getAttribute("href")).slice(3);
  await p.goto(BASE + "#r-" + id); await p.waitForSelector(".ing li");
  await p.click("a[href^='#cook-']"); await p.waitForSelector(".cook .tx");
  assert(/Step 1 of \d+/i.test(await p.locator(".cook .n").innerText()), "no step 1");
  assert(await p.evaluate(() => document.documentElement.classList.contains("cooking")), "no cooking class");
  await p.keyboard.press("ArrowRight"); await p.waitForSelector("text=/Step 2 of/i");
  await p.click("button[aria-label='Ingredients']"); await p.waitForSelector(".cook .ing li");
  await p.click("text=Back to the steps"); await p.keyboard.press("Escape"); await p.waitForSelector(".ing li");
  assert(!(await p.evaluate(() => document.documentElement.classList.contains("cooking"))), "cooking class left");
  assert(p.errors.length === 0, p.errors.join("; ")); if (SHOTS) await p.screenshot({ path: SHOTS + "/cook.png" });
});

await test("settings: back up everything and restore it", async () => {
  const p = await page({ init: () => { if (!localStorage.getItem("bb-favs")) localStorage.setItem("bb-favs", JSON.stringify(["43fc74fc"])); } });
  await p.goto(BASE + "#settings"); await ready(p); await p.waitForSelector("text=Your data");
  if (SHOTS) await p.screenshot({ path: SHOTS + "/settings.png" });
  const [d] = await Promise.all([p.waitForEvent("download"), p.click("text=Back up everything")]);
  assert(/^Chefsheet_Backup_\d{4}-\d\d-\d\d\.json$/.test(d.suggestedFilename()), d.suggestedFilename());
  const path = await d.path(); const j = JSON.parse(await (await import("fs")).promises.readFile(path, "utf8"));
  assert(j.app === "chefsheet" && j.data["bb-favs"][0] === "43fc74fc", "backup content");
  j.data["bb-favs"] = ["43fc74fc", "a781489f"];
  await p.setInputFiles("input[type=file]", { name: "b.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(j)) });
  await p.waitForEvent("load"); await ready(p);
  assert((await p.evaluate(() => localStorage.getItem("bb-favs"))).includes("a781489f"), "not restored");
  await p.setInputFiles("input[type=file]", { name: "x.json", mimeType: "application/json", buffer: Buffer.from("{}") });
  await p.waitForSelector("text=not a Chefsheet backup");
  assert(p.errors.length === 0, p.errors.join("; "));
});

await test("what can I cook: any chicken + cream finds recipes", async () => {
  const p = await page(); await p.goto(BASE + "#recipes-have"); await ready(p);
  await p.fill("#pq", "chick"); await p.waitForSelector("text=Any chicken"); await p.keyboard.press("Enter");
  await p.fill("#pq", "cream"); await p.waitForSelector(".sg button"); await p.keyboard.press("Enter");
  await p.waitForSelector("a.row .hint"); const h = await p.locator("a.row .hint").first().innerText();
  assert(/USES 2 OF 2/i.test(h), h); await noHScroll(p);
  if (SHOTS) await p.screenshot({ path: SHOTS + "/have.png" });
});

await test("welcome tour on the first start, then never again", async () => {
  const p = await page({ tour: true }); await p.goto(BASE); await ready(p);
  await p.waitForSelector(".tour"); if (SHOTS) await p.screenshot({ path: SHOTS + "/tour.png" });
  for (let i = 0; i < 3; i++) await p.click(".tour .nx");
  await p.click("text=Start cooking"); await p.waitForSelector(".tour", { state: "detached" });
  await p.reload(); await ready(p); await p.waitForTimeout(500);
  assert(!(await p.locator(".tour").count()), "tour shown again");
});

await test("accessibility basics: no unnamed buttons or images", async () => {
  for (const h of ["#today", "#recipes", "#settings", "#learn"]) {
    const p = await page(); await p.goto(BASE + h); await ready(p); await p.waitForTimeout(600);
    const bad = await p.evaluate(() => [...document.querySelectorAll("button, a[href], img")].filter((e) => { const r = e.getBoundingClientRect(); if (!r.width) return false; if (e.tagName === "IMG") return !e.hasAttribute("alt"); return !(e.getAttribute("aria-label") || e.textContent.trim() || e.getAttribute("title")); }).map((e) => e.outerHTML.slice(0, 80)));
    assert(!bad.length, h + ": " + bad.join(" | ")); await p.context().close();
  }
});

await test("tools: numbers match the tables (yield, buffet, bakers, sous-vide, cost)", async () => {
  const p = await page(); const out = async () => (await p.locator(".tool-body .outs").allInnerTexts()).join(" | ").replace(/\s+/g, " ");
  const has = async (re, not = false) => { for (let k = 0; k < 30; k++) { if (re.test(await out()) !== not) return true; await p.waitForTimeout(100); } return false; };
  // Yield: minced meat has no sous-vide figure, so the method moves to braise (88 %) and the button matches
  await p.goto(BASE + "#tool-yield"); await ready(p); await p.waitForSelector(".tool-body select");
  await p.locator(".tool-body .seg button").first().click();
  await p.selectOption(".tool-body select", { label: "Minced meat 80/20" });
  assert(await has(/COOKED 880 g/i), "got " + await out());
  assert(await p.locator(".tool-body .seg button[aria-pressed=true]").innerText().then((t) => /Braise/.test(t)), "button not moved");
  assert(await has(/BUY RAW/i, true), "empty buy raw shown");
  await p.locator(".tool-body input").nth(1).fill("9000"); assert(await has(/BUY RAW 10,227 g/i), "got " + await out());
  // Buffet: 100 guests × 92 g × K 1 × 1.1 = 10.1 kg; 2 proteins: chicken 120 g → 13.2 kg
  await p.goto(BASE + "#tool-buffet"); await p.reload(); await ready(p); await p.waitForSelector(".tool-body select");
  assert(await has(/10.1 kg/), "got " + await out());
  await p.click(".tool-body .seg button:has-text('2 proteins')"); assert(await has(/13.2 kg/), "got " + await out());
  // Bakers: pasta has no yeast line
  await p.goto(BASE + "#tool-bakers"); await p.reload(); await ready(p); await p.waitForSelector(".tool-body select");
  await p.selectOption(".tool-body select", "0"); assert(await has(/YEAST/i, true), "got " + await out());
  await p.selectOption(".tool-body select", "3"); assert(await has(/YEAST/i), "got " + await out());
  // Sous-vide: carrots have no salt figure, no broken number
  await p.goto(BASE + "#tool-sousvide"); await p.reload(); await ready(p); await p.waitForSelector(".tool-body select");
  await p.selectOption(".tool-body select", { label: "Carrots" }); await p.waitForSelector("text=No salt in the bag");
  assert(!/–\s*g|NaN/.test(await p.locator(".tool-body").innerText()), "broken salt");
  // Sous-vide by thickness (Baldwin/NSW): chicken breast 25 mm slab → 75 min + 18 min hold at 63 °C
  await p.selectOption(".tool-body select", { label: "Chicken breast" }); await p.locator(".tool-body input").first().fill("25");
  assert(await has(/CORE REACHES BATH 1 h 15 min.*HOLD AT 63 °C 18 min.*MINIMUM IN BATH 1 h 33 min/i), "sv " + await out());
  await p.click(".tool-body .seg button:has-text('Cylinder')"); assert(await has(/CORE REACHES BATH 40 min/i), "cyl " + await out());
  await p.locator(".tool-body input").first().fill("120"); await p.waitForSelector("text=past the table");
  // Cost: 3.20 at 30 % → 10.67 net, 12.80 with 20 % VAT; menu price 15 → 25.6 %
  await p.goto(BASE + "#tool-cost"); await p.reload(); await ready(p); await p.waitForSelector(".tool-body input");
  assert(await has(/10.67/) && await has(/12.80/), "got " + await out());
  await p.locator(".tool-body input").nth(3).fill("15"); assert(await has(/25.6 %/), "got " + await out());
  assert(p.errors.length === 0, p.errors.join("; "));
});

await test("gels: gelatin sheets by bloom, roux flour and butter", async () => {
  const p = await page(); await p.goto(BASE + "#tool-gel"); await ready(p); await p.waitForSelector(".outs");
  const sel = p.locator(".tool-body select");
  await sel.nth(0).selectOption({ index: 2 }); // fruit jelly 2 %
  await sel.nth(1).selectOption({ index: 1 }); // gold sheets 2 g, 200 bloom
  await p.locator(".tool-body input[type=number]").first().fill("1000");
  let v = await p.locator(".outs b").allInnerTexts(); assert(/^20\b/.test(v[0]) && /^10\b/.test(v[1]), "gelatin " + v.join("|"));
  await sel.nth(1).selectOption({ index: 2 }); // silver 160 bloom → 20 × √1.25 = 22.4 g
  v = await p.locator(".outs b").allInnerTexts(); assert(/^22\.4\b/.test(v[0]), "silver " + v[0]);
  await p.click(".tool-body button:has-text('Starch')"); await p.locator(".tool-body select").first().selectOption({ index: 4 }); // béchamel 7 %
  v = await p.locator(".outs b").allInnerTexts(); assert(/^70\b/.test(v[0]) && /^70\b/.test(v[1]), "roux " + v.join("|"));
  assert(p.errors.length === 0, p.errors.join("; "));
});

await test("tool upgrades: doneness kinds, price rounding, brine to cover, dough water, buffet list", async () => {
  const p = await page(); const out = async () => (await p.locator(".tool-body .outs").allInnerTexts()).join(" | ").replace(/\s+/g, " ");
  const has = async (re) => { for (let k = 0; k < 30; k++) { if (re.test(await out())) return true; await p.waitForTimeout(100); } return false; };
  const open = async (t) => { await p.goto(BASE + "#tool-" + t); await p.reload(); await ready(p); await p.waitForSelector(".tool-body .outs"); };
  await open("doneness"); await p.click(".tool-body .seg button:has-text('Poultry')");
  assert(await has(/PULL AT 70 °C.*AFTER REST 74 °C/i), "poultry " + await out());
  await p.click(".tool-body .seg button:has-text('Fish')"); await p.waitForSelector("text=against parasites");
  await open("cost"); await p.click(".tool-body .seg button:has-text('.90')");
  assert(await has(/MENU PRICE, WITH VAT 12.90/i), "round " + await out());
  await p.click(".tool-body .seg button:has-text('Exact')"); await p.click(".tool-body .seg button:has-text('By profit')");
  assert(await has(/MENU PRICE, WITH VAT 13.44/i), "profit " + await out());
  await open("salt"); await p.click(".tool-body .seg button:has-text('Brine')");
  assert(await has(/WATER 2,000 g.*FINE SALT 60 g/i), "brine " + await out());
  await p.click(".tool-body .seg button:has-text('container')"); assert(await has(/WATER 3,000 g.*FINE SALT 90 g/i), "brine2 " + await out());
  await open("bakers"); await p.selectOption(".tool-body select", "3");
  assert(await has(/WATER AT 19 °C/i), "ddt " + await out());
  await p.click(".tool-body .seg button:has-text('Poolish')"); assert(await has(/PRE: FLOUR 453 g.*PRE: WATER 453 g/i), "poolish " + await out());
  await open("buffet"); await p.click("text=Add to the list"); await p.selectOption(".tool-body select", "1"); await p.click("text=Add to the list");
  assert(await p.locator(".tool-body .tlist > div").count() === 2, "list");
  assert(p.errors.length === 0, p.errors.join("; "));
});

await b.close();
console.log(results.join("\n"));
console.log(failed ? `\n${failed} failed` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
