/**
 * Goals on the real Worker and database, as the seeded Sara (pnpm db:seed). Each test creates its own goal and
 * deletes it at the end, so the seed stays as it was. The photo upload itself is answered by a stub of
 * api.cloudinary.com (the signature still comes from the Worker), so nothing is written to the Cloudinary account.
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

async function deleteFromEdit(page: Page, title: string) {
  await page.getByRole("link", { name: `Edit ${title}` }).click();
  await page.getByRole("button", { name: "Delete goal" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete goal" }).click();
  await expect(page).toHaveURL(/\/goals$/);
  await expect(page.locator("#toast")).toContainText(`${title} deleted`);
  await expect(page.getByRole("link", { name: title })).toHaveCount(0);
}

test.describe.configure({ mode: "serial" });

/** Goals a failed earlier run left behind (titles end in a random suffix): removed so the seed stays clean. */
test.beforeEach(async ({ page }) => {
  await signInSara(page);
  await page.evaluate(async () => {
    const r = (await (await fetch("/api/goals")).json()) as { goals: { id: string; title: string }[] };
    for (const g of r.goals.filter((x) => /^(Rug|Balcony) [a-z0-9]{5}$/.test(x.title)))
      await fetch(`/api/goals/${g.id}`, { method: "DELETE" });
  });
});

test("create a money goal, add to it, edit it, delete it", async ({ page }) => {
  const title = uniqueTitle("Rug");
  await page.goto("/goals");
  await expect(page.getByRole("heading", { level: 1, name: "Goals" })).toBeVisible();
  await page.locator("#primary").click();
  await expect(page).toHaveURL(/\/goals\/new$/);

  // The form checks before anything is sent.
  await page.getByRole("button", { name: "Create goal" }).click();
  await expect(page.getByText("Enter a title for the goal.").first()).toBeVisible();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel(/^Target amount/).fill("300");
  await page.getByRole("button", { name: "Create goal" }).click();

  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page).toHaveURL(/\/goals\/[0-9a-f-]{36}$/);

  // Add to it from its own page: the sheet has no "Change goal".
  await page.getByRole("button", { name: "Add to this goal" }).click();
  const sheet = page.getByRole("dialog", { name: "Add to a goal" });
  await expect(sheet.getByText(`Adding to ${title}`)).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Change goal" })).toHaveCount(0);
  await sheet.getByLabel(/Amount/).fill("120");
  await sheet.getByRole("button", { name: "Add contribution" }).click();
  await expect(page.locator("#toast")).toContainText(`Added 120 EUR to ${title}`);
  const id = page.url().split("/").pop()!;
  await expect
    .poll(async () => page.evaluate(async (g) => (await (await fetch(`/api/goals/${g}`)).json()).goal.progress, id), {
      timeout: 15_000,
    })
    .toBe(12_000);

  // Edit: lowering the target to what's saved completes it.
  await page.getByRole("link", { name: `Edit ${title}` }).click();
  await expect(page).toHaveURL(/\/edit$/);
  await page.getByLabel(/^Target amount/).fill("120");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
  await expect(page.locator("#toast")).toContainText(`${title} is done`);

  await deleteFromEdit(page, title);
});

test("journal: write a note with a photo, then delete it", async ({ page }) => {
  // Cloudinary's upload endpoint, stubbed: it answers with the public id the Worker signed.
  await page.route("https://api.cloudinary.com/**", async (route) => {
    const body = route.request().postDataBuffer()?.toString("latin1") ?? "";
    const publicId = /name="public_id"\r\n\r\n([^\r]+)/.exec(body)?.[1] ?? "missing";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ public_id: publicId, version: 1731150000, width: 64, height: 48, format: "jpg" }),
    });
  });
  await page.route("https://res.cloudinary.com/**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3"><rect width="4" height="3" fill="#ccc"/></svg>',
    }),
  );

  const title = uniqueTitle("Balcony");
  await page.goto("/goals/new");
  await page.getByLabel("Title").fill(title);
  await page.getByLabel(/^Target amount/).fill("50");
  await page.getByRole("button", { name: "Create goal" }).click();
  await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();

  // Phones: History and Journal are tabs.
  await page.getByRole("tab", { name: /Journal/ }).click();
  await expect(page).toHaveURL(/view=journal/);
  await page.getByRole("button", { name: "Write a note" }).first().click();
  await expect(page).toHaveURL(/note=new/);
  const composer = page.getByRole("dialog");
  await composer.getByRole("textbox", { name: "Note", exact: true }).fill("Measured the balcony: 3 by 1.2 metres.");

  // A tiny PNG, picked like a phone would.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAAA7ljmRAAAAEklEQVR4nGP4z8AARMDw/z8DAEnHB/m7nE9MAAAAAElFTkSuQmCC",
    "base64",
  );
  const chooser = page.waitForEvent("filechooser");
  await composer.getByRole("button", { name: /Add photo/ }).click();
  await (await chooser).setFiles({ name: "balcony.png", mimeType: "image/png", buffer: png });
  await composer.getByRole("button", { name: "Save note" }).click();

  await expect(page).not.toHaveURL(/note=/);
  await expect(page.getByText("Measured the balcony: 3 by 1.2 metres.")).toBeVisible();
  const id = page.url().split("/").pop()!.split("?")[0]!;
  const notes = await page.evaluate(async (g) => (await (await fetch(`/api/goals/${g}/notes`)).json()).notes, id);
  expect(notes).toHaveLength(1);
  expect(notes[0].blocks.map((b: { type: string }) => b.type)).toEqual(["text", "image"]);
  expect(notes[0].blocks[1].image.publicId).toMatch(/^zamane\/[0-9a-f-]{36}\/note-image\//);

  await deleteFromEdit(page, title);
});
