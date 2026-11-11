/**
 * Home on the real Worker and database, as the seeded Sara (pnpm db:seed). Every change made here is undone, so
 * the seed stays as it was.
 */
import { expect, test, type Page } from "@playwright/test";

async function signInSara(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("sara@example.com");
  await page.getByLabel("Password", { exact: true }).fill("sara-dev-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Hi, you two" })).toBeVisible();
}

const total = (page: Page) => page.locator("#total-num");
/** The server's own total (minor units), not the page's cached copy. */
const serverTotal = (page: Page) =>
  page.evaluate(async () => ((await (await fetch("/api/home")).json()) as { total: number }).total);
/** "10,200 EUR" + 2 → "10,202 EUR" (whole euros, as these tests add). */
const plus = (text: string, n: number) =>
  `${(Number(text.replace(/[^0-9.]/g, "")) + n).toLocaleString("en-US", { maximumFractionDigits: 2 })} EUR`;

test.describe.configure({ mode: "serial" });

test("quick add to a money goal, then Undo", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await signInSara(page);
  const before = (await total(page).textContent())!.trim();
  const beforeServer = await serverTotal(page);

  await page.getByRole("button", { name: "Add to a goal" }).click();
  const sheet = page.getByRole("dialog", { name: "Add to a goal" });
  await sheet.getByRole("button", { name: /Wedding fund/ }).click();
  await expect(sheet.getByText("Adding to Wedding fund")).toBeVisible();

  // The amount is checked before anything is sent.
  await sheet.getByLabel(/Amount/).fill("12x");
  await sheet.getByRole("button", { name: "Add contribution" }).click();
  await expect(sheet.locator("#amt-err")).toHaveText("Use numbers only, for example 500 or 500,50.");
  await sheet.getByLabel(/Amount/).fill("1");
  await expect(sheet.locator("#amt-help")).toContainText("Wedding fund will be at");
  await sheet.getByRole("button", { name: "Add contribution" }).click();

  const toast = page.locator("#toast");
  await expect(toast).toContainText("Added 1 EUR to Wedding fund");
  await expect(total(page)).not.toHaveText(before);
  await expect(page.getByText("Sara added 1 · just now")).toBeVisible();
  await expect(page.locator("#primary")).toBeFocused();

  await toast.getByRole("button", { name: "Undo: remove 1 EUR from Wedding fund" }).click();
  await expect(toast).toContainText("Removed 1 EUR from Wedding fund");
  await expect(total(page)).toHaveText(before);
  // The removal is queued behind the add (which takes a moment to reach the server); the server ends where it started.
  await expect.poll(() => serverTotal(page), { timeout: 15_000 }).toBe(beforeServer);
  await page.reload();
  await expect(total(page)).toHaveText(before);
  await ctx.close();
});

test("an add made offline waits, then syncs when back online", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await signInSara(page);
  const before = (await total(page).textContent())!.trim();
  const beforeServer = await serverTotal(page);

  await ctx.setOffline(true);
  await expect(page.getByText("You're offline. Showing the latest data on this phone.")).toBeVisible();
  await page.getByRole("button", { name: "Add to a goal" }).click();
  const sheet = page.getByRole("dialog", { name: "Add to a goal" });
  await sheet.getByRole("button", { name: /Wedding fund/ }).click();
  await sheet.getByLabel(/Amount/).fill("2");
  await sheet.getByRole("button", { name: "Add contribution" }).click();
  await expect(page.locator("#toast")).toContainText("Will sync when you're back online.");
  await expect(page.getByText("Sara added 2 · waiting to sync")).toBeVisible();

  await ctx.setOffline(false);
  // Synced: the server's total (refetched after the replay) includes it, and the card no longer waits.
  await expect(total(page)).toHaveText(plus(before, 2), { timeout: 15_000 });
  await expect(page.getByText("Sara added 2 · waiting to sync")).toHaveCount(0);

  // Undo after the sync deletes it on the server, which also puts the seed back.
  await page.locator("#toast").getByRole("button", { name: "Undo: remove 2 EUR from Wedding fund" }).click();
  await expect(page.locator("#toast")).toContainText("Removed 2 EUR from Wedding fund");
  await expect.poll(() => serverTotal(page), { timeout: 15_000 }).toBe(beforeServer);
  await page.reload();
  await expect(total(page)).toHaveText(before);
  await ctx.close();
});
