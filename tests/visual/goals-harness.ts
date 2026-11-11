/**
 * Shared by the Goals visual specs: the prototype's example data (.ux-forge/goals/shared.js seed(), "today" Mon
 * 9 Nov 2026 12:00) in the API's shape, a small stateful mock of /api, and the side-by-side comparison report.
 * Known differences: the prototype's "Example photo" covers and journal photos have no real counterpart (the app
 * shows the title's initial / a delivered image), and the prototype's example-data footnote is hidden.
 */
import { test, type BrowserContext, type Page, type Route } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import sharp from "sharp";

export const ROOT = join(import.meta.dirname, "..", "..");
export const PROTO = pathToFileURL(join(ROOT, ".ux-forge/goals/goals.html")).href;
export const APP = "http://localhost:3000";
export const THRESHOLD = 0.1;
export const TODAY = new Date(2026, 10, 9, 12, 0, 0);

const SARA = { userId: "u-sara", displayName: "Sara", slot: "a" as const };
const YOUSSEF = { userId: "u-youssef", displayName: "Youssef", slot: "b" as const };
const who = (by: "a" | "b") => (by === "a" ? SARA.userId : YOUSSEF.userId);
/** A local wall-clock time as the browser (timezone Africa/Casablanca) reads it. */
const D = (y: number, m: number, d: number, h = 12, mi = 0) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}T${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}:00`;
const day = (iso: string) => iso.slice(0, 10);

type Kind = "money" | "general";
interface SeedGoal {
  id: string;
  kind: Kind;
  title: string;
  target: number | null;
  targetDate: string | null;
  description: string;
  cover: boolean;
  createdAt: string;
  createdBy: "a" | "b";
  updatedAt: string;
  completedAt: string | null;
  completedBy: "a" | "b" | null;
}
interface SeedEntry {
  id: string;
  goalId: string;
  by: "a" | "b";
  amount?: number;
  percent?: number;
  note: string;
  at: string;
}
interface SeedNote {
  id: string;
  goalId: string;
  by: "a" | "b";
  at: string;
  updatedAt: string;
  blocks: ({ type: "text"; text: string } | { type: "image"; alt: string })[];
}

/** shared.js seed(state), amounts in MAD (converted to minor units on the way out). */
export function seed(state: string) {
  const goals: SeedGoal[] = [
    {
      id: "wedding",
      kind: "money",
      title: "Wedding fund",
      target: 20000,
      targetDate: day(D(2027, 6, 12)),
      description: "For the venue in Fes, the photographer and the dress.",
      cover: true,
      createdAt: D(2026, 7, 28, 20, 10),
      createdBy: "a",
      updatedAt: D(2026, 9, 2, 9, 0),
      completedAt: null,
      completedBy: null,
    },
    {
      id: "guest-room",
      kind: "general",
      title: "Paint the guest room",
      target: null,
      targetDate: null,
      description: "",
      cover: false,
      createdAt: D(2026, 10, 3, 11, 0),
      createdBy: "b",
      updatedAt: D(2026, 10, 3, 11, 0),
      completedAt: null,
      completedBy: null,
    },
    {
      id: "honeymoon",
      kind: "money",
      title: "Honeymoon",
      target: 30000,
      targetDate: null,
      description: "",
      cover: false,
      createdAt: D(2026, 11, 1, 21, 30),
      createdBy: "a",
      updatedAt: D(2026, 11, 1, 21, 30),
      completedAt: null,
      completedBy: null,
    },
    {
      id: "sofa",
      kind: "money",
      title: "New sofa",
      target: 6000,
      targetDate: null,
      description: "",
      cover: false,
      createdAt: D(2026, 8, 10, 19, 0),
      createdBy: "b",
      updatedAt: D(2026, 8, 10, 19, 0),
      completedAt: D(2026, 10, 30, 18, 5),
      completedBy: "b",
    },
  ];
  const entries: SeedEntry[] = [
    { id: "e7", goalId: "wedding", by: "a", amount: 500, note: "bonus month", at: D(2026, 11, 7, 19, 42) },
    { id: "e6", goalId: "wedding", by: "b", amount: 1000, note: "", at: D(2026, 11, 1, 10, 15) },
    { id: "e5", goalId: "wedding", by: "a", amount: 750, note: "", at: D(2026, 10, 28, 21, 5) },
    { id: "e4", goalId: "wedding", by: "b", amount: 3000, note: "", at: D(2026, 10, 15, 18, 30) },
    { id: "e3", goalId: "wedding", by: "a", amount: 2000, note: "", at: D(2026, 10, 1, 9, 12) },
    { id: "e2", goalId: "wedding", by: "b", amount: 2500, note: "", at: D(2026, 9, 1, 8, 40) },
    { id: "e1", goalId: "wedding", by: "a", amount: 4500, note: "", at: D(2026, 8, 1, 12, 0) },
    { id: "p3", goalId: "guest-room", by: "b", percent: 60, note: "", at: D(2026, 11, 8, 17, 20) },
    { id: "p2", goalId: "guest-room", by: "a", percent: 40, note: "", at: D(2026, 10, 24, 15, 0) },
    { id: "p1", goalId: "guest-room", by: "b", percent: 20, note: "", at: D(2026, 10, 10, 16, 45) },
    { id: "s3", goalId: "sofa", by: "b", amount: 1000, note: "", at: D(2026, 10, 30, 18, 5) },
    { id: "s2", goalId: "sofa", by: "a", amount: 2500, note: "", at: D(2026, 9, 15, 20, 0) },
    { id: "s1", goalId: "sofa", by: "b", amount: 2500, note: "", at: D(2026, 8, 15, 13, 30) },
  ];
  const notes: SeedNote[] = [
    {
      id: "n2",
      goalId: "wedding",
      by: "a",
      at: D(2026, 11, 7, 19, 50),
      updatedAt: D(2026, 11, 7, 19, 50),
      blocks: [
        {
          type: "text",
          text: "The bonus came in, so most of it went here. Seven months to go and we're ahead of where we said we'd be.",
        },
      ],
    },
    {
      id: "n1",
      goalId: "wedding",
      by: "b",
      at: D(2026, 11, 1, 10, 30),
      updatedAt: D(2026, 11, 1, 10, 30),
      blocks: [
        {
          type: "text",
          text: "Saw the venue in Fes with your mum this morning. The courtyard is even nicer than in the photos.",
        },
        { type: "image", alt: "" },
        {
          type: "text",
          text: "We sat by the fountain afterwards and did the sums again. If we keep this pace we're fine.",
        },
      ],
    },
  ];
  const g = (id: string) => goals.find((x) => x.id === id)!;
  if (state === "empty") {
    goals.length = 0;
    entries.length = 0;
    notes.length = 0;
  }
  if (state === "all-done") {
    entries.unshift({ id: "e8", goalId: "wedding", by: "b", amount: 5750, note: "", at: D(2026, 11, 9, 9, 30) });
    entries.unshift({ id: "h2", goalId: "honeymoon", by: "b", amount: 15000, note: "", at: D(2026, 11, 6, 20, 0) });
    entries.unshift({ id: "h1", goalId: "honeymoon", by: "a", amount: 15000, note: "", at: D(2026, 11, 4, 20, 0) });
    entries.unshift({ id: "p4", goalId: "guest-room", by: "a", percent: 100, note: "", at: D(2026, 11, 8, 19, 0) });
    Object.assign(g("wedding"), { completedAt: D(2026, 11, 9, 9, 30), completedBy: "b" });
    Object.assign(g("honeymoon"), { completedAt: D(2026, 11, 6, 20, 0), completedBy: "b" });
    Object.assign(g("guest-room"), { completedAt: D(2026, 11, 8, 19, 0), completedBy: "a" });
  }
  if (state === "solo") {
    entries.forEach((e) => (e.by = "a"));
    notes.forEach((n) => (n.by = "a"));
    goals.forEach((x) => {
      x.createdBy = "a";
      if (x.completedBy) x.completedBy = "a";
    });
  }
  return { goals, entries, notes, members: state === "solo" ? [SARA] : [SARA, YOUSSEF] };
}
export type Seed = ReturnType<typeof seed>;

const minor = (n: number) => Math.round(n * 100);
const newestFirst = <T extends { at: string }>(a: T, b: T) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0);

export function entryView(e: SeedEntry) {
  return {
    id: e.id,
    userId: who(e.by),
    amount: e.amount != null ? minor(e.amount) : null,
    percent: e.percent ?? null,
    note: e.note || null,
    at: e.at,
  };
}
export function goalView(s: Seed, g: SeedGoal) {
  const es = s.entries.filter((e) => e.goalId === g.id).sort(newestFirst);
  const progress =
    g.kind === "money" ? es.reduce((n, e) => n + minor(e.amount ?? 0), 0) : es.length ? es[0]!.percent! : 0;
  return {
    id: g.id,
    kind: g.kind,
    title: g.title,
    description: g.description,
    target: g.target != null ? minor(g.target) : null,
    targetDate: g.targetDate,
    // Example covers: a placeholder image is delivered (see mockServer), so the arch has the same shape.
    cover: g.cover
      ? { publicId: `zamane/s1/goal-cover/${g.id}`, version: 1, width: 1600, height: 1200, format: "jpg" }
      : null,
    progress,
    completedAt: g.completedAt,
    completedBy: g.completedBy ? who(g.completedBy) : null,
    createdAt: g.createdAt,
    createdBy: who(g.createdBy),
    updatedAt: g.updatedAt,
    last: es[0] ? entryView(es[0]) : null,
    entryCount: es.length,
    noteCount: s.notes.filter((n) => n.goalId === g.id).length,
  };
}
export function noteView(n: SeedNote) {
  return {
    id: n.id,
    userId: who(n.by),
    at: n.at,
    updatedAt: n.updatedAt,
    blocks: n.blocks.map((b) =>
      b.type === "text"
        ? b
        : {
            type: "image" as const,
            image: { publicId: `zamane/s1/note-image/${n.id}`, version: 1, width: 1600, height: 1200, format: "jpg" },
            alt: b.alt,
          },
    ),
  };
}
export function statsView(s: Seed, g: SeedGoal) {
  const es = s.entries.filter((e) => e.goalId === g.id).sort(newestFirst);
  const monthStart = D(2026, 11, 1, 0, 0);
  const month = es.filter((e) => e.at >= monthStart);
  const ids = s.members.map((m) => m.userId);
  if (g.kind === "money") {
    const total = es.reduce((n, e) => n + minor(e.amount!), 0);
    return {
      count: es.length,
      total,
      average: es.length ? Math.round(total / es.length) : 0,
      largest: es.reduce((m, e) => Math.max(m, minor(e.amount!)), 0),
      thisMonth: month.reduce((n, e) => n + minor(e.amount!), 0),
      shares: ids.map((id) => {
        const mine = es.filter((e) => who(e.by) === id);
        const amount = mine.reduce((n, e) => n + minor(e.amount!), 0);
        return { userId: id, amount, count: mine.length, pct: total ? Math.round((amount / total) * 100) : 0 };
      }),
      last: es[0] ? entryView(es[0]) : null,
    };
  }
  const before = es.find((e) => e.at < monthStart);
  return {
    count: es.length,
    monthFrom: before ? before.percent! : 0,
    monthTo: month.length ? month[0]!.percent! : null,
    shares: ids.map((id) => {
      const n = es.filter((e) => who(e.by) === id).length;
      return { userId: id, amount: 0, count: n, pct: es.length ? Math.round((n / es.length) * 100) : 0 };
    }),
    last: es[0] ? entryView(es[0]) : null,
  };
}

export interface ServerOpts {
  /** GET /api/goals never answers (loading). */
  listHangs?: boolean;
  /** GET /api/goals fails (error). */
  listFails?: boolean;
  /** Photos off (the prototype's uploads-off). By default a cloud name is given and images are a flat placeholder. */
  uploadsOff?: boolean;
}

/** A stateful mock of the Goals API (and /api/me, /api/home) over the seed. */
export async function mockServer(page: Page, state: string, opts: ServerOpts = {}) {
  const s = seed(state);
  const ME = {
    user: { id: SARA.userId, displayName: "Sara", email: "sara@example.com" },
    space: {
      id: "s1",
      name: "Our space",
      currency: "MAD",
      timezone: "Africa/Casablanca",
      slot: "a",
      memberCount: s.members.length,
    },
  };
  const uploads = !opts.uploadsOff && state !== "uploads-off";
  if (uploads) {
    await page.route("https://res.cloudinary.com/**", (r) =>
      r.fulfill({
        status: 200,
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#c8bba5"/></svg>',
      }),
    );
  }
  await page.route("**/api/**", async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const method = req.method();
    const json = (status: number, body: unknown) =>
      route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    const goal = (id: string) => s.goals.find((g) => g.id === id);
    if (path === "/api/me") return json(200, ME);
    if (path === "/api/goals" && method === "GET") {
      if (opts.listHangs) return new Promise<void>(() => {});
      if (opts.listFails) return json(500, { error: { code: "internal", message: "x" } });
      return json(200, {
        currency: "MAD",
        images: uploads ? { cloudName: "zamane-test" } : null,
        goals: s.goals.map((g) => goalView(s, g)),
        members: s.members,
      });
    }
    let m = path.match(/^\/api\/goals\/([^/]+)$/);
    if (m && method === "GET") {
      const g = goal(m[1]!);
      return g
        ? json(200, { goal: goalView(s, g) })
        : json(404, { error: { code: "not_found", message: "Not found." } });
    }
    m = path.match(/^\/api\/goals\/([^/]+)\/(entries|notes|stats)$/);
    if (m && method === "GET") {
      const g = goal(m[1]!);
      if (!g) return json(404, { error: { code: "not_found", message: "Not found." } });
      if (m[2] === "entries")
        return json(200, {
          entries: s.entries
            .filter((e) => e.goalId === g.id)
            .sort(newestFirst)
            .map(entryView),
        });
      if (m[2] === "notes")
        return json(200, {
          notes: s.notes
            .filter((n) => n.goalId === g.id)
            .sort(newestFirst)
            .map(noteView),
        });
      return json(200, statsView(s, g));
    }
    m = path.match(/^\/api\/goals\/([^/]+)\/entries$/);
    if (m && method === "POST") {
      const body = req.postDataJSON() as { id: string; amount?: number; percent?: number; note?: string };
      const g = goal(m[1]!)!;
      s.entries.push({
        id: body.id,
        goalId: g.id,
        by: "a",
        amount: body.amount != null ? body.amount / 100 : undefined,
        percent: body.percent,
        note: body.note ?? "",
        at: new Date().toISOString().slice(0, 19),
      });
      const v = goalView(s, g);
      return json(201, {
        entry: { id: body.id },
        goal: { id: g.id, progress: v.progress, completedAt: v.completedAt },
        completed: false,
      });
    }
    if (method === "DELETE") return route.fulfill({ status: 204 });
    if (path === "/api/home") return json(404, { error: { code: "not_found", message: "x" } });
    return json(404, { error: { code: "not_found", message: "x" } });
  });
  return s;
}

// ---------- shooting and the report ----------

export const PHONES = [
  { name: "390x844", w: 390, h: 844 },
  { name: "360x780", w: 360, h: 780 },
] as const;
export const WIDE = { name: "1440x900", w: 1440, h: 900 } as const;

interface Result {
  id: string;
  size: string;
  scheme: string;
  diffPercent: number;
  heights: [number, number];
  image: string;
}

export async function shoot(page: Page, wait: number): Promise<PNG> {
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

export interface Case {
  id: string;
  /** The prototype URL after goals.html: "?state=…#/goals/…". */
  proto: string;
  /** Mock data state. */
  state: string;
  /** The app path. */
  path: string;
  wide?: boolean;
  server?: ServerOpts;
  /** Waits for the app's screen to be ready (default: the h1). */
  ready?: string;
  /** Extra API routes for this case, registered after the mock (so they win), before the page loads. */
  routes?: (p: Page, s: Seed) => Promise<void>;
  /** Drives the app into the case's state. */
  react?: (p: Page, ctx: BrowserContext) => Promise<void>;
  /** Drives the prototype (when the state isn't a ?state= fixture). */
  protoAct?: (p: Page) => Promise<void>;
  wait?: number;
}

/** Registers one test per case and writes tests/visual/report/<area>/index.html + results.json. */
export function visualSuite(area: string, title: string, cases: Case[]) {
  const REPORT = join(ROOT, "tests/visual/report", area);
  const results: Result[] = [];
  test.describe.configure({ mode: "serial" });
  test.beforeAll(() => mkdirSync(REPORT, { recursive: true }));

  async function compare(id: string, size: string, scheme: string, a: PNG, b: PNG) {
    const w = Math.max(a.width, b.width);
    const h = Math.max(a.height, b.height);
    const pa = pad(a, w, h);
    const pb = pad(b, w, h);
    const diff = new PNG({ width: w, height: h });
    const n = pixelmatch(pa.data, pb.data, diff.data, w, h, { threshold: THRESHOLD });
    const name = `${id}--${size}--${scheme}.png`;
    const gap = 12;
    const stacked = w > 800;
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

  for (const c of cases) {
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
          const pctx = await browser.newContext(opts);
          const pp = await pctx.newPage();
          await pp.clock.setFixedTime(TODAY);
          await pp.goto(`${PROTO}${c.proto}`);
          await pp.addStyleTag({ content: "#footnote{display:none!important}" });
          if (c.protoAct) await c.protoAct(pp);
          const protoImg = await shoot(pp, c.wait ?? 600);
          await pctx.close();

          const rctx = await browser.newContext(opts);
          const rp = await rctx.newPage();
          await rp.clock.setFixedTime(TODAY);
          const seeded = await mockServer(rp, c.state, c.server);
          if (c.routes) await c.routes(rp, seeded);
          await rp.goto(`${APP}${c.path}`);
          await rp.waitForSelector(c.ready ?? "#main h1", { timeout: 20_000 });
          if (c.react) await c.react(rp, rctx);
          const reactImg = await shoot(rp, c.wait ?? 600);
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
      `<!doctype html><meta charset="utf-8"><title>${title} visual comparison</title>
<style>body{font:14px system-ui;margin:24px}table{border-collapse:collapse}td,th{padding:4px 10px;border-bottom:1px solid #ddd;text-align:left}.n{text-align:right;font-variant-numeric:tabular-nums}</style>
<h1>${title}: prototype vs React</h1>
<p>Each image: prototype, React, pixel diff (threshold ${THRESHOLD}); phones side by side, wide pages stacked. Magenta = different size. Worst first.
Known: the prototype's example covers and photos have no real counterpart.</p>
<table><tr><th>Case</th><th>Size</th><th>Scheme</th><th>Diff</th><th>Heights (proto / React)</th><th></th></tr>
${rows}</table>`,
    );
  });
}
