import "server-only";
import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { MIGRATIONS } from "./migrations.generated";

export type Q = <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";

const NUMERIC = 1700;
const INT8 = 20;
const parseNum = (v: string) => Number(v);

pg.types.setTypeParser(NUMERIC, parseNum);
pg.types.setTypeParser(INT8, parseNum);

type Global = typeof globalThis & {
  __pool?: pg.Pool;
  __local?: Promise<PGlite>;
  __mode?: DbMode;
};
const g = globalThis as Global;

export type DbMode = "postgres" | "local-file" | "memory";
g.__mode ??= databaseUrl ? "postgres" : "memory";

export function dbMode(): DbMode {
  return g.__mode as DbMode;
}

async function startLocal(): Promise<PGlite> {
  const options = { parsers: { [NUMERIC]: parseNum, [INT8]: parseNum } };
  let db: PGlite;
  const dir = process.env.PGLITE_DIR?.trim() || (process.env.NODE_ENV === "production" ? "" : ".data/pglite");
  if (dir) {
    try {
      mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
      db = new PGlite(dir, options);
      await db.waitReady;
      g.__mode = "local-file";
    } catch {
      db = new PGlite(undefined, options);
    }
  } else {
    db = new PGlite(undefined, options);
  }
  await db.exec("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const done = new Set((await db.query<{ name: string }>("select name from schema_migrations")).rows.map((r) => r.name));
  for (const [name, text] of MIGRATIONS) {
    if (done.has(name)) continue;
    await db.exec(text);
    await db.query("insert into schema_migrations (name) values ($1)", [name]);
  }
  return db;
}

function local(): Promise<PGlite> {
  g.__local ??= startLocal().catch((error: unknown) => {
    g.__local = undefined;
    throw error;
  });
  return g.__local;
}

function pool(): pg.Pool {
  g.__pool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
  return g.__pool;
}

export const sql: Q = async <T,>(text: string, params: unknown[] = []) => {
  if (databaseUrl) return (await pool().query(text, params)).rows as T[];
  return (await (await local()).query<T>(text, params)).rows;
};

export async function tx<R>(fn: (q: Q) => Promise<R>): Promise<R> {
  if (databaseUrl) {
    const client = await pool().connect();
    try {
      await client.query("begin");
      const q: Q = async <T,>(text: string, params: unknown[] = []) =>
        (await client.query(text, params)).rows as T[];
      const result = await fn(q);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
  const db = await local();
  return db.transaction(async (t) => {
    const q: Q = async <T,>(text: string, params: unknown[] = []) =>
      (await t.query<T>(text, params)).rows;
    return fn(q);
  });
}

export function usingDatabaseUrl(): boolean {
  return databaseUrl !== "";
}
