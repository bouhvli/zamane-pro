/**
 * The only file that knows the database driver (D2).
 * - db(c): a module-level Drizzle client on Neon's HTTP driver, for single statements and non-interactive batches.
 * - atomic(c, [...]): several statements in one non-interactive transaction (db.batch on HTTP).
 * - withTx(c, fn): an interactive transaction on a per-request WebSocket Pool, closed in the background.
 */
import { neon, Pool } from "@neondatabase/serverless";
import type { BatchItem, BatchResponse } from "drizzle-orm/batch";
import { drizzle as drizzleHttp, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs, type NeonDatabase } from "drizzle-orm/neon-serverless";
import { background } from "../background.ts";
import { serverConfig } from "../env.ts";
import * as schema from "./schema.ts";

export type Schema = typeof schema;
export type Db = NeonHttpDatabase<Schema>;
export type Tx = Parameters<Parameters<NeonDatabase<Schema>["transaction"]>[0]>[0];

/**
 * Kept as the first parameter of every repository function (a Hono context, or anything in a script or test):
 * the database URL itself comes from the server configuration (D56).
 */
export type DbContext = object;

let http: { url: string; db: Db } | null = null;

export function dbFor(url: string): Db {
  if (!http || http.url !== url) http = { url, db: drizzleHttp({ client: neon(url), schema }) };
  return http.db;
}

export function db(_c?: DbContext): Db {
  return dbFor(serverConfig().DATABASE_URL);
}

export function atomic<T extends [BatchItem<"pg">, ...BatchItem<"pg">[]]>(
  c: DbContext,
  queries: T,
): Promise<BatchResponse<T>> {
  return db(c).batch(queries);
}

export async function withTx<T>(_c: DbContext, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const pool = new Pool({ connectionString: serverConfig().DATABASE_URL });
  // A socket closing after the request has ended emits "error" on the pool; without a listener that is an
  // uncaught exception. The query results have already been returned by then.
  pool.on("error", (err: Error) => console.warn(`db pool: ${err.name}`));
  try {
    return await drizzleWs({ client: pool, schema }).transaction(fn);
  } finally {
    background(pool.end().catch(() => {}));
  }
}
