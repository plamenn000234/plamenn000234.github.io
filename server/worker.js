// Chefsheet API v2 (Cloudflare Worker + D1). One file: paste it into the worker editor and Deploy.
// Bindings: D1 database "chefsheet" as DB.
// Variables (Settings > Variables and Secrets): GOOGLE_CLIENT_ID (text), ADMIN_EMAILS (text, comma separated),
// ANTHROPIC_API_KEY (secret, only for photo import). Nothing secret lives in this file.
//
// Accounts are optional: the app works without them. Signing in with Google gives a cloud copy,
// shared kitchens with roles, a live prep board, verifiable certificates and community recipes.
// Anonymous usage counts need no account and store no device or person id.

const ORIGINS = ["https://plamenn000234.github.io", "https://appassets.androidplatform.net"];
const DEV_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const LIMITS = { sync: 2_000_000, recipe: 60_000, board: 300, kitchens: 10, members: 60, posts: 20, certs: 30, imports: 10, text: 300 };
const SESSION_DAYS = 180;

/* ---------- small helpers ---------- */
const now = () => Date.now();
const day = (t = now()) => new Date(t).toISOString().slice(0, 10);
const rid = (n = 12) => { const a = crypto.getRandomValues(new Uint8Array(n)); return [...a].map((b) => "abcdefghijkmnpqrstuvwxyz23456789"[b % 32]).join(""); };
const code = () => { const a = crypto.getRandomValues(new Uint8Array(6)); return [...a].map((b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join(""); };
const str = (v, max = LIMITS.text) => (typeof v === "string" ? v.trim().slice(0, max) : "");
async function sha(s) { const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)); return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
const b64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

class E extends Error { constructor(status, code) { super(code); this.status = status; this.code = code; } }
const fail = (status, code) => { throw new E(status, code); };

function cors(req) {
  const o = req.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": ORIGINS.includes(o) || DEV_ORIGIN.test(o) ? o : ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400", Vary: "Origin",
  };
}

