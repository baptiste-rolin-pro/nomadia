/**
 * Applique les migrations SQL (dossier drizzle/) sur la base configurée.
 * - PostgreSQL (DATABASE_URL_UNPOOLED ou DATABASE_URL) : migrateur Drizzle (chaque lot dans une transaction),
 *   sérialisé par un verrou consultatif PostgreSQL (deux builds simultanés ne migrent pas en même temps).
 *   C'est le SEUL chemin de migration en exploitation : l'application ne migre pas au démarrage.
 * - Sans URL : PGlite local dans PGLITE_DATA_DIR (.data/pglite par défaut). Le serveur Next.js ne doit pas
 *   tourner en même temps sur la même base PGlite.
 */
import { assertDatabaseConfigured, describeTarget, scriptDatabaseUrl } from "./lib/script-env";
import path from "node:path";
import { closeDatabase, getDatabase, migratePostgres } from "../src/lib/db/client";

async function main() {
  const url = scriptDatabaseUrl();
  assertDatabaseConfigured(url, "db:migrate");
  const dataDir = path.resolve(process.cwd(), process.env.PGLITE_DATA_DIR ?? ".data/pglite");
  const migrationsFolder = path.resolve(process.cwd(), "drizzle");
  if (url) {
    await migratePostgres(url, migrationsFolder);
  } else {
    await getDatabase({ pgliteDir: dataDir, migrationsFolder });
    await closeDatabase();
  }
  console.log(`Migrations appliquées (${describeTarget(url, dataDir)}).`);
}

main().catch((err: unknown) => {
  // Message seulement : une erreur de connexion pg ne contient pas l'URL, mais on évite d'imprimer l'objet complet.
  console.error("db:migrate a échoué :", err instanceof Error ? err.message : err);
  process.exit(1);
});
