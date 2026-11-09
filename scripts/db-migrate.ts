/**
 * Applique les migrations SQL (dossier drizzle/) sur la base configurée.
 * Sans DATABASE_URL : PGlite local dans PGLITE_DATA_DIR (.data/pglite par défaut).
 * Le serveur Next.js ne doit pas tourner en même temps sur la même base PGlite.
 */
import path from "node:path";
import { closeDatabase, getDatabase } from "../src/lib/db/client";

async function main() {
  const dataDir = path.resolve(process.cwd(), process.env.PGLITE_DATA_DIR ?? ".data/pglite");
  await getDatabase({ databaseUrl: process.env.DATABASE_URL, pgliteDir: dataDir, migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  await closeDatabase();
  console.log(`Migrations appliquées (${process.env.DATABASE_URL ? "PostgreSQL" : `PGlite : ${dataDir}`}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
