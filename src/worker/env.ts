import { z } from "zod";

/**
 * The server's settings (process.env), parsed once, on first use (§10). Errors name the missing or invalid keys, never their values.
 * Unknown keys (anything else in .env) are ignored.
 */
const APP_ENVS = ["development", "preview", "production"] as const;

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v ?? "").trim());

const schema = z
  .object({
    APP_ENV: z.enum(APP_ENVS),
    DATABASE_URL: z
      .string()
      .min(1)
      .refine((v) => /^postgres(ql)?:\/\//.test(v), "must be a postgres:// URL"),
    BETTER_AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
    APP_URL: z.url(),
    RESEND_API_KEY: optionalString,
    CLOUDINARY_CLOUD_NAME: optionalString,
    CLOUDINARY_API_KEY: optionalString,
    CLOUDINARY_API_SECRET: optionalString,
  })
  .superRefine((e, ctx) => {
    const cloud = [
      ["CLOUDINARY_CLOUD_NAME", e.CLOUDINARY_CLOUD_NAME],
      ["CLOUDINARY_API_KEY", e.CLOUDINARY_API_KEY],
      ["CLOUDINARY_API_SECRET", e.CLOUDINARY_API_SECRET],
    ] as const;
    const set = cloud.filter(([, v]) => v !== "");
    if (set.length > 0 && set.length < cloud.length) {
      for (const [k, v] of cloud)
        if (v === "") ctx.addIssue({ code: "custom", path: [k], message: "Cloudinary keys are all-or-nothing" });
    }
    if (e.APP_ENV !== "development" && e.RESEND_API_KEY === "")
      ctx.addIssue({ code: "custom", path: ["RESEND_API_KEY"], message: "required outside development" });
  });

export type AppConfig = z.output<typeof schema> & {
  /** Better Auth's base URL: the app's own origin (one origin, D45). */
  authUrl: string;
  /** The sender of the app's emails (D45). */
  emailFrom: string;
  uploadsEnabled: boolean;
};

let cached: { source: object; config: AppConfig } | null = null;

/**
 * D45: the sender isn't configured. Locally it is Resend's shared test sender (it only delivers to the Resend
 * account's own address); elsewhere it is no-reply@ the app's own domain, which must be verified in Resend.
 */
export function senderFor(appEnv: string, appUrl: string): string {
  if (appEnv === "development") return "Zamane <onboarding@resend.dev>";
  return `Zamane <no-reply@${new URL(appUrl).hostname.replace(/^www./, "")}>`;
}

export class EnvError extends Error {
  override name = "EnvError";
}

export function getConfig(env: object): AppConfig {
  if (cached && cached.source === env) return cached.config;
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    const keys = parsed.error.issues.map((i) => `${i.path.join(".") || "(env)"}: ${i.message}`);
    throw new EnvError(`Invalid server configuration. ${keys.join("; ")}`);
  }
  const e = parsed.data;
  if (/-pooler\./.test(new URL(e.DATABASE_URL).hostname)) {
    console.warn("DATABASE_URL uses a -pooler host. Use the direct (unpooled) endpoint (D32).");
  }
  const config: AppConfig = {
    ...e,
    authUrl: e.APP_URL,
    emailFrom: senderFor(e.APP_ENV, e.APP_URL),
    uploadsEnabled: e.CLOUDINARY_CLOUD_NAME !== "",
  };
  cached = { source: env, config };
  return config;
}

/** The server's own configuration, from its environment variables (Vercel project settings, or .env locally). */
export function serverConfig(): AppConfig {
  return getConfig(process.env);
}
