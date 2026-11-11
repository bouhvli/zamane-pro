import { eq } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";
import { db } from "../db/client.ts";
import { spaceMembers, spaces } from "../db/schema.ts";
import { ApiError } from "../errors.ts";
import type { AppEnv } from "../types.ts";

/** Resolves the Better Auth session once (cookie cache first) and sets c.var.user. */
export const session: MiddlewareHandler<AppEnv> = async (c, next) => {
  const s = await c.get("auth").api.getSession({ headers: c.req.raw.headers });
  if (!s) throw new ApiError(401, "unauthenticated", "Sign in to carry on.");
  c.set("user", { id: s.user.id, email: s.user.email, name: s.user.name });
  c.set("sessionId", s.session.id);
  await next();
};

/** One query: the caller's membership and space. A user without a space gets 403 no_space. */
export const requireSpace: MiddlewareHandler<AppEnv> = async (c, next) => {
  const userId = c.get("user").id;
  const [row] = await db(c)
    .select({
      spaceId: spaces.id,
      slot: spaceMembers.slot,
      currency: spaces.currency,
      timezone: spaces.timezone,
    })
    .from(spaceMembers)
    .innerJoin(spaces, eq(spaces.id, spaceMembers.spaceId))
    .where(eq(spaceMembers.userId, userId))
    .limit(1);
  if (!row) throw new ApiError(403, "no_space", "Set up your space first.");
  c.set("space", { ...row, userId });
  await next();
};
