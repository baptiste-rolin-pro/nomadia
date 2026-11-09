/** Recrée la base de test des parcours (PGlite dédiée) : suppression, migrations, seed. */
import { rm } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

async function main() {
  const dir = path.resolve(process.cwd(), process.env.PGLITE_DATA_DIR ?? ".data/pglite-e2e");
  if (!dir.includes(".data")) throw new Error(`Dossier inattendu : ${dir}`);
  await rm(dir, { recursive: true, force: true });
  for (const script of ["db:migrate", "db:seed"]) {
    const r = spawnSync(`npm run ${script}`, { stdio: "inherit", shell: true, env: { ...process.env, PGLITE_DATA_DIR: dir } });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
