// 2x close-ups: the index + a section heading, the theme tiles, and the password row opened. API mocked.
import { chromium } from "@playwright/test";
const out = ".ux-forge/settings/screenshots/after";
const ME = { user: { id: "u-sara", displayName: "Sara", email: "sara.benali@example.com" },
  space: { id: "s1", name: "Sara & Youssef", currency: "MAD", timezone: "Africa/Casablanca", slot: "a", memberCount: 2 } };
const SPACE = { space: { id: "s1", name: "Sara & Youssef", currency: "MAD", timezone: "Africa/Casablanca", inviteCode: null,
  inviteCodeRotatedAt: null, slot: "a", members: [
    { userId: "u-sara", displayName: "Sara", slot: "a", joinedAt: "2026-10-01T10:00:00Z" },
    { userId: "u-youssef", displayName: "Youssef", slot: "b", joinedAt: "2026-10-02T10:00:00Z" }] } };
const browser = await chromium.launch();
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.route("**/api/**", (r) => {
    const p = new URL(r.request().url()).pathname;
    const j = (b) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(b) });
    if (p === "/api/me") return j(ME);
    if (p === "/api/spaces/mine") return j(SPACE);
    return r.fulfill({ status: 404, contentType: "application/json", body: "{}" });
  });
  await page.goto("http://localhost:5000/profile");
  await page.locator(".pf-plates").waitFor();
  if (w === 1440) {
    await page.locator("#pf-security-h").scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, document.getElementById("pf-security").getBoundingClientRect().top - 84));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/detail-index-1440.png`, clip: { x: 260, y: 60, width: 920, height: 420 } });
  }
  await page.locator("#pf-look .pf-swatches").first().screenshot({ path: `${out}/detail-theme-${w}.png` });
  await page.getByRole("button", { name: "Change password" }).click();
  await page.locator("#pf-current").waitFor();
  await page.locator("#pf-security .pf-list").screenshot({ path: `${out}/detail-pw-open-${w}.png` });
  console.log("focused:", await page.evaluate(() => document.activeElement?.id));
  await ctx.close();
}
await browser.close();
