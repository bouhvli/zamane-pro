import type { Context, ErrorHandler, MiddlewareHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { createAuth } from "../auth.ts";
import { EnvError, serverConfig } from "../env.ts";
import { ApiError, pgError } from "../errors.ts";
import type { AppEnv } from "../types.ts";

/** requestId: Vercel's x-vercel-id when present, else random. Echoed as x-request-id. */
export const requestId: MiddlewareHandler<AppEnv> = async (c, next) => {
  const id = c.req.header("x-vercel-id") ?? crypto.randomUUID();
  c.set("requestId", id);
  await next();
  c.header("x-request-id", id);
};

/** Parses the configuration (once per instance) and builds the per-request Better Auth instance. */
export const configure: MiddlewareHandler<AppEnv> = async (c, next) => {
  const config = serverConfig();
  c.set("config", config);
  c.set("auth", createAuth(config));
  await next();
};

export function errorBody(code: string, message: string, fields?: Record<string, string>) {
  return { error: fields ? { code, message, fields } : { code, message } };
}

/** Handled errors keep their status and code; anything else is 500 internal, logged with the request id only. */
export const onError: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof ApiError) {
    if (err.headers) for (const [k, v] of Object.entries(err.headers)) c.header(k, v);
    return c.json(errorBody(err.code, err.message, err.fields), err.status);
  }
  if (err instanceof HTTPException && err.status < 500) {
    const code = err.status === 413 ? "payload_too_large" : err.status === 401 ? "unauthenticated" : "bad_request";
    return c.json(errorBody(code, err.message || "Bad request."), err.status);
  }
  // Never log the message of a database error: Drizzle puts the query and its parameters in it.
  const pg = pgError(err);
  // EnvError messages name the missing or invalid keys, never their values.
  const what = pg
    ? `postgres ${pg.code}${pg.constraint ? ` (${pg.constraint})` : ""}`
    : err instanceof EnvError
      ? err.message
      : err.name;
  console.error(`[${c.get("requestId") ?? "-"}] ${c.req.method} ${new URL(c.req.url).pathname} failed: ${what}`);
  return c.json(errorBody("internal", "Something went wrong on our side. Try again in a moment."), 500);
};

export const notFoundHandler: NotFoundHandler<AppEnv> = (c) => c.json(errorBody("not_found", "Not found."), 404);

/**
 * Same-origin JSON only for state-changing calls outside /api/auth (§6): a cross-site form post loses on the
 * content type, and a cross-site fetch on the Origin check.
 */
export const sameOriginJson: MiddlewareHandler<AppEnv> = async (c, next) => {
  const m = c.req.method;
  if (m === "POST" || m === "PUT" || m === "PATCH" || m === "DELETE") {
    const origin = c.req.header("origin");
    if (origin && origin !== new URL(c.get("config").APP_URL).origin) {
      throw new ApiError(403, "unauthenticated", "Cross-origin requests aren't allowed.");
    }
    const len = c.req.header("content-length");
    const hasBody = m !== "DELETE" || (len !== undefined && len !== "0");
    if (hasBody && !/^application\/json\b/i.test(c.req.header("content-type") ?? "")) {
      throw new ApiError(415, "validation_failed", "Send JSON.");
    }
  }
  await next();
};

/** The caller's IP: Vercel sets x-real-ip (and overwrites any value a client sends). Locally there is none. */
export function clientIp(c: Context): string {
  return c.req.header("x-real-ip") ?? "local";
}
