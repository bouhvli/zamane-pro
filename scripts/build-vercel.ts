/**
 * pnpm build, last step (D56): writes Vercel's Build Output API v3 in .vercel/output, which Vercel deploys as is.
 *   static/            the client build (dist/client): the SPA, the service worker, icons
 *   functions/api.func one Node.js function with the whole /api (src/worker/vercel.ts, bundled by esbuild)
 *   config.json        routes: security headers, /api/* → the function (original URL kept), the files, then the
 *                      SPA fallback to /index.html
 * The function runs in fra1 (Frankfurt), next to the Neon database (eu-central-1).
 */
import { build } from "esbuild";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = ".vercel/output";
const CLIENT = "dist/client";
const FUNC = join(OUT, "functions", "api.func");
const REGION = "fra1";

if (!existsSync(join(CLIENT, "index.html"))) {
  console.error("build-vercel: no dist/client/index.html — run vite build first.");
  process.exit(1);
}
const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };

rmSync(OUT, { recursive: true, force: true });
mkdirSync(FUNC, { recursive: true });
cpSync(CLIENT, join(OUT, "static"), { recursive: true });

await build({
  entryPoints: ["src/worker/vercel.ts"],
  outfile: join(FUNC, "index.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  // Syntax only: drops dead branches (the test-only route) while names stay readable in stack traces.
  minifySyntax: true,
  sourcemap: false,
  legalComments: "none",
  // The test-only route is dead code here and drops out of the bundle (check:secrets verifies it).
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __E2E__: "false" },
  // Some dependencies are CommonJS and call require(); give the ESM bundle one.
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  logLevel: "warning",
});

writeFileSync(
  join(FUNC, ".vc-config.json"),
  JSON.stringify(
    {
      runtime: "nodejs22.x",
      handler: "index.mjs",
      launcherType: "Nodejs",
      shouldAddHelpers: false,
      supportsResponseStreaming: true,
      regions: [REGION],
    },
    null,
    2,
  ),
);
writeFileSync(join(FUNC, "package.json"), JSON.stringify({ type: "module" }));

/** Headers for every response (the API sets its own as well, with secureHeaders in src/worker/index.ts). */
const SECURITY = {
  // The same policy as the API (§12): the SPA loads only its own files, Google Fonts and Cloudinary images.
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' https://fonts.googleapis.com",
    "font-src https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://res.cloudinary.com",
    "connect-src 'self' https://api.cloudinary.com",
    "worker-src 'self'",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
};

writeFileSync(
  join(OUT, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "/(.*)", headers: SECURITY, continue: true },
        // Fingerprinted build files never change; the service worker and the page must always be fresh.
        { src: "/assets/(.*)", headers: { "Cache-Control": "public, max-age=31536000, immutable" }, continue: true },
        {
          src: "/(sw\\.js|index\\.html|manifest\\.webmanifest)",
          headers: { "Cache-Control": "no-cache" },
          continue: true,
        },
        { src: "^/api(/.*)?$", dest: "/api" },
        { handle: "filesystem" },
        // Client routes (/goals/…): the SPA answers. Unknown files under /assets stay 404.
        { src: "^/assets/.*", status: 404 },
        { src: "/(.*)", dest: "/index.html", headers: { "Cache-Control": "no-cache" } },
      ],
    },
    null,
    2,
  ),
);

console.log(`build-vercel: ${OUT} ready (static + api function in ${REGION}).`);
