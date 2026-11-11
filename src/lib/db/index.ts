import "server-only";
import path from "node:path";
import { getDatabase, type Database } from "@/lib/db/client";

export type { Database };

/**
 * Accès base de données côté serveur (singleton par processus / instance).
 * - Sans DATABASE_URL : PGlite (PostgreSQL WASM) persistant dans PGLITE_DATA_DIR — environnement local reproductible ;
 *   les migrations `drizzle/` sont appliquées au premier accès (un seul processus par dossier).
 * - Avec DATABASE_URL : PostgreSQL via node-postgres (Neon « pooled » sur Vercel). Aucune migration au démarrage :
 *   elles sont appliquées par `npm run db:migrate` (étape de build Vercel, voir README).
 */
export async function db(): Promise<Database> {
  const databaseUrl = process.env.DATABASE_URL || undefined;
  if (process.env.VERCEL && !databaseUrl) {
    // Système de fichiers éphémère : PGlite y perdrait les données à chaque instance.
    throw new Error("DATABASE_URL (PostgreSQL) est obligatoire sur Vercel.");
  }
  return getDatabase({
    databaseUrl,
    pgliteDir: path.resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.PGLITE_DATA_DIR ?? ".data/pglite"),
    migrationsFolder: path.resolve(/*turbopackIgnore: true*/ process.cwd(), "drizzle"),
  });
}
