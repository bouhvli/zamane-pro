/**
 * Visual comparison: create and edit goal (.ux-forge/goals/goals.html#/goals/new and #/goals/<id>/edit, form.js
 * fixtures) next to the app's /goals/new and /goals/<id>/edit with the same example data mocked. The app has no
 * fixtures, so each case drives the real form into the state (typing, a photo, a 409, going offline).
 * Not compared: partner-changed (a live change named by realtime, Phase 5). Writes tests/visual/report/goals-form/.
 */
import type { Page } from "@playwright/test";
import { type Case, goalView, visualSuite } from "./goals-harness.ts";

/** A 1×1 PNG. */
const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const NEW = "#/goals/new";
const EDIT = (id: string) => `#/goals/${id}/edit`;

async function cloudinary(p: Page, mode: "hang" | "fail") {
  await p.route("**/api/uploads/sign", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        cloudName: "zamane-test",
        apiKey: "000",
        timestamp: 1,
        signature: "x",
        signatureAlgorithm: "sha256",
        publicId: "zamane/s1/goal-cover/new",
        allowedFormats: "jpg,png,webp",
        maxFileSize: 10485760,
      }),
    }),
  );
  await p.route("https://api.cloudinary.com/**", (r) =>
    mode === "hang" ? new Promise<void>(() => {}) : r.fulfill({ status: 500, body: "{}" }),
  );
}
const focusTitle = (p: Page) => p.evaluate(() => document.getElementById("f-title")?.focus());
const blur = (p: Page) => p.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

/** form.js prefill(details): the example values. */
async function prefill(p: Page, details: boolean) {
  await p.fill("#f-title", "Summer in Essaouira");
  await p.fill("#f-target", "12,000");
  if (details) {
    // By keyboard, like the fixture (a pointer press would turn off focus-visible rings).
    await p.focus(".details-toggle");
    await p.keyboard.press("Enter");
    await p.fill("#f-date", "2027-07-03");
    await p.fill("#f-desc", "A week by the sea after the wedding.");
  }
  await focusTitle(p);
}
async function addPhoto(p: Page) {
  await p.setInputFiles("#cover-file", { name: "photo.png", mimeType: "image/png", buffer: PNG_1PX });
}

const create = (id: string, extra: Partial<Case> = {}): Case => ({
  id: `new-${id}`,
  proto: id === "default" ? `${NEW}` : `?state=${id}${NEW}`,
  state: id === "uploads-off" ? "uploads-off" : "populated",
  path: "/goals/new",
  ready: "#f-title",
  wide: id === "default",
  ...extra,
});
const edit = (goal: string, id: string, extra: Partial<Case> = {}): Case => ({
  id: `edit-${goal}-${id}`,
  proto: id === "default" ? `${EDIT(goal)}` : `?state=${id}${EDIT(goal)}`,
  state: id === "uploads-off" ? "uploads-off" : "populated",
  path: `/goals/${goal}/edit`,
  ready: "#form-h",
  wide: id === "default" && goal === "wedding",
  ...extra,
});

const cases: Case[] = [
  create("default"),
  create("invalid", {
    react: async (p) => {
      await p.fill("#f-target", "0");
      await p.press("#f-target", "Enter");
      await p.waitForSelector("#f-title-err:not([hidden])");
    },
  }),
  create("percent", {
    react: async (p) => {
      await p.fill("#f-title", "Retile the kitchen");
      await p.evaluate(() => document.getElementById("type-general")?.click());
      await focusTitle(p);
    },
  }),
  create("details", { react: (p) => prefill(p, true) }),
  create("cover-uploading", {
    routes: (p) => cloudinary(p, "hang"),
    react: async (p) => {
      await prefill(p, true);
      await addPhoto(p);
      await p.waitForSelector(".cover-pill");
      await focusTitle(p);
    },
  }),
  create("cover-failed", {
    routes: (p) => cloudinary(p, "fail"),
    react: async (p) => {
      await prefill(p, true);
      await addPhoto(p);
      await p.waitForSelector("#cover-retry");
    },
  }),
  create("offline", {
    react: async (p) => {
      await prefill(p, false);
      await p.context().setOffline(true);
      await p.waitForSelector("#submit-reason:not([hidden])");
    },
  }),
  create("uploads-off", { react: (p) => prefill(p, true) }),

  edit("wedding", "default"),
  edit("guest-room", "default"),
  edit("sofa", "default"),
  edit("wedding", "invalid", {
    react: async (p) => {
      await p.fill("#f-title", "");
      await p.press("#f-title", "Enter");
      await p.waitForSelector("#f-title-err:not([hidden])");
    },
  }),
  edit("wedding", "completion-preview", {
    react: async (p) => {
      await p.fill("#f-target", "14,000");
      await blur(p);
    },
  }),
  edit("wedding", "conflict", {
    routes: async (p, s) => {
      const g = s.goals.find((x) => x.id === "wedding")!;
      const current = { ...g, title: "Our wedding", targetDate: "2027-06-19", updatedAt: "2026-11-09T12:00:00" };
      await p.route("**/api/goals/wedding", async (r) => {
        if (r.request().method() === "PATCH")
          return r.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({ error: { code: "conflict", message: "x" } }),
          });
        const v = goalView(s, { ...g, ...current });
        return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ goal: v }) });
      });
    },
    react: async (p) => {
      await p.fill("#f-title", "Our wedding in Fes");
      await p.fill("#f-target", "22,000");
      await p.click("#primary");
      await p.waitForSelector("#merge-text");
    },
  }),
  edit("wedding", "not-found", {
    routes: async (p) => {
      await p.route("**/api/goals/wedding", (r) =>
        r.request().method() === "PATCH"
          ? r.fulfill({
              status: 404,
              contentType: "application/json",
              body: JSON.stringify({ error: { code: "not_found", message: "Not found." } }),
            })
          : r.fallback(),
      );
    },
    react: async (p) => {
      await p.fill("#f-title", "Our wedding in Fes");
      await p.fill("#f-target", "22,000");
      await p.click("#primary");
      await p.waitForSelector(".gone");
    },
  }),
  edit("wedding", "delete-confirm", {
    react: async (p) => {
      // Focus without scrolling, as Z.focus does.
      await p.evaluate(() => document.getElementById("delete")?.focus({ preventScroll: true }));
      await p.keyboard.press("Enter");
      await p.waitForSelector("#confirm[open]");
    },
  }),
  edit("wedding", "offline", {
    react: async (p) => {
      await p.context().setOffline(true);
      await p.waitForSelector("#submit-reason:not([hidden])");
    },
  }),
  edit("wedding", "uploads-off"),
  edit("wedding", "cover-uploading", {
    routes: (p) => cloudinary(p, "hang"),
    react: async (p) => {
      await addPhoto(p);
      await p.waitForSelector(".cover-pill");
      await blur(p);
    },
  }),
  edit("wedding", "cover-failed", {
    routes: (p) => cloudinary(p, "fail"),
    react: async (p) => {
      await addPhoto(p);
      await p.waitForSelector("#cover-retry");
    },
  }),
];

visualSuite("goals-form", "Goal form", cases);
