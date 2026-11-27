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
  const ctx = await b.newContext({ viewport: opts.vp || { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: opts.dark ? "dark" : "light" });
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

await test("old links: #order → #kitchen, #fav → favourites, #prep opens 2.x", async () => {
  const p = await page(); await p.goto(BASE + "#order"); await ready(p); assert((await p.evaluate(() => location.hash)) === "#kitchen", "no redirect");
  await p.goto(BASE + "#fav"); await p.waitForSelector("h1:has-text('Favourites')");
  await p.goto(BASE + "#prep"); await p.waitForURL((u) => !u.pathname.startsWith("/v3/"), { timeout: 8000 });
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

await b.close();
console.log(results.join("\n"));
console.log(failed ? `\n${failed} failed` : `\nall ${results.length} passed`);
process.exit(failed ? 1 : 0);
