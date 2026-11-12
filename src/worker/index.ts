/**
 * The server: Hono under /api (§3, §5), one Vercel Function (src/worker/vercel.ts, D56). Static files and the SPA
 * fallback are served by Vercel from the client build; only /api/* reaches this code.
 *
 * Middleware order (outermost first): requestId → errorHandler → secureHeaders → body limit → configure (env,
 * auth instance) → same-origin JSON → rateLimit (selected routes) → session → requireSpace (space routes).
 */
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import { ApiError } from "./errors.ts";
import { configure, notFoundHandler, onError, requestId, sameOriginJson } from "./middleware/core.ts";
import { authRoutes } from "./routes/auth.ts";
import { goalRoutes, uploadRoutes } from "./routes/goals.ts";
import { shoppingRoutes } from "./routes/shopping.ts";
import { tripRoutes } from "./routes/trips.ts";
import { homeRoutes } from "./routes/home.ts";
import { meRoutes, passwordResetRoutes } from "./routes/me.ts";
import { publicRoutes } from "./routes/public.ts";
import { spaceRoutes } from "./routes/spaces.ts";
import type { AppEnv } from "./types.ts";

const app = new Hono<AppEnv>();

app.use("*", requestId);
app.onError(onError);
app.notFound(notFoundHandler);
app.use(
  "*",
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "https://fonts.googleapis.com"],
      fontSrc: ["https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com"],
      // res.cloudinary.com: the service worker's image cache fetches covers itself, and its fetches follow connect-src.
      connectSrc: ["'self'", "https://api.cloudinary.com", "https://res.cloudinary.com"],
      workerSrc: ["'self'"],
      manifestSrc: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
    referrerPolicy: "strict-origin-when-cross-origin",
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(
  "*",
  bodyLimit({
    maxSize: 64 * 1024,
    onError: () => {
      throw new ApiError(413, "validation_failed", "That's too much to send at once.");
    },
  }),
);
app.use("*", configure);

// Better Auth has its own CSRF defences (origin check, Fetch Metadata); everything else is same-origin JSON.
app.route("/api/auth", authRoutes);

if (__E2E__) {
  // Dead code in every production build (__E2E__ is defined as false), so the module isn't bundled at all.
  app.all("/api/test/*", async (c) => {
    if (c.get("config").APP_ENV !== "development") return notFoundHandler(c);
    const { testOnlyRoutes } = await import("./routes/test-only.ts");
    return testOnlyRoutes.fetch(new Request(c.req.url.replace("/api/test", ""), c.req.raw));
  });
}

const api = new Hono<AppEnv>()
  .use("*", sameOriginJson)
  .route("/", publicRoutes)
  .route("/me", meRoutes)
  .route("/password-reset", passwordResetRoutes)
  .route("/spaces", spaceRoutes)
  .route("/home", homeRoutes)
  .route("/goals", goalRoutes)
  .route("/trips", tripRoutes)
  .route("/shopping", shoppingRoutes)
  .route("/uploads", uploadRoutes);

app.route("/api", api);

export type AppType = typeof api;
export default app;
