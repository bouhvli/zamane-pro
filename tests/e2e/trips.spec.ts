/**
 * Trips on the real Worker and database, as the seeded Sara (pnpm db:seed). Each test creates its own trip and
 * deletes it at the end, so the seed stays as it was.
 */
import { expect, test, type Page } from "@playwright/test";

async function signInSara(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("sara@example.com");
  await page.getByLabel("Password", { exact: true }).fill("sara-dev-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Hi, you two" })).toBeVisible();
}

const uniqueTitle = (t: string) => `${t} ${Math.random().toString(36).slice(2, 7)}`;

test.describe.configure({ mode: "serial" });

/** Trips a failed earlier run left behind are removed so the seed stays clean. */
test.beforeEach(async ({ page }) => {
  await signInSara(page);
  await page.evaluate(async () => {
    const r = (await (await fetch("/api/trips")).json()) as { trips: { id: string; title: string }[] };
    for (const t of r.trips.filter((x) => /^(Marrakech|Tangier) [a-z0-9]{5}$/.test(x.title)))
      await fetch(`/api/trips/${t.id}`, { method: "DELETE" });
  });
});

test("plan a trip, add a place and a plan item, tick it, edit and delete the trip", async ({ page }) => {
  const title = uniqueTitle("Marrakech");
  await page.goto("/trips");
  await expect(page.getByRole("heading", { level: 1, name: "Trips" })).toBeVisible();
  await page.locator("#primary").click();
  await expect(page).toHaveURL(/\/trips\/new$/);

  // Only the title is needed; the form checks it before anything is sent.
  await page.getByRole("button", { name: "Create trip" }).click();
  await expect(page.getByText("Enter a title for the trip.").first()).toBeVisible();
  await page.locator("#f-title").fill(title);
  await page.getByRole("button", { name: "Create trip" }).click();

  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page).toHaveURL(/\/trips\/[0-9a-f-]{36}$/);
  const id = page.url().split("/").pop()!;
  const full = () => page.evaluate(async (t) => (await fetch(`/api/trips/${t}`)).json(), id);

  // The checklist is seeded with the trip (11 suggestions).
  expect((await full()).items).toHaveLength(11);

  // An undated trip's primary adds a place.
  await page.locator("#primary").click();
  await expect(page).toHaveURL(/place=new/);
  const form = page.getByRole("dialog");
  await form.getByLabel(/^Title/).fill("Jemaa el-Fnaa");
  await form.getByRole("button", { name: "Add place" }).click();
  await expect(page).not.toHaveURL(/place=/);
  await expect.poll(async () => (await full()).places.length, { timeout: 15_000 }).toBe(1);

  // A plan item from the API, ticked from the page.
  const entryId = crypto.randomUUID();
  const made = await page.evaluate(
    async ([t, e]) =>
      (
        await fetch(`/api/trips/${t}/plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: e, type: "food", title: "Dinner on the square" }),
        })
      ).status,
    [id, entryId],
  );
  expect(made).toBe(201);
  await page.reload();
  await page.getByRole("tab", { name: /Plan/ }).click();
  await page.getByRole("checkbox", { name: /Dinner on the square/ }).click();
  await expect.poll(async () => (await full()).entries[0].doneAt, { timeout: 15_000 }).not.toBeNull();

  // Edit, then delete from the edit form.
  await page.getByRole("link", { name: /^Edit/ }).first().click();
  await expect(page).toHaveURL(/\/edit$/);
  await page.locator("#f-title").fill(`${title} x`);
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { level: 1, name: `${title} x` })).toBeVisible();

  await page.getByRole("link", { name: /^Edit/ }).first().click();
  await page.locator("#delete").click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: /^Delete/ })
    .click();
  await expect(page).toHaveURL(/\/trips$/);
  await expect(page.getByRole("link", { name: new RegExp(title) })).toHaveCount(0);
});
