/**
 * pnpm preview: serves the built .vercel/output on :3000 the way Vercel routes it (D56), to check a build locally:
 * /api/* → the bundled function (with .env as its environment), files from static/, otherwise index.html.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join, normalize } from "node:path";
import { pathToFileURL } from "node:url";

const OUT = ".vercel/output";
if (!existsSync(join(OUT, "config.json"))) {
  console.error("preview: no .vercel/output — run pnpm build first.");
  process.exit(1);
}
if (existsSync(".env")) process.loadEnvFile(".env");
process.env.APP_ENV ??= "development";

const fn = (await import(pathToFileURL(join(OUT, "functions/api.func/index.mjs")).href)) as {
  default: (req: IncomingMessage, res: ServerResponse) => void;
};
const STATIC = join(OUT, "static");
/** The header routes from config.json, applied like Vercel does (every matching route with `headers`). */
const ROUTES = (
  JSON.parse(readFileSync(join(OUT, "config.json"), "utf8")) as {
    routes: { src?: string; headers?: Record<string, string> }[];
  }
).routes.filter((r) => r.src && r.headers);
function headersFor(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of ROUTES) if (new RegExp(r.src!).test(path)) Object.assign(out, r.headers);
  return out;
}
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".json": "application/json",
};

function file(path: string): string | null {
  const p = normalize(join(STATIC, decodeURIComponent(path)));
  if (!p.startsWith(normalize(STATIC))) return null;
  return existsSync(p) && statSync(p).isFile() ? p : null;
}

createServer((req, res) => {
  const path = new URL(req.url ?? "/", "http://localhost").pathname;
  for (const [k, v] of Object.entries(headersFor(path))) res.setHeader(k, v);
  if (path === "/api" || path.startsWith("/api/")) return fn.default(req, res);
  const hit = file(path) ?? (path.startsWith("/assets/") ? null : join(STATIC, "index.html"));
  if (!hit) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "Content-Type": TYPES[extname(hit)] ?? "application/octet-stream" });
  res.end(readFileSync(hit));
}).listen(3000, () => console.log("preview: http://localhost:3000 (the built output)"));
