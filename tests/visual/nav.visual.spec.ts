/**
 * Visual comparison of the nav bar: .ux-forge/nav-bar/nav-bar.html (over file://) next to the app's AppShell, for
 * each destination as the current one. Phones (390, 360, 320 wide) compare the bottom tab bar; 1440 wide compares
 * the top bar. Light and dark. The page content differs on purpose (the prototype shows a Home mock), so only the
 * bar is compared. Writes to tests/visual/report/nav/.
 */
import { test, type Page, type Route } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import sharp from "sharp";

const ROOT = join(import.meta.dirname, "..", "..");
const PROTO = pathToFileURL(join(ROOT, ".ux-forge/nav-bar/nav-bar.html")).href;
const REPORT = join(ROOT, "tests/visual/report/nav");
const APP = "http://localhost:3000";
const THRESHOLD = 0.1;

const ME = {
  user: { id: "u-sara", displayName: "Sara", email: "sara@example.com" },
  space: { id: "s1", name: "Our space", currency: "MAD", timezone: "Africa/Casablanca", slot: "a", memberCount: 2 },
};
const SPACE = {
  space: {
    id: "s1",
    name: "Our space",
    currency: "MAD",
    timezone: "Africa/Casablanca",
    inviteCode: "K7QM4XPA",
    inviteCodeRotatedAt: null,
    slot: "a",
    members: [
      { userId: "u-sara", displayName: "Sara", slot: "a", joinedAt: "2026-11-01T00:00:00Z" },
      { userId: "u-y", displayName: "Youssef", slot: "b", joinedAt: "2026-11-02T00:00:00Z" },
    ],
  },
};

const DESTS = [
  { id: "home", path: "/" },
  { id: "goals", path: "/goals" },
  { id: "trips", path: "/trips" },
  { id: "shopping", path: "/shopping" },
  { id: "profile", path: "/profile" },
] as const;

const VIEWS = [
  { name: "390x844", w: 390, h: 844, part: ".nav" },
  { name: "360x780", w: 360, h: 780, part: ".nav" },
  { name: "320x568", w: 320, h: 568, part: ".nav" },
  { name: "1440x900", w: 1440, h: 900, part: ".app-header" },
] as const;

interface Result {
  id: string;
  size: string;
  scheme: string;
  diffPercent: number;
  dims: [string, string];
  image: string;
}
const results: Result[] = [];

