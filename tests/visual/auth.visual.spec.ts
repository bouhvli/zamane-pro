/**
 * Visual comparison: every auth prototype state (.ux-forge/auth/auth.html?state=…#/route, over file://) next to the
 * React route in the same state (API mocked), at 390×844 and 360×780, light and dark. Pixel diff with a small
 * threshold for font anti-aliasing. Writes side-by-side images, diffs and an index to tests/visual/report/.
 *
 * Prototype-only elements are hidden on the prototype side: the "Example data" footnote and the labelled
 * "Prototype" controls. Run with `pnpm test:visual` (starts the dev server).
 */
import { test, type BrowserContext, type Page, type Route } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import sharp from "sharp";
import { resetPasswordEmail } from "../../src/worker/services/reset-email.ts";

const ROOT = join(import.meta.dirname, "..", "..");
const PROTO = pathToFileURL(join(ROOT, ".ux-forge/auth/auth.html")).href;
const REPORT = join(ROOT, "tests/visual/report");
const APP = "http://localhost:3000";
const SIZES = [
  { w: 390, h: 844 },
  { w: 360, h: 780 },
] as const;
const SCHEMES = ["light", "dark"] as const;
const THRESHOLD = 0.1; // per-pixel colour distance (pixelmatch), tolerant of font anti-aliasing

const SARA = { id: "u-sara", displayName: "Sara", email: "sara@example.com" };
const YOUSSEF = { id: "u-youssef", displayName: "Youssef", email: "youssef@example.com" };
const meNoSpace = (user: typeof SARA) => ({ user, space: null });
const SOLO = {
  user: YOUSSEF,
  space: { id: "s1", name: "Our space", currency: "MAD", timezone: "Africa/Casablanca", slot: "a", memberCount: 1 },
};
const GOOD_PW = "olive-tree-2026";

type Api = Record<string, (route: Route) => Promise<void> | void>;
const json =
  (status: number, body: unknown, headers: Record<string, string> = {}) =>
  (r: Route) =>
    r.fulfill({ status, contentType: "application/json", body: JSON.stringify(body), headers });
const hang = () => () => new Promise<void>(() => {});
const abort = () => (r: Route) => r.abort("internetdisconnected");
const err = (code: string, message = "x", fields?: Record<string, string>) => ({ error: { code, message, fields } });
const signedOut = { "/api/me": json(401, err("unauthenticated")) };

interface Case {
  id: string;
  /** prototype "state#/route" */
  proto: string;
  /** prototype interactions after load */
  protoAfter?: (p: Page) => Promise<void>;
  /** React: mocks, storage, then a path, then interactions */
  api?: Api;
  storage?: Record<string, string>;
  path: string;
  react?: (p: Page, ctx: BrowserContext) => Promise<void>;
  /** both sides: keep focus where the case put it (default: blur) */
  keepFocus?: boolean;
  wait?: number;
}

async function mockApi(page: Page, api: Api) {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const handler = api[path] ?? api[`${route.request().method()} ${path}`];
    if (handler) return handler(route);
    if (path === "/api/config") return json(200, { uploadsEnabled: false, cloudinaryCloudName: null })(route);
    return json(404, err("not_found"))(route);
  });
}
const submit = (p: Page, form: string) =>
  p.evaluate((id) => (document.getElementById(id) as HTMLFormElement).requestSubmit(), form);
const fill = async (p: Page, sel: string, v: string) => {
  await p.fill(sel, v);
  await p.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
};
const focus = (p: Page, sel: string) => p.focus(sel);

