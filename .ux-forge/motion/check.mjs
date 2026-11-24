// Checks the motion kit in the app with the API mocked (nothing reaches the database): Home's count-up, the Done pop
// and star burst when a quick-add completes a goal, and a page transition to Goals. Needs `pnpm dev` on :5000.
// Usage: node .ux-forge/motion/check.mjs [out-dir]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const out = process.argv[2] ?? ".ux-forge/motion/screenshots";
mkdirSync(out, { recursive: true });

const ME = {
  user: { id: "u-sara", displayName: "Sara", email: "sara@example.com" },
  space: { id: "s1", name: "Our space", currency: "MAD", timezone: "Africa/Casablanca", slot: "a", memberCount: 2 },
};
const MEMBERS = [
  { userId: "u-sara", displayName: "Sara", slot: "a" },
  { userId: "u-youssef", displayName: "Youssef", slot: "b" },
];
const home = {
  currency: "MAD",
  total: 2_025_000,
  goals: [
    { id: "g-wedding", kind: "money", title: "Wedding fund", progress: 1_425_000, target: 2_000_000, completedAt: null,
      last: { userId: "u-sara", amount: 50_000, percent: null, note: null, at: "2026-11-07T09:00:00" } },
    { id: "g-room", kind: "general", title: "Paint the guest room", progress: 60, target: null, completedAt: null,
      last: { userId: "u-youssef", amount: null, percent: 60, note: null, at: "2026-11-08T18:00:00" } },
    { id: "g-honeymoon", kind: "money", title: "Honeymoon", progress: 0, target: 3_000_000, completedAt: null, last: null },
  ],
  trips: [],
  shoppingLeft: 7,
  members: MEMBERS,
  inviteCode: null,
};

const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));
await page.route("**/api/**", async (route) => {
  const req = route.request();
  const path = new URL(req.url()).pathname;
  const json = (status, body) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  if (path === "/api/me") return json(200, ME);
  if (path === "/api/config") return json(200, { uploadsEnabled: false, cloudinaryCloudName: null });
  if (path === "/api/home") return json(200, home);
  if (path === "/api/goals") return json(200, { currency: "MAD", goals: home.goals.map((g) => ({ ...g, description: null, targetDate: null, cover: null, createdAt: "2026-10-01T10:00:00Z", createdBy: "u-sara" })), members: MEMBERS, images: { cloudName: null } });
  const m = path.match(/^\/api\/goals\/([^/]+)\/entries$/);
  if (m && req.method() === "POST") {
    const body = req.postDataJSON();
    const g = home.goals.find((x) => x.id === m[1]);
    g.progress += body.amount;
    home.total += body.amount;
    const crossed = g.progress >= g.target && !g.completedAt;
    if (crossed) g.completedAt = new Date().toISOString();
    g.last = { userId: "u-sara", amount: body.amount, percent: null, note: null, at: new Date().toISOString() };
    return json(201, { entry: { id: body.id }, goal: { id: g.id, progress: g.progress, completedAt: g.completedAt }, completed: crossed });
  }
  return json(404, { error: { code: "not_found", message: "mocked" } });
});

await page.goto("http://localhost:5000/");
await page.locator("#total-num").waitFor();
await page.waitForTimeout(900); // the cards' staggered arrival
const restText = await page.locator("#total-num").textContent();
await page.screenshot({ path: `${out}/1-home-rest.png` });

// Quick add 5,750 MAD to the Wedding fund: completes it.
await page.focus("#primary");
await page.keyboard.press("Enter");
await page.waitForSelector("#qa-sheet[open]");
await page.click('.pick-row:has-text("Wedding fund")');
await page.waitForSelector("#add-form");
await page.fill("#amt", "5750");
await page.press("#amt", "Enter");
const t0 = Date.now();
await page.waitForTimeout(180);
const midHtml = await page.locator("#total-num").innerHTML();
await page.screenshot({ path: `${out}/2-home-counting.png` });
await page.waitForTimeout(260);
await page.screenshot({ path: `${out}/3-home-burst.png` });
await page.waitForTimeout(1200);
const endText = await page.locator("#total-num").textContent();
await page.screenshot({ path: `${out}/4-home-after.png` });

// A page change: Home -> Goals through the tab bar (view transition).
await page.getByRole("link", { name: "Goals" }).first().click();
await page.getByRole("heading", { level: 1 }).waitFor();
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/5-goals.png` });
const vt = await page.evaluate(() => typeof document.startViewTransition === "function");

console.log(JSON.stringify({ restText, midHtml, endText, msToFirstShot: 180, viewTransitionsSupported: vt, url: page.url(), errors, t0: !!t0 }, null, 2));
await browser.close();
