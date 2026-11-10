import { mkdirSync } from "node:fs";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import type { ClientConfig, PoolConfig } from "pg";
import * as schema from "@/lib/db/schema";

/** Type commun : l'API Drizzle PostgreSQL est identique pour PGlite et node-postgres. */
export type Database = PgliteDatabase<typeof schema>;

interface Options {
  databaseUrl?: string;
  pgliteDir: string;
  migrationsFolder: string;
  /**
   * Appliquer les migrations à l'ouverture. Toujours vrai pour PGlite (un seul processus local).
   * Pour PostgreSQL (DATABASE_URL), faux par défaut : les migrations passent par `npm run db:migrate`
   * (étape explicite, sérialisée par un verrou consultatif), jamais à chaque démarrage à froid.
   */
  migrate?: boolean;
}

type Holder = { promise: Promise<Database> | null; close: (() => Promise<void>) | null };

const globalForDb = globalThis as unknown as { __nomadiaDb?: Holder };

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const WEAK_SSL_MODES = new Set(["prefer", "require", "verify-ca"]);
/** Modes qui désactivent TLS (`disable`) ou la vérification du certificat (`no-verify`, propre à pg). */
const INSECURE_SSL_MODES = new Set(["disable", "no-verify"]);

/**
 * Chaîne de connexion transmise à node-postgres, sans jamais la journaliser.
 * - Hôte distant sans `sslmode` : TLS imposé (`verify-full`).
 * - `prefer` / `require` / `verify-ca` : écrits `verify-full`. pg 8 les traite déjà comme `verify-full`
 *   (avec un avertissement) ; les écrire explicitement conserve la vérification du certificat si pg 9
 *   adopte la sémantique libpq, plus faible. Neon présente un certificat public valide.
 * - `disable` / `no-verify` sur un hôte distant : erreur explicite (TLS ou vérification du certificat
 *   désactivés en silence sinon). Le message ne contient jamais la chaîne de connexion.
 * - Hôte local (Docker, tests) : inchangé.
 */
export function postgresConnectionString(databaseUrl: string): string {
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    return databaseUrl;
  }
  const host = url.hostname.toLowerCase();
  if (!host || LOCAL_HOSTS.has(host)) return databaseUrl;
  const mode = url.searchParams.get("sslmode");
  if (mode !== null && INSECURE_SSL_MODES.has(mode)) {
    throw new Error(
      `DATABASE_URL : sslmode=${mode} refusé pour un hôte PostgreSQL distant (TLS ou vérification du certificat désactivés). Retirez sslmode ou utilisez sslmode=verify-full.`,
    );
  }
  if (mode === null || WEAK_SSL_MODES.has(mode)) {
    url.searchParams.set("sslmode", "verify-full");
    return url.toString();
  }
  return databaseUrl;
}

/** Point d'accès Neon via PgBouncer (mode transaction) : pas de verrou de session fiable. */
export function isPooledNeonUrl(databaseUrl: string): boolean {
  try {
    return new URL(databaseUrl).hostname.includes("-pooler.");
  } catch {
    return false;
  }
}

/**
 * Pool adapté aux fonctions serverless (Vercel, Fluid compute) : peu de connexions par instance, connexions
 * inactives fermées vite (Neon suspend le calcul après inactivité), délai de connexion borné.
 * Utiliser la chaîne « pooled » de Neon (hôte `-pooler`, PgBouncer) pour l'application.
 */
export function pgPoolConfig(databaseUrl: string, source: Record<string, string | undefined> = process.env): PoolConfig {
  return {
    connectionString: postgresConnectionString(databaseUrl),
    max: source.VERCEL ? 5 : 10,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
  };
}

async function create(opts: Options): Promise<{ database: Database; close: () => Promise<void> }> {
  if (opts.databaseUrl) {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const pool = new Pool(pgPoolConfig(opts.databaseUrl));
    // Sans écouteur, l'erreur d'une connexion inactive (fermée par le serveur, calcul Neon suspendu)
    // ferait tomber le processus. Le pool écarte la connexion fautive ; la suivante est recréée.
    pool.on("error", (err) => console.error("[db] connexion PostgreSQL inactive fermée :", err.message));
    const database = drizzle({ client: pool, schema });
    if (opts.migrate) {
      const { migrate } = await import("drizzle-orm/node-postgres/migrator");
      await migrate(database, { migrationsFolder: opts.migrationsFolder });
    }
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

// ---------------------------------------------------------------------------
// Scripts d'exploitation (migrations, seed) sur PostgreSQL
// ---------------------------------------------------------------------------

/** Clé du verrou consultatif partagé par `db:migrate` et `db:seed` (texte haché par PostgreSQL). */
const LOCK_NAME = "nomadia:schema-and-seed";

function clientConfig(databaseUrl: string): ClientConfig {
  return { connectionString: postgresConnectionString(databaseUrl), connectionTimeoutMillis: 15_000 };
}

/**
 * Exécute `fn` en tenant un verrou consultatif de session PostgreSQL, sur une connexion dédiée :
 * deux builds / seeds simultanés s'exécutent l'un après l'autre. Sur un point d'accès PgBouncer en mode
 * transaction (hôte Neon `-pooler`), un verrou de session n'est pas fiable : il est alors omis et
 * un avertissement est affiché (fournir DATABASE_URL_UNPOOLED pour l'activer).
 */
export async function withPostgresLock<T>(databaseUrl: string, fn: () => Promise<T>, log: (msg: string) => void = console.log): Promise<T> {
  if (isPooledNeonUrl(databaseUrl)) {
    log("Avertissement : connexion « pooled » (PgBouncer) — verrou consultatif omis. Définissez DATABASE_URL_UNPOOLED pour sérialiser migrations et seed.");
    return fn();
  }
  const { Client } = await import("pg");
  const lock = new Client(clientConfig(databaseUrl));
  await lock.connect();
  try {
    await lock.query("select pg_advisory_lock(hashtext($1))", [LOCK_NAME]);
    return await fn();
  } finally {
    await lock.query("select pg_advisory_unlock(hashtext($1))", [LOCK_NAME]).catch(() => undefined);
    await lock.end().catch(() => undefined);
  }
}

/** Applique les migrations `drizzle/` (chacune dans la transaction du migrateur Drizzle), sous verrou. */
export async function migratePostgres(databaseUrl: string, migrationsFolder: string, log: (msg: string) => void = console.log): Promise<void> {
  await withPostgresLock(
    databaseUrl,
    async () => {
      const { Client } = await import("pg");
      const { drizzle } = await import("drizzle-orm/node-postgres");
      const { migrate } = await import("drizzle-orm/node-postgres/migrator");
      const client = new Client(clientConfig(databaseUrl));
      await client.connect();
      try {
        await migrate(drizzle({ client }), { migrationsFolder });
      } finally {
        await client.end().catch(() => undefined);
      }
    },
    log,
  );
}
