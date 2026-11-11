/**
 * TEST ONLY. Mounted only when the Worker was built with __E2E__ (a dev server started with E2E=1) AND
 * APP_ENV=development. A production build never contains this module: see tests/unit/no-test-routes.test.ts.
 */
import { Hono } from "hono";
import { devOutbox } from "../services/email.ts";
import type { AppEnv } from "../types.ts";

export const testOnlyRoutes = new Hono<AppEnv>().get("/last-reset-link", (c) => {
  const email = (c.req.query("email") ?? "").trim().toLowerCase();
  const link = devOutbox.get(email);
  return link ? c.json({ link }) : c.json({ error: { code: "not_found", message: "No email yet." } }, 404);
});
