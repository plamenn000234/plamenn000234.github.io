// API tests for server/worker.js on Node (no Cloudflare needed): node --no-warnings server/test.mjs
import worker from "./worker.js";
import { env } from "./dev.mjs";
const E = env(); let failed = 0; const out = [];
async function api(method, path, body, token) {
  const r = await worker.fetch(new Request("http://x" + path, { method, headers: { "Content-Type": "application/json", Origin: "https://plamenn000234.github.io", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: body ? JSON.stringify(body) : undefined }), E);
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { s: r.status, j, h: r.headers };
}
async function test(name, fn) { try { await fn(); out.push("ok   " + name); } catch (e) { failed++; out.push("FAIL " + name + "\n     " + e.message); } }
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${m}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`); };
const ok = (c, m) => { if (!c) throw new Error(m); };
const login = async (id, email, name) => (await api("POST", "/auth/google", { credential: `dev:${id}:${email}:${name}` })).j;

let chef, cook, other, kid, code;
await test("health and CORS", async () => { const r = await api("GET", "/"); eq(r.j.v, 2, "v"); eq(r.h.get("access-control-allow-origin"), "https://plamenn000234.github.io", "cors"); });
await test("no account: private routes say sign_in", async () => { const r = await api("GET", "/me"); eq([r.s, r.j.error], [401, "sign_in"], "me"); });
await test("google sign-in makes a user once; bad token refused", async () => {
  chef = await login("1", "chef@example.com", "Plamen"); ok(chef.token && chef.user.id, "token");
  const again = await login("1", "chef@example.com", "Plamen"); eq(again.user.id, chef.user.id, "same user");
  cook = await login("2", "cook@example.com", "Ivan"); other = await login("3", "x@example.com", "Other");
  const bad = await api("POST", "/auth/google", { credential: "a.b.c" }); eq(bad.s, 401, "bad");
});
await test("cloud copy: put and get the backup", async () => {
  const data = { app: "chefsheet", v: 3, data: { "bb-favs": ["a"] } };
  const p = await api("PUT", "/sync", { data }, chef.token); ok(p.j.at > 0, "at");
  const g = await api("GET", "/sync", null, chef.token); eq(g.j.data, data, "data");
  eq((await api("PUT", "/sync", { data: { x: 1 } }, chef.token)).j.error, "not_backup", "check");
  eq((await api("GET", "/sync", null, cook.token)).j.data, null, "other user empty");
});
await test("kitchen: create, join by code, roles", async () => {
  const k = await api("POST", "/kitchens", { name: "Main kitchen" }, chef.token); kid = k.j.kitchen.id; code = k.j.kitchen.code; eq(k.j.kitchen.role, "owner", "owner");
  eq((await api("POST", "/kitchens/join", { code: "nope" }, cook.token)).j.error, "bad_code", "bad code");
  const j = await api("POST", "/kitchens/join", { code: code.toLowerCase() }, cook.token); eq(j.j.kitchen.role, "cook", "cook");
  const v = await api("GET", "/kitchens/" + kid, null, cook.token); eq(v.j.members.length, 2, "members"); eq(v.j.kitchen.code, null, "cook does not see code");
  eq((await api("GET", "/kitchens/" + kid, null, other.token)).s, 404, "outsider");
  eq((await api("PATCH", "/kitchens/" + kid + "/members/" + chef.user.id, { role: "cook" }, cook.token)).s, 403, "cook can't set roles");
  const me = await api("GET", "/me", null, cook.token); eq(me.j.kitchens.map((x) => x.role), ["cook"], "me kitchens");
});
await test("prep board: chef adds, cook ticks, cook can't edit, rev changes", async () => {
  const a = await api("POST", `/kitchens/${kid}/board`, { day: "2026-12-01", tasks: [{ text: "Peel onions", qty: "5 kg", who: "Ivan" }, { text: "Beef stock" }] }, chef.token); eq(a.j.added.length, 2, "added");
  eq((await api("POST", `/kitchens/${kid}/board`, { text: "x" }, cook.token)).s, 403, "cook add");
  const g = await api("GET", `/kitchens/${kid}/board?day=2026-12-01`, null, cook.token); eq(g.j.tasks.map((t) => t.text), ["Peel onions", "Beef stock"], "order");
  const same = await api("GET", `/kitchens/${kid}/board?day=2026-12-01&rev=${g.j.rev}`, null, cook.token); eq(same.j.same, true, "no change");
  const t = g.j.tasks[0].id; eq((await api("PATCH", `/kitchens/${kid}/board/${t}`, { done: true }, cook.token)).j.ok, true, "tick");
  eq((await api("PATCH", `/kitchens/${kid}/board/${t}`, { text: "y" }, cook.token)).s, 403, "cook edit");
  const g2 = await api("GET", `/kitchens/${kid}/board?day=2026-12-01&rev=${g.j.rev}`, null, chef.token); ok(g2.j.rev > g.j.rev && g2.j.tasks[0].done === 1 && g2.j.tasks[0].by === "Ivan", "ticked " + JSON.stringify(g2.j));
  eq((await api("DELETE", `/kitchens/${kid}/board/${t}`, null, chef.token)).j.ok, true, "delete");
});
await test("kitchen recipes: chef shares, cook reads", async () => {
  const r = { name: "House burger sauce", N: 10, algs: [3], ing: [["Mayonnaise", 500], ["Pickles", 100]], steps: ["Mix"] };
  eq((await api("PUT", `/kitchens/${kid}/recipes/m1`, { data: r }, chef.token)).j.ok, true, "put");
  eq((await api("PUT", `/kitchens/${kid}/recipes/m1`, { data: r }, cook.token)).s, 403, "cook put");
  eq((await api("GET", `/kitchens/${kid}/recipes`, null, cook.token)).j.list[0].data.name, "House burger sauce", "get");
});
await test("roles: make chef, chef can add, cook leaves", async () => {
  eq((await api("PATCH", `/kitchens/${kid}/members/${cook.user.id}`, { role: "chef" }, chef.token)).j.ok, true, "promote");
  eq((await api("POST", `/kitchens/${kid}/board`, { text: "Bread" }, cook.token)).j.added.length, 1, "chef adds");
  eq((await api("DELETE", `/kitchens/${kid}/members/${chef.user.id}`, null, cook.token)).s, 403, "can't remove owner");
  eq((await api("DELETE", `/kitchens/${kid}/members/${cook.user.id}`, null, cook.token)).j.ok, true, "leave");
  eq((await api("GET", "/kitchens/" + kid, null, cook.token)).s, 404, "gone");
});
await test("certificates: issue, public check page", async () => {
  const c = await api("POST", "/certs", { title: "Food safety basics", score: 92, date: "2026-11-27", name: "Ivan Petrov" }, cook.token); ok(c.j.id, "id");
  eq((await api("GET", "/certs/" + c.j.id)).j.cert.name, "Ivan Petrov", "json");
  const page = await api("GET", "/c/" + c.j.id); ok(String(page.j).includes("Valid certificate") && String(page.j).includes("Food safety basics"), "page");
  ok(String((await api("GET", "/c/zzzz")).j).includes("not found"), "missing");
  eq((await api("POST", "/certs", { title: "Food safety basics", score: 95, name: "Ivan Petrov" }, cook.token)).j.id, c.j.id, "same cert updated");
});
let cid;
await test("community: share, list and search without account, report hides after 3, admin restores", async () => {
  eq((await api("POST", "/community", { data: { name: "x", ing: [] } }, chef.token)).s, 400, "empty");
  const p = await api("POST", "/community", { data: { name: "Grandma's banitsa", N: 8, ing: [["Filo pastry", 500], ["Sirene cheese", 400]], steps: ["Layer", "Bake"] } }, chef.token); cid = p.j.id;
  eq((await api("GET", "/community")).j.list.map((x) => x.name), ["Grandma's banitsa"], "list");
  eq((await api("GET", "/community?q=sirene")).j.list.length, 1, "search by ingredient");
  eq((await api("GET", "/community?q=pizza")).j.list.length, 0, "no match");
  eq((await api("GET", "/community/" + cid)).j.recipe.author, "Plamen", "open");
  for (const t of [cook.token, other.token, other.token]) await api("POST", `/community/${cid}/report`, null, t);
  eq((await api("GET", "/community")).j.list.length, 1, "2 distinct reports keep it");
  const x = await login("4", "y@example.com", "Y"); await api("POST", `/community/${cid}/report`, null, x.token);
  eq((await api("GET", "/community")).j.list.length, 0, "hidden after 3");
  const admin = await login("9", "admin@example.com", "Admin");
  eq((await api("GET", "/admin/community", null, admin.token)).j.list[0].status, "hidden", "admin sees");
  eq((await api("GET", "/admin/community", null, chef.token)).s, 403, "not admin");
  await api("PATCH", "/admin/community/" + cid, { status: "public" }, admin.token);
  eq((await api("GET", "/community")).j.list.length, 1, "restored");
  eq((await api("DELETE", "/community/" + cid, null, other.token)).s, 403, "not yours");
});
await test("anonymous stats: counts only, admin report", async () => {
  await api("POST", "/ev", { v: "3.0.0", ev: ["open", "tool:salt", "bad name!"] }); await api("POST", "/ev", { v: "3.0.0", ev: ["open"] });
  const admin = await login("9", "admin@example.com", "Admin"); const s = await api("GET", "/stats", null, admin.token);
  eq(s.j.events.find((x) => x.ev === "open").n, 2, "open"); ok(!s.j.events.some((x) => x.ev === "bad name!"), "filtered"); ok(s.j.users >= 4, "users");
  eq((await api("GET", "/stats", null, chef.token)).s, 403, "not admin");
});
await test("delete account removes data and owned kitchens; sign out", async () => {
  eq((await api("DELETE", "/me", null, chef.token)).j.ok, true, "delete");
  eq((await api("GET", "/me", null, chef.token)).s, 401, "session gone");
  eq((await api("GET", "/community")).j.list.length, 0, "posts gone");
  eq((await api("POST", "/kitchens/join", { code }, other.token)).j.error, "bad_code", "kitchen gone");
  await api("POST", "/auth/logout", null, other.token); eq((await api("GET", "/me", null, other.token)).s, 401, "logged out");
});
await test("photo import is off without a key", async () => { eq((await api("POST", "/import", { image: "x" })).j.error, "not_enabled", "import"); });
await test("real Google token shape: RS256 signature, audience, expiry", async () => {
  const kp = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = { ...(await crypto.subtle.exportKey("jwk", kp.publicKey)), kid: "k1", alg: "RS256" };
  const G = { ...E, DEV_AUTH: "0", GOOGLE_CLIENT_ID: "cid.apps.googleusercontent.com", FETCH: async () => new Response(JSON.stringify({ keys: [jwk] })) };
  const b = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const sign = async (pl) => { const h = b({ alg: "RS256", kid: "k1", typ: "JWT" }) + "." + b(pl); const sg = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", kp.privateKey, new TextEncoder().encode(h)); return h + "." + Buffer.from(sg).toString("base64url"); };
  const call = async (tok) => { const r = await worker.fetch(new Request("http://x/auth/google", { method: "POST", body: JSON.stringify({ credential: tok }) }), G); return [r.status, await r.json()]; };
  const base = { iss: "https://accounts.google.com", aud: "cid.apps.googleusercontent.com", sub: "g-77", email: "g@example.com", email_verified: true, name: "G", exp: Math.floor(Date.now() / 1000) + 600 };
  const [s1, j1] = await call(await sign(base)); eq(s1, 200, "valid " + JSON.stringify(j1)); ok(j1.token, "token");
  eq((await call(await sign({ ...base, aud: "other" })))[1].error, "bad_audience", "aud");
  eq((await call(await sign({ ...base, exp: 1000 })))[1].error, "expired", "exp");
  const t = await sign(base); eq((await call(t.slice(0, -4) + "AAAA"))[1].error, "bad_token", "tampered");
});
console.log(out.join("\n")); console.log(failed ? `\n${failed} failed` : `\nall ${out.length} passed`); process.exit(failed ? 1 : 0);
