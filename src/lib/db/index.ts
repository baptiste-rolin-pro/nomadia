import "server-only";
import path from "node:path";
import { getDatabase, type Database } from "@/lib/db/client";

export type { Database };

/**
 * Accès base de données côté serveur (singleton par processus).
 * - Sans DATABASE_URL : PGlite (PostgreSQL WASM) persistant dans PGLITE_DATA_DIR — environnement local reproductible.
 * - Avec DATABASE_URL : PostgreSQL via node-postgres (exploitation).
 * Les migrations `drizzle/` sont appliquées au premier accès.
 */
export async function db(): Promise<Database> {
  return getDatabase({
    databaseUrl: process.env.DATABASE_URL,
    pgliteDir: path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.PGLITE_DATA_DIR ?? ".data/pglite"),
    migrationsFolder: path.resolve(/*turbopackIgnore: true*/ process.cwd(), "drizzle"),
  });
}
