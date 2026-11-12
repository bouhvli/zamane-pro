import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

// API tests talk to the Neon dev branch from .env (never printed). CI provides DATABASE_URL from the PR branch.
if (!process.env.DATABASE_URL && existsSync(".env")) process.loadEnvFile(".env");

const define = { __APP_VERSION__: JSON.stringify("test"), __E2E__: "false" };

export default defineConfig({
  test: {
    projects: [
      {
        define,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        define,
        test: {
          name: "api",
          include: ["tests/api/**/*.test.ts"],
          setupFiles: ["tests/api/setup.ts"],
          environment: "node",
          // The server reads its configuration from process.env (D56). Fake Cloudinary credentials: signing is
          // checked offline; cleanup calls fail and are only logged.
          env: {
            APP_ENV: "development",
            APP_URL: "http://localhost:3000",
            DATABASE_URL: process.env.DATABASE_URL ?? "",
            BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "test-secret-test-secret-test-secret-0123",
            RESEND_API_KEY: "",
            CLOUDINARY_CLOUD_NAME: "zamane-test",
            CLOUDINARY_API_KEY: "000000000000000",
            CLOUDINARY_API_SECRET: "test-cloudinary-secret",
          },
          testTimeout: 60_000,
          hookTimeout: 60_000,
          // Tests share one database: run files one after another.
          fileParallelism: false,
        },
      },
    ],
  },
});
