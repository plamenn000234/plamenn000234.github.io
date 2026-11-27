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
  await p.route(/fonts\.(googleapis|gstatic)\.com|accounts\.google\.com/, (r) => r.abort());
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(e.message));
  await p.addInitScript(() => { if (!localStorage.getItem("cs-api")) localStorage.setItem("cs-api", "http://localhost:8787"); });
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

await test("guest allergens: QR in the allergen matrix, link opens a clean page, table cards PDF", async () => {
  const { p } = await withOrder(); await p.goto(BASE + "#kitchen"); await p.reload(); await p.waitForSelector(".ticket li");
  await p.click(".acts button:has-text('Allergen matrix')"); await p.click("button:has-text('QR for guests')"); await p.waitForSelector(".qimg svg");
  const link = await p.getAttribute(".qt a:has-text('Preview')", "href"); assert(/#guest\?d=/.test(link), link);
  const f = await download(p, () => p.click("button:has-text('Table cards PDF')")); assert(/^Allergen_QR_/.test(f), f);
  const g = await page({ tour: true }); await g.goto(link); await g.waitForSelector(".gp li");
  assert(await g.locator("nav.tabs").count() === 0 && await g.locator(".tour, [role=dialog]").count() === 0, "app chrome or tour on the guest page");
  assert(await g.locator(".gp li").count() === 2, "dishes"); assert((await g.locator(".gp h1").innerText()) === "Test banquet", "name");
  const a = await g.locator(".tags span").first().innerText();
  if (a && !/None/.test(a)) { await g.click(`.al button:has-text('${a}')`); await g.waitForSelector(".gp li.bad"); }
  if (SHOTS) await g.screenshot({ path: SHOTS + "/guest.png", fullPage: true });
  assert(g.errors.length === 0 && p.errors.length === 0, g.errors.concat(p.errors).join("; "));
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

await test("recipes without a product: no mushrooms", async () => {
  const p = await page(); await p.goto(BASE + "#recipes"); await ready(p);
  await p.fill("input[aria-label='Search recipes']", "risotto"); await p.waitForSelector("a.row");
  const before = Number((await p.locator(".count").innerText()).replace(/\D/g, ""));
  await p.click("button:has-text('Filters')"); await p.fill("input[aria-label='Recipes without this product']", "mushr");
  await p.click(".sg .any"); await p.waitForSelector(".av .hc:has-text('Without mushroom')");
  const after = Number((await p.locator(".count").innerText()).replace(/\D/g, ""));
  assert(after > 0 && after < before, `risotto ${before} → ${after}`);
  const hrefs = await p.$$eval("a.row", (a) => a.map((x) => x.getAttribute("href")));
  for (const h of hrefs.slice(0, 5)) { await p.goto(BASE + h); await p.waitForSelector(".ing li"); const t = (await p.locator(".ing").allInnerTexts()).join(" "); assert(!/mushroom/i.test(t), "mushroom in " + h); }
  assert(p.errors.length === 0, p.errors.join("; "));
});

await test("what's new: card on Today for an updated app, gone after Got it; not on a first start", async () => {
  let p = await page({ tour: true }); await p.goto(BASE); await ready(p); assert(await p.locator(".news").count() === 0, "news on a first start");
  p = await page({ init: () => { if (!sessionStorage.y) { sessionStorage.y = 1; localStorage.removeItem("bb-news3"); } } }); await p.goto(BASE); await ready(p);
  await p.waitForSelector(".news li"); await p.click(".news button:has-text('Got it')"); await p.reload(); await ready(p);
  assert(await p.locator(".news").count() === 0, "news still shown"); assert(p.errors.length === 0, p.errors.join("; "));
});

await test("food safety logs: off by default, turn on, temperatures, cooling, delivery, PDF", async () => {
  const p = await page(); await p.goto(BASE + "#kitchen"); await ready(p); assert(await p.locator("a[href='#haccp']").count() === 0, "logs shown while off");
  await p.goto(BASE + "#settings"); await p.waitForSelector("text=Food safety logs (HACCP)"); await p.check(".sw input");
  await p.goto(BASE + "#kitchen"); await p.waitForSelector("a.hz:has-text('2 units not checked today')");
  await p.goto(BASE + "#today"); await p.waitForSelector("text=Temperature check");
  await p.goto(BASE + "#haccp"); await p.waitForSelector(".unit");
  await p.fill(".tf.by input", "PN");
  await p.fill("input[aria-label='Temperature of Fridge 1']", "3.5"); await p.click(".unit:has-text('Fridge 1') button:has-text('Save')");
  await p.fill("input[aria-label='Temperature of Freezer 1']", "-12"); await p.click(".unit:has-text('Freezer 1') button:has-text('Save')");
  await p.waitForSelector(".log li.bad:has-text('Freezer 1')"); assert(await p.locator("em.due").count() === 0, "still due");
  await p.click(".seg button:has-text('Cooling')"); await p.fill(".form input >> nth=0", "Beef stock"); await p.click("button:has-text('Start cooling')");
  await p.waitForSelector(".cool:has-text('Beef stock')"); await p.waitForSelector(".tbar .t");
  await p.fill("input[aria-label='Core temperature of Beef stock']", "18"); await p.click("button:has-text('2 h check')");
  await p.fill("input[aria-label='Core temperature of Beef stock']", "4"); await p.click("button:has-text('Final check')");
  await p.waitForSelector(".log li:has-text('Beef stock'):has-text('OK')");
  await p.click(".seg button:has-text('Deliveries')"); await p.fill(".form input >> nth=1", "Chicken breast"); await p.fill(".form input[type=number]", "9");
  await p.waitForSelector("text=Too warm"); await p.click("button:has-text('Save delivery')"); await p.waitForSelector(".log li.bad:has-text('Rejected')");
  const h = await p.evaluate(() => JSON.parse(localStorage.getItem("bb-haccp")));
  assert(h.on && h.temps.length === 2 && h.temps[0].by === "PN" && h.cool[0].t2 === 4 && h.recv[0].ok === false, JSON.stringify(h).slice(0, 300));
  if (SHOTS) await p.screenshot({ path: SHOTS + "/haccp.png", fullPage: true });
  const f = await download(p, () => p.click(".pdf button")); assert(/^Food_Safety_Log_\d{4}-\d{2}\.pdf$/.test(f), f);
  assert(p.errors.length === 0, p.errors.join("; "));
});

await test("onboarding: chef makes a link, cook opens it, tests become tasks, ticks are saved", async () => {
  const p = await page({ init: () => { if (!sessionStorage.z) { sessionStorage.z = 1; localStorage.setItem("bb-favs", JSON.stringify([])); } } });
  await p.goto(BASE + "#recipes"); await ready(p); await p.fill("input[aria-label='Search recipes']", "risotto"); await p.waitForSelector("a.row");
  const rid = (await p.locator("a.row").first().getAttribute("href")).slice(3);
  await p.evaluate((rid) => localStorage.setItem("bb-favs", JSON.stringify([rid])), rid);
  await p.goto(BASE + "#onboard-new"); await p.reload(); await p.waitForSelector(".ch button");
  await p.fill("input[placeholder='e.g. Chef Ivan']", "Chef Ivan"); await p.fill("input[placeholder='e.g. Cold kitchen']", "Cold kitchen");
  await p.locator(".blk").nth(1).locator(".ch button").first().click(); await p.locator(".blk").nth(2).locator(".ch button").first().click();
  await p.evaluate(() => { window.__clip = ""; navigator.clipboard.writeText = async (t) => { window.__clip = t; }; });
  await p.click("button:has-text('Copy link')"); const link = await p.evaluate(() => window.__clip); assert(/#welcome\?d=/.test(link), "link " + link);
  const c = await page(); await c.goto(link); await c.waitForSelector("h1:has-text('Welcome to Cold kitchen')"); await c.waitForSelector(".it b:has-text('Module')");
  assert((await c.evaluate(() => location.hash)) === "#welcome", "query not stripped");
  await c.locator(".ckl").first().click(); await c.locator("button[aria-label^='I know']").click();
  const s = await c.evaluate(() => ({ o: JSON.parse(localStorage.getItem("bb-onboard")), l: JSON.parse(localStorage.getItem("bb-learn")) }));
  assert(s.o.packs[0].ticks.length === 1 && s.o.packs[0].known.length === 1 && Object.values(s.l.tasks)[0].by === "Chef Ivan", JSON.stringify(s).slice(0, 300));
  await c.goto(BASE + "#learn"); await c.waitForSelector("a.ob:has-text('2 of')"); await c.waitForSelector("text=Assigned to you");
  if (SHOTS) { await c.goto(BASE + "#welcome"); await c.waitForSelector(".it"); await c.screenshot({ path: SHOTS + "/welcome.png", fullPage: true }); }
  assert(c.errors.length === 0 && p.errors.length === 0, c.errors.concat(p.errors).join("; "));
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

await test("stock: off by default, turn on, add, delivered and cooked order, write-off, undo, PDF", async () => {
  const { p } = await withOrder(); await p.goto(BASE + "#kitchen"); await p.reload(); await ready(p);
  assert(await p.locator("a[href='#stock']").count() === 0, "stock shown while off");
  await p.goto(BASE + "#settings"); await p.waitForSelector("text=Stock and write-offs"); await p.check(".sw:has-text('Stock and write-offs') input");
  await p.goto(BASE + "#stock"); await p.waitForSelector("text=Current order: Test banquet");
  await p.fill(".tf.wide input >> nth=0", "butter"); await p.fill(".form input[type=number] >> nth=0", "2"); await p.click(".form button:has-text('Add to stock')");
  await p.waitForSelector(".st li:has-text('Butter')");
  await p.click("button:has-text('Delivered: add to stock')"); await p.click("button:has-text('Tap again to add')");
  let st = await p.evaluate(() => JSON.parse(localStorage.getItem("bb-stock")));
  const n = Object.keys(st.have).length; assert(n > 3 && st.have.Butter.q > 2, "after delivery " + JSON.stringify(st.have).slice(0, 200));
  await p.goto(BASE + "#kitchen"); await p.waitForSelector("a.hz:has-text('Stock and write-offs')"); await p.waitForSelector(".ticket small.sb:has-text('enough')");
  await p.goto(BASE + "#stock"); await p.click("button:has-text('Cooked: take from stock')"); await p.click("button:has-text('Tap again to take')");
  st = await p.evaluate(() => JSON.parse(localStorage.getItem("bb-stock")));
  assert(Object.entries(st.have).every(([k, it]) => it.q === (k === "Butter" ? 2 : 0)), "not taken " + JSON.stringify(st.have).slice(0, 200));
  await p.click(".st li:has-text('Butter') button.row"); await p.fill("input[aria-label='Minimum of Butter']", "5"); await p.click("button:has-text('Set minimum')");
  await p.waitForSelector("b.bad:has-text('1 running low')");
  await p.evaluate(() => localStorage.setItem("bb-prices", JSON.stringify({ Butter: 10 })));
  await p.reload(); await ready(p);
  await p.click(".seg button:has-text('Write-off')"); await p.fill(".tf.wide input", "Butter"); await p.fill(".form input[type=number]", "0.5");
  await p.selectOption(".form select", "1"); await p.waitForSelector("text=Value € 5.00"); await p.click(".form button:has-text('Write off')");
  await p.waitForSelector("h2:has-text('1 write-off · € 5.00')");
  st = await p.evaluate(() => JSON.parse(localStorage.getItem("bb-stock")));
  assert(st.have.Butter.q === 1.5 && st.log[0].k === "waste" && st.log[0].why === "Past use-by", JSON.stringify(st.log[0]));
  if (SHOTS) await p.screenshot({ path: SHOTS + "/stock.png", fullPage: true });
  await p.click(".seg button:has-text('History')"); await p.click(".log li >> nth=0 >> button.x"); await p.click(".log li >> nth=0 >> button:has-text('Undo?')");
  st = await p.evaluate(() => JSON.parse(localStorage.getItem("bb-stock"))); assert(st.have.Butter.q === 2, "undo " + st.have.Butter.q);
  await p.goto(BASE + "#today"); await p.waitForSelector("text=Running low");
  await p.goto(BASE + "#stock"); const f = await download(p, () => p.click(".pdf button")); assert(/^Stock_\d{4}-\d{2}\.pdf$/.test(f), f);
  assert(p.errors.length === 0, p.errors.join("; "));
});

await test("menu engineering: classes from price, sold and cost", async () => {
  const { p, ids } = await withOrder();
  await p.evaluate((ids) => localStorage.setItem("bb-mix", JSON.stringify({ vat: 0, src: "o", rows: { [ids[0]]: { p: 20, n: 100, c: 5 }, [ids[1]]: { p: 10, n: 20, c: 6 } } })), ids);
  await p.goto(BASE + "#tool-menu"); await p.reload(); await ready(p); await p.waitForSelector(".quad");
  assert(await p.locator(".dish >> nth=0 >> em.cls").innerText() === "Star", "first not star");
  assert(await p.locator(".dish >> nth=1 >> em.cls").innerText() === "Dog", "second not dog");
  const o = (await p.locator(".tool-body .outs").innerText()).replace(/\s+/g, " ");
  assert(/PORTIONS SOLD 120/i.test(o) && /AVERAGE PROFIT 13.17/i.test(o), o);
  if (SHOTS) await p.screenshot({ path: SHOTS + "/menu-eng.png", fullPage: true });
  assert(p.errors.length === 0, p.errors.join("; "));
});

// The optional account against the local API (node server/dev.mjs on 8787, sign-in with dev tokens).
const API = "http://localhost:8787", RUN = Date.now().toString(36);
async function signIn(p, who, name) {
  const j = await p.evaluate(async ([api, c]) => (await fetch(api + "/auth/google", { method: "POST", body: JSON.stringify({ credential: c }) })).json(), [API, `dev:${who}${RUN}:${who}${RUN}@example.com:${name}`]);
  await p.evaluate((j) => localStorage.setItem("cs-account", JSON.stringify({ token: j.token, user: j.user, kitchens: [], syncAt: 0, auto: true, stats: true })), j);
  return j;
}
await test("account: optional, cloud copy, kitchen with code, live prep board with roles", async () => {
  const p = await page(); await p.goto(BASE + "#settings"); await ready(p); await p.waitForSelector("text=Send anonymous usage counts");
  await p.click("a:has-text('Sign in')"); await p.waitForSelector("text=Sign in to keep your kitchen in the cloud");
  await signIn(p, "chef", "Plamen"); await p.reload(); await p.waitForSelector(".who:has-text('Plamen')");
  await p.click("button:has-text('Save now')"); await p.waitForSelector("text=Last saved");
  await p.fill("input[placeholder='e.g. Hotel main kitchen']", "Main kitchen"); await p.click("button:has-text('Create')");
  await p.waitForSelector("h1:has-text('Main kitchen')"); const code = (await p.locator(".code b").innerText()).trim(); assert(/^[A-Z0-9]{6}$/.test(code), "code " + code);
  const kid = p.url().split("#team-")[1];
  if (SHOTS) await p.screenshot({ path: SHOTS + "/team.png", fullPage: true });
  const c = await page(); await c.goto(BASE + "#account"); await ready(c); await signIn(c, "cook", "Ivan"); await c.reload();
  await c.fill("input[placeholder='6 letters']", code.toLowerCase()); await c.click("button:has-text('Join')"); await c.waitForSelector("h1:has-text('Main kitchen')");
  assert(await c.locator(".code").count() === 0, "cook sees the code");
  await p.goto(BASE + "#board-" + kid); await p.waitForSelector("text=No tasks yet");
  await p.fill("input[placeholder='e.g. Beef stock 20 L']", "Peel onions"); await p.fill("input[placeholder='e.g. 5 kg']", "5 kg"); await p.click("button:has-text('Add task')");
  await p.waitForSelector(".tl li:has-text('Peel onions')");
  await c.goto(BASE + "#board-" + kid); await c.waitForSelector(".tl li:has-text('Peel onions')");
  assert(await c.locator("button:has-text('Add task')").count() === 0, "cook can add");
  await c.click(".tl .ck"); await c.waitForSelector(".tl li.done");
  await p.waitForSelector(".tl li.done:has-text('done by Ivan')", { timeout: 12000 });
  if (SHOTS) await p.screenshot({ path: SHOTS + "/board.png", fullPage: true });
  await p.goto(BASE + "#kitchen"); await p.waitForSelector("a.hz:has-text('Prep board · Main kitchen')");
  assert(p.errors.length === 0 && c.errors.length === 0, p.errors.concat(c.errors).join("; "));
});
await test("community: share my recipe, find it signed out, save a copy", async () => {
  const mine = [{ id: "u" + RUN, name: "Banitsa " + RUN, N: 8, algs: [1, 3], ing: [["Filo pastry", 500], ["Sirene cheese", 400], ["Eggs", "4 pcs"]], steps: ["Layer", "Bake 40 min at 180 °C"], updatedAt: 1 }];
  const p = await page(); await p.addInitScript((m) => localStorage.setItem("bb-mine", m), JSON.stringify(mine));
  await p.goto(BASE + "#r-u" + RUN); await ready(p); await signIn(p, "baker", "Maria");
  await p.goto(BASE + "#community?share=u" + RUN); await p.reload(); await p.waitForSelector("text=Share your recipe");
  await p.check(".sw input"); await p.click("button:has-text('Share with the community')"); await p.waitForSelector("h1:has-text('Banitsa')");
  const g = await page(); await g.goto(BASE + "#community"); await ready(g); await g.fill("input[aria-label='Search community recipes']", "sirene");
  await g.click(`a.cr:has-text('Banitsa ${RUN}')`); await g.waitForSelector("text=Shared by Maria"); await g.waitForSelector(".ing li:has-text('Filo pastry')");
  await g.click("button:has-text('Save to my recipes')"); await g.waitForSelector(`h1:has-text('Banitsa ${RUN}')`);
  const n = await g.evaluate(() => JSON.parse(localStorage.getItem("bb-mine")).length); assert(n === 1, "saved " + n);
  assert(p.errors.length === 0 && g.errors.length === 0, p.errors.concat(g.errors).join("; "));
});

await test("recipes by dish: soups, then fish, then a cuisine; old Bulgarian link opens Balkans", async () => {
  const p = await page(); await p.goto(BASE + "#recipes"); await ready(p);
  await p.click("a.dt:has-text('Soups')"); await p.waitForSelector("h1:has-text('Soups')");
  const all = parseInt((await p.locator(".count").innerText()).replace(/,/g, ""));
  assert(all > 200, "soups " + all);
  await p.click(".tags button:has-text('Fish')"); await p.waitForTimeout(150);
  const fish = parseInt((await p.locator(".count").innerText()).replace(/,/g, ""));
  assert(fish > 5 && fish < all, "fish soups " + fish);
  await p.click(".tags button:has-text('Mediterranean')"); await p.waitForTimeout(150);
  const med = parseInt((await p.locator(".count").innerText()).replace(/,/g, ""));
  assert(med >= 1 && med <= fish, "med fish soups " + med);
  await noHScroll(p);
  if (SHOTS) await p.screenshot({ path: SHOTS + "/dish-soups.png" });
  await p.goto(BASE + "#c-bulgarian-classics"); await p.waitForSelector("h1:has-text('Adriatic & Balkan')");
  await p.fill("input[aria-label='Search recipes']", "banitsa"); await p.waitForSelector("a.row");
  assert(p.errors.length === 0, p.errors.join("; "));
});

await b.close();
console.log(results.join("\n"));
console.log(failed ? `\n${failed} failed` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
