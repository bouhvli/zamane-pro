/**
 * Better Auth, self-hosted in the server function (§6, D1). Built per request (cheap; the config is cached).
 * Uses the HTTP Drizzle client; the adapter's `transaction` option stays off, so no interactive transaction is needed.
 */
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { v7 as uuidv7 } from "uuid";
import { PASSWORD_MAX, PASSWORD_MIN } from "../shared/enums.ts";
import { background } from "./background.ts";
import { dbFor } from "./db/client.ts";
import * as schema from "./db/schema.ts";
import type { AppConfig } from "./env.ts";
import { sendEmail } from "./services/email.ts";
import { changeEmailEmail } from "./services/change-email.ts";
import { resetPasswordEmail } from "./services/reset-email.ts";

/** Options shared with auth.config.ts (the schema CLI), minus anything that needs the configuration. */
export const authOptions = {
  appName: "Zamane",
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: PASSWORD_MIN,
    maxPasswordLength: PASSWORD_MAX,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
  },
  // Change email (D70): never applied at once. The confirmation link goes to the NEW address and the account keeps its
  // current one until it is opened (updateEmailWithoutVerification stays off).
  user: { modelName: "user", fields: { name: "displayName" }, changeEmail: { enabled: true } },
  emailVerification: { expiresIn: 60 * 60 },
  session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
  rateLimit: { enabled: false }, // D57: the app's own limiter (a Neon table) runs in Hono middleware instead
  advanced: {
    database: { generateId: () => uuidv7() },
    ipAddress: { ipAddressHeaders: ["x-real-ip"] },
  },
} satisfies BetterAuthOptions;

export function createAuth(config: AppConfig) {
  return betterAuth({
    ...authOptions,
    secret: config.BETTER_AUTH_SECRET,
    baseURL: config.authUrl,
    basePath: "/api/auth",
    database: drizzleAdapter(dbFor(config.DATABASE_URL), {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailVerification: {
      ...authOptions.emailVerification,
      // Only the change-email flow sends one (sign-up doesn't ask for verification). `user.email` is the NEW address.
      sendVerificationEmail: async ({ user, url }) => {
        const email = changeEmailEmail({ to: user.email, name: user.name, url, appUrl: config.APP_URL });
        background(
          sendEmail(config, email, { link: url }).catch((e: unknown) =>
            console.error("change-email email failed:", e instanceof Error ? e.name : "unknown"),
          ),
        );
      },
    },
    emailAndPassword: {
      ...authOptions.emailAndPassword,
      // Same response whether or not the account exists (Better Auth runs a dummy lookup); the email is sent
      // in the background, so timing doesn't tell either. The link goes straight to the app's reset screen.
      sendResetPassword: async ({ user, token }) => {
        const url = `${config.APP_URL.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
        const email = resetPasswordEmail({ to: user.email, name: user.name, url, appUrl: config.APP_URL });
        background(
          sendEmail(config, email, { link: url }).catch((e: unknown) =>
            console.error("reset email failed:", e instanceof Error ? e.name : "unknown"),
          ),
        );
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
