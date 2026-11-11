/**
 * The only file that knows the database driver (D2).
 * - db(c): a module-level Drizzle client on Neon's HTTP driver, for single statements and non-interactive batches.
 * - atomic(c, [...]): several statements in one non-interactive transaction (db.batch on HTTP).
 * - withTx(c, fn): an interactive transaction on a per-request WebSocket Pool, closed in waitUntil.
 */
import { neon, Pool } from "@neondatabase/serverless";
import type { BatchItem, BatchResponse } from "drizzle-orm/batch";
import { drizzle as drizzleHttp, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs, type NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "./schema.ts";

export type Schema = typeof schema;
export type Db = NeonHttpDatabase<Schema>;
export type Tx = Parameters<Parameters<NeonDatabase<Schema>["transaction"]>[0]>[0];

/** What the helpers need from a Hono context (or a test). */
export interface DbContext {
  env: { DATABASE_URL: string };
  executionCtx?: Pick<ExecutionContext, "waitUntil">;
}

let http: { url: string; db: Db } | null = null;

export function dbFor(url: string): Db {
  if (!http || http.url !== url) http = { url, db: drizzleHttp({ client: neon(url), schema }) };
  return http.db;
}

export function db(c: DbContext): Db {
  return dbFor(c.env.DATABASE_URL);
}

export function atomic<T extends [BatchItem<"pg">, ...BatchItem<"pg">[]]>(
  c: DbContext,
  queries: T,
): Promise<BatchResponse<T>> {
  return db(c).batch(queries);
}

export async function withTx<T>(c: DbContext, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: c.env.DATABASE_URL });
  try {
    return await drizzleWs({ client: pool, schema }).transaction(fn);
  } finally {
    const end = pool.end();
    if (c.executionCtx) c.executionCtx.waitUntil(end);
    else await end;
  }
}
