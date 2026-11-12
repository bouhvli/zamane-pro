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
  await expect(s.getByRole("heading", { level: 1, name: /^Hi, / })).toBeVisible();

  await s.getByRole("link", { name: "Profile" }).click();
  const codeEl = s.getByTestId("invite-code");
  await expect(codeEl).toHaveText(/^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
  const firstCode = (await codeEl.textContent())!.trim();

  // Solo, the code can be copied and replaced (both go away once the partner has joined).
  await s.getByRole("button", { name: "Copy code" }).click();
  await expect(s.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await s.evaluate(() => navigator.clipboard.readText())).toBe(firstCode);
  await s.getByRole("button", { name: "New code" }).click();
  await expect(codeEl).not.toHaveText(firstCode);
  const code = (await codeEl.textContent())!.trim();

  // ---- Youssef joins with the code ----
  const yCtx = await browser.newContext({ locale: "en-MA", timezoneId: "Africa/Casablanca" });
  const y = await yCtx.newPage();
  await signUp(y, youssef);
  await y.getByRole("link", { name: "Join with a code" }).click();
  await y.getByLabel("Invite code").fill(code.toLowerCase().replace("-", " "));
  await y.getByRole("button", { name: "Join space" }).click();
  await expect(y.getByRole("heading", { level: 1, name: /^Hi, / })).toBeVisible();

  // Both are in the space now.
  await s.reload();
  await expect(s.locator(".pf-plates").getByText("Sara", { exact: true })).toBeVisible();
  await expect(s.locator(".pf-plates").getByText("Youssef", { exact: true })).toBeVisible();

  // ---- Youssef signs out ----
  await y.getByRole("link", { name: "Profile" }).click();
  await y.getByRole("button", { name: "Sign out", exact: true }).click();
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
  await expect(y.getByRole("heading", { level: 1, name: /^Hi, / })).toBeVisible();

  // ---- The Profile page ----
  // The name saves by itself when the field loses focus.
  await s.getByLabel("First name").fill("Sarah");
  await s.getByLabel("First name").blur();
  await expect(s.getByText("Saved.", { exact: true })).toBeVisible();
  await expect(s.locator(".pf-plates").getByText("Sarah", { exact: true })).toBeVisible();

  // Linked: no invite code, Copy code or New code any more.
  await expect(s.getByTestId("invite-code")).toHaveCount(0);
  await expect(s.getByRole("button", { name: "Copy code" })).toHaveCount(0);
  await expect(s.getByRole("button", { name: "New code" })).toHaveCount(0);

  await s.getByLabel("Dark").check();
  await expect(s.locator("html")).toHaveAttribute("data-theme", "dark");
  await s.reload();
  await expect(s.locator("html")).toHaveAttribute("data-theme", "dark"); // per device, before first paint
  await s.getByLabel("Same as this phone").check();
  await expect(s.locator("html")).not.toHaveAttribute("data-theme", /.+/);

  await s.getByRole("button", { name: "Change password" }).click(); // opens the form
  await expect(s.locator("#pf-current")).toBeFocused();
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
  await expect(p.getByRole("heading", { level: 1, name: /^Hi, / })).toBeVisible();
  for (const path of ["/sign-in", "/create-account", "/forgot-password", "/setup"]) {
    await p.goto(path);
    await expect(p.getByRole("heading", { level: 1, name: /^Hi, / })).toBeVisible();
  }
  await ctx.close();
});

test("the nav bar: tabs, the current one, focus on arrival (seeded Sara)", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  await p.goto("/sign-in");
  await p.getByLabel("Email").fill("sara@example.com");
  await p.getByLabel("Password", { exact: true }).fill("sara-dev-password");
  await p.getByRole("button", { name: "Sign in" }).click();
  const nav = p.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Profile" })).toContainText("S"); // your initial on your tint

  for (const [name, path] of [
    ["Goals", "/goals"],
    ["Trips", "/trips"],
    ["Shopping", "/shopping"],
    ["Profile", "/profile"],
    ["Home", "/"],
  ] as const) {
    await nav.getByRole("link", { name }).click();
    await expect(p).toHaveURL(new RegExp(`${path === "/" ? "/$" : `${path}$`}`));
    await expect(nav.getByRole("link", { name })).toHaveAttribute("aria-current", "page");
    await expect(nav.locator("[aria-current=page]")).toHaveCount(1);
    await expect(p.getByRole("heading", { level: 1 })).toBeFocused();
  }

  // Tapping the tab you're on keeps you there (and scrolls to the top).
  await nav.getByRole("link", { name: "Home" }).click();
  await expect(p).toHaveURL(/\/$/);

  // A goal's own page still belongs to Goals.
  await nav.getByRole("link", { name: "Goals" }).click();
  await p.locator(".tile-title a, .done-title a").first().click();
  await expect(p).toHaveURL(/\/goals\/[0-9a-f-]{36}$/);
  await expect(nav.getByRole("link", { name: "Goals" })).toHaveAttribute("aria-current", "page");
  // Creating a goal is a task page: no bottom nav on phones (goals.html, decision (a)).
  await p.goto("/goals/new");
  await expect(p.getByRole("heading", { level: 1, name: "New goal" })).toBeVisible();
  await expect(nav).toBeHidden();
  await ctx.close();
});
