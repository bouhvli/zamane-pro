import { z } from "zod";
import { CAPS, PASSWORD_MAX, PASSWORD_MIN } from "../enums.ts";

/**
 * Auth form schemas, shared by the React forms and the Worker. Messages are the design's, verbatim
 * (.ux-forge/auth/account.js). Lengths count code points, like the prototype (Array.from(v).length).
 */
export const MSG = {
  emailEmpty: "Enter your email address.",
  emailFormat: "Check your email address. It should look like name@example.com.",
  pwEmpty: "Enter your password.",
  newPwEmpty: "Choose a password with at least 10 characters.",
  pwShort: "Use at least 10 characters.",
  pwLong: "Use 128 characters or fewer.",
  nameEmpty: "Enter your first name.",
  nameLong: "Use 120 characters or fewer.",
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const len = (v: string) => Array.from(v).length;

/** Trimmed and lower-cased before it's checked (A7), so what's sent is what's shown back. */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .superRefine((v, ctx) => {
    if (!v) ctx.addIssue({ code: "custom", message: MSG.emailEmpty });
    else if (!EMAIL_RE.test(v) || len(v) > 254) ctx.addIssue({ code: "custom", message: MSG.emailFormat });
  });

export const currentPasswordSchema = z.string().min(1, MSG.pwEmpty);

export const newPasswordSchema = z.string().superRefine((v, ctx) => {
  if (!v) ctx.addIssue({ code: "custom", message: MSG.newPwEmpty });
  else if (len(v) < PASSWORD_MIN) ctx.addIssue({ code: "custom", message: MSG.pwShort });
  else if (len(v) > PASSWORD_MAX) ctx.addIssue({ code: "custom", message: MSG.pwLong });
});

export const displayNameSchema = z
  .string()
  .trim()
  .superRefine((v, ctx) => {
    if (!v) ctx.addIssue({ code: "custom", message: MSG.nameEmpty });
    else if (len(v) > CAPS.name) ctx.addIssue({ code: "custom", message: MSG.nameLong });
  });

export const signInSchema = z.object({ email: emailSchema, password: currentPasswordSchema });
export type SignInInput = z.input<typeof signInSchema>;

export const signUpSchema = z.object({ name: displayNameSchema, email: emailSchema, password: newPasswordSchema });
export type SignUpInput = z.input<typeof signUpSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.input<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({ password: newPasswordSchema });
export type ResetPasswordInput = z.input<typeof resetPasswordSchema>;

export const changePasswordSchema = z.object({
  currentPassword: currentPasswordSchema,
  newPassword: newPasswordSchema,
});
export type ChangePasswordInput = z.input<typeof changePasswordSchema>;

export const updateMeSchema = z.object({ displayName: displayNameSchema });
export type UpdateMeInput = z.input<typeof updateMeSchema>;
