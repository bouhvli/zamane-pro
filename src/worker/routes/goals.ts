import { Hono } from "hono";
import { z } from "zod";
import { createEntrySchema } from "../../shared/schemas/home.ts";
import {
  createGoalSchema,
  createNoteSchema,
  signUploadSchema,
  updateGoalSchema,
  updateNoteSchema,
} from "../../shared/schemas/goals.ts";
import { errorBody } from "../middleware/core.ts";
import { enforceRateLimit } from "../middleware/rate-limit.ts";
import { requireSpace, session } from "../middleware/session.ts";
import { destroyLater, signUpload } from "../services/cloudinary.ts";
import { addEntry, deleteEntry } from "../services/entries.ts";
import {
  createGoal,
  createNote,
  deleteGoal,
  deleteNote,
  getGoal,
  goalStats,
  listEntries,
  listGoals,
  listNotes,
  updateGoal,
  updateNote,
} from "../services/goals.ts";
import type { AppEnv } from "../types.ts";
import { validate } from "../validate.ts";
import { notFound } from "../errors.ts";

const goalParam = z.object({ goalId: z.uuid() });
const entryParam = z.object({ goalId: z.uuid(), entryId: z.uuid() });
const noteParam = z.object({ goalId: z.uuid(), noteId: z.uuid() });

const CONFLICT_MESSAGE = "Your partner changed this while you were editing.";

/** /api/goals (§5). Phase 5 broadcasts each write after commit. */
export const goalRoutes = new Hono<AppEnv>()
  .use("*", session, requireSpace)
  .get("/", async (c) => {
    c.header("Cache-Control", "no-store");
    const config = c.get("config");
    const images = config.uploadsEnabled ? { cloudName: config.CLOUDINARY_CLOUD_NAME } : null;
    return c.json({ ...(await listGoals(c, c.get("space").spaceId)), images });
  })
  .post("/", validate("json", createGoalSchema), async (c) => {
    const { spaceId, userId } = c.get("space");
    const r = await createGoal(c, spaceId, userId, c.req.valid("json"));
    return c.json({ goal: r.goal }, r.status);
  })
  .get("/:goalId", validate("param", goalParam), async (c) => {
    const goal = await getGoal(c, c.get("space").spaceId, c.req.valid("param").goalId);
    if (!goal) throw notFound();
    c.header("Cache-Control", "no-store");
    return c.json({ goal });
  })
  .patch("/:goalId", validate("param", goalParam), validate("json", updateGoalSchema), async (c) => {
    const { spaceId, userId } = c.get("space");
    const r = await updateGoal(c, spaceId, userId, c.req.valid("param").goalId, c.req.valid("json"));
    if (r.kind === "not_found") throw notFound();
    if (r.kind === "conflict") return c.json({ ...errorBody("conflict", CONFLICT_MESSAGE), current: r.current }, 409);
    if (r.oldCover) destroyLater(c, c.get("config"), [r.oldCover]);
    return c.json({ goal: r.goal, completed: r.completed, reopened: r.reopened });
  })
  .delete("/:goalId", validate("param", goalParam), async (c) => {
    const ids = await deleteGoal(c, c.get("space").spaceId, c.req.valid("param").goalId);
    if (ids) destroyLater(c, c.get("config"), ids);
    return c.body(null, 204);
  })
  .get("/:goalId/stats", validate("param", goalParam), async (c) => {
    c.header("Cache-Control", "no-store");
    return c.json(await goalStats(c, c.get("space").spaceId, c.req.valid("param").goalId));
  })
  .get("/:goalId/entries", validate("param", goalParam), async (c) => {
    c.header("Cache-Control", "no-store");
    return c.json({ entries: await listEntries(c, c.get("space").spaceId, c.req.valid("param").goalId) });
  })
  .post("/:goalId/entries", validate("param", goalParam), validate("json", createEntrySchema), async (c) => {
    const { spaceId, userId } = c.get("space");
    const r = await addEntry(c, spaceId, c.req.valid("param").goalId, userId, c.req.valid("json"));
    return c.json(r.body, r.status);
  })
  .delete("/:goalId/entries/:entryId", validate("param", entryParam), async (c) => {
    const { spaceId, userId } = c.get("space");
    const { goalId, entryId } = c.req.valid("param");
    await deleteEntry(c, spaceId, goalId, entryId, userId);
    return c.body(null, 204);
  })
  .get("/:goalId/notes", validate("param", goalParam), async (c) => {
    c.header("Cache-Control", "no-store");
    return c.json({ notes: await listNotes(c, c.get("space").spaceId, c.req.valid("param").goalId) });
  })
  .post("/:goalId/notes", validate("param", goalParam), validate("json", createNoteSchema), async (c) => {
    const { spaceId, userId } = c.get("space");
    const r = await createNote(c, spaceId, c.req.valid("param").goalId, userId, c.req.valid("json"));
    return c.json({ note: r.note }, r.status);
  })
  .put("/:goalId/notes/:noteId", validate("param", noteParam), validate("json", updateNoteSchema), async (c) => {
    const { spaceId, userId } = c.get("space");
    const { goalId, noteId } = c.req.valid("param");
    const r = await updateNote(c, spaceId, goalId, noteId, userId, c.req.valid("json"));
    if (r.kind === "not_found") throw notFound();
    if (r.kind === "forbidden")
      return c.json(errorBody("forbidden", "Only the person who wrote a note can edit it."), 403);
    if (r.kind === "conflict") return c.json({ ...errorBody("conflict", CONFLICT_MESSAGE), current: r.current }, 409);
    destroyLater(c, c.get("config"), r.removedImages);
    return c.json({ note: r.note });
  })
  .delete("/:goalId/notes/:noteId", validate("param", noteParam), async (c) => {
    const { spaceId, userId } = c.get("space");
    const { goalId, noteId } = c.req.valid("param");
    destroyLater(c, c.get("config"), await deleteNote(c, spaceId, goalId, noteId, userId));
    return c.body(null, 204);
  });

/** POST /api/uploads/sign (§8): a signature for one upload into this space's folder. 30 a minute per person. */
export const uploadRoutes = new Hono<AppEnv>().post(
  "/sign",
  session,
  requireSpace,
  validate("json", signUploadSchema),
  async (c) => {
    const { spaceId, userId } = c.get("space");
    await enforceRateLimit(c, "RL_UPLOAD", [`upload:user:${userId}`]);
    c.header("Cache-Control", "no-store");
    return c.json(await signUpload(c.get("config"), spaceId, c.req.valid("json").purpose));
  },
);
