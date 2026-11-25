// Screenshots of the app's /profile with the API mocked (nothing reaches the database).
// Usage: node .ux-forge/settings/shoot-app.mjs <out-dir> [state]   state: paired (default) | solo | offline
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const out = process.argv[2] ?? ".ux-forge/settings/screenshots/now";
const state = process.argv[3] ?? "paired";
mkdirSync(out, { recursive: true });

const SARA = { userId: "u-sara", displayName: "Sara", slot: "a", joinedAt: "2026-10-01T10:00:00Z" };
const YOUSSEF = { userId: "u-youssef", displayName: "Youssef", slot: "b", joinedAt: "2026-10-02T10:00:00Z" };
const solo = state === "solo";
const members = solo ? [SARA] : [SARA, YOUSSEF];
const ME = {
  user: { id: "u-sara", displayName: "Sara", email: "sara.benali@example.com" },
  space: { id: "s1", name: "Sara & Youssef", currency: "MAD", timezone: "Africa/Casablanca", slot: "a", memberCount: members.length },
};
const SPACE = {
  space: {
    id: "s1",
    name: "Sara & Youssef",
    currency: "MAD",
    timezone: "Africa/Casablanca",
    inviteCode: solo ? "K7QM4XPA" : null,
    inviteCodeRotatedAt: null,
    slot: "a",
    members,
  },
};

const sizes = [
  ["390", { width: 390, height: 844 }],
  ["1440", { width: 1440, height: 900 }],
];

const browser = await chromium.launch();
for (const scheme of ["light", "dark"]) {
  for (const [name, viewport] of sizes) {
    const ctx = await browser.newContext({ viewport, colorScheme: scheme, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.route("**/api/**", (route) => {
      const path = new URL(route.request().url()).pathname;
      const json = (status, body) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
      if (path === "/api/me") return json(200, ME);
      if (path === "/api/spaces/mine") return json(200, SPACE);
      if (path === "/api/config") return json(200, { uploadsEnabled: false, cloudinaryCloudName: null });
      return json(404, { error: { code: "not_found", message: "mocked" } });
    });
    await page.goto("http://localhost:5000/profile");
    await page.getByRole("heading", { level: 1, name: "Profile" }).waitFor();
    await page.locator(".pf-plates").waitFor();
    if (state === "offline") await ctx.setOffline(true);
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(out, `${name}-${scheme}.png`), fullPage: true });
    await ctx.close();
  }
}
await browser.close();
console.log("shot", out);
