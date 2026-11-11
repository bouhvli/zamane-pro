/**
 * Visual comparison: a goal (.ux-forge/goals/goals.html#/goals/:id, ?state= fixtures from detail.js) next to the
 * app's /goals/:id with the same example data mocked and the clock fixed to the prototype's "today".
 * Dialogs and toasts are driven by keyboard in the app, as the prototype's fixtures focus programmatically.
 * Writes tests/visual/report/goals-detail/.
 */
import type { Page } from "@playwright/test";
import { type Case, visualSuite } from "./goals-harness.ts";

const READY = ".gd-title";

const key = async (p: Page, sel: string) => {
  await p.focus(sel);
  await p.keyboard.press("Enter");
};
const openRow = async (p: Page) => {
  await p.waitForSelector(".gd-row", { timeout: 15_000 });
  await key(p, ".gd-row");
  await p.waitForSelector("#gd-entry[open]", { timeout: 15_000 });
  // Focusing the row scrolled it into view; the prototype's fixture opens the sheet at the top.
  await top(p);
};
const top = (p: Page) => p.evaluate(() => window.scrollTo(0, 0));
const quickAdd = async (p: Page, value: string) => {
  await key(p, "#primary");
  await p.waitForSelector("#qa-sheet[open] #amt", { timeout: 15_000 });
  await p.fill("#amt", value);
  await p.press("#amt", "Enter");
  await p.waitForSelector("#toast:not([hidden])", { timeout: 15_000 });
};
const goOffline = async (p: Page) => {
  await p.waitForSelector(".gd-row", { timeout: 15_000 });
  await p.context().setOffline(true);
  await p.waitForSelector(".gd-notice .notice", { timeout: 15_000 });
};

const page = (id: string, goal: string, state = "populated", extra: Partial<Case> = {}): Case => ({
  id,
  proto: `?state=${state}#/goals/${goal}`,
  state,
  path: `/goals/${goal}`,
  wide: true,
  ready: READY,
  react: (p) => p.waitForSelector(".gd-row, .gd-empty", { timeout: 15_000 }).then(() => undefined),
  ...extra,
});

const cases: Case[] = [
  page("wedding", "wedding"),
  page("guest-room", "guest-room"),
  page("sofa-done", "sofa"),
  page("honeymoon-empty", "honeymoon"),
  page("solo", "wedding", "solo"),
  page("uploads-off", "wedding", "uploads-off"),
  {
    ...page("journal", "wedding", "journal"),
    path: "/goals/wedding?view=journal",
    react: (p) => p.waitForSelector(".gd-note", { timeout: 15_000 }).then(() => undefined),
  },
  {
    ...page("stats-open", "wedding", "stats-open"),
    // The disclosure remembers its state on the device (zamane.goals.statsOpen).
    routes: async (p) => {
      await p.addInitScript(() => localStorage.setItem("zamane.goals.statsOpen", "1"));
    },
  },
  { ...page("offline", "wedding", "offline"), react: goOffline },
  {
    ...page("partial", "wedding", "partial"),
    routes: async (p) => {
      await p.route(/\/api\/goals\/wedding\/(entries|notes|stats)$/, () => new Promise<void>(() => {}));
    },
    react: undefined,
  },
  { ...page("loading", "wedding", "loading"), server: { listHangs: true }, ready: "#main h1", react: undefined },
  { ...page("error", "wedding", "error"), server: { listFails: true }, ready: ".gd-state h1", react: undefined },
  {
    ...page("not-found", "nope", "not-found"),
    proto: "?state=not-found#/goals/nope",
    ready: ".gd-state h1",
    react: undefined,
  },
  // Dialogs and toasts: phones only.
  { ...page("entry-sheet", "wedding", "entry-sheet"), wide: false, react: openRow },
  {
    ...page("confirm-delete", "wedding", "confirm-delete"),
    wide: false,
    react: async (p) => {
      await openRow(p);
      await key(p, "#gd-entry-delete");
      await p.waitForSelector("#confirm[open]", { timeout: 15_000 });
    },
  },
  {
    ...page("quick-add", "wedding"),
    wide: false,
    protoAct: async (p) => {
      await key(p, "#primary");
      await p.waitForSelector("#sheet[open]", { timeout: 15_000 });
    },
    react: async (p) => {
      await key(p, "#primary");
      await p.waitForSelector("#qa-sheet[open] #amt", { timeout: 15_000 });
    },
  },
  { ...page("toast-added", "wedding", "toast-added"), wide: false, react: (p) => quickAdd(p, "500") },
  { ...page("toast-completed", "wedding", "toast-completed"), wide: false, react: (p) => quickAdd(p, "5750") },
  {
    ...page("toast-queued", "wedding", "toast-queued"),
    wide: false,
    react: async (p) => {
      await goOffline(p);
      await quickAdd(p, "500");
    },
  },
  {
    ...page("toast-deleted", "wedding", "toast-deleted"),
    wide: false,
    // The delete really removes the entry, so the refetch after it agrees (the shared mock only answers 204).
    routes: async (p, s) => {
      await p.route(/\/api\/goals\/[^/]+\/entries\/[^/]+$/, async (r) => {
        if (r.request().method() !== "DELETE") return r.fallback();
        const id = new URL(r.request().url()).pathname.split("/").pop();
        const i = s.entries.findIndex((e) => e.id === id);
        if (i > -1) s.entries.splice(i, 1);
        await r.fulfill({ status: 204 });
      });
    },
    react: async (p) => {
      await openRow(p);
      await key(p, "#gd-entry-delete");
      await p.waitForSelector("#confirm[open]", { timeout: 15_000 });
      await key(p, "#confirm-ok");
      await p.waitForSelector("#toast:not([hidden])", { timeout: 15_000 });
      await top(p);
    },
  },
  {
    ...page("photo-viewer", "wedding", "journal"),
    path: "/goals/wedding?view=journal",
    wide: false,
    protoAct: async (p) => {
      await key(p, ".gd-photo");
      await p.waitForSelector("#gd-viewer[open]", { timeout: 15_000 });
    },
    react: async (p) => {
      await p.waitForSelector(".gd-photo", { timeout: 15_000 });
      await key(p, ".gd-photo");
      await p.waitForSelector("#gd-viewer[open]", { timeout: 15_000 });
    },
  },
];

visualSuite("goals-detail", "Goal detail", cases);
