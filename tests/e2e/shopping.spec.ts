/**
 * Shopping on the real Worker and database, as the seeded Sara (pnpm db:seed). The test adds its own item with a unique
 * name prefix and removes it at the end (and in beforeEach, if an earlier run died), so the seed stays as it was. The
 * seeded bought item (Milk) is cleared with the new one and brought back by Undo.
 */
import { expect, test, type Page } from "@playwright/test";

async function signInSara(page: Page) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill("sara@example.com");
  await page.getByLabel("Password", { exact: true }).fill("sara-dev-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Hi, you two" })).toBeVisible();
}

const uniqueName = () => `Pwtest ${Math.random().toString(36).slice(2, 7)}`;
type Row = { id: string; name: string; quantity: number; unit: string; boughtAt: string | null };
const list = (page: Page) =>
  page.evaluate(async () => (await (await fetch("/api/shopping")).json()) as { items: Row[] });

test.describe.configure({ mode: "serial" });

/** Items a failed earlier run left behind are removed so the seed stays clean. */
test.beforeEach(async ({ page }) => {
  await signInSara(page);
  await page.evaluate(async () => {
    const r = (await (await fetch("/api/shopping")).json()) as { items: { id: string; name: string }[] };
    for (const i of r.items.filter((x) => /^Pwtest /.test(x.name)))
      await fetch(`/api/shopping/${i.id}`, { method: "DELETE" });
  });
});

test("add from the dock, tick, edit in the form, clear bought with Undo, delete", async ({ page }) => {
  const name = uniqueName();
  await page.goto("/shopping");
  await expect(page.getByRole("heading", { level: 1, name: "Shopping" })).toBeVisible();
  // The seeded list: 4 left to buy, Milk bought
  await expect(page.getByText("4 left to buy")).toBeVisible();

  // Add from the floating button: it opens the form with Name focused
  await page.locator("#primary").click();
  await expect(page).toHaveURL(/item=new/);
  const addForm = page.getByRole("dialog", { name: "Add item" });
  await expect(addForm.locator("#if-name")).toBeFocused();
  await addForm.locator("#if-name").fill(name);
  await addForm.locator("#if-qty").fill("500");
  await addForm.locator("#if-unit").selectOption("g");
  await addForm.getByRole("button", { name: "Add item" }).click();
  await expect(addForm).toBeHidden();
  await expect(page.locator("#toast")).toContainText(`Added ${name} to Other`);
  const added = page.locator("li.row", { hasText: name });
  await expect(added).toBeVisible();
  await expect(added.locator(".r-price")).toHaveText("500 g");
  await expect(added.locator(".r-whotext")).toHaveText(/^Today, \d\d:\d\d$/);
  await expect(page.getByText("5 left to buy")).toBeVisible();
  await expect.poll(async () => (await list(page)).items.some((i) => i.name === name), { timeout: 15_000 }).toBe(true);

  // Tick it: the row stays where it is (nothing moves under the thumb) and Tidy up offers to move it
  await page.getByRole("checkbox", { name }).check();
  await expect(page.getByRole("heading", { name: /Bought · 1/ })).toBeVisible();
  await page.getByRole("button", { name: /^Tidy up \(1\)/ }).click();
  await expect(page.getByRole("heading", { name: /Bought · 2/ })).toBeVisible();
  await expect(page.getByText("4 left to buy")).toBeVisible();
  await expect
    .poll(async () => (await list(page)).items.find((i) => i.name === name)?.boughtAt ?? null, { timeout: 15_000 })
    .not.toBeNull();

  // Open the sheet, edit in the form
  await page.getByRole("button", { name: `${name}, details` }).click();
  const sheet = page.getByRole("dialog", { name });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: `Edit ${name}` }).click();
  await expect(page).toHaveURL(/item=[0-9a-f-]{36}/);
  const form = page.getByRole("dialog", { name: "Edit item" });
  await expect(form).toBeVisible();
  await form.locator("#if-qty").fill("3");
  await form.locator("#if-unit").selectOption("kg");
  await form.getByRole("button", { name: "Save changes" }).click();
  await expect(form).toBeHidden();
  await expect(page).not.toHaveURL(/item=/);
  await expect(page.locator("li.row", { hasText: name }).locator(".r-price")).toHaveText("3 kg");
  await expect
    .poll(async () => (await list(page)).items.find((i) => i.name === name)?.unit, { timeout: 15_000 })
    .toBe("kg");

  // Clear bought: the confirmation counts them; Undo brings them back
  await page.getByRole("button", { name: /^Clear bought/ }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm.getByRole("heading", { name: "Clear 2 bought items?" })).toBeVisible();
  await confirm.getByRole("button", { name: "Clear 2 items" }).click();
  await expect(page.locator("li.row", { hasText: name })).toHaveCount(0);
  await expect(page.locator("#toast")).toContainText("Cleared 2 items");
  await expect.poll(async () => (await list(page)).items.some((i) => i.boughtAt), { timeout: 15_000 }).toBe(false);
  await page.locator("#toast").getByRole("button", { name: /^Undo/ }).click();
  await expect(page.locator("li.row", { hasText: name })).toBeVisible();
  await expect(page.locator("li.row", { hasText: "Milk" })).toBeVisible();
  await expect.poll(async () => (await list(page)).items.filter((i) => i.boughtAt).length, { timeout: 15_000 }).toBe(2);

  // Delete it from the sheet
  await page.getByRole("button", { name: `${name}, details` }).click();
  await page
    .getByRole("dialog", { name })
    .getByRole("button", { name: `Delete ${name}` })
    .click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: `Delete ${name}` })
    .click();
  await expect(page.locator("li.row", { hasText: name })).toHaveCount(0);
  await expect(page.locator("#toast")).toContainText(`Deleted ${name}`);
  await expect.poll(async () => (await list(page)).items.some((i) => i.name === name), { timeout: 15_000 }).toBe(false);
});
