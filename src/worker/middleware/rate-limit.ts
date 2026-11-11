import type { Context } from "hono";
import { ApiError } from "../errors.ts";
import type { AppEnv } from "../types.ts";

export const RATE_LIMITED_MESSAGE = "Too many tries. Wait a minute, then try again.";
/** The bindings count per 60 s window, so a minute is the honest wait. */
export const RETRY_AFTER_SECONDS = 60;

type LimiterName = "RL_AUTH" | "RL_JOIN" | "RL_UPLOAD" | "RL_REALTIME";

/**
 * Workers Rate Limiting binding (D26). Every key must pass; keys are namespaced by purpose, e.g. "signin:ip:…" and
 * "signin:email:…", so a guess is limited both per address and per account.
 */
export async function enforceRateLimit(c: Context<AppEnv>, limiter: LimiterName, keys: string[]): Promise<void> {
  const binding = c.env[limiter];
  for (const key of keys) {
    const { success } = await binding.limit({ key });
    if (!success) {
      throw new ApiError(429, "rate_limited", RATE_LIMITED_MESSAGE, undefined, {
        "Retry-After": String(RETRY_AFTER_SECONDS),
      });
    }
  }
}
