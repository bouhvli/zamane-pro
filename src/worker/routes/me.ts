import { and, eq, gt } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { updateMeSchema } from "../../shared/schemas/auth.ts";
import { db } from "../db/client.ts";
import { verification } from "../db/schema.ts";
import { ApiError } from "../errors.ts";
import { clientIp } from "../middleware/core.ts";
import { enforceRateLimit } from "../middleware/rate-limit.ts";
import { session } from "../middleware/session.ts";
import { getMe, updateDisplayName } from "../services/spaces.ts";
import type { AppEnv } from "../types.ts";
import { validate } from "../validate.ts";

/** GET /api/me decides where the app goes (Home or setup); PATCH /api/me changes the display name. */
export const meRoutes = new Hono<AppEnv>()
  .get("/", session, async (c) => {
    const me = await getMe(c, c.get("user").id);
    if (!me) throw new ApiError(401, "unauthenticated", "Sign in to carry on.");
    c.header("Cache-Control", "no-store");
    return c.json(me);
  })
  .patch("/", session, validate("json", updateMeSchema), async (c) => {
    const { displayName } = c.req.valid("json");
    await updateDisplayName(c, c.get("user").id, displayName);
    const me = await getMe(c, c.get("user").id);
    return c.json(me);
  });

/**
 * GET /api/password-reset/check?token= → { valid }. Lets the reset screen show "Link doesn't work" on arrival.
 * Expired and already-used tokens are indistinguishable: both are { valid: false }.
 */
export const passwordResetRoutes = new Hono<AppEnv>().get(
  "/check",
  validate("query", z.object({ token: z.string().min(1).max(200) })),
  async (c) => {
    await enforceRateLimit(c, "RL_AUTH", [`reset-check:ip:${clientIp(c)}`]);
    const { token } = c.req.valid("query");
    const [row] = await db(c)
      .select({ id: verification.id })
      .from(verification)
      .where(and(eq(verification.identifier, `reset-password:${token}`), gt(verification.expiresAt, new Date())))
      .limit(1);
    c.header("Cache-Control", "no-store");
    return c.json({ valid: !!row });
  },
);
