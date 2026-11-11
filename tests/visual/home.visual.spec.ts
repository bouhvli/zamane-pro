/**
 * Visual comparison: .ux-forge/home/home.html (over file://, ?state= / ?sheet= / ?toast=) next to the app's Home
 * with the same example data mocked and the clock fixed to the prototype's "today" (Mon 9 Nov 2026).
 * Phones at 390×844 and 360×780 for every state; 1440×900 for the page states (the masthead line and the
 * 5 | 7 grid). Light and dark. The prototype's footnote is hidden. Writes to tests/visual/report/home/.
 */
import { test, type BrowserContext, type Page, type Route } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import sharp from "sharp";

const ROOT = join(import.meta.dirname, "..", "..");
const PROTO = pathToFileURL(join(ROOT, ".ux-forge/home/home.html")).href;
const REPORT = join(ROOT, "tests/visual/report/home");
const APP = "http://localhost:3000";
const THRESHOLD = 0.1;
const TODAY = new Date("2026-11-09T10:00:00");

const SARA = { userId: "u-sara", displayName: "Sara", slot: "a" as const };
const YOUSSEF = { userId: "u-youssef", displayName: "Youssef", slot: "b" as const };
const ME = (memberCount: number) => ({
  user: { id: "u-sara", displayName: "Sara", email: "sara@example.com" },
  space: { id: "s1", name: "Our space", currency: "MAD", timezone: "Africa/Casablanca", slot: "a", memberCount },
});

type Goal = {
  id: string;
  kind: "money" | "general";
  title: string;
  progress: number;
  target: number | null;
  completedAt: string | null;
  last: null | { userId: string; amount: number | null; percent: number | null; note: string | null; at: string };
};
type Home = {
  currency: string;
  total: number;
  goals: Goal[];
  trips: { id: string; title: string; destination: string | null; startDate: string; endDate: string }[];
  shoppingLeft: number;
  members: (typeof SARA | typeof YOUSSEF)[];
  inviteCode: string | null;
};

/** The prototype's initialData(), in the API's shape (minor units). */
function homeFor(state: string): Home {
  const h: Home = {
    currency: "MAD",
    total: 2_025_000,
    goals: [
      {
        id: "g-wedding",
        kind: "money",
        title: "Wedding fund",
        progress: 1_425_000,
        target: 2_000_000,
        completedAt: null,
        last: { userId: "u-sara", amount: 50_000, percent: null, note: null, at: "2026-11-07T09:00:00" },
      },
      {
        id: "g-room",
        kind: "general",
        title: "Paint the guest room",
        progress: 60,
        target: null,
        completedAt: null,
        last: { userId: "u-youssef", amount: null, percent: 60, note: null, at: "2026-11-08T18:00:00" },
      },
      {
        id: "g-honeymoon",
        kind: "money",
        title: "Honeymoon",
        progress: 0,
        target: 3_000_000,
        completedAt: null,
        last: null,
      },
      {
        id: "g-sofa",
        kind: "money",
        title: "New sofa",
        progress: 600_000,
        target: 600_000,
        completedAt: "2026-11-01T10:00:00",
        last: { userId: "u-youssef", amount: 600_000, percent: null, note: null, at: "2026-11-01T10:00:00" },
      },
    ],
    trips: [
      {
        id: "t-chef",
        title: "Chefchaouen",
        destination: "Rif mountains",
        startDate: "2026-11-21",
        endDate: "2026-11-25",
      },
    ],
    shoppingLeft: 7,
    members: [SARA, YOUSSEF],
    inviteCode: null,
  };
  if (state === "trip-now") h.trips[0] = { ...h.trips[0]!, startDate: "2026-11-08", endDate: "2026-11-12" };
  if (state === "no-trip") h.trips = [];
  if (state === "all-done") {
    h.total = 5_600_000;
    h.goals = h.goals.map((g) =>
      g.kind === "money"
        ? { ...g, progress: g.target!, completedAt: "2026-11-05T10:00:00" }
        : { ...g, progress: 100, completedAt: "2026-11-05T10:00:00" },
    );
  }
  if (state === "joined-empty") Object.assign(h, { total: 0, goals: [], trips: [], shoppingLeft: 0 });
  if (state === "first-run") Object.assign(h, { members: [SARA], inviteCode: "K7QM4XPA" });
  return h;
}

