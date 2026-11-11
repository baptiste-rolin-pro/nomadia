/**
 * Réinitialise la base PGlite locale (suppression du dossier de données), puis migrations et seed.
 * Refuse d'agir sur une base PostgreSQL (DATABASE_URL / DATABASE_URL_UNPOOLED, y compris depuis `.env.local`)
 * par sécurité : une base distante n'est jamais supprimée par ce script.
 */
import { scriptDatabaseUrl } from "./lib/script-env";
import { rm } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

async function main() {
  if (scriptDatabaseUrl()) {
    console.error("db:reset est réservé à la base PGlite locale. Retirez DATABASE_URL / DATABASE_URL_UNPOOLED (environnement et .env.local).");
    process.exit(1);
  }
  const dir = path.resolve(process.cwd(), process.env.PGLITE_DATA_DIR ?? ".data/pglite");
  if (!dir.includes(".data")) {
    console.error(`Dossier inattendu, abandon : ${dir}`);
    process.exit(1);
  }
  await rm(dir, { recursive: true, force: true });
  console.log(`Base locale supprimée : ${dir}`);
  for (const script of ["db:migrate", "db:seed"]) {
    const r = spawnSync(`npm run ${script}`, { stdio: "inherit", shell: true });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
