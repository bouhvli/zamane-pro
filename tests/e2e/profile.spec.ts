/**
 * The Profile settings end to end (D67-D71), two browser contexts on their own throwaway users:
 * - the space name autosaves, currency and time zone are read only, the invite code disappears once the partner joins;
 * - the partner leaves: lands in the setup flow, and the remaining person gets the (new) invite code back;
 * - export downloads a JSON file;
 * - change email goes through the confirmation link (read from the test-only endpoint, E2E=1 dev servers only);
 * - sign out other devices;
 * - delete account asks for the password, then ends on Sign in.
 */
import { expect, test, type Page } from "@playwright/test";

const run = Date.now().toString(36);
const sara = { name: "Sara", email: `psara-${run}@example.com`, password: "olive-tree-2026" };
const youssef = { name: "Youssef", email: `pyoussef-${run}@example.com`, password: "argan-grove-2026" };
const NEW_EMAIL = `psara-new-${run}@example.com`;

async function signUp(page: Page, who: typeof sara) {
  await page.goto("/create-account");
  await page.getByLabel("First name").fill(who.name);
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password", { exact: true }).fill(who.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/setup$/);
}

test.describe.configure({ mode: "serial" });

test("space settings, linking, leaving, export, change email, other devices, delete account", async ({ browser }) => {
  const saraCtx = await browser.newContext({ locale: "en-BE", timezoneId: "Europe/Brussels" });
  const s = await saraCtx.newPage();
  await signUp(s, sara);
  await s.getByRole("link", { name: "Start our space" }).click();
  await s.getByRole("button", { name: "Start our space" }).click();
  await expect(s.getByRole("heading", { level: 1, name: /^Hi, / })).toBeVisible();
  await s.getByRole("link", { name: "Profile" }).click();

  // ---- Solo: the code shows; name autosaves; currency and time zone are read only ----
  const codeEl = s.getByTestId("invite-code");
  await expect(codeEl).toBeVisible();
  const code = (await codeEl.textContent())!.trim();
  await expect(s.getByText("Chosen when the space was created.")).toBeVisible();
  await expect(s.locator(".pf-facts")).toContainText("Euro (EUR)");
  await expect(s.locator(".pf-facts")).toContainText("Europe/Brussels");
  await expect(s.locator(".pf-facts input, .pf-facts select")).toHaveCount(0);

  await s.getByLabel("Space name").fill("Dar Sara");
  await s.getByLabel("Space name").blur();
  await expect(s.locator("#pf-space .pf-status")).toHaveText("Saved.");
  await expect(s.getByRole("heading", { level: 2, name: "Dar Sara" })).toBeVisible();
  await s.reload();
  await expect(s.getByLabel("Space name")).toHaveValue("Dar Sara");
  // An empty name isn't saved.
  await s.getByLabel("Space name").fill("");
  await s.getByLabel("Space name").blur();
  await expect(s.getByText("Give your space a name.")).toBeVisible();

  // ---- Youssef joins: the code is gone for both ----
  const yCtx = await browser.newContext({ locale: "en-MA", timezoneId: "Africa/Casablanca" });
  const y = await yCtx.newPage();
  await signUp(y, youssef);
  await y.getByRole("link", { name: "Join with a code" }).click();
  await y.getByLabel("Invite code").fill(code.toLowerCase().replace("-", " "));
  await y.getByRole("button", { name: "Join space" }).click();
  await expect(y.getByRole("heading", { level: 1, name: /^Hi, / })).toBeVisible();
  await s.reload();
  await expect(s.locator(".pf-plates").getByText("Youssef", { exact: true })).toBeVisible();
  await expect(s.getByTestId("invite-code")).toHaveCount(0);
  await expect(s.getByRole("button", { name: "New code" })).toHaveCount(0);
  await expect(s.getByLabel("Space name")).toHaveValue("Dar Sara");

  // ---- Youssef leaves (Cancel first) ----
  await y.getByRole("link", { name: "Profile" }).click();
  await expect(y.getByTestId("invite-code")).toHaveCount(0);
  await y.getByRole("button", { name: "Leave space" }).click();
  await expect(y.getByRole("alertdialog", { name: "Leave this space?" })).toBeVisible();
  await expect(y.getByRole("alertdialog")).toContainText("keeps the space and everything in it");
  await y.locator("#confirm-cancel").click();
  await expect(y.getByRole("alertdialog")).toBeHidden();
  await expect(y.locator("#pf-leave")).toBeFocused();
  await y.locator("#pf-leave").click();
  await y.locator("#confirm-ok").click();
  await expect(y).toHaveURL(/\/setup$/);
  await expect(y.getByRole("link", { name: "Start our space" })).toBeVisible();

  // Sara keeps the space and sees a new code for the freed seat.
  await s.reload();
  const fresh = s.getByTestId("invite-code");
  await expect(fresh).toBeVisible();
  expect((await fresh.textContent())!.trim()).not.toBe(code);
  await expect(s.getByText("Waiting for your partner")).toBeVisible();
  await expect(s.getByLabel("Space name")).toHaveValue("Dar Sara");
  await yCtx.close();

  // ---- Export ----
  const [download] = await Promise.all([
    s.waitForEvent("download"),
    s.getByRole("button", { name: "Export my data" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^zamane-export-\d{4}-\d{2}-\d{2}\.json$/);

  // ---- Other devices ----
  await s.getByRole("button", { name: "Sign out other devices" }).click();
  await expect(s.locator("#pf-dev-done")).toHaveText("Signed out on your other devices.");

  // ---- Change email: the form opens on request, the link confirms it ----
  await s.getByRole("button", { name: "Change email" }).click();
  await expect(s.locator("#pf-email-new")).toBeFocused();
  await expect(s.locator("#pf-email")).toContainText(sara.email);
  await s.getByRole("button", { name: "Cancel" }).click();
  await expect(s.locator("#pf-email-open")).toBeFocused();
  await s.getByRole("button", { name: "Change email" }).click();
  await s.getByLabel("New email").fill(NEW_EMAIL);
  await s.locator("#pf-email-pw").fill("wrong-password-123");
  await s.locator("#pf-email").getByRole("button", { name: "Change email" }).click();
  await expect(s.getByText("That password isn't right.")).toBeVisible();
  await s.locator("#pf-email-pw").fill(sara.password);
  await s.locator("#pf-email").getByRole("button", { name: "Change email" }).click();
  await expect(s.locator("#pf-email-sent")).toContainText("a confirmation link is on its way");
  await expect(s.locator("#pf-email-sent")).toContainText(`Your email stays ${sara.email}`);

  let link = "";
  await expect
    .poll(async () => {
      const r = await s.request.get(`/api/test/last-reset-link?email=${encodeURIComponent(NEW_EMAIL)}`);
      link = r.ok() ? ((await r.json()) as { link: string }).link : "";
      return link;
    })
    .toContain("/api/auth/verify-email?token=");
  await s.goto(link);
  await expect(s).toHaveURL(/\/profile\?email=updated/);
  await expect(s.locator("#pf-email-updated")).toHaveText("Your email address was changed.");
  await expect(s.locator("#pf-email-open").locator("xpath=preceding-sibling::p")).toContainText(NEW_EMAIL);

  // ---- Delete the account (Sara is alone: the space goes with it) ----
  await s.getByRole("button", { name: "Delete my account" }).click();
  await expect(s.getByRole("alertdialog", { name: "Delete your account?" })).toBeVisible();
  await expect(s.getByRole("alertdialog")).toContainText("the space and everything in it is deleted too");
  await s.locator("#confirm-ok").click(); // no password yet
  await expect(s.getByText("Enter your password.")).toBeVisible();
  await s.locator("#pf-del-pw").fill("wrong-password-123");
  await s.locator("#confirm-ok").click();
  await expect(s.getByText("That password isn't right.")).toBeVisible();
  await s.locator("#pf-del-pw").fill(sara.password);
  await s.locator("#confirm-ok").click();
  await expect(s).toHaveURL(/\/sign-in$/);
  await expect(s.locator("#si-note")).toHaveText("Your account was deleted.");

  await s.getByLabel("Email").fill(NEW_EMAIL);
  await s.getByLabel("Password", { exact: true }).fill(sara.password);
  await s.getByRole("button", { name: "Sign in" }).click();
  await expect(s.getByText("That email and password don't match.", { exact: false })).toBeVisible();
  await saraCtx.close();
});