async function mock(page: Page) {
  await page.route("**/api/**", (route: Route) => {
    const path = new URL(route.request().url()).pathname;
    const body =
      path === "/api/me"
        ? ME
        : path === "/api/spaces/mine"
          ? SPACE
          : { uploadsEnabled: false, cloudinaryCloudName: null };
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
}

async function grab(page: Page, selector: string): Promise<PNG> {
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(350);
  return PNG.sync.read(await page.locator(selector).first().screenshot({ animations: "disabled", caret: "hide" }));
}

function pad(img: PNG, w: number, h: number): PNG {
  if (img.width === w && img.height === h) return img;
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (x < img.width && y < img.height)
        img.data.copy(out.data, o, (y * img.width + x) * 4, (y * img.width + x) * 4 + 4);
      else out.data.set([255, 0, 255, 255], o);
    }
  return out;
}

async function compare(id: string, size: string, scheme: string, a: PNG, b: PNG) {
  const w = Math.max(a.width, b.width);
  const h = Math.max(a.height, b.height);
  const pa = pad(a, w, h);
  const pb = pad(b, w, h);
  const diff = new PNG({ width: w, height: h });
  const n = pixelmatch(pa.data, pb.data, diff.data, w, h, { threshold: THRESHOLD });
  const name = `${id}--${size}--${scheme}.png`;
  const gap = 12;
  // Stacked: prototype, React, diff (the bars are wide and short).
  await sharp({ create: { width: w, height: h * 3 + gap * 2, channels: 4, background: "#888888" } })
    .composite([
      { input: PNG.sync.write(pa), left: 0, top: 0 },
      { input: PNG.sync.write(pb), left: 0, top: h + gap },
      { input: PNG.sync.write(diff), left: 0, top: (h + gap) * 2 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(join(REPORT, name));
  results.push({
    id,
    size,
    scheme,
    diffPercent: (n / (w * h)) * 100,
    dims: [`${a.width}×${a.height}`, `${b.width}×${b.height}`],
    image: name,
  });
}

test.describe.configure({ mode: "serial" });
test.beforeAll(() => mkdirSync(REPORT, { recursive: true }));

for (const d of DESTS) {
  test(`nav current: ${d.id}`, async ({ browser }) => {
    for (const v of VIEWS) {
      for (const scheme of ["light", "dark"] as const) {
        const opts = { viewport: { width: v.w, height: v.h }, colorScheme: scheme, reducedMotion: "reduce" as const };
        const pctx = await browser.newContext(opts);
        const pp = await pctx.newPage();
        await pp.goto(`${PROTO}#/${d.id}`);
        const protoImg = await grab(pp, v.part);
        await pctx.close();

        const rctx = await browser.newContext(opts);
        const rp = await rctx.newPage();
        await mock(rp);
        await rp.goto(`${APP}${d.path}`);
        await rp.waitForSelector(".nav-link[aria-current=page]");
        const reactImg = await grab(rp, v.part);
        await rctx.close();

        await compare(`current-${d.id}`, v.name, scheme, protoImg, reactImg);
      }
    }
  });
}

test("nav keyboard focus", async ({ browser }) => {
  for (const v of VIEWS) {
    for (const scheme of ["light", "dark"] as const) {
      const opts = { viewport: { width: v.w, height: v.h }, colorScheme: scheme, reducedMotion: "reduce" as const };
      const pctx = await browser.newContext(opts);
      const pp = await pctx.newPage();
      // The prototype's ?focus= helper focuses the item from script; :focus-visible needs a keyboard focus, so
      // both sides get there by Tab.
      await pp.goto(`${PROTO}#/home`);
      await pp.keyboard.press("Tab"); // skip link
      while (!(await pp.evaluate(() => document.activeElement?.getAttribute("data-to") === "goals")))
        await pp.keyboard.press("Tab");
      const protoImg = await grab(pp, v.part);
      await pctx.close();

      const rctx = await browser.newContext(opts);
      const rp = await rctx.newPage();
      await mock(rp);
      await rp.goto(`${APP}/`);
      await rp.waitForSelector(".nav-link[aria-current=page]");
      for (let i = 0; i < 12; i++) {
        await rp.keyboard.press("Tab");
        if (await rp.evaluate(() => document.activeElement?.getAttribute("href") === "/goals")) break;
      }
      const reactImg = await grab(rp, v.part);
      await rctx.close();
      await compare("focus-goals", v.name, scheme, protoImg, reactImg);
    }
  }
});

test.afterAll(() => {
  results.sort((a, b) => b.diffPercent - a.diffPercent);
  writeFileSync(join(REPORT, "results.json"), JSON.stringify(results, null, 2));
  const rows = results
    .map(
      (r) =>
        `<tr><td>${r.id}</td><td>${r.size}</td><td>${r.scheme}</td><td class="n">${r.diffPercent.toFixed(2)}%</td>` +
        `<td class="n">${r.dims.join(" / ")}</td><td><a href="${r.image}">image</a></td></tr>`,
    )
    .join("\n");
  writeFileSync(
    join(REPORT, "index.html"),
    `<!doctype html><meta charset="utf-8"><title>Nav bar visual comparison</title>
<style>body{font:14px system-ui;margin:24px}table{border-collapse:collapse}td,th{padding:4px 10px;border-bottom:1px solid #ddd;text-align:left}.n{text-align:right;font-variant-numeric:tabular-nums}</style>
<h1>Nav bar: prototype vs React</h1>
<p>Each image, top to bottom: prototype, React, pixel diff (threshold ${THRESHOLD}). Magenta = different size. Worst first.</p>
<table><tr><th>Case</th><th>Size</th><th>Scheme</th><th>Diff</th><th>Size (proto / React)</th><th></th></tr>
${rows}</table>`,
  );
});
