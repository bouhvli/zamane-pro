/**
 * pnpm db:migrate: applies pending migrations with drizzle-kit migrate. When a pending migration contains DROP,
 * TRUNCATE or ALTER … DROP, the guard runs first (§10). Destructive changes follow expand → deploy → contract.
 */
import { neon } from "@neondatabase/serverless";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { assertSafeBranch } from "./db-guard.ts";

if (existsSync(".env")) process.loadEnvFile(".env");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("db:migrate: DATABASE_URL is not set.");
  process.exit(1);
}

const journal = JSON.parse(readFileSync(join("drizzle", "meta", "_journal.json"), "utf8")) as {
  entries: { idx: number; when: number; tag: string }[];
};

async function lastApplied(): Promise<number> {
  const sql = neon(url!);
  try {
    const rows = (await sql.query("select max(created_at)::bigint as last from drizzle.__drizzle_migrations")) as {
      last: string | null;
    }[];
    return Number(rows[0]?.last ?? 0);
  } catch {
    return 0; // nothing applied yet
  }
}

const last = await lastApplied();
const pending = journal.entries.filter((e) => e.when > last);
if (!pending.length) {
  console.log("db:migrate: nothing to apply.");
  process.exit(0);
}
const DESTRUCTIVE = /\bDROP\b|\bTRUNCATE\b|\bALTER\b[\s\S]*?\bDROP\b/i;
const destructive = pending.filter((e) => DESTRUCTIVE.test(readFileSync(join("drizzle", `${e.tag}.sql`), "utf8")));
if (destructive.length) {
  console.log(
    `db:migrate: ${destructive.map((e) => e.tag).join(", ")} contain destructive statements; checking the branch.`,
  );
  try {
    const name = await assertSafeBranch();
    console.log(`db guard: OK, branch "${name}".`);
  } catch (e) {
    console.error(`db guard: refused. ${e instanceof Error ? e.message : "unknown error"}`);
    process.exit(1);
  }
}
console.log(`db:migrate: applying ${pending.map((e) => e.tag).join(", ")}`);
const r = spawnSync("pnpm", ["exec", "drizzle-kit", "migrate"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(r.status ?? 1);
