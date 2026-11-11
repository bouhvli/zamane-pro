import type { Context } from "hono";
import { sql } from "drizzle-orm";
import { background } from "../background.ts";
import { db } from "../db/client.ts";
import { ApiError } from "../errors.ts";
import type { AppEnv } from "../types.ts";

export const RATE_LIMITED_MESSAGE = "Too many tries. Wait a minute, then try again.";
/** The counters are per minute, so a minute is the honest wait. */
export const RETRY_AFTER_SECONDS = 60;

/** Tries allowed per key per minute (§5). */
const LIMITS = {
  RL_AUTH: 10,
  RL_JOIN: 5,
  RL_UPLOAD: 30,
  RL_REALTIME: 20,
} as const;
type LimiterName = keyof typeof LIMITS;

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Fixed one-minute windows counted in Neon (`rate_limits`, D57). Every key must pass; keys are namespaced by
 * purpose, e.g. "signin:ip:…" and "signin:email:…", so a guess is limited both per address and per account.
 * Keys are stored hashed: no email or IP address is kept. One statement per check; old windows are swept now
 * and then in the background.
 */
export async function enforceRateLimit(_c: Context<AppEnv>, limiter: LimiterName, keys: string[]): Promise<void> {
  if (!keys.length) return;
  const hashed = await Promise.all(keys.map((k) => sha256Hex(`${limiter}:${k}`)));
  const r = await db().execute<{ count: number }>(sql`
    insert into rate_limits (key, window_start, count)
    select k, date_trunc('minute', now()), 1 from unnest(array[${sql.join(
      hashed.map((h) => sql`${h}`),
      sql`, `,
    )}]::text[]) as k
    on conflict (key, window_start) do update set count = rate_limits.count + 1
    returning count`);
  if (Math.random() < 0.02) {
    background(
      db()
        .execute(sql`delete from rate_limits where window_start < now() - interval '1 hour'`)
        .catch(() => {}),
    );
  }
  if (r.rows.some((row) => Number(row.count) > LIMITS[limiter])) {
    throw new ApiError(429, "rate_limited", RATE_LIMITED_MESSAGE, undefined, {
      "Retry-After": String(RETRY_AFTER_SECONDS),
    });
  }
}
