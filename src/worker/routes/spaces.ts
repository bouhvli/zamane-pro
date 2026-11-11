import { Hono } from "hono";
import { createSpaceSchema, joinSpaceSchema } from "../../shared/schemas/spaces.ts";
import { ApiError } from "../errors.ts";
import { clientIp } from "../middleware/core.ts";
import { enforceRateLimit } from "../middleware/rate-limit.ts";
import { requireSpace, session } from "../middleware/session.ts";
import {
  createSpace,
  getMySpace,
  joinSpace,
  rotateInviteCode,
  soloSummary,
  switchAndJoin,
} from "../services/spaces.ts";
import type { AppEnv } from "../types.ts";
import { validate } from "../validate.ts";

/** Spaces (§5). Create and join work without a space; everything under /mine needs one. */
export const spaceRoutes = new Hono<AppEnv>()
  .post("/", session, validate("json", createSpaceSchema), async (c) => {
    const r = await createSpace(c, c.get("user").id, c.req.valid("json"));
    return c.json({ space: r.space }, r.status);
  })
  .post(
    "/join",
    session,
    async (c, next) => {
      const user = c.get("user");
      await enforceRateLimit(c, "RL_JOIN", [`join:user:${user.id}`, `join:ip:${clientIp(c)}`]);
      await next();
    },
    validate("json", joinSpaceSchema),
    async (c) => {
      const { code, replaceSolo } = c.req.valid("json");
      const userId = c.get("user").id;
      const r = replaceSolo ? await switchAndJoin(c, userId, code) : await joinSpace(c, userId, code);
      return c.json(r);
    },
  )
  .get("/mine", session, requireSpace, async (c) => {
    const { spaceId, userId } = c.get("space");
    c.header("Cache-Control", "no-store");
    return c.json({ space: await getMySpace(c, spaceId, userId) });
  })
  .get("/mine/summary", session, requireSpace, async (c) => {
    return c.json(await soloSummary(c, c.get("space").spaceId));
  })
  .post("/mine/invite-code", session, requireSpace, async (c) => {
    return c.json({ inviteCode: await rotateInviteCode(c, c.get("space").spaceId) });
  })
  .post("/mine/leave", session, requireSpace, () => {
    // D19: leaving raises product questions that aren't decided yet.
    throw new ApiError(501, "not_implemented", "Leaving a space isn't available yet.");
  });
