import { Hono } from "hono";
import { createSpaceSchema, joinSpaceSchema, renameSpaceSchema } from "../../shared/schemas/spaces.ts";
import { clientIp } from "../middleware/core.ts";
import { enforceRateLimit } from "../middleware/rate-limit.ts";
import { requireSpace, session } from "../middleware/session.ts";
import { leaveSpace } from "../services/account.ts";
import { destroyLater } from "../services/cloudinary.ts";
import {
  createSpace,
  getMySpace,
  joinSpace,
  renameSpace,
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
  // D68: any member may rename. Currency and time zone are fixed when the space is created.
  .patch("/mine", session, requireSpace, validate("json", renameSpaceSchema), async (c) => {
    const { spaceId, userId } = c.get("space");
    await renameSpace(c, spaceId, c.req.valid("json").name);
    return c.json({ space: await getMySpace(c, spaceId, userId) });
  })
  .get("/mine/summary", session, requireSpace, async (c) => {
    return c.json(await soloSummary(c, c.get("space").spaceId));
  })
  .post("/mine/invite-code", session, requireSpace, async (c) => {
    return c.json({ inviteCode: await rotateInviteCode(c, c.get("space").spaceId) });
  })
  // D67 (replaces D19's 501): leaves only the caller's membership; the last member leaving deletes the space.
  // Session only, not requireSpace: a retry after the first call went through answers 200 { left: false }.
  .post("/mine/leave", session, async (c) => {
    const { assets, ...res } = await leaveSpace(c, c.get("user").id);
    destroyLater(c.get("config"), assets);
    return c.json(res);
  });
