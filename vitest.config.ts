import { cloudflareTest } from "@cloudflare/vitest-plugin";
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
        plugins: [
          cloudflareTest({
            wrangler: { configPath: "./wrangler.jsonc" },
            miniflare: {
              bindings: {
                APP_ENV: "development",
                APP_URL: "http://localhost:3000",
                DATABASE_URL: process.env.DATABASE_URL ?? "",
                BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || "test-secret-test-secret-test-secret-0123",
                RESEND_API_KEY: "",
                CLOUDINARY_CLOUD_NAME: "",
                CLOUDINARY_API_KEY: "",
                CLOUDINARY_API_SECRET: "",
              },
            },
          }),
        ],
        test: {
          name: "api",
          include: ["tests/api/**/*.test.ts"],
          testTimeout: 60_000,
          hookTimeout: 60_000,
          // Tests share one database: run files one after another.
          fileParallelism: false,
        },
      },
    ],
  },
});