/* ---------- Google sign-in: verify the ID token (RS256) ---------- */
let KEYS = null, KEYS_AT = 0;
async function googleKeys(env) {
  if (KEYS && now() - KEYS_AT < 3600e3) return KEYS;
  const r = await (env.FETCH || fetch)("https://www.googleapis.com/oauth2/v3/certs"); if (!r.ok) fail(502, "google_keys");
  KEYS = (await r.json()).keys; KEYS_AT = now(); return KEYS;
}
async function verifyGoogle(token, env) {
  if (env.DEV_AUTH === "1" && token.startsWith("dev:")) { const [, sub, email, name] = token.split(":"); return { sub: "dev-" + sub, email, name: name || email }; }
  const parts = String(token).split("."); if (parts.length !== 3) fail(401, "bad_token");
  let head, pl; try { head = JSON.parse(new TextDecoder().decode(b64u(parts[0]))); pl = JSON.parse(new TextDecoder().decode(b64u(parts[1]))); } catch { fail(401, "bad_token"); }
  const jwk = (await googleKeys(env)).find((k) => k.kid === head.kid); if (!jwk || head.alg !== "RS256") fail(401, "bad_token");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64u(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
  if (!ok) fail(401, "bad_token");
  if (!env.GOOGLE_CLIENT_ID || pl.aud !== env.GOOGLE_CLIENT_ID) fail(401, "bad_audience");
  if (!["accounts.google.com", "https://accounts.google.com"].includes(pl.iss)) fail(401, "bad_issuer");
  if (pl.exp * 1000 < now() - 60e3) fail(401, "expired");
  if (!pl.email || pl.email_verified === false) fail(401, "no_email");
  return { sub: pl.sub, email: pl.email, name: pl.name || pl.email.split("@")[0] };
}

/* ---------- database ---------- */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, sub TEXT UNIQUE NOT NULL, email TEXT NOT NULL, name TEXT NOT NULL, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (h TEXT PRIMARY KEY, uid TEXT NOT NULL, created INTEGER NOT NULL, seen INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_uid ON sessions(uid);
CREATE TABLE IF NOT EXISTS sync (uid TEXT PRIMARY KEY, data TEXT NOT NULL, at INTEGER NOT NULL, size INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS kitchens (id TEXT PRIMARY KEY, name TEXT NOT NULL, owner TEXT NOT NULL, code TEXT UNIQUE NOT NULL, created INTEGER NOT NULL, rev INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS members (kid TEXT NOT NULL, uid TEXT NOT NULL, role TEXT NOT NULL, joined INTEGER NOT NULL, PRIMARY KEY (kid, uid));
CREATE INDEX IF NOT EXISTS members_uid ON members(uid);
CREATE TABLE IF NOT EXISTS board (id TEXT PRIMARY KEY, kid TEXT NOT NULL, day TEXT NOT NULL, text TEXT NOT NULL, qty TEXT NOT NULL DEFAULT '', who TEXT NOT NULL DEFAULT '', done INTEGER NOT NULL DEFAULT 0, by TEXT NOT NULL DEFAULT '', at INTEGER NOT NULL, pos INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS board_kd ON board(kid, day);
CREATE TABLE IF NOT EXISTS krecipes (id TEXT NOT NULL, kid TEXT NOT NULL, uid TEXT NOT NULL, name TEXT NOT NULL, data TEXT NOT NULL, at INTEGER NOT NULL, PRIMARY KEY (kid, id));
CREATE TABLE IF NOT EXISTS certs (id TEXT PRIMARY KEY, uid TEXT NOT NULL, name TEXT NOT NULL, title TEXT NOT NULL, score INTEGER NOT NULL, date TEXT NOT NULL, at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS community (id TEXT PRIMARY KEY, uid TEXT NOT NULL, author TEXT NOT NULL, name TEXT NOT NULL, hay TEXT NOT NULL, data TEXT NOT NULL, at INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'public', reports INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS community_at ON community(status, at);
CREATE TABLE IF NOT EXISTS reports (cid TEXT NOT NULL, uid TEXT NOT NULL, PRIMARY KEY (cid, uid));
CREATE TABLE IF NOT EXISTS stats (day TEXT NOT NULL, ev TEXT NOT NULL, v TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (day, ev, v));
CREATE TABLE IF NOT EXISTS usage (device TEXT NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (device, day));`;
let READY = false;
async function ready(env) { if (READY) return; for (const s of SCHEMA.split(";").map((x) => x.trim()).filter(Boolean)) await env.DB.prepare(s).run(); READY = true; }
const one = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).first();
const all = async (env, sql, ...a) => (await env.DB.prepare(sql).bind(...a).all()).results || [];
const run = (env, sql, ...a) => env.DB.prepare(sql).bind(...a).run();
async function bump(env, key, max) { const r = await one(env, "INSERT INTO usage(device, day, n) VALUES (?1, ?2, 1) ON CONFLICT(device, day) DO UPDATE SET n = n + 1 RETURNING n", key, day()); if (r.n > max) fail(429, "limit"); return r.n; }

/* ---------- who is calling ---------- */
async function auth(req, env, need = true) {
  const t = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!t) { if (need) fail(401, "sign_in"); return null; }
  const s = await one(env, "SELECT uid, seen FROM sessions WHERE h = ?1", await sha(t));
  if (!s || s.seen < now() - SESSION_DAYS * 864e5) { if (need) fail(401, "sign_in"); return null; }
  if (s.seen < now() - 864e5) await run(env, "UPDATE sessions SET seen = ?1 WHERE h = ?2", now(), await sha(t));
  const u = await one(env, "SELECT id, email, name FROM users WHERE id = ?1", s.uid); if (!u && need) fail(401, "sign_in");
  return u;
}
const isAdmin = (u, env) => !!u && String(env.ADMIN_EMAILS || "").toLowerCase().split(",").map((x) => x.trim()).includes(u.email.toLowerCase());
async function member(env, kid, uid, roles = ["owner", "chef", "cook"]) {
  const m = await one(env, "SELECT role FROM members WHERE kid = ?1 AND uid = ?2", kid, uid);
  if (!m) fail(404, "no_kitchen"); if (!roles.includes(m.role)) fail(403, "role"); return m.role;
}
const touch = (env, kid) => run(env, "UPDATE kitchens SET rev = rev + 1 WHERE id = ?1", kid);

/* ---------- routes ---------- */
async function route(req, env, url) {
  const p = url.pathname.replace(/\/+$/, "") || "/", m = req.method, seg = p.split("/").filter(Boolean);
  const body = async () => { if (m === "GET" || m === "DELETE") return {}; try { return (await req.json()) || {}; } catch { fail(400, "bad_json"); } };

  if (p === "/") return { ok: true, service: "chefsheet-api", v: 2, google: env.GOOGLE_CLIENT_ID || "" };

  /* anonymous usage counts: event names only, no ids */
  if (p === "/ev" && m === "POST") {
    const b = await body(), v = str(b.v, 20) || "?", evs = Array.isArray(b.ev) ? b.ev.slice(0, 40) : [];
    for (const e of evs) { const ev = str(e, 40); if (/^[a-z0-9:_-]+$/i.test(ev)) await run(env, "INSERT INTO stats(day, ev, v, n) VALUES (?1, ?2, ?3, 1) ON CONFLICT(day, ev, v) DO UPDATE SET n = n + 1", day(), ev, v); }
    return { ok: true };
  }
  if (p === "/stats" && m === "GET") {
    const u = await auth(req, env); if (!isAdmin(u, env)) fail(403, "admin");
    const from = day(now() - (Number(url.searchParams.get("days")) || 30) * 864e5);
    const rows = await all(env, "SELECT ev, SUM(n) AS n FROM stats WHERE day >= ?1 GROUP BY ev ORDER BY n DESC LIMIT 200", from);
    const byDay = await all(env, "SELECT day, SUM(n) AS n FROM stats WHERE day >= ?1 AND ev = 'open' GROUP BY day ORDER BY day", from);
    const users = await one(env, "SELECT COUNT(*) AS n FROM users"), kitchens = await one(env, "SELECT COUNT(*) AS n FROM kitchens"), posts = await one(env, "SELECT COUNT(*) AS n FROM community WHERE status = 'public'");
    return { from, events: rows, opens: byDay, users: users.n, kitchens: kitchens.n, community: posts.n };
  }

  /* public certificate check */
  if (seg[0] === "certs" && seg[1] && m === "GET") {
    const c = await one(env, "SELECT id, name, title, score, date FROM certs WHERE id = ?1", seg[1]); if (!c) fail(404, "not_found"); return { cert: c };
  }

  /* sign in and out */
  if (p === "/auth/google" && m === "POST") {
    const b = await body(), g = await verifyGoogle(str(b.credential, 4000), env);
    let u = await one(env, "SELECT id, email, name FROM users WHERE sub = ?1", g.sub);
    if (!u) { u = { id: rid(), email: g.email, name: str(g.name, 60) }; await run(env, "INSERT INTO users(id, sub, email, name, created) VALUES (?1, ?2, ?3, ?4, ?5)", u.id, g.sub, u.email, u.name, now()); }
    else if (u.email !== g.email) await run(env, "UPDATE users SET email = ?1 WHERE id = ?2", g.email, u.id);
    const t = rid(32); await run(env, "INSERT INTO sessions(h, uid, created, seen) VALUES (?1, ?2, ?3, ?3)", await sha(t), u.id, now());
    return { token: t, user: { ...u, email: g.email } };
  }
  const u = await auth(req, env, false);
  if (p === "/auth/logout" && m === "POST") { const t = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, ""); if (t) await run(env, "DELETE FROM sessions WHERE h = ?1", await sha(t)); return { ok: true }; }

  /* community: reading is public */
  if (p === "/community" && m === "GET") {
    const q = str(url.searchParams.get("q"), 60).toLowerCase(), off = Math.max(0, Number(url.searchParams.get("o")) || 0);
    const rows = q ? await all(env, "SELECT id, author, name, at FROM community WHERE status = 'public' AND hay LIKE ?1 ORDER BY at DESC LIMIT 30 OFFSET ?2", "%" + q.replace(/[%_]/g, "") + "%", off)
      : await all(env, "SELECT id, author, name, at FROM community WHERE status = 'public' ORDER BY at DESC LIMIT 30 OFFSET ?1", off);
    return { list: rows };
  }
  if (seg[0] === "community" && seg[1] && seg.length === 2 && m === "GET") {
    const c = await one(env, "SELECT id, uid, author, name, data, at, status FROM community WHERE id = ?1", seg[1]);
    if (!c || (c.status !== "public" && c.uid !== u?.id && !isAdmin(u, env))) fail(404, "not_found");
    return { recipe: { id: c.id, author: c.author, name: c.name, at: c.at, mine: c.uid === u?.id, data: JSON.parse(c.data) } };
  }

  /* everything below needs an account */
  if (!u) fail(401, "sign_in");

  if (p === "/me" && m === "GET") {
    const ks = await all(env, "SELECT k.id, k.name, m.role FROM members m JOIN kitchens k ON k.id = m.kid WHERE m.uid = ?1 ORDER BY k.name", u.id);
    const s = await one(env, "SELECT at, size FROM sync WHERE uid = ?1", u.id);
    return { user: u, kitchens: ks, sync: s || null, admin: isAdmin(u, env) };
  }
  if (p === "/me" && m === "PATCH") { const b = await body(), n = str(b.name, 60); if (n) await run(env, "UPDATE users SET name = ?1 WHERE id = ?2", n, u.id); return { ok: true, name: n || u.name }; }
  if (p === "/me" && m === "DELETE") {
    // Deletes the account and everything it owns. Kitchens it owns go with it.
    for (const k of await all(env, "SELECT id FROM kitchens WHERE owner = ?1", u.id)) for (const t of ["members", "board", "krecipes"]) await run(env, `DELETE FROM ${t} WHERE kid = ?1`, k.id);
    await run(env, "DELETE FROM kitchens WHERE owner = ?1", u.id);
    for (const t of ["sessions", "sync", "members", "certs", "community", "reports"]) await run(env, `DELETE FROM ${t} WHERE uid = ?1`, u.id);
    await run(env, "DELETE FROM users WHERE id = ?1", u.id); return { ok: true };
  }

  /* cloud copy: the whole on-device backup, last write wins */
  if (p === "/sync" && m === "GET") { const s = await one(env, "SELECT data, at FROM sync WHERE uid = ?1", u.id); return s ? { at: s.at, data: JSON.parse(s.data) } : { at: 0, data: null }; }
  if (p === "/sync" && m === "PUT") {
    const raw = await req.text(); if (raw.length > LIMITS.sync) fail(413, "too_big");
    let b; try { b = JSON.parse(raw); } catch { fail(400, "bad_json"); }
    if (!b?.data || b.data.app !== "chefsheet") fail(400, "not_backup");
    const at = now(), data = JSON.stringify(b.data);
    await run(env, "INSERT INTO sync(uid, data, at, size) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(uid) DO UPDATE SET data = ?2, at = ?3, size = ?4", u.id, data, at, data.length);
    return { at };
  }

  /* kitchens and roles: owner (head chef), chef (edits the board and recipes), cook (ticks tasks) */
  if (p === "/kitchens" && m === "POST") {
    const b = await body(), name = str(b.name, 60); if (!name) fail(400, "name");
    const n = await one(env, "SELECT COUNT(*) AS n FROM kitchens WHERE owner = ?1", u.id); if (n.n >= LIMITS.kitchens) fail(429, "limit");
    const k = { id: rid(), name, code: code() };
    await run(env, "INSERT INTO kitchens(id, name, owner, code, created) VALUES (?1, ?2, ?3, ?4, ?5)", k.id, name, u.id, k.code, now());
    await run(env, "INSERT INTO members(kid, uid, role, joined) VALUES (?1, ?2, 'owner', ?3)", k.id, u.id, now());
    return { kitchen: { ...k, role: "owner" } };
  }
  if (p === "/kitchens/join" && m === "POST") {
    const b = await body(), c = str(b.code, 12).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const k = await one(env, "SELECT id, name FROM kitchens WHERE code = ?1", c); if (!k) fail(404, "bad_code");
    const have = await one(env, "SELECT role FROM members WHERE kid = ?1 AND uid = ?2", k.id, u.id); if (have) return { kitchen: { ...k, role: have.role } };
    const n = await one(env, "SELECT COUNT(*) AS n FROM members WHERE kid = ?1", k.id); if (n.n >= LIMITS.members) fail(429, "full");
    await run(env, "INSERT INTO members(kid, uid, role, joined) VALUES (?1, ?2, 'cook', ?3)", k.id, u.id, now()); await touch(env, k.id);
    return { kitchen: { ...k, role: "cook" } };
  }
  if (seg[0] === "kitchens" && seg[1]) {
    const kid = seg[1], role = await member(env, kid, u.id), sub = seg.slice(2).join("/");
    const k = await one(env, "SELECT id, name, code, rev, owner FROM kitchens WHERE id = ?1", kid);
    if (!sub && m === "GET") {
      const ms = await all(env, "SELECT m.uid, u.name, m.role FROM members m JOIN users u ON u.id = m.uid WHERE m.kid = ?1 ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'chef' THEN 1 ELSE 2 END, u.name", kid);
      return { kitchen: { id: k.id, name: k.name, rev: k.rev, code: role === "cook" ? null : k.code }, role, me: u.id, members: ms };
    }
    if (!sub && m === "PATCH") {
      if (role !== "owner") fail(403, "role"); const b = await body();
      if (str(b.name, 60)) await run(env, "UPDATE kitchens SET name = ?1 WHERE id = ?2", str(b.name, 60), kid);
      if (b.newCode) await run(env, "UPDATE kitchens SET code = ?1 WHERE id = ?2", code(), kid);
      await touch(env, kid); return { ok: true };
    }
    if (!sub && m === "DELETE") {
      if (role !== "owner") fail(403, "role");
      for (const t of ["members", "board", "krecipes"]) await run(env, `DELETE FROM ${t} WHERE kid = ?1`, kid);
      await run(env, "DELETE FROM kitchens WHERE id = ?1", kid); return { ok: true };
    }
    if (seg[2] === "members" && seg[3]) {
      const who = seg[3], target = await one(env, "SELECT role FROM members WHERE kid = ?1 AND uid = ?2", kid, who); if (!target) fail(404, "not_found");
      if (m === "DELETE") {
        if (who !== u.id && role !== "owner") fail(403, "role"); if (target.role === "owner") fail(400, "owner_stays");
        await run(env, "DELETE FROM members WHERE kid = ?1 AND uid = ?2", kid, who); await touch(env, kid); return { ok: true };
      }
      if (m === "PATCH") {
        if (role !== "owner") fail(403, "role"); const b = await body(), r = b.role;
        if (!["chef", "cook", "owner"].includes(r) || who === u.id) fail(400, "role");
        if (r === "owner") { await run(env, "UPDATE members SET role = 'chef' WHERE kid = ?1 AND uid = ?2", kid, u.id); await run(env, "UPDATE kitchens SET owner = ?1 WHERE id = ?2", who, kid); }
        await run(env, "UPDATE members SET role = ?1 WHERE kid = ?2 AND uid = ?3", r, kid, who); await touch(env, kid); return { ok: true };
      }
    }
    /* live prep board: the app asks for changes every few seconds with the kitchen's rev */
    if (seg[2] === "board") {
      const tid = seg[3];
      if (!tid && m === "GET") {
        const d = str(url.searchParams.get("day"), 10) || day(), since = Number(url.searchParams.get("rev"));
        if (since && since === k.rev) return { rev: k.rev, same: true };
        return { rev: k.rev, day: d, tasks: await all(env, "SELECT id, text, qty, who, done, by, at, pos FROM board WHERE kid = ?1 AND day = ?2 ORDER BY pos, at", kid, d) };
      }
      if (!tid && m === "POST") {
        if (role === "cook") fail(403, "role"); const b = await body(), d = str(b.day, 10) || day();
        const items = (Array.isArray(b.tasks) ? b.tasks : [b]).slice(0, 100), out = [];
        const n = await one(env, "SELECT COUNT(*) AS n, MAX(pos) AS p FROM board WHERE kid = ?1 AND day = ?2", kid, d); if (n.n + items.length > LIMITS.board) fail(429, "limit");
        let pos = (n.p || 0) + 1;
        for (const x of items) { const text = str(x.text, 160); if (!text) continue; const t = { id: rid(), text, qty: str(x.qty, 40), who: str(x.who, 40) };
          await run(env, "INSERT INTO board(id, kid, day, text, qty, who, at, pos) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)", t.id, kid, d, t.text, t.qty, t.who, now(), pos++); out.push(t); }
        await touch(env, kid); return { added: out };
      }
      if (tid && (m === "PATCH" || m === "DELETE")) {
        const t = await one(env, "SELECT id FROM board WHERE id = ?1 AND kid = ?2", tid, kid); if (!t) fail(404, "not_found");
        if (m === "DELETE") { if (role === "cook") fail(403, "role"); await run(env, "DELETE FROM board WHERE id = ?1", tid); }
        else {
          const b = await body();
          if ("done" in b) await run(env, "UPDATE board SET done = ?1, by = ?2, at = ?3 WHERE id = ?4", b.done ? 1 : 0, b.done ? u.name : "", now(), tid);
          if (role !== "cook") { for (const f of ["text", "qty", "who"]) if (typeof b[f] === "string") await run(env, `UPDATE board SET ${f} = ?1 WHERE id = ?2`, str(b[f], f === "text" ? 160 : 40), tid); }
          else if (["text", "qty", "who"].some((f) => f in b)) fail(403, "role");
        }
        await touch(env, kid); return { ok: true };
      }
    }
    /* the kitchen's shared recipes (own recipes in the app format) */
    if (seg[2] === "recipes") {
      const r = seg[3];
      if (!r && m === "GET") return { rev: k.rev, list: (await all(env, "SELECT id, name, data, at FROM krecipes WHERE kid = ?1 ORDER BY name", kid)).map((x) => ({ ...x, data: JSON.parse(x.data) })) };
      if (r && m === "PUT") {
        if (role === "cook") fail(403, "role"); const raw = await req.text(); if (raw.length > LIMITS.recipe) fail(413, "too_big");
        let b; try { b = JSON.parse(raw); } catch { fail(400, "bad_json"); }
        const name = str(b?.data?.name, 120); if (!name || !Array.isArray(b.data.ing)) fail(400, "not_recipe");
        await run(env, "INSERT INTO krecipes(id, kid, uid, name, data, at) VALUES (?1, ?2, ?3, ?4, ?5, ?6) ON CONFLICT(kid, id) DO UPDATE SET name = ?4, data = ?5, at = ?6, uid = ?3", str(r, 40), kid, u.id, name, JSON.stringify(b.data), now());
        await touch(env, kid); return { ok: true };
      }
      if (r && m === "DELETE") { if (role === "cook") fail(403, "role"); await run(env, "DELETE FROM krecipes WHERE kid = ?1 AND id = ?2", kid, r); await touch(env, kid); return { ok: true }; }
    }
    fail(404, "not_found");
  }

  /* verifiable certificates */
  if (p === "/certs" && m === "POST") {
    const b = await body(), title = str(b.title, 120), name = str(b.name, 80) || u.name, score = Math.max(0, Math.min(100, Math.round(Number(b.score) || 0)));
    if (!title) fail(400, "title");
    const same = await one(env, "SELECT id FROM certs WHERE uid = ?1 AND title = ?2 AND name = ?3", u.id, title, name);
    if (same) { await run(env, "UPDATE certs SET score = ?1, date = ?2 WHERE id = ?3", score, str(b.date, 10) || day(), same.id); return { id: same.id }; }
    await bump(env, "cert:" + u.id, LIMITS.certs);
    const id = rid(10); await run(env, "INSERT INTO certs(id, uid, name, title, score, date, at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)", id, u.id, name, title, score, str(b.date, 10) || day(), now());
    return { id };
  }

  /* community recipes: anyone signed in can share; reports hide a recipe until the admin looks */
  if (p === "/community" && m === "POST") {
    const raw = await req.text(); if (raw.length > LIMITS.recipe) fail(413, "too_big");
    let b; try { b = JSON.parse(raw); } catch { fail(400, "bad_json"); }
    const d = b?.data, name = str(d?.name, 120); if (!name || !Array.isArray(d.ing) || !d.ing.length) fail(400, "not_recipe");
    await bump(env, "post:" + u.id, LIMITS.posts);
    const hay = (name + " " + d.ing.map((x) => x?.[0] || "").join(" ")).toLowerCase().slice(0, 2000);
    const old = b.id ? await one(env, "SELECT id FROM community WHERE id = ?1 AND uid = ?2", b.id, u.id) : null;
    const author = str(b.author, 60) || u.name;
    if (old) { await run(env, "UPDATE community SET name = ?1, hay = ?2, data = ?3, at = ?4, author = ?5 WHERE id = ?6", name, hay, JSON.stringify(d), now(), author, old.id); return { id: old.id }; }
    const id = rid(10); await run(env, "INSERT INTO community(id, uid, author, name, hay, data, at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)", id, u.id, author, name, hay, JSON.stringify(d), now());
    return { id };
  }
  if (p === "/community/mine" && m === "GET") return { list: await all(env, "SELECT id, name, at, status FROM community WHERE uid = ?1 ORDER BY at DESC", u.id) };
  if (seg[0] === "community" && seg[1] && seg[2] === "report" && m === "POST") {
    const c = await one(env, "SELECT id FROM community WHERE id = ?1", seg[1]); if (!c) fail(404, "not_found");
    const r = await env.DB.prepare("INSERT OR IGNORE INTO reports(cid, uid) VALUES (?1, ?2)").bind(seg[1], u.id).run();
    if (r.meta?.changes ?? 1) await run(env, "UPDATE community SET reports = reports + 1, status = CASE WHEN reports + 1 >= 3 THEN 'hidden' ELSE status END WHERE id = ?1", seg[1]);
    return { ok: true };
  }
  if (seg[0] === "community" && seg[1] && seg.length === 2 && m === "DELETE") {
    const c = await one(env, "SELECT uid FROM community WHERE id = ?1", seg[1]); if (!c) fail(404, "not_found");
    if (c.uid !== u.id && !isAdmin(u, env)) fail(403, "role"); await run(env, "DELETE FROM community WHERE id = ?1", seg[1]); return { ok: true };
  }
  if (p === "/admin/community" && m === "GET") { if (!isAdmin(u, env)) fail(403, "admin"); return { list: await all(env, "SELECT id, author, name, status, reports, at FROM community WHERE status != 'public' OR reports > 0 ORDER BY at DESC LIMIT 100") }; }
  if (seg[0] === "admin" && seg[1] === "community" && seg[2] && m === "PATCH") {
    if (!isAdmin(u, env)) fail(403, "admin"); const b = await body(); if (!["public", "hidden"].includes(b.status)) fail(400, "status");
    await run(env, "UPDATE community SET status = ?1, reports = 0 WHERE id = ?2", b.status, seg[2]); await run(env, "DELETE FROM reports WHERE cid = ?1", seg[2]); return { ok: true };
  }

  fail(404, "not_found");
}

/* ---------- certificate page anyone can open (from the QR on the certificate) ---------- */
async function certPage(id, env) {
  const c = await one(env, "SELECT name, title, score, date FROM certs WHERE id = ?1", id);
  const body = c ? `<p class="ok">Valid certificate</p><h1>${esc(c.name)}</h1><p>completed</p><h2>${esc(c.title)}</h2><p>Score ${c.score} % · ${esc(c.date)}</p>`
    : `<p class="no">Certificate not found</p><p>This code is not in the Chefsheet register. Ask the person for the original link.</p>`;
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chefsheet certificate check</title>
<style>body{font:16px/1.5 system-ui,sans-serif;margin:0;background:#f3f4f6;color:#14171b}main{max-width:520px;margin:40px auto;padding:32px 24px;background:#fff;border-radius:18px;box-shadow:0 2px 12px rgba(0,0,0,.08);text-align:center}
h1{font-size:28px;margin:6px 0}h2{font-size:20px;margin:6px 0 12px;color:#c2410c}.ok{color:#1f7a3a;font-weight:700}.no{color:#c92a2a;font-weight:700}small{color:#6a727c}
@media(prefers-color-scheme:dark){body{background:#111315;color:#eef0f2}main{background:#1b1e21}}</style></head>
<body><main>${body}<p><small>Chefsheet · certificate ${esc(id)}</small></p></main></body></html>`, { status: c ? 200 : 404, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "public, max-age=300" } });
}

/* ---------- photo import (needs ANTHROPIC_API_KEY; kept from v1) ---------- */
const IMPORT_SCHEMA = { type: "object", additionalProperties: false, required: ["title", "portions", "ingredients", "steps", "notes"],
  properties: { title: { type: "string" }, portions: { type: "number" }, steps: { type: "array", items: { type: "string" } }, notes: { type: "string" },
    ingredients: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "qty", "unit"], properties: { name: { type: "string" }, qty: { type: "number" }, unit: { type: "string" } } } } } };
const IMPORT_PROMPT = `This is a photo of a professional kitchen tech card (recipe card). Extract it.
Translate dish and ingredient names to English, keep quantities exactly as written, convert units to g, kg, ml, l, pcs or tsp/tbsp.
portions = number of portions the card is written for (1 if not stated). steps = short imperative cooking steps.
If something is unreadable, leave it out and mention it in notes. If the photo is not a recipe, return an empty title.`;
async function photoImport(req, env) {
  if (!env.ANTHROPIC_API_KEY) fail(503, "not_enabled");
  let b; try { b = await req.json(); } catch { fail(400, "bad_json"); }
  const { image, media_type, device } = b || {};
  if (typeof image !== "string" || !image || image.length > 7_000_000) fail(400, "bad_image");
  if (!["image/jpeg", "image/png", "image/webp"].includes(media_type)) fail(400, "bad_type");
  if (typeof device !== "string" || !/^[a-z0-9-]{8,64}$/i.test(device)) fail(400, "bad_device");
  const n = await bump(env, device, LIMITS.imports);
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST",
    headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2026-10-21", "anthropic-beta": "server-side-fallback-2026-07-01" },
    body: JSON.stringify({ model: "claude-opus-5-5", max_tokens: 16000, fallbacks: "default", output_config: { effort: "low", format: { type: "json_schema", schema: IMPORT_SCHEMA } },
      messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type, data: image } }, { type: "text", text: IMPORT_PROMPT }] }] }) });
  if (!r.ok) fail(502, "ai_failed");
  const msg = await r.json(); if (msg.stop_reason === "refusal") fail(422, "refused");
  const text = (msg.content || []).find((x) => x.type === "text")?.text;
  try { return { recipe: JSON.parse(text), left: LIMITS.imports - n }; } catch { fail(502, "ai_bad_output"); }
}

export default {
  async fetch(req, env) {
    const h = cors(req);
    if (req.method === "OPTIONS") return new Response(null, { headers: h });
    const url = new URL(req.url);
    try {
      await ready(env);
      if (url.pathname.startsWith("/c/") && req.method === "GET") return certPage(url.pathname.slice(3), env);
      const out = url.pathname === "/import" && req.method === "POST" ? await photoImport(req, env) : await route(req, env, url);
      return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...h } });
    } catch (e) {
      const status = e instanceof E ? e.status : 500;
      if (status === 500) console.error(e);
      return new Response(JSON.stringify({ error: e instanceof E ? e.code : "server" }), { status, headers: { "Content-Type": "application/json", ...h } });
    }
  },
};
