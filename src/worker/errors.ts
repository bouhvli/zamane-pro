import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ErrorCode } from "../shared/errors.ts";

/** A handled error: becomes { error: { code, message, fields? } } with its status (§3). */
export class ApiError extends Error {
  override name = "ApiError";
  constructor(
    readonly status: ContentfulStatusCode,
    readonly code: ErrorCode,
    message: string,
    readonly fields?: Record<string, string>,
    readonly headers?: Record<string, string>,
  ) {
    super(message);
  }
}

export const notFound = () => new ApiError(404, "not_found", "Not found.");

/** Postgres error details, looked up through Drizzle's wrapper. Never includes the query or its parameters. */
export function pgError(err: unknown): { code: string; constraint: string } | null {
  let e: unknown = err;
  for (let i = 0; i < 4 && e; i++) {
    if (typeof e === "object" && e !== null && "code" in e && typeof (e as { code: unknown }).code === "string") {
      const code = (e as { code: string }).code;
      if (/^[0-9A-Z]{5}$/.test(code)) {
        return { code, constraint: String((e as { constraint?: unknown }).constraint ?? "") };
      }
    }
    e = typeof e === "object" && e !== null && "cause" in e ? (e as { cause: unknown }).cause : null;
  }
  return null;
}

export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  const p = pgError(err);
  return !!p && p.code === "23505" && (!constraint || p.constraint === constraint);
}
