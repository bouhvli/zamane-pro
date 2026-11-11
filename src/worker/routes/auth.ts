import { Hono, type Context } from "hono";
import type { z } from "zod";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  newPasswordSchema,
  signInSchema,
  signUpSchema,
} from "../../shared/schemas/auth.ts";
import { ApiError } from "../errors.ts";
import { clientIp, errorBody } from "../middleware/core.ts";
import { enforceRateLimit } from "../middleware/rate-limit.ts";
import type { AppEnv } from "../types.ts";

/**
 * /api/auth/* → Better Auth (§6), behind a gate:
 * - only the endpoints the app uses are reachable;
 * - bodies are validated with the same Zod schemas as the forms, and the email is normalised;
 * - the rate-limit binding runs before the handler (D26);
 * - change-password always revokes the other sessions;
 * - Better Auth's errors are translated into the app's { error: { code, message, fields? } } shape.
 */
type Gate = {
  limit?: (c: Context<AppEnv>, body: Record<string, unknown>) => string[];
  validate?: (body: Record<string, unknown>) => Record<string, unknown>;
};

function fieldErrors(error: z.ZodError, rename: Record<string, string> = {}): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const i of error.issues) {
    const key = String(i.path[0] ?? "");
    const name = rename[key] ?? key;
    if (name && !fields[name]) fields[name] = i.message;
  }
  return fields;
}

function check<S extends z.ZodType>(schema: S, value: unknown, rename?: Record<string, string>): z.output<S> {
  const r = schema.safeParse(value);
  if (!r.success)
    throw new ApiError(400, "validation_failed", "Check the highlighted fields.", fieldErrors(r.error, rename));
  return r.data;
}

const ip = (c: Context<AppEnv>, purpose: string) => `${purpose}:ip:${clientIp(c)}`;
const email = (purpose: string, body: Record<string, unknown>) =>
  `${purpose}:email:${String(body.email ?? "")
    .trim()
    .toLowerCase()}`;

const GATES: Record<string, Gate> = {
  "POST /sign-up/email": {
    validate: (b) => ({ ...b, ...check(signUpSchema, b) }),
    limit: (c, b) => [ip(c, "signup"), email("signup", b)],
  },
  "POST /sign-in/email": {
    validate: (b) => ({ ...b, ...check(signInSchema, b) }),
    limit: (c, b) => [ip(c, "signin"), email("signin", b)],
  },
  "POST /sign-out": {},
  "GET /get-session": {},
  "POST /request-password-reset": {
    validate: (b) => ({ email: check(forgotPasswordSchema, b).email }),
    limit: (c, b) => [ip(c, "reset"), email("reset", b)],
  },
  "POST /reset-password": {
    validate: (b) => {
      const password = check(newPasswordSchema, b.newPassword, { "": "password" });
      const token = typeof b.token === "string" ? b.token : "";
      if (!token) throw new ApiError(400, "invalid_token", "This link doesn't work any more.");
      return { newPassword: password, token };
    },
    limit: (c) => [ip(c, "reset")],
  },
  "POST /change-password": {
    validate: (b) => ({ ...check(changePasswordSchema, b), revokeOtherSessions: true }),
    limit: (c) => [ip(c, "change-password")],
  },
};

/** Better Auth error code → the app's error. */
function translate(
  status: number,
  code: string,
  message: string,
): { status: number; body: ReturnType<typeof errorBody> } {
  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return { status: 401, body: errorBody("invalid_credentials", "That email and password don't match.") };
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return {
        status: 422,
        body: errorBody("email_taken", "That email already has an account.", {
          email: "That email already has an account.",
        }),
      };
    case "INVALID_TOKEN":
      return { status: 400, body: errorBody("invalid_token", "This link doesn't work any more.") };
    case "PASSWORD_TOO_SHORT":
      return {
        status: 400,
        body: errorBody("validation_failed", "Check the highlighted fields.", {
          password: "Use at least 10 characters.",
        }),
      };
    case "PASSWORD_TOO_LONG":
      return {
        status: 400,
        body: errorBody("validation_failed", "Check the highlighted fields.", {
          password: "Use 128 characters or fewer.",
        }),
      };
    case "INVALID_PASSWORD":
      return {
        status: 400,
        body: errorBody("validation_failed", "Check the highlighted fields.", {
          currentPassword: "That password isn't right.",
        }),
      };
    default:
      if (status === 401) return { status, body: errorBody("unauthenticated", "Sign in to carry on.") };
      return { status, body: errorBody(code ? code.toLowerCase() : "bad_request", message || "Bad request.") };
  }
}

export const authRoutes = new Hono<AppEnv>().on(["GET", "POST"], "/*", async (c) => {
  const path = new URL(c.req.url).pathname.replace(/^\/api\/auth/, "");
  const gate = GATES[`${c.req.method} ${path}`];
  if (!gate) return c.json(errorBody("not_found", "Not found."), 404);

  let request = c.req.raw;
  if (c.req.method === "POST" && (gate.validate || gate.limit)) {
    let body: Record<string, unknown> = {};
    try {
      const parsed: unknown = await c.req.raw.clone().json();
      if (parsed && typeof parsed === "object") body = parsed as Record<string, unknown>;
    } catch {
      throw new ApiError(400, "validation_failed", "Send JSON.");
    }
    if (gate.limit) await enforceRateLimit(c, "RL_AUTH", gate.limit(c, body));
    if (gate.validate) {
      const next = gate.validate(body);
      const headers = new Headers(c.req.raw.headers);
      headers.delete("content-length");
      request = new Request(c.req.raw.url, { method: "POST", headers, body: JSON.stringify(next) });
    }
  }

  const res = await c.get("auth").handler(request);
  if (res.ok || res.status < 400) return res;

  let code = "";
  let message = "";
  try {
    const j = (await res.clone().json()) as { code?: unknown; message?: unknown };
    code = typeof j.code === "string" ? j.code : "";
    message = typeof j.message === "string" ? j.message : "";
  } catch {
    /* not JSON */
  }
  const t = translate(res.status, code, message);
  const headers = new Headers(res.headers);
  headers.set("content-type", "application/json");
  headers.delete("content-length");
  return new Response(JSON.stringify(t.body), { status: t.status, headers });
});