const CASES: Case[] = [
  // ---------- Sign in ----------
  { id: "sign-in-idle", proto: "idle#/sign-in", api: signedOut, path: "/sign-in" },
  {
    id: "sign-in-focused",
    proto: "idle#/sign-in",
    protoAfter: (p) => focus(p, "#si-email"),
    api: signedOut,
    path: "/sign-in",
    react: (p) => focus(p, "#si-email"),
    keepFocus: true,
  },
  {
    id: "sign-in-filled-shown",
    proto: "idle#/sign-in",
    protoAfter: async (p) => {
      await p.fill("#si-email", SARA.email);
      await p.fill("#si-pw", GOOD_PW);
      await p.click(".pw-toggle");
    },
    api: signedOut,
    path: "/sign-in",
    react: async (p) => {
      await p.fill("#si-email", SARA.email);
      await p.fill("#si-pw", GOOD_PW);
      await p.click(".pw-toggle");
    },
    keepFocus: true,
  },
  {
    id: "sign-in-prefilled",
    proto: "prefilled#/sign-in",
    api: signedOut,
    storage: { "zamane.auth.email": SARA.email },
    path: "/sign-in",
    react: (p) => focus(p, "#si-pw"),
    keepFocus: true,
  },
  {
    id: "sign-in-invalid",
    proto: "invalid#/sign-in",
    api: signedOut,
    path: "/sign-in",
    react: async (p) => {
      await fill(p, "#si-email", "sara@example");
      await submit(p, "si");
    },
    keepFocus: true,
  },
  {
    id: "sign-in-wrong",
    proto: "wrong#/sign-in",
    api: { ...signedOut, "/api/auth/sign-in/email": json(401, err("invalid_credentials")) },
    path: "/sign-in",
    react: async (p) => {
      await fill(p, "#si-email", SARA.email);
      await fill(p, "#si-pw", "wrong-password-1");
      await submit(p, "si");
    },
    keepFocus: true,
  },
  ...(["submitting", "rate-limited", "network-error", "server-error"] as const).map((st): Case => ({
    id: `sign-in-${st}`,
    proto: `${st}#/sign-in`,
    api: {
      ...signedOut,
      "/api/auth/sign-in/email":
        st === "submitting"
          ? hang()
          : st === "rate-limited"
            ? json(429, err("rate_limited"), { "Retry-After": "60" })
            : st === "network-error"
              ? abort()
              : json(500, err("internal")),
    },
    path: "/sign-in",
    react: async (p) => {
      await fill(p, "#si-email", SARA.email);
      await fill(p, "#si-pw", GOOD_PW);
      await submit(p, "si");
      if (st !== "submitting") await focus(p, "#si [type=submit]");
    },
    keepFocus: true,
  })),
  {
    id: "sign-in-offline",
    proto: "offline#/sign-in",
    api: signedOut,
    path: "/sign-in",
    react: async (p) => {
      await p.context().setOffline(true);
      await p.waitForSelector("#si-offline:not([hidden])");
    },
  },
  {
    id: "sign-in-signed-out",
    proto: "signed-out#/sign-in",
    api: {
      "/api/me": json(200, meNoSpace(SARA)),
      "/api/auth/sign-out": async (r) => {
        await p_me_out.set(true);
        return json(200, { success: true })(r);
      },
    },
    path: "/setup",
    react: async (p) => {
      await p.click("#sign-out");
      await p.waitForURL(/sign-in/);
      await p.waitForSelector("#si-note");
    },
    keepFocus: true,
  },
  // ---------- Create account ----------
  { id: "create-account-idle", proto: "idle#/create-account", api: signedOut, path: "/create-account" },
  {
    id: "create-account-has-code",
    proto: "has-code#/create-account",
    api: signedOut,
    storage: { "zamane.auth.intent": "join" },
    path: "/create-account",
    react: (p) => focus(p, "h1").catch(() => undefined),
  },
  {
    id: "create-account-name-typed",
    proto: "idle#/create-account",
    protoAfter: (p) => fill(p, "#ca-name", "Sara"),
    api: signedOut,
    path: "/create-account",
    react: (p) => fill(p, "#ca-name", "Sara"),
  },
  {
    id: "create-account-invalid",
    proto: "invalid#/create-account",
    api: signedOut,
    path: "/create-account",
    react: async (p) => {
      await fill(p, "#ca-email", "sara@example");
      await fill(p, "#ca-pw", "sesame");
      await submit(p, "ca");
    },
    keepFocus: true,
  },
  {
    id: "create-account-email-taken",
    proto: "email-taken#/create-account",
    api: { ...signedOut, "/api/auth/sign-up/email": json(422, err("email_taken", "x", { email: "x" })) },
    path: "/create-account",
    react: async (p) => {
      await fill(p, "#ca-name", "Sara");
      await fill(p, "#ca-email", SARA.email);
      await fill(p, "#ca-pw", GOOD_PW);
      await submit(p, "ca");
    },
    keepFocus: true,
  },
  ...(["submitting", "rate-limited", "server-error"] as const).map((st): Case => ({
    id: `create-account-${st}`,
    proto: `${st}#/create-account`,
    api: {
      ...signedOut,
      "/api/auth/sign-up/email":
        st === "submitting"
          ? hang()
          : st === "rate-limited"
            ? json(429, err("rate_limited"), { "Retry-After": "60" })
            : json(500, err("internal")),
    },
    path: "/create-account",
    react: async (p) => {
      await fill(p, "#ca-name", "Sara");
      await fill(p, "#ca-email", SARA.email);
      await fill(p, "#ca-pw", GOOD_PW);
      await submit(p, "ca");
      if (st !== "submitting") await focus(p, "#ca [type=submit]");
    },
    keepFocus: true,
  })),
  {
    id: "create-account-with-code",
    proto: "with-code#/create-account",
    api: signedOut,
    storage: { "zamane.auth.code": "K7QM-4XPA" },
    path: "/create-account",
  },
  {
    id: "create-account-offline",
    proto: "offline#/create-account",
    api: signedOut,
    path: "/create-account",
    react: async (p) => {
      await p.context().setOffline(true);
      await p.waitForSelector("#ca-offline:not([hidden])");
    },
  },
  // ---------- Forgot password ----------
  { id: "forgot-password-idle", proto: "idle#/forgot-password", api: signedOut, path: "/forgot-password" },
  {
    id: "forgot-password-prefilled",
    proto: "prefilled#/forgot-password",
    api: signedOut,
    storage: { "zamane.auth.email": SARA.email },
    path: "/forgot-password",
  },
  {
    id: "forgot-password-invalid",
    proto: "invalid#/forgot-password",
    api: signedOut,
    path: "/forgot-password",
    react: async (p) => {
      await fill(p, "#fp-email", "sara@example");
      await submit(p, "fp");
    },
    keepFocus: true,
  },
  {
    id: "forgot-password-submitting",
    proto: "submitting#/forgot-password",
    api: { ...signedOut, "/api/auth/request-password-reset": hang() },
    path: "/forgot-password",
    react: async (p) => {
      await fill(p, "#fp-email", SARA.email);
      await submit(p, "fp");
    },
  },
  {
    id: "forgot-password-sent",
    proto: "sent#/forgot-password",
    api: { ...signedOut, "/api/auth/request-password-reset": json(200, { status: true }) },
    path: "/forgot-password",
    react: async (p) => {
      await fill(p, "#fp-email", SARA.email);
      await submit(p, "fp");
      await p.waitForSelector("#fs");
    },
    keepFocus: true,
  },
  {
    id: "forgot-password-resent",
    proto: "resent#/forgot-password",
    api: { ...signedOut, "/api/auth/request-password-reset": json(200, { status: true }) },
    path: "/forgot-password",
    react: async (p) => {
      await fill(p, "#fp-email", SARA.email);
      await submit(p, "fp");
      await p.waitForSelector("#fs");
      await submit(p, "fs");
      await p.waitForSelector("#fs-resent:not([hidden])");
      await focus(p, "h1");
    },
    keepFocus: true,
  },
  {
    id: "forgot-password-rate-limited",
    proto: "rate-limited#/forgot-password",
    api: { ...signedOut, "/api/auth/request-password-reset": json(429, err("rate_limited"), { "Retry-After": "60" }) },
    path: "/forgot-password",
    react: async (p) => {
      await fill(p, "#fp-email", SARA.email);
      await submit(p, "fp");
      await focus(p, "#fp [type=submit]");
    },
    keepFocus: true,
  },
  {
    id: "forgot-password-offline",
    proto: "offline#/forgot-password",
    api: signedOut,
    path: "/forgot-password",
    react: async (p) => {
      await p.context().setOffline(true);
      await p.waitForSelector("#fp-offline:not([hidden])");
    },
  },
  // ---------- Reset password ----------
  {
    id: "reset-password-valid",
    proto: "valid#/reset-password",
    api: { ...signedOut, "/api/password-reset/check": json(200, { valid: true }) },
    path: "/reset-password?token=t0k3n",
    keepFocus: true,
  },
  {
    id: "reset-password-invalid",
    proto: "invalid#/reset-password",
    api: { ...signedOut, "/api/password-reset/check": json(200, { valid: true }) },
    path: "/reset-password?token=t0k3n",
    react: async (p) => {
      await fill(p, "#rp-pw", "sesame");
      await submit(p, "rp");
    },
    keepFocus: true,
  },
  {
    id: "reset-password-submitting",
    proto: "submitting#/reset-password",
    api: { ...signedOut, "/api/password-reset/check": json(200, { valid: true }), "/api/auth/reset-password": hang() },
    path: "/reset-password?token=t0k3n",
    react: async (p) => {
      await fill(p, "#rp-pw", GOOD_PW);
      await submit(p, "rp");
    },
  },
  {
    id: "reset-password-success",
    proto: "success#/reset-password",
    api: {
      ...signedOut,
      "/api/password-reset/check": json(200, { valid: true }),
      "/api/auth/reset-password": json(200, { status: true }),
    },
    path: "/reset-password?token=t0k3n",
    react: async (p) => {
      await fill(p, "#rp-pw", GOOD_PW);
      await submit(p, "rp");
      await p.waitForSelector(".result");
    },
    keepFocus: true,
  },
  {
    id: "reset-password-expired",
    proto: "expired#/reset-password",
    api: { ...signedOut, "/api/password-reset/check": json(200, { valid: false }) },
    path: "/reset-password?token=t0k3n",
    react: (p) => focus(p, "h1"),
    keepFocus: true,
  },
  {
    id: "reset-password-expired-on-submit",
    proto: "expired-on-submit#/reset-password",
    protoAfter: async (p) => {
      await p.fill("#rp-pw", GOOD_PW);
      await submit(p, "rp");
      await p.waitForSelector(".result");
    },
    api: {
      ...signedOut,
      "/api/password-reset/check": json(200, { valid: true }),
      "/api/auth/reset-password": json(400, err("invalid_token")),
    },
    path: "/reset-password?token=t0k3n",
    react: async (p) => {
      await fill(p, "#rp-pw", GOOD_PW);
      await submit(p, "rp");
      await p.waitForSelector(".result");
    },
    keepFocus: true,
  },
  {
    id: "reset-password-signed-in",
    proto: "signed-in#/reset-password",
    api: { "/api/me": json(200, meNoSpace(SARA)), "/api/password-reset/check": json(200, { valid: true }) },
    path: "/reset-password?token=t0k3n",
    keepFocus: true,
  },
  {
    id: "reset-password-rate-limited",
    proto: "rate-limited#/reset-password",
    api: {
      ...signedOut,
      "/api/password-reset/check": json(200, { valid: true }),
      "/api/auth/reset-password": json(429, err("rate_limited"), { "Retry-After": "60" }),
    },
    path: "/reset-password?token=t0k3n",
    react: async (p) => {
      await fill(p, "#rp-pw", GOOD_PW);
      await submit(p, "rp");
      await focus(p, "#rp [type=submit]");
    },
    keepFocus: true,
  },
  // ---------- Setup: choose ----------
  { id: "setup-choose", proto: "choose#/setup", api: { "/api/me": json(200, meNoSpace(SARA)) }, path: "/setup" },
  {
    id: "setup-long-email",
    proto: "long-email#/setup",
    api: { "/api/me": json(200, meNoSpace({ ...SARA, email: "sara.benali.elidrissi+zamane@example.com" })) },
    path: "/setup",
  },
  {
    id: "setup-offline",
    proto: "offline#/setup",
    api: { "/api/me": json(200, meNoSpace(SARA)) },
    path: "/setup",
    react: async (p) => {
      await p.context().setOffline(true);
      await p.waitForSelector("#choose-offline");
    },
  },
  // ---------- Setup: start ----------
  {
    id: "setup-start-idle",
    proto: "idle#/setup/start",
    api: { "/api/me": json(200, meNoSpace(SARA)) },
    path: "/setup/start",
  },
  {
    id: "setup-start-invalid",
    proto: "invalid#/setup/start",
    api: { "/api/me": json(200, meNoSpace(SARA)) },
    path: "/setup/start",
    react: async (p) => {
      await p.fill("#space-name", "");
      await p.check("input[name=currency][value=other]");
      await submit(p, "start");
    },
    keepFocus: true,
  },
  {
    id: "setup-start-other-currency",
    proto: "other-currency#/setup/start",
    api: { "/api/me": json(200, meNoSpace(SARA)) },
    path: "/setup/start",
    react: async (p) => {
      await p.check("input[name=currency][value=other]");
      await p.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    },
  },
  {
    id: "setup-start-timezone-change",
    proto: "timezone-change#/setup/start",
    api: { "/api/me": json(200, meNoSpace(SARA)) },
    path: "/setup/start",
    react: async (p) => {
      await p.click("#tz-toggle");
      await p.focus("#tz");
    },
    keepFocus: true,
  },
  {
    id: "setup-start-submitting",
    proto: "submitting#/setup/start",
    api: { "/api/me": json(200, meNoSpace(SARA)), "/api/spaces": hang() },
    path: "/setup/start",
    react: (p) => submit(p, "start"),
  },
  {
    id: "setup-start-network-error",
    proto: "network-error#/setup/start",
    api: { "/api/me": json(200, meNoSpace(SARA)), "/api/spaces": abort() },
    path: "/setup/start",
    react: async (p) => {
      await submit(p, "start");
      await p.waitForSelector("#start-alert-msg");
    },
  },
  {
    id: "setup-start-offline",
    proto: "offline#/setup/start",
    api: { "/api/me": json(200, meNoSpace(SARA)) },
    path: "/setup/start",
    react: async (p) => {
      await p.context().setOffline(true);
      await p.waitForSelector("#start-offline");
    },
  },
  // ---------- Setup: join ----------
  {
    id: "setup-join-idle",
    proto: "idle#/setup/join",
    api: { "/api/me": json(200, meNoSpace(YOUSSEF)) },
    path: "/setup/join",
  },
  {
    id: "setup-join-prefilled",
    proto: "prefilled#/setup/join",
    api: { "/api/me": json(200, meNoSpace(YOUSSEF)) },
    storage: { "zamane.auth.code": "K7QM-4XPA" },
    path: "/setup/join",
  },
  {
    id: "setup-join-restored",
    proto: "restored#/setup/join",
    api: { "/api/me": json(200, meNoSpace(YOUSSEF)) },
    storage: { "zamane.auth.joinDraft": "K7QM 4X" },
    path: "/setup/join",
  },
  ...(
    [
      ["invalid", "K7QM-4XP"],
      ["invalid-letters", "K7QM-4XP0"],
    ] as const
  ).map(([st, code]): Case => ({
    id: `setup-join-${st}`,
    proto: `${st}#/setup/join`,
    api: { "/api/me": json(200, meNoSpace(YOUSSEF)) },
    path: "/setup/join",
    react: async (p) => {
      await p.fill("#invite-code", code);
      await submit(p, "join");
    },
    keepFocus: true,
  })),
  ...(
    [
      ["invite-invalid", json(404, err("invite_invalid"))],
      ["submitting", hang()],
      ["rate-limited", json(429, err("rate_limited"), { "Retry-After": "60" })],
      ["network-error", abort()],
      ["server-error", json(500, err("internal"))],
    ] as const
  ).map(([st, handler]): Case => ({
    id: `setup-join-${st}`,
    proto: `${st}#/setup/join`,
    api: { "/api/me": json(200, meNoSpace(YOUSSEF)), "/api/spaces/join": handler },
    path: "/setup/join",
    react: async (p) => {
      await p.fill("#invite-code", st === "submitting" || st.endsWith("error") ? "K7QM-4XPA" : "H3RT-9WCN");
      await submit(p, "join");
      if (st !== "invite-invalid" && st !== "submitting") await focus(p, "#join [type=submit]");
      if (st === "submitting") await focus(p, "#join [type=submit]");
    },
    keepFocus: true,
  })),
  {
    id: "setup-join-offline",
    proto: "offline#/setup/join",
    api: { "/api/me": json(200, meNoSpace(YOUSSEF)) },
    path: "/setup/join",
    react: async (p) => {
      await p.context().setOffline(true);
      await p.waitForSelector("#join-offline");
    },
  },
  {
    id: "setup-join-switch",
    proto: "switch#/setup/join",
    api: { "/api/me": json(200, SOLO) },
    path: "/setup/join?switch=true",
  },
  {
    id: "setup-join-switch-confirm",
    proto: "switch-confirm#/setup/join",
    api: { "/api/me": json(200, SOLO), "/api/spaces/mine/summary": json(200, { goals: 1, trips: 0, items: 3 }) },
    path: "/setup/join?switch=true",
    react: async (p) => {
      await p.fill("#invite-code", "K7QM-4XPA");
      await submit(p, "join");
      await p.waitForSelector("#confirm[open]");
    },
    keepFocus: true,
    wait: 600,
  },
  // ---------- Launch ----------
  { id: "launch-loading", proto: "loading#/launch", api: { "/api/me": hang() }, path: "/", wait: 1400 },
  { id: "launch-offline", proto: "offline#/launch", api: { "/api/me": abort() }, path: "/" },
  { id: "launch-error", proto: "error#/launch", api: { "/api/me": json(500, err("internal")) }, path: "/" },
];

