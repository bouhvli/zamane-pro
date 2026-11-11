import { isApiErrorBody } from "../../shared/errors.ts";

/** A failed API call with the server's { error: { code, message, fields? } }. */
export class ApiRequestError extends Error {
  override name = "ApiRequestError";
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields: Record<string, string> = {},
    /** Seconds, from Retry-After on a 429. */
    readonly retryAfter: number | null = null,
  ) {
    super(message);
  }
}

/** The request never got an answer (offline, DNS, dropped connection). */
export class NetworkError extends Error {
  override name = "NetworkError";
}

type Json = Record<string, unknown> | unknown[];

/** Called on any 401 outside the auth endpoints: the session was revoked or expired mid-session. */
let onUnauthenticated: (() => void) | null = null;
export function setUnauthenticatedHandler(fn: () => void) {
  onUnauthenticated = fn;
}

export async function api<T>(
  path: string,
  init: { method?: string; body?: Json; signal?: AbortSignal } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method ?? (init.body ? "POST" : "GET"),
      headers: init.body ? { "Content-Type": "application/json" } : undefined,
      body: init.body ? JSON.stringify(init.body) : undefined,
      credentials: "same-origin",
      signal: init.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new NetworkError("Couldn't reach Zamane.");
  }
  if (res.status === 204) return undefined as T;
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* empty or not JSON */
  }
  if (!res.ok) {
    const retry = Number(res.headers.get("Retry-After"));
    const err = isApiErrorBody(data)
      ? new ApiRequestError(
          res.status,
          data.error.code,
          data.error.message,
          data.error.fields ?? {},
          Number.isFinite(retry) && retry > 0 ? retry : null,
        )
      : new ApiRequestError(
          res.status,
          res.status >= 500 ? "internal" : "bad_request",
          "Something went wrong on our side. Try again in a moment.",
        );
    if (res.status === 401 && !path.startsWith("/api/auth/") && path !== "/api/me") onUnauthenticated?.();
    throw err;
  }
  return data as T;
}

export const isNetworkError = (e: unknown): e is NetworkError => e instanceof NetworkError;
export const isApiError = (e: unknown, code?: string): e is ApiRequestError =>
  e instanceof ApiRequestError && (code === undefined || e.code === code);
