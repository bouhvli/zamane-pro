import { defineConfig } from "drizzle-kit";
import { existsSync } from "node:fs";

// Same .env the Worker reads (D20). Never printed.
if (!process.env.DATABASE_URL && existsSync(".env")) process.loadEnvFile(".env");

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/worker/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: false,
});
