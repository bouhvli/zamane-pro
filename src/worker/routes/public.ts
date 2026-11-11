import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { db } from "../db/client.ts";
import { pgError } from "../errors.ts";
import type { AppEnv } from "../types.ts";

/** GET /api/health (a database round trip; never shows the URL) · GET /api/config. */
export const publicRoutes = new Hono<AppEnv>()
  .get("/health", async (c) => {
    const started = Date.now();
    try {
      await db(c).execute(sql`select 1`);
      return c.json({ ok: true, db: "ok", ms: Date.now() - started });
    } catch (err) {
      const pg = pgError(err);
      console.error(`[${c.get("requestId")}] health: database unreachable${pg ? ` (postgres ${pg.code})` : ""}`);
      return c.json({ ok: false, db: "unreachable" }, 503);
    }
  })
  .get("/config", (c) => {
    const config = c.get("config");
    return c.json({ uploadsEnabled: config.uploadsEnabled, cloudinaryCloudName: config.CLOUDINARY_CLOUD_NAME || null });
  });
