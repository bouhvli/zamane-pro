/**
 * pnpm check:secrets (§11, §12, D34): fails if the build output carries a secret.
 *   - the client bundle (dist/client, what browsers get) must not contain "CLOUDINARY_API_SECRET", "postgres://"
 *     or "postgresql://". The Worker bundle legitimately names its own bindings, so the literals are not checked there;
 *   - no file in dist/ may contain a secret value present in this environment (DATABASE_URL, BETTER_AUTH_SECRET, …);
 *   - the test-only reset-link route must be absent from the Worker code (its .js files).
 * dist/zamane/.dev.vars is skipped: the Cloudflare plugin writes it for local `vite preview` from .env. It is never
 * served (it's outside dist/client) and never uploaded by `wrangler deploy`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

if (existsSync(".env")) process.loadEnvFile(".env");

const DIST = "dist";
if (!existsSync(DIST)) {
  console.error("check:secrets: no dist/ — run `pnpm build` first.");
  process.exit(1);
}

const LITERALS = ["CLOUDINARY_API_SECRET", "postgres://", "postgresql://"];
const VALUES = ["DATABASE_URL", "BETTER_AUTH_SECRET", "RESEND_API_KEY", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]
  .map((k) => [k, (process.env[k] ?? "").trim()] as const)
  .filter(([, v]) => v.length >= 8);
const TEST_ONLY = ["last-reset-link", "/api/test/"];

function* files(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else yield p;
  }
}

const problems: string[] = [];
for (const file of files(DIST)) {
  const rel = relative(DIST, file).replace(/\\/g, "/");
  if (rel === "zamane/.dev.vars") continue;
  if (rel.startsWith("client/") && /(^|\/)\.dev\.vars/.test(rel))
    problems.push(`${rel}: a .dev.vars file in served assets`);
  const text = readFileSync(file, "utf8");
  if (rel.startsWith("client/"))
    for (const lit of LITERALS) if (text.includes(lit)) problems.push(`${rel}: contains "${lit}"`);
  for (const [key, value] of VALUES) if (text.includes(value)) problems.push(`${rel}: contains the value of ${key}`);
  if (rel.startsWith("zamane/") && rel.endsWith(".js"))
    for (const t of TEST_ONLY) if (text.includes(t)) problems.push(`${rel}: contains the test-only route ("${t}")`);
}

if (problems.length) {
  console.error(`check:secrets: ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log("check:secrets: dist/ is clean (no secrets, no test-only routes).");
