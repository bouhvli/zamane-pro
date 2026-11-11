import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import type { z } from "zod";
import { errorBody } from "./middleware/core.ts";

/** zValidator with the app's error shape: 400 validation_failed, fields keyed by path (§3). */
export function validate<T extends z.ZodType, Target extends keyof ValidationTargets>(target: Target, schema: T) {
  return zValidator(target, schema, (result, c) => {
    if (!result.success) {
      const fields: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.map(String).join(".") || target;
        if (!fields[key]) fields[key] = issue.message;
      }
      return c.json(errorBody("validation_failed", "Check the highlighted fields.", fields), 400);
    }
  });
}