// The sign-out case flips /api/me to 401 once sign-out has been called.
const p_me_out = {
  value: false,
  async set(v: boolean) {
    this.value = v;
  },
};

const PROTO_ONLY_CSS = "#footnote,.proto,.proto-ctl{display:none!important}";

async function settle(page: Page, keepFocus: boolean, wait = 450) {
  await page.mouse.move(0, 0); // no hover state left over from the interactions
  await page.evaluate(() => document.fonts.ready);
  if (!keepFocus) await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.waitForTimeout(wait);
}

async function shoot(page: Page): Promise<PNG> {
  return PNG.sync.read(await page.screenshot({ fullPage: true, animations: "disabled", caret: "hide" }));
}

function pad(img: PNG, w: number, h: number): PNG {
  if (img.width === w && img.height === h) return img;
  const out = new PNG({ width: w, height: h });
  out.data.fill(0);
  for (let y = 0; y < out.height; y++)
    for (let x = 0; x < out.width; x++) {
      const o = (y * w + x) * 4;
      if (x < img.width && y < img.height)
        img.data.copy(out.data, o, (y * img.width + x) * 4, (y * img.width + x) * 4 + 4);
      else out.data.set([255, 0, 255, 255], o); // magenta: height or width differs
    }
  return out;
}

interface Result {
  id: string;
  size: string;
  scheme: string;
  diffPercent: number;
  heights: [number, number];
  image: string;
}
const results: Result[] = [];