/** A small stateful server: entries change what /api/home answers next, like the prototype's commit(). */
async function mockServer(page: Page, state: string, opts: { homeHangs?: boolean; homeFails?: boolean } = {}) {
  const home = homeFor(state);
  const entries = new Map<string, { goalId: string; amount?: number; percent?: number; prevPercent?: number }>();
  await page.route("**/api/**", async (route: Route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    const json = (status: number, body: unknown) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/api/me") return json(200, ME(home.members.length));
    if (path === "/api/config") return json(200, { uploadsEnabled: false, cloudinaryCloudName: null });
    if (path === "/api/home") {
      if (opts.homeHangs) return new Promise<void>(() => {});
      if (opts.homeFails) return json(500, { error: { code: "internal", message: "x" } });
      return json(200, home);
    }
    const m = path.match(/^\/api\/goals\/([^/]+)\/entries(?:\/([^/]+))?$/);
    if (m && req.method() === "POST") {
      const body = req.postDataJSON() as { id: string; amount?: number; percent?: number; note?: string };
      const g = home.goals.find((x) => x.id === m[1])!;
      const prevPercent = g.progress;
      if (g.kind === "money") {
        g.progress += body.amount!;
        home.total += body.amount!;
      } else g.progress = body.percent!;
      const done = g.kind === "money" ? g.progress >= g.target! : g.progress >= 100;
      const crossed = done && !g.completedAt;
      if (done && !g.completedAt) g.completedAt = TODAY.toISOString();
      g.last = {
        userId: "u-sara",
        amount: body.amount ?? null,
        percent: body.percent ?? null,
        note: body.note ?? null,
        at: TODAY.toISOString(),
      };
      entries.set(body.id, { goalId: g.id, amount: body.amount, percent: body.percent, prevPercent });
      return json(201, {
        entry: { id: body.id },
        goal: { id: g.id, progress: g.progress, completedAt: g.completedAt },
        completed: crossed,
      });
    }
    if (m && req.method() === "DELETE") return route.fulfill({ status: 204 });
    return json(404, { error: { code: "not_found", message: "x" } });
  });
}

interface Case {
  id: string;
  proto: string; // query string for home.html
  state: string; // mock data
  wide?: boolean; // also 1440×900
  react?: (p: Page, ctx: BrowserContext) => Promise<void>;
  server?: { homeHangs?: boolean; homeFails?: boolean };
  wait?: number;
}

const openSheet = async (p: Page) => {
  // By keyboard, like the prototype's scripted open, so focus-visible rings match.
  await p.focus("#primary");
  await p.keyboard.press("Enter");
  await p.waitForSelector("#qa-sheet[open]");
};
const pick = async (p: Page, title: string) => {
  await openSheet(p);
  await p.click(`.pick-row:has-text("${title}")`);
  await p.waitForSelector("#add-form");
};
const addAmount = async (p: Page, title: string, value: string) => {
  await pick(p, title);
  await p.fill("#amt", value);
  await p.press("#amt", "Enter");
  await p.waitForSelector("#toast:not([hidden])");
};

const CASES: Case[] = [
  ...["populated", "first-run", "joined-empty", "trip-now", "no-trip", "all-done"].map((s): Case => ({
    id: s,
    proto: `state=${s}`,
    state: s,
    wide: true,
  })),
  { id: "loading", proto: "state=loading", state: "populated", wide: true, server: { homeHangs: true } },
  { id: "error", proto: "state=error", state: "populated", wide: true, server: { homeFails: true }, wait: 3500 },
  {
    id: "offline",
    proto: "state=offline",
    state: "populated",
    wide: true,
    react: async (p) => {
      await p.context().setOffline(true);
      await p.waitForSelector(".home .notice");
    },
  },
  { id: "sheet-pick", proto: "sheet=pick", state: "populated", react: openSheet },
  { id: "sheet-money", proto: "sheet=money", state: "populated", react: (p) => pick(p, "Wedding fund") },
  { id: "sheet-percent", proto: "sheet=percent", state: "populated", react: (p) => pick(p, "Paint the guest room") },
  {
    id: "sheet-invalid",
    proto: "sheet=invalid",
    state: "populated",
    react: async (p) => {
      await pick(p, "Wedding fund");
      await p.fill("#amt", "12x");
      await p.press("#amt", "Enter");
      await p.waitForSelector("#amt-err:not([hidden])");
    },
  },
  { id: "toast-added", proto: "toast=added", state: "populated", react: (p) => addAmount(p, "Wedding fund", "500") },
  {
    id: "toast-completed",
    proto: "toast=completed",
    state: "populated",
    react: (p) => addAmount(p, "Wedding fund", "5750"),
  },
  {
    id: "toast-queued",
    proto: "toast=queued",
    state: "populated",
    react: async (p) => {
      await p.context().setOffline(true);
      await p.waitForSelector(".home .notice");
      await addAmount(p, "Wedding fund", "500");
    },
  },
  {
    id: "toast-percent",
    proto: "toast=percent",
    state: "populated",
    react: async (p) => {
      await pick(p, "Paint the guest room");
      await p.fill("#amt", "70");
      await p.press("#amt", "Enter");
      await p.waitForSelector("#toast:not([hidden])");
    },
  },
];

