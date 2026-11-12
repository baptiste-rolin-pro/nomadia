import "server-only";
import { randomBytes } from "node:crypto";
import { z } from "zod";

const mode = z.enum(["demo", "sandbox", "live"]);
const bool = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((v) => v === "true" || v === "1");
/** Variable vide (`NOM=` dans un fichier .env) traitée comme absente. */
const blankAsUndefined = (v: unknown) => (v === "" ? undefined : v);
const intSetting = (min: number, max: number, fallback: number) => z.preprocess(blankAsUndefined, z.coerce.number().int().min(min).max(max).default(fallback));

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NOMADIA_SITE_URL: z.url().default("http://localhost:3000"),
  NOMADIA_SITE_ENV: z.enum(["demo", "staging", "production"]).default("demo"),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  DATABASE_URL: z.string().optional(),
  PGLITE_DATA_DIR: z.string().default(".data/pglite"),
  FLIGHTS_PROVIDER_MODE: mode.default("demo"),
  HOTELS_PROVIDER_MODE: mode.default("demo"),
  CARS_PROVIDER_MODE: mode.default("demo"),
  DUFFEL_ACCESS_TOKEN: z.string().optional(),
  BOOKING_DEMAND_API_KEY: z.string().optional(),
  BOOKING_DEMAND_AFFILIATE_ID: z.string().optional(),
  NOMADIA_LIVE_SALES_APPROVED: bool,
  MAIL_TRANSPORT: z.enum(["capture"]).default("capture"),
  MAIL_FROM: z.string().default("Nomadia <no-reply@nomadia.example>"),
  NOMADIA_DEV_MAILBOX: bool,
  DEMO_WEBHOOK_SECRET: z.string().min(16).optional(),
  NOMADIA_FIXED_NOW: z.string().optional(),
  NOMADIA_JOB_RUNNER_TOKEN: z.string().min(16).optional(),
  /** Secret envoyé par Vercel Cron (`Authorization: Bearer <CRON_SECRET>`) ; accepté par /api/jobs/run. */
  CRON_SECRET: z.string().min(16).optional(),
  /** « off » désactive la limitation de débit de l'authentification (tests automatisés, jamais en production). */
  NOMADIA_AUTH_RATE_LIMIT: z.enum(["on", "off"]).default("on"),
  /**
   * Inscription publique et réinitialisation du mot de passe par email. Faux par défaut : site de démonstration
   * public, connexion uniquement avec les comptes de démonstration partagés (voir src/lib/demo-site.ts).
   */
  NOMADIA_PUBLIC_SIGNUP: bool,
  /** Mots de passe des comptes de démonstration (valeurs de TEST, affichées sur la page de connexion en mode démo). */
  DEMO_USER_PASSWORD: z.string().min(10).optional(),
  DEMO_ADMIN_PASSWORD: z.string().min(10).optional(),
  /**
   * Repli de l'assistant vers le modèle Claude (API Anthropic, src/lib/assistant). SECRET, OPTIONNELLE.
   * L'assistant fonctionne sans elle (analyse locale, src/lib/assistant/parser) ; avec elle, seules les demandes
   * que l'analyse locale ne comprend pas sont envoyées au modèle. Seule source d'identifiants utilisée par le serveur.
   */
  ANTHROPIC_API_KEY: z.preprocess(blankAsUndefined, z.string().min(1).optional()),
  /** Demandes envoyées au modèle (repli) par visiteur (empreinte de l'adresse IP) et par heure, fenêtre fixe. */
  NOMADIA_ASSISTANT_IP_HOURLY_LIMIT: intSetting(1, 1000, 20),
  /** Plafond global de demandes envoyées au modèle par jour UTC, tous visiteurs confondus ; 0 désactive le repli. */
  NOMADIA_ASSISTANT_DAILY_LIMIT: intSetting(0, 100_000, 300),
  /** Demandes traitées par l'analyse locale par visiteur et par heure (protection contre le spam, aucun coût). */
  NOMADIA_ASSISTANT_LOCAL_HOURLY_LIMIT: intSetting(1, 100_000, 120),
  /**
   * « e2e » : modèle simulé (src/lib/assistant/mock.ts) pour les tests de parcours, sans appel réseau.
   * Interdit sur Vercel et lorsque NOMADIA_SITE_ENV=production.
   */
  NOMADIA_ASSISTANT_MOCK: z.preprocess(blankAsUndefined, z.enum(["off", "e2e"]).default("off")),
});