async function compare(id: string, size: string, scheme: string, a: PNG, b: PNG) {
  const w = Math.max(a.width, b.width);
  const h = Math.max(a.height, b.height);
  const pa = pad(a, w, h);
  const pb = pad(b, w, h);
  const diff = new PNG({ width: w, height: h });
  const n = pixelmatch(pa.data, pb.data, diff.data, w, h, { threshold: THRESHOLD });
  const name = `${id}--${size}--${scheme}.png`;
  const gap = 12;
  await sharp({ create: { width: w * 3 + gap * 2, height: h, channels: 4, background: "#888888" } })
    .composite([
      { input: PNG.sync.write(pa), left: 0, top: 0 },
      { input: PNG.sync.write(pb), left: w + gap, top: 0 },
      { input: PNG.sync.write(diff), left: (w + gap) * 2, top: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(join(REPORT, name));
  results.push({ id, size, scheme, diffPercent: (n / (w * h)) * 100, heights: [a.height, b.height], image: name });
}

test.describe.configure({ mode: "serial" });
test.beforeAll(() => mkdirSync(REPORT, { recursive: true }));

for (const c of CASES) {
  test(c.id, async ({ browser }) => {
    for (const s of SIZES) {
      for (const scheme of SCHEMES) {
        const ctxOpts = {
          viewport: { width: s.w, height: s.h },
          colorScheme: scheme,
          locale: "en-MA",
          timezoneId: "Africa/Casablanca",
          reducedMotion: "reduce" as const,
        };
        // Prototype
        const pctx = await browser.newContext(ctxOpts);
        const pp = await pctx.newPage();
        await pp.goto(`${PROTO}?state=${c.proto.replace("#", "#")}`);
        await pp.addStyleTag({ content: PROTO_ONLY_CSS });
        await pp.waitForTimeout(c.proto.startsWith("loading") ? 1200 : 900);
        if (c.protoAfter) await c.protoAfter(pp);
        await settle(pp, c.keepFocus ?? false, c.wait);
        const protoImg = await shoot(pp);
        await pctx.close();

        // React
        p_me_out.value = false;
        const rctx = await browser.newContext(ctxOpts);
        const rp = await rctx.newPage();
        const api: Api = { ...(c.api ?? {}) };
        if (c.id === "sign-in-signed-out") {
          const me = api["/api/me"]!;
          api["/api/me"] = (r) => (p_me_out.value ? json(401, err("unauthenticated"))(r) : me(r));
        }
        await mockApi(rp, api);
        if (c.storage)
          await rp.addInitScript((kv) => {
            for (const [k, v] of Object.entries(kv)) sessionStorage.setItem(k, v);
          }, c.storage);
        await rp.goto(`${APP}${c.path}`);
        await rp.waitForTimeout(400);
        if (c.react) await c.react(rp, rctx);
        await settle(rp, c.keepFocus ?? false, c.wait);
        const reactImg = await shoot(rp);
        await rctx.close();

        await compare(c.id, `${s.w}x${s.h}`, scheme, protoImg, reactImg);
      }
    }
  });
}

test("email-reset", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(join(ROOT, ".ux-forge/auth/email-reset.html")).href);
  await page.waitForTimeout(500);
  const protoImg = await shoot(page);
  const url = "https://zamane.example/api/auth/reset-password/7Hq2xV9mKe4TbN8w?callbackURL=%2Freset-password";
  const email = resetPasswordEmail({ to: SARA.email, name: "Sara", url, appUrl: "https://zamane.example" });
  const logo = `data:image/png;base64,${readFileSync(join(ROOT, "public/email/zamane-logo.png")).toString("base64")}`;
  await page.setContent(email.html.replace("https://zamane.example/email/zamane-logo.png", logo));
  await page.waitForTimeout(500);
  const ours = await shoot(page);
  await compare("email-reset", "390x844", "light", protoImg, ours);
  await ctx.close();
});

test.afterAll(() => {
  results.sort((a, b) => b.diffPercent - a.diffPercent);
  writeFileSync(join(REPORT, "results.json"), JSON.stringify(results, null, 2));
  const rows = results
    .map(
      (r) =>
        `<tr><td>${r.id}</td><td>${r.size}</td><td>${r.scheme}</td><td class="n">${r.diffPercent.toFixed(2)}%</td>` +
        `<td class="n">${r.heights[0]} / ${r.heights[1]}</td><td><a href="${r.image}">image</a></td></tr>`,
    )
    .join("\n");
  writeFileSync(
    join(REPORT, "index.html"),
    `<!doctype html><meta charset="utf-8"><title>Auth visual comparison</title>
<style>body{font:14px system-ui;margin:24px}table{border-collapse:collapse}td,th{padding:4px 10px;border-bottom:1px solid #ddd;text-align:left}.n{text-align:right;font-variant-numeric:tabular-nums}</style>
<h1>Auth: prototype vs React</h1>
<p>Each image: prototype | React | pixel diff (threshold ${THRESHOLD}). Magenta = the pages differ in size. Worst first.</p>
<table><tr><th>Case</th><th>Size</th><th>Scheme</th><th>Diff</th><th>Heights (proto / React)</th><th></th></tr>
${rows}</table>`,
  );
});