const PHONES = [
  { name: "390x844", w: 390, h: 844 },
  { name: "360x780", w: 360, h: 780 },
] as const;
const WIDE = { name: "1440x900", w: 1440, h: 900 } as const;

interface Result {
  id: string;
  size: string;
  scheme: string;
  diffPercent: number;
  heights: [number, number];
  image: string;
}
const results: Result[] = [];

async function shoot(page: Page, wait: number): Promise<PNG> {
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
  await page.waitForTimeout(wait);
  return PNG.sync.read(await page.screenshot({ fullPage: true, animations: "disabled", caret: "hide" }));
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
  const stacked = w > 800; // wide pages stack top to bottom; phones sit side by side
  await sharp({
    create: {
      width: stacked ? w : w * 3 + gap * 2,
      height: stacked ? h * 3 + gap * 2 : h,
      channels: 4,
      background: "#888888",
    },
  })
    .composite([
      { input: PNG.sync.write(pa), left: 0, top: 0 },
      { input: PNG.sync.write(pb), left: stacked ? 0 : w + gap, top: stacked ? h + gap : 0 },
      { input: PNG.sync.write(diff), left: stacked ? 0 : (w + gap) * 2, top: stacked ? (h + gap) * 2 : 0 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(join(REPORT, name));
  results.push({ id, size, scheme, diffPercent: (n / (w * h)) * 100, heights: [a.height, b.height], image: name });
}

test.describe.configure({ mode: "serial" });
test.beforeAll(() => mkdirSync(REPORT, { recursive: true }));

for (const c of CASES) {
  test(c.id, async ({ browser }) => {
    const sizes = c.wide ? [...PHONES, WIDE] : PHONES;
    for (const s of sizes) {
      for (const scheme of ["light", "dark"] as const) {
        const opts = {
          viewport: { width: s.w, height: s.h },
          colorScheme: scheme,
          reducedMotion: "reduce" as const,
          locale: "en-MA",
          timezoneId: "Africa/Casablanca",
        };
        // Prototype
        const pctx = await browser.newContext(opts);
        const pp = await pctx.newPage();
        await pp.clock.setFixedTime(TODAY);
        await pp.goto(`${PROTO}?${c.proto}`);
        await pp.addStyleTag({ content: "#footnote{display:none!important}" });
        const protoImg = await shoot(pp, c.id.startsWith("toast") || c.id.startsWith("sheet") ? 700 : 450);
        await pctx.close();

        // React
        const rctx = await browser.newContext(opts);
        const rp = await rctx.newPage();
        await rp.clock.setFixedTime(TODAY);
        await mockServer(rp, c.state, c.server);
        await rp.goto(`${APP}/`);
        await rp.waitForSelector(".home .masthead");
        if (c.server?.homeFails) await rp.waitForSelector(".lead-error", { timeout: 15_000 });
        else if (!c.server?.homeHangs) await rp.waitForSelector(".home .greet h1:not(.vh)");
        if (c.react) await c.react(rp, rctx);
        const reactImg = await shoot(rp, c.wait ?? (c.id.startsWith("toast") || c.id.startsWith("sheet") ? 700 : 450));
        await rctx.close();

        await compare(c.id, s.name, scheme, protoImg, reactImg);
      }
    }
  });
}

test.afterAll(() => {
  results.sort((a, b) => b.diffPercent - a.diffPercent);
  writeFileSync(join(REPORT, "results.json"), JSON.stringify(results, null, 2));
  const rows = results
    .map(
      (r) =>
        `<tr><td>${r.id}</td><td>${r.size}</td><td>${r.scheme}</td><td class="n">${r.diffPercent.toFixed(2)}%</td>` +
        `<td class="n">${r.heights.join(" / ")}</td><td><a href="${r.image}">image</a></td></tr>`,
    )
    .join("\n");
  writeFileSync(
    join(REPORT, "index.html"),
    `<!doctype html><meta charset="utf-8"><title>Home visual comparison</title>
<style>body{font:14px system-ui;margin:24px}table{border-collapse:collapse}td,th{padding:4px 10px;border-bottom:1px solid #ddd;text-align:left}.n{text-align:right;font-variant-numeric:tabular-nums}</style>
<h1>Home: prototype vs React</h1>
<p>Each image: prototype, React, pixel diff (threshold ${THRESHOLD}); phones side by side, wide pages stacked. Magenta = different size. Worst first.</p>
<table><tr><th>Case</th><th>Size</th><th>Scheme</th><th>Diff</th><th>Heights (proto / React)</th><th></th></tr>
${rows}</table>`,
  );
});