export type ServerEnv = z.infer<typeof schema> & {
  BETTER_AUTH_SECRET: string;
  DEMO_WEBHOOK_SECRET: string;
  /**
   * Origine du secret des événements de paiement de démonstration : « configured » (DEMO_WEBHOOK_SECRET fourni)
   * ou « generated » (hors production uniquement : secret aléatoire propre au processus, inconnu de l'extérieur).
   */
  demoWebhookSecretSource: "configured" | "generated";
};

const DEV_ONLY_SECRET = "dev-only-secret-not-for-production-0123456789abcdef";

/**
 * Secret de repli des événements de paiement de démonstration (hors production) : aléatoire, tiré une fois par
 * processus et conservé sur `globalThis` pour que signature (demo-psp) et vérification (webhook) le partagent.
 * Jamais une valeur fixe publiée dans le code : un appel HTTP ne peut pas le reproduire.
 */
function processLocalWebhookSecret(): string {
  const holder = globalThis as unknown as { __nomadiaDemoWebhookSecret?: string };
  return (holder.__nomadiaDemoWebhookSecret ??= randomBytes(32).toString("base64url"));
}

/**
 * URL publique par défaut sur Vercel quand NOMADIA_SITE_URL est absent : domaine de production du projet
 * (VERCEL_PROJECT_PRODUCTION_URL) ou, pour un aperçu, l'URL de branche / de déploiement. Variables système
 * Vercel (noms d'hôte sans protocole). Hors Vercel : aucune valeur (défaut http://localhost:3000).
 */
export function vercelSiteUrl(source: Record<string, string | undefined> = process.env): string | undefined {
  if (!source.VERCEL) return undefined;
  const host = source.VERCEL_ENV === "production" ? source.VERCEL_PROJECT_PRODUCTION_URL : source.VERCEL_BRANCH_URL || source.VERCEL_URL;
  return host ? `https://${host}` : undefined;
}

let cached: ServerEnv | null = null;

export function env(): ServerEnv {
  if (cached) return cached;
  const input: Record<string, string | undefined> = { ...process.env };
  if (!input.NOMADIA_SITE_URL) input.NOMADIA_SITE_URL = vercelSiteUrl();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new Error(`Configuration serveur invalide : ${parsed.error.message}`);
  }
  const value = parsed.data;
  const isProdSite = value.NOMADIA_SITE_ENV === "production";
  // Tout déploiement Vercel (production ou aperçu) est public : mêmes exigences de secret qu'en production.
  const onVercel = Boolean(process.env.VERCEL);
  const vercelProduction = process.env.VERCEL_ENV === "production";
  if ((isProdSite || onVercel) && !value.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET est obligatoire lorsque NOMADIA_SITE_ENV=production et sur tout déploiement Vercel.");
  }
  if (isProdSite && !value.DEMO_WEBHOOK_SECRET) {
    throw new Error("DEMO_WEBHOOK_SECRET est obligatoire lorsque NOMADIA_SITE_ENV=production.");
  }
  if ((isProdSite || vercelProduction) && value.NOMADIA_AUTH_RATE_LIMIT === "off") {
    throw new Error("NOMADIA_AUTH_RATE_LIMIT=off est interdit en production.");
  }
  if ((isProdSite || vercelProduction) && value.NOMADIA_DEV_MAILBOX) {
    throw new Error("NOMADIA_DEV_MAILBOX ne peut pas être activé en production (ni sur le déploiement de production Vercel).");
  }
  if (value.NOMADIA_ASSISTANT_MOCK !== "off" && (isProdSite || onVercel)) {
    throw new Error("NOMADIA_ASSISTANT_MOCK est réservé aux tests locaux : interdit sur Vercel et lorsque NOMADIA_SITE_ENV=production.");
  }
  if (onVercel && !value.DATABASE_URL) {
    // Le système de fichiers des fonctions Vercel n'est pas persistant : PGlite y perdrait toutes les données.
    throw new Error("DATABASE_URL (PostgreSQL, par exemple Neon) est obligatoire sur Vercel.");
  }
  cached = {
    ...value,
    BETTER_AUTH_SECRET: value.BETTER_AUTH_SECRET ?? DEV_ONLY_SECRET,
    DEMO_WEBHOOK_SECRET: value.DEMO_WEBHOOK_SECRET ?? processLocalWebhookSecret(),
    demoWebhookSecretSource: value.DEMO_WEBHOOK_SECRET ? "configured" : "generated",
  };
  return cached;
}

/** Le site ne doit être indexé que pour un environnement de production explicitement configuré. */
export function isIndexable(): boolean {
  return env().NOMADIA_SITE_ENV === "production";
}

export function siteUrl(): string {
  return env().NOMADIA_SITE_URL.replace(/\/$/, "");
}

/** Cookies `Secure` dès que le site est servi en HTTPS. */
export function secureCookies(): boolean {
  return siteUrl().startsWith("https://");
}
