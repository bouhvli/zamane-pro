/**
 * The whole auth flow on the real Worker and database, two browser contexts:
 * Sara signs up, starts the space and sees the invite code; Youssef signs up, joins with it, and both land on Home;
 * Youssef signs out, resets his password through the emailed link (read from the test-only endpoint, which exists
 * only in a dev server started with E2E=1) and signs in with the new one; the TEMP Profile page works.
 */
import { expect, test, type Page } from "@playwright/test";

const run = Date.now().toString(36);
const sara = { name: "Sara", email: `sara-${run}@example.com`, password: "olive-tree-2026" };
const youssef = { name: "Youssef", email: `youssef-${run}@example.com`, password: "argan-grove-2026" };
const NEW_PASSWORD = "cedar-forest-2027";

async function signUp(page: Page, who: typeof sara) {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.getByRole("link", { name: "Create an account" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Create your account" })).toBeVisible();
  await page.getByLabel("First name").fill(who.name);
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password", { exact: true }).fill(who.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/setup$/);
  await expect(page.getByText(who.email)).toBeVisible(); // "Signed up as …"
}

test.describe.configure({ mode: "serial" });

test("two partners: sign up, start, join, sign out, reset, sign in", async ({ browser }) => {
  // ---- Sara starts the space ----
  const saraCtx = await browser.newContext({ locale: "en-BE", timezoneId: "Europe/Brussels" });
  await saraCtx.grantPermissions(["clipboard-read", "clipboard-write"]);
  const s = await saraCtx.newPage();
  await signUp(s, sara);
  await s.getByRole("link", { name: "Start our space" }).click();
  await expect(s.getByRole("heading", { level: 1, name: "Start our space" })).toBeVisible();
  await expect(s.getByLabel("Space name")).toHaveValue("Our space");
  await expect(s.getByText("Brussels (from this phone)")).toBeVisible();
  await s.getByRole("button", { name: "Start our space" }).click();
  await expect(s.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();

  await s.getByRole("link", { name: "Profile" }).click();
  const codeEl = s.getByTestId("invite-code");
  await expect(codeEl).toHaveText(/^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
  const code = (await codeEl.textContent())!.trim();

  // ---- Youssef joins with the code ----
  const yCtx = await browser.newContext({ locale: "en-MA", timezoneId: "Africa/Casablanca" });
  const y = await yCtx.newPage();
  await signUp(y, youssef);
  await y.getByRole("link", { name: "Join with a code" }).click();
  await y.getByLabel("Invite code").fill(code.toLowerCase().replace("-", " "));
  await y.getByRole("button", { name: "Join space" }).click();
  await expect(y.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();

  // Both are in the space now.
  await s.reload();
  await expect(s.getByText(/Sara · partner a/)).toBeVisible();
  await expect(s.getByText(/Youssef · partner b/)).toBeVisible();

  // ---- Youssef signs out ----
  await y.getByRole("link", { name: "Profile" }).click();
  await y.getByRole("button", { name: "Sign out" }).click();
  await expect(y).toHaveURL(/\/sign-in/);
  await expect(y.locator("#si-note")).toHaveText("You're signed out.");
  await y.goto("/profile");
  await expect(y).toHaveURL(/\/sign-in\?redirect=%2Fprofile/);

  // ---- Forgot password → the emailed link → new password ----
  await y.getByRole("link", { name: "Forgot password?" }).click();
  await y.getByLabel("Email").fill(youssef.email);
  await y.getByRole("button", { name: "Send reset link" }).click();
  await expect(y.getByRole("heading", { level: 1, name: "Check your email" })).toBeVisible();
  let link = "";
  await expect
    .poll(async () => {
      const r = await y.request.get(`/api/test/last-reset-link?email=${encodeURIComponent(youssef.email)}`);
      link = r.ok() ? ((await r.json()) as { link: string }).link : "";
      return link;
    })
    .toContain("/reset-password?token=");
  await y.goto(link);
  // A fresh dev server compiles this route on first visit, so allow it longer.
  await expect(y.getByRole("heading", { level: 1, name: "Set a new password" })).toBeVisible({ timeout: 30_000 });
  await y.getByLabel("New password").fill(NEW_PASSWORD);
  await y.getByRole("button", { name: "Set new password" }).click();
  await expect(y.getByRole("heading", { level: 1, name: "Password changed" })).toBeVisible();

  // The link works once.
  await y.goto(link);
  await expect(y.getByRole("heading", { level: 1, name: "This link doesn't work any more" })).toBeVisible();
  await y.goto("/sign-in");

  // ---- Sign in with the new password ----
  await y.getByLabel("Email").fill(youssef.email);
  await y.getByLabel("Password", { exact: true }).fill(youssef.password);
  await y.getByRole("button", { name: "Sign in" }).click();
  await expect(y.getByText("That email and password don't match.", { exact: false })).toBeVisible();
  await y.getByLabel("Password", { exact: true }).fill(NEW_PASSWORD);
  await y.getByRole("button", { name: "Sign in" }).click();
  await expect(y.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();

  // ---- The TEMP Profile page ----
  await s.getByLabel("First name").fill("Sarah");
  await s.getByRole("button", { name: "Save name" }).click();
  await expect(s.getByText("Saved.")).toBeVisible();
  await expect(s.getByText(/Sarah · partner a/)).toBeVisible();

  await s.getByRole("button", { name: "Copy code" }).click();
  await expect(s.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await s.evaluate(() => navigator.clipboard.readText())).toBe(code);

  await s.getByRole("button", { name: "New code" }).click();
  await expect(codeEl).not.toHaveText(code);

  await s.getByLabel("Dark").check();
  await expect(s.locator("html")).toHaveAttribute("data-theme", "dark");
  await s.reload();
  await expect(s.locator("html")).toHaveAttribute("data-theme", "dark"); // per device, before first paint
  await s.getByLabel("Same as this phone").check();
  await expect(s.locator("html")).not.toHaveAttribute("data-theme", /.+/);

  await s.getByLabel("Current password").fill(sara.password);
  await s.getByLabel("New password").fill("a-second-sara-password");
  await s.getByRole("button", { name: "Change password" }).click();
  await expect(s.locator("#pf-pw-done")).toHaveText("Password changed. You've been signed out on your other devices.");

  await saraCtx.close();
  await yCtx.close();
});

test("guards: signed-in visitors skip the auth pages, the invite link carries the code", async ({ browser }) => {
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  // A signed-out visitor following an invite link lands on Create account with the code kept.
  await p.goto("/join#code=k7qm-4xpa");
  await expect(p).toHaveURL(/\/create-account$/);
  await expect(p.getByText("then you'll join with code")).toBeVisible();
  await expect(p.getByText("K7QM-4XPA")).toBeVisible();
  // Signed in (with a space), the auth pages send you home.
  await p.goto("/sign-in");
  await p.getByLabel("Email").fill(sara.email);
  await p.getByLabel("Password", { exact: true }).fill("a-second-sara-password");
  await p.getByRole("button", { name: "Sign in" }).click();
  await expect(p.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();
  for (const path of ["/sign-in", "/create-account", "/forgot-password", "/setup"]) {
    await p.goto(path);
    await expect(p.getByRole("heading", { level: 1, name: "Home" })).toBeVisible();
  }
  await ctx.close();
});
