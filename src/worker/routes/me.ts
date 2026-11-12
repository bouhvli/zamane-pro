import { and, eq, gt } from "drizzle-orm";
import { APIError } from "better-auth/api";
import { Hono, type Context } from "hono";
import { z } from "zod";
import { changeEmailSchema, deleteAccountSchema, updateMeSchema } from "../../shared/schemas/auth.ts";
import { db } from "../db/client.ts";
import { verification } from "../db/schema.ts";
import { ApiError } from "../errors.ts";
import { clientIp } from "../middleware/core.ts";
import { enforceRateLimit } from "../middleware/rate-limit.ts";
import { requireSpace, session } from "../middleware/session.ts";
import { deleteAccount } from "../services/account.ts";
import { destroyLater } from "../services/cloudinary.ts";
import { exportData } from "../services/export.ts";
import { getMe, updateDisplayName } from "../services/spaces.ts";
import type { AppEnv } from "../types.ts";
import { validate } from "../validate.ts";

const WRONG_PASSWORD = "That password isn't right.";

/** Checks the caller's current password through Better Auth. A wrong one is the form's field error. */
async function confirmPassword(c: Context<AppEnv>, password: string): Promise<void> {
  try {
    await c.get("auth").api.verifyPassword({ body: { password }, headers: c.req.raw.headers });
  } catch (e) {
    if (e instanceof APIError && e.statusCode === 400)
      throw new ApiError(400, "validation_failed", "Check the highlighted fields.", { password: WRONG_PASSWORD });
    throw e;
  }
}

/** The date in the space's time zone, as YYYY-MM-DD (the export's file name). */
function today(timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** GET /api/me decides where the app goes (Home or setup); PATCH changes the display name; the rest is the account. */
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
  })
  // D69: a JSON download of everything in the caller's space.
  .get("/export", session, requireSpace, async (c) => {
    const { userId, spaceId, timezone } = c.get("space");
    await enforceRateLimit(c, "RL_AUTH", [`export:user:${userId}`]);
    const data = await exportData(c, userId, spaceId, c.get("config").CLOUDINARY_CLOUD_NAME);
    return c.body(JSON.stringify(data, null, 2), 200, {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="zamane-export-${today(timezone)}.json"`,
      "Cache-Control": "no-store",
    });
  })
  // D70: the new address gets a confirmation link; the account keeps its email until it is opened. An address that
  // already has an account answers exactly like a free one (Better Auth sends nothing and says nothing).
  .post("/email", session, validate("json", changeEmailSchema), async (c) => {
    const { id } = c.get("user");
    const { newEmail, password } = c.req.valid("json");
    await enforceRateLimit(c, "RL_AUTH", [`change-email:user:${id}`, `change-email:ip:${clientIp(c)}`]);
    await confirmPassword(c, password);
    try {
      await c.get("auth").api.changeEmail({
        body: { newEmail, callbackURL: "/profile?email=updated" },
        headers: c.req.raw.headers,
      });
    } catch (e) {
      if (e instanceof APIError && e.statusCode === 400)
        throw new ApiError(400, "validation_failed", "Check the highlighted fields.", {
          newEmail: "That's already your email address.",
        });
      throw e;
    }
    return c.json({ requested: true });
  })
  // D68: deletes the account (and the space too when the person is its last member). 204, session cookie cleared.
  .delete("/", session, validate("json", deleteAccountSchema), async (c) => {
    const { id } = c.get("user");
    const { password } = c.req.valid("json");
    await enforceRateLimit(c, "RL_AUTH", [`delete-account:user:${id}`, `delete-account:ip:${clientIp(c)}`]);
    await confirmPassword(c, password);
    const r = await deleteAccount(c, id);
    destroyLater(c.get("config"), r.assets);
    // The session row is gone; this only produces the Set-Cookie headers that clear the cookies.
    const out = await c.get("auth").api.signOut({ headers: c.req.raw.headers, asResponse: true });
    for (const cookie of out.headers.getSetCookie()) c.header("Set-Cookie", cookie, { append: true });
    c.header("Cache-Control", "no-store");
    return c.body(null, 204);
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
