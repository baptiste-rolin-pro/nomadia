/**
 * Environnement des scripts de base de données (migrate, seed, reset, e2e).
 * Importé EN PREMIER par chaque script : charge `.env.local` / `.env` comme Next.js (@next/env), sans jamais
 * écraser une variable déjà définie dans l'environnement — y compris une valeur vide, ce qui permet de forcer
 * PGlite avec `DATABASE_URL=` (tests de parcours). Aucune valeur n'est affichée.
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production", { info: () => undefined, error: console.error });

/**
 * URL utilisée par les scripts : la connexion directe (DATABASE_URL_UNPOOLED, fournie par l'intégration
 * Neon de Vercel) de préférence, car migrations et verrou consultatif exigent une session PostgreSQL stable ;
 * sinon DATABASE_URL. Chaîne vide = absente (PGlite local).
 */
export function scriptDatabaseUrl(): string | undefined {
  return process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || undefined;
}

/** Sur Vercel, l'absence de base PostgreSQL est une erreur explicite (PGlite n'y est pas persistant). */
export function assertDatabaseConfigured(url: string | undefined, script: string): void {
  if (process.env.VERCEL && !url) {
    console.error(`${script} : DATABASE_URL (ou DATABASE_URL_UNPOOLED) est obligatoire sur Vercel. Configurez la base Neon pour cet environnement (Production / Preview).`);
    process.exit(1);
  }
}

export function describeTarget(url: string | undefined, pgliteDir: string): string {
  if (!url) return `PGlite : ${pgliteDir}`;
  // Jamais l'URL (identifiants) : seulement le type de connexion.
  const pooled = (() => {
    try {
      return new URL(url).hostname.includes("-pooler.");
    } catch {
      return false;
    }
  })();
  return `PostgreSQL (${process.env.DATABASE_URL_UNPOOLED ? "DATABASE_URL_UNPOOLED, connexion directe" : `DATABASE_URL${pooled ? ", connexion pooled" : ""}`})`;
}
