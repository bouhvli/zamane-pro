import { Hono } from "hono";
import { requireSpace, session } from "../middleware/session.ts";
import { getHome } from "../services/home.ts";
import type { AppEnv } from "../types.ts";

/** GET /api/home. */
export const homeRoutes = new Hono<AppEnv>().get("/", session, requireSpace, async (c) => {
  c.header("Cache-Control", "no-store");
  return c.json(await getHome(c, c.get("space").spaceId));
});
