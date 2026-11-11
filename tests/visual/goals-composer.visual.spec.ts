/**
 * Visual comparison: the note composer (.ux-forge/goals/goals.html?state=composer…#/goals/wedding, which opens
 * ?note=new or ?note=n2) next to the app's /goals/wedding?note=… with the same example data mocked. The app is
 * driven into each fixture through the UI (typing, picking a generated photo, a mocked Cloudinary upload, a 409 or
 * 404 on save). Known differences: the prototype's "Example photo" placeholders are real (flat) images here, and
 * an upload's progress is whatever the browser reports. Writes tests/visual/report/goals-composer/.
 */
import type { Page } from "@playwright/test";
import { PNG } from "pngjs";
import { type Case, type Seed, visualSuite } from "./goals-harness.ts";

const EX1 =
  "We saw the riad in Fes on Saturday. The courtyard has room for everyone, and the light there in the afternoon is lovely.";
const EX2 = "Deposit due in March.";
const N2 = "The bonus came in, so most of it went here. Seven months to go and we're ahead of where we said we'd be.";

const photo = (() => {
  const png = new PNG({ width: 400, height: 500 });
  for (let i = 0; i < png.data.length; i += 4) png.data.set([200, 187, 165, 255], i);
  return PNG.sync.write(png);
})();
const asset = (id: string) => ({
  publicId: `zamane/s1/note-image/${id}`,
  version: 1,
  width: 400,
  height: 500,
  format: "jpg",
});

/** Signing and Cloudinary: `upload` decides what the upload answers. */
function uploads(upload: "ok" | "hang" | "fail") {
  return async (p: Page) => {
    let n = 0;
    await p.route("**/api/uploads/sign", (r) =>
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          cloudName: "zamane-test",
          apiKey: "1",
          timestamp: 1,
          signature: "x",
          signatureAlgorithm: "sha256",
          publicId: `zamane/s1/note-image/p${++n}`,
          allowedFormats: "jpg,png,webp",
          maxFileSize: 10485760,
        }),
      }),
    );
    await p.route("https://api.cloudinary.com/**", (r) => {
      if (upload === "hang") return new Promise<void>(() => {});
      if (upload === "fail") return r.fulfill({ status: 500, body: "{}" });
      return r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          public_id: `zamane/s1/note-image/p${n}`,
          version: 1,
          width: 400,
          height: 500,
          format: "jpg",
        }),
      });
    });
  };
}

/** Save answers: a conflict (and the latest version with a photo added), or the note gone. */
function saves(kind: "conflict" | "missing") {
  return async (p: Page, s: Seed) => {
    let changed = false;
    await p.route("**/api/goals/wedding/notes/n2", (r) => {
      if (r.request().method() !== "PUT") return r.fallback();
      changed = true;
      return r.fulfill({
        status: kind === "conflict" ? 409 : 404,
        contentType: "application/json",
        body: JSON.stringify({ error: { code: kind === "conflict" ? "conflict" : "not_found", message: "x" } }),
      });
    });
    await p.route("**/api/goals/wedding/notes", (r) => {
      if (r.request().method() !== "GET" || !changed) return r.fallback();
      const n2 = s.notes.find((n) => n.id === "n2")!;
      const notes =
        kind === "missing"
          ? []
          : [
              {
                id: "n2",
                userId: "u-sara",
                at: n2.at,
                updatedAt: "2026-11-09T11:59:00",
                blocks: [
                  { type: "text", text: N2 },
                  { type: "image", image: asset("latest"), alt: "" },
                ],
              },
            ];
      return r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ notes }) });
    });
  };
}

const T = "#composer textarea.cmp-text";
async function typeFirst(p: Page, text: string) {
  await p.locator(T).first().fill(text);
}
async function addPhoto(p: Page) {
  await p.setInputFiles("#composer input[type=file]", { name: "photo.png", mimeType: "image/png", buffer: photo });
  await p.waitForSelector("#composer .cmp-photo");
}
/** Focus the end of the first text block, like the prototype's fixtures. */
async function caretFirstEnd(p: Page) {
  await p
    .locator(T)
    .first()
    .evaluate((t: HTMLTextAreaElement) => {
      t.focus();
      t.setSelectionRange(t.value.length, t.value.length);
    });
}
async function withPhotos(p: Page) {
  await typeFirst(p, EX1);
  await addPhoto(p);
  await p.waitForSelector("#composer .cmp-photo:not(:has(.cmp-pill))");
  await p.locator(T).nth(1).fill(EX2);
}

const READY = "#composer[open] .cmp-head";
const hideExample = async (p: Page) => {
  await p.addStyleTag({ content: ".cmp-example{display:none!important}" });
};
const c = (id: string, note: string, extra: Partial<Case> = {}): Case => ({
  id,
  proto: `?state=${id}#/goals/wedding`,
  state: "populated",
  path: `/goals/wedding?note=${note}`,
  ready: READY,
  protoAct: hideExample,
  ...extra,
});

const cases: Case[] = [
  c("composer", "new", { wide: true }),
  c("composer-photos", "new", {
    routes: uploads("ok"),
    react: async (p) => {
      await withPhotos(p);
      await caretFirstEnd(p);
    },
  }),
  c("composer-uploading", "new", {
    routes: uploads("hang"),
    react: async (p) => {
      await typeFirst(p, EX1);
      await addPhoto(p);
    },
  }),
  c("composer-failed", "new", {
    routes: uploads("fail"),
    react: async (p) => {
      await typeFirst(p, EX1);
      await addPhoto(p);
      await p.waitForSelector("#composer .cmp-pill.is-failed");
      await p.focus("#composer [data-act=retry]");
    },
  }),
  c("composer-reorder", "new", {
    routes: uploads("ok"),
    react: async (p) => {
      await withPhotos(p);
      await p.focus("#composer [data-act=reorder]");
      await p.keyboard.press("Enter");
      await p.waitForSelector("#composer .cmp-rows");
    },
  }),
  c("composer-offline", "new", {
    react: async (p) => {
      await typeFirst(p, EX1);
      await p.context().setOffline(true);
      await p.waitForSelector("#composer #cmp-save-why:not([hidden])");
      await caretFirstEnd(p);
    },
  }),
  c("composer-edit", "n2", { wide: true }),
  c("composer-conflict", "n2", {
    routes: saves("conflict"),
    react: async (p) => {
      await p.locator(T).first().fill(`${N2} ${EX2}`);
      await p.keyboard.press("Control+Enter");
      await p.waitForSelector("#composer .cmp-banner");
    },
  }),
  c("composer-missing", "n2", {
    routes: saves("missing"),
    react: async (p) => {
      await p.locator(T).first().fill(`${N2} ${EX2}`);
      await p.keyboard.press("Control+Enter");
      await p.waitForSelector("#composer .cmp-banner");
    },
  }),
  c("composer-restored", "new", {
    routes: async (p) => {
      const draft = {
        v: 1,
        base: null,
        at: 1,
        blocks: [
          { type: "text", text: EX1 },
          { type: "image", image: asset("restored"), alt: "" },
          { type: "text", text: EX2 },
        ],
      };
      await p.addInitScript(
        (d) => localStorage.setItem("zamane.goals.noteDraft:wedding:new", d),
        JSON.stringify(draft),
      );
    },
  }),
];

visualSuite("goals-composer", "Goals composer", cases);
