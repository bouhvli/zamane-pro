/**
 * Better Auth, self-hosted in the Worker (§6, D1). Built per request, because bindings arrive per request.
 * Uses the HTTP Drizzle client; the adapter's `transaction` option stays off, so no interactive transaction is needed.
 */
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { v7 as uuidv7 } from "uuid";
import { PASSWORD_MAX, PASSWORD_MIN } from "../shared/enums.ts";
import { dbFor } from "./db/client.ts";
import * as schema from "./db/schema.ts";
import type { AppConfig } from "./env.ts";
import { sendEmail } from "./services/email.ts";
import { resetPasswordEmail } from "./services/reset-email.ts";

type WaitUntil = Pick<ExecutionContext, "waitUntil">;

/** Options shared with auth.config.ts (the schema CLI), minus anything that needs bindings. */
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
  user: { modelName: "user", fields: { name: "displayName" } },
  session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
  rateLimit: { enabled: false }, // D26: the Workers Rate Limiting binding runs in Hono middleware instead
  advanced: {
    database: { generateId: () => uuidv7() },
    ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
  },
} satisfies BetterAuthOptions;

export function createAuth(config: AppConfig, ctx: WaitUntil) {
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
    emailAndPassword: {
      ...authOptions.emailAndPassword,
      // Same response whether or not the account exists (Better Auth runs a dummy lookup); the email is sent
      // from waitUntil, so timing doesn't tell either. The link goes straight to the app's reset screen.
      sendResetPassword: async ({ user, token }) => {
        const url = `${config.APP_URL.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
        const email = resetPasswordEmail({ to: user.email, name: user.name, url, appUrl: config.APP_URL });
        ctx.waitUntil(
          sendEmail(config, email, { link: url }).catch((e: unknown) =>
            console.error("reset email failed:", e instanceof Error ? e.name : "unknown"),
          ),
        );
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
