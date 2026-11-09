import "server-only";
import { randomBytes } from "node:crypto";
import { z } from "zod";

const mode = z.enum(["demo", "sandbox", "live"]);
const bool = z
  .enum(["true", "false", "1", "0", ""])
  .optional()
  .transform((v) => v === "true" || v === "1");

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
  /** « off » désactive la limitation de débit de l'authentification (tests automatisés, jamais en production). */
  NOMADIA_AUTH_RATE_LIMIT: z.enum(["on", "off"]).default("on"),
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

let cached: ServerEnv | null = null;

export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Configuration serveur invalide : ${parsed.error.message}`);
  }
  const value = parsed.data;
  const isProdSite = value.NOMADIA_SITE_ENV === "production";
  if (isProdSite && !value.BETTER_AUTH_SECRET) {
    throw new Error("BETTER_AUTH_SECRET est obligatoire lorsque NOMADIA_SITE_ENV=production.");
  }
  if (isProdSite && !value.DEMO_WEBHOOK_SECRET) {
    throw new Error("DEMO_WEBHOOK_SECRET est obligatoire lorsque NOMADIA_SITE_ENV=production.");
  }
  if (isProdSite && value.NOMADIA_AUTH_RATE_LIMIT === "off") {
    throw new Error("NOMADIA_AUTH_RATE_LIMIT=off est interdit en production.");
  }
  if (isProdSite && value.NOMADIA_DEV_MAILBOX) {
    throw new Error("NOMADIA_DEV_MAILBOX ne peut pas être activé en production.");
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
