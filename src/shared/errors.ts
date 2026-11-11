/** Every API error has the shape { error: { code, message, fields? } } (§3). */
export const ERROR_CODES = [
  "unauthenticated",
  "no_space",
  "validation_failed",
  "not_found",
  "conflict",
  "id_conflict",
  "invite_invalid",
  "already_in_space",
  "partner_joined",
  "email_taken",
  "invalid_credentials",
  "invalid_token",
  "rate_limited",
  "not_implemented",
  "uploads_disabled",
  "internal",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

export function isApiErrorBody(v: unknown): v is ApiErrorBody {
  if (typeof v !== "object" || v === null || !("error" in v)) return false;
  const e = (v as { error: unknown }).error;
  return typeof e === "object" && e !== null && typeof (e as { code?: unknown }).code === "string";
}
