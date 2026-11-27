// Runs the worker on Node with an in-memory SQLite in place of D1. For tests only:
//   node --no-warnings server/dev.mjs  (port 8787, Google sign-in replaced by "dev:<id>:<email>:<name>" tokens)
import { DatabaseSync } from "node:sqlite";
import { createServer } from "node:http";
import worker from "./worker.js";

export function d1() {
  const db = new DatabaseSync(":memory:");
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    first: async () => { const s = db.prepare(sql); return s.get(...args) ?? null; },
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: r.changes } }; },
  });
  return { prepare: (sql) => stmt(sql) };
}
export function env(extra = {}) { return { DB: d1(), DEV_AUTH: "1", GOOGLE_CLIENT_ID: "dev", ADMIN_EMAILS: "admin@example.com", ...extra }; }

export function serve(port = 8787, e = env()) {
  const srv = createServer(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    const r = await worker.fetch(new Request("http://localhost:" + port + req.url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body }), e);
    res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
  });
  return new Promise((ok) => srv.listen(port, () => ok(srv)));
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop())) serve(Number(process.env.PORT) || 8787).then(() => console.log("api on 8787"));
