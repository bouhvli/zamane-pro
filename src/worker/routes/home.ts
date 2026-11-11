import { Hono } from "hono";
import { z } from "zod";
import { createEntrySchema } from "../../shared/schemas/home.ts";
import { requireSpace, session } from "../middleware/session.ts";
import { addEntry, deleteEntry } from "../services/entries.ts";
import { getHome } from "../services/home.ts";
import type { AppEnv } from "../types.ts";
import { validate } from "../validate.ts";

const goalParam = z.object({ goalId: z.uuid() });
const entryParam = z.object({ goalId: z.uuid(), entryId: z.uuid() });

/** GET /api/home. */
export const homeRoutes = new Hono<AppEnv>().get("/", session, requireSpace, async (c) => {
  c.header("Cache-Control", "no-store");
  return c.json(await getHome(c, c.get("space").spaceId));
});

/** Goal entries (the quick-add sheet and its Undo). The rest of /api/goals arrives with the Goals phase. */
export const goalRoutes = new Hono<AppEnv>()
  .post(
    "/:goalId/entries",
    session,
    requireSpace,
    validate("param", goalParam),
    validate("json", createEntrySchema),
    async (c) => {
      const { spaceId, userId } = c.get("space");
      const { goalId } = c.req.valid("param");
      const r = await addEntry(c, spaceId, goalId, userId, c.req.valid("json"));
      // Phase 5: broadcast(c, { type: "created", entity: "goal_entry", id, parentId: goalId, … }) after commit.
      return c.json(r.body, r.status);
    },
  )
  .delete("/:goalId/entries/:entryId", session, requireSpace, validate("param", entryParam), async (c) => {
    const { spaceId, userId } = c.get("space");
    const { goalId, entryId } = c.req.valid("param");
    await deleteEntry(c, spaceId, goalId, entryId, userId);
    return c.body(null, 204);
  });
