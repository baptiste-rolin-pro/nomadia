import { mkdirSync } from "node:fs";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "@/lib/db/schema";

/** Type commun : l'API Drizzle PostgreSQL est identique pour PGlite et node-postgres. */
export type Database = PgliteDatabase<typeof schema>;

interface Options {
  databaseUrl?: string;
  pgliteDir: string;
  migrationsFolder: string;
}

type Holder = { promise: Promise<Database> | null; close: (() => Promise<void>) | null };

const globalForDb = globalThis as unknown as { __nomadiaDb?: Holder };

async function create(opts: Options): Promise<{ database: Database; close: () => Promise<void> }> {
  if (opts.databaseUrl) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const pool = new Pool({ connectionString: opts.databaseUrl, max: 10 });
    const database = drizzle({ client: pool, schema });
    await migrate(database, { migrationsFolder: opts.migrationsFolder });
    return { database: database as unknown as Database, close: () => pool.end() };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  mkdirSync(opts.pgliteDir, { recursive: true });
  const client = await PGlite.create(opts.pgliteDir);
  const database = drizzle({ client, schema });
  await migrate(database, { migrationsFolder: opts.migrationsFolder });
  return { database, close: () => client.close() };
}

export function getDatabase(opts: Options): Promise<Database> {
  const holder = (globalForDb.__nomadiaDb ??= { promise: null, close: null });
  if (!holder.promise) {
    holder.promise = create(opts)
      .then(({ database, close }) => {
        holder.close = close;
        return database;
      })
      .catch((err) => {
        holder.promise = null;
        throw err;
      });
  }
  return holder.promise;
}

export async function closeDatabase(): Promise<void> {
  const holder = globalForDb.__nomadiaDb;
  if (holder?.promise) {
    await holder.promise.catch(() => undefined);
    await holder.close?.();
    holder.promise = null;
    holder.close = null;
  }
}
