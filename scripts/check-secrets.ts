/**
 * pnpm check:secrets (§11, §12, D34): fails if the build output carries a secret.
 *   - what browsers get (.vercel/output/static) must not contain "CLOUDINARY_API_SECRET", "postgres://" or
 *     "postgresql://". The server function legitimately names its own settings, so the literals aren't checked there;
 *   - no file in .vercel/output may contain a secret value present in this environment (DATABASE_URL, …);
 *   - the test-only reset-link route must be absent from the server function.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

if (existsSync(".env")) process.loadEnvFile(".env");

const OUT = ".vercel/output";
if (!existsSync(OUT)) {
  console.error("check:secrets: no .vercel/output — run `pnpm build` first.");
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
for (const file of files(OUT)) {
  const rel = relative(OUT, file).replace(/\\/g, "/");
  if (/(^|\/)\.env(\.|$)/.test(rel)) problems.push(`${rel}: an .env file in the build output`);
  const text = readFileSync(file, "utf8");
  if (rel.startsWith("static/"))
    for (const lit of LITERALS) if (text.includes(lit)) problems.push(`${rel}: contains "${lit}"`);
  for (const [key, value] of VALUES) if (text.includes(value)) problems.push(`${rel}: contains the value of ${key}`);
  if (rel.startsWith("functions/") && rel.endsWith(".mjs"))
    for (const t of TEST_ONLY) if (text.includes(t)) problems.push(`${rel}: contains the test-only route ("${t}")`);
}

if (problems.length) {
  console.error(`check:secrets: ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log("check:secrets: .vercel/output is clean (no secrets, no test-only routes).");
