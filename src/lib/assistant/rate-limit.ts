/**
 * Limitation de débit de l'assistant, partagée entre instances serverless (compteurs en base, fenêtres fixes).
 * Deux chemins, deux jeux de compteurs :
 * - analyse locale (gratuite) : `local:<HMAC-SHA256(secret, IP)>:<heure>`, limite haute contre le spam ;
 *   `localday:<AAAA-MM-JJ UTC>` ne sert qu'à déclencher la purge quotidienne (aucun plafond) ;
 * - repli vers le modèle (payant) : `ip:<HMAC>:<heure>` par visiteur et `day:<AAAA-MM-JJ UTC>`, plafond de coût
 *   journalier tous visiteurs confondus. Seules les demandes réellement envoyées au modèle les consomment.
 * L'adresse IP n'est jamais stockée en clair. Incrément atomique (`INSERT … ON CONFLICT DO UPDATE … RETURNING`),
 * identique sous PGlite et PostgreSQL. Une demande refusée pour le visiteur ne consomme pas le plafond global.
 */
import { lt, sql } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { assistantRateLimits } from "@/lib/db/schema";
import { hmacSha256 } from "@/lib/security";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export interface AssistantQuotaConfig {
  ipHourlyLimit: number;
  dailyLimit: number;
  /** Secret serveur utilisé pour l'empreinte des adresses IP. */
  secret: string;
}

export type QuotaOutcome = { ok: true } | { ok: false; code: "RATE_LIMITED" | "DAILY_LIMIT"; retryAfterSec: number };

/**
 * Adresse du client. Sur Vercel, `x-forwarded-for` est réécrit par la plateforme (première valeur = client) ;
 * ailleurs, l'en-tête peut être falsifié : la limite reste alors indicative, le plafond global protège le coût.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headers.get("x-real-ip")?.trim() || "inconnue";
  return ip.slice(0, 64);
}

export function ipBucketKey(ip: string, secret: string, nowMs: number): string {
  const hour = Math.floor(nowMs / HOUR);
  return `ip:${hmacSha256(secret, `assistant:${ip}`).slice(0, 32)}:${hour}`;
}

export function dayBucketKey(nowMs: number): string {
  return `day:${new Date(nowMs).toISOString().slice(0, 10)}`;
}

export function localBucketKey(ip: string, secret: string, nowMs: number): string {
  const hour = Math.floor(nowMs / HOUR);
  return `local:${hmacSha256(secret, `assistant-local:${ip}`).slice(0, 32)}:${hour}`;
}

export interface LocalQuotaConfig {
  hourlyLimit: number;
  secret: string;
}

/** Analyse locale : limite par visiteur et par heure seulement (aucun coût, donc aucun plafond global). */
export async function consumeLocalQuota(database: Database, ip: string, config: LocalQuotaConfig, nowMs: number): Promise<QuotaOutcome> {
  const hourEnd = (Math.floor(nowMs / HOUR) + 1) * HOUR;
  const count = await increment(database, localBucketKey(ip, config.secret, nowMs), new Date(hourEnd));
  if (count > config.hourlyLimit) return { ok: false, code: "RATE_LIMITED", retryAfterSec: Math.max(1, Math.ceil((hourEnd - nowMs) / 1000)) };
  const dayEnd = (Math.floor(nowMs / DAY) + 1) * DAY;
  const marker = await increment(database, `localday:${new Date(nowMs).toISOString().slice(0, 10)}`, new Date(dayEnd));
  if (marker === 1) await database.delete(assistantRateLimits).where(lt(assistantRateLimits.expiresAt, new Date(nowMs)));
  return { ok: true };
}

async function increment(database: Database, key: string, expiresAt: Date): Promise<number> {
  const [row] = await database
    .insert(assistantRateLimits)
    .values({ key, count: 1, expiresAt })
    .onConflictDoUpdate({ target: assistantRateLimits.key, set: { count: sql`${assistantRateLimits.count} + 1` } })
    .returning({ count: assistantRateLimits.count });
  return row?.count ?? Number.POSITIVE_INFINITY;
}

export async function consumeAssistantQuota(database: Database, ip: string, config: AssistantQuotaConfig, nowMs: number): Promise<QuotaOutcome> {
  const hourEnd = (Math.floor(nowMs / HOUR) + 1) * HOUR;
  const ipCount = await increment(database, ipBucketKey(ip, config.secret, nowMs), new Date(hourEnd));
  if (ipCount > config.ipHourlyLimit) return { ok: false, code: "RATE_LIMITED", retryAfterSec: Math.max(1, Math.ceil((hourEnd - nowMs) / 1000)) };

  const dayEnd = (Math.floor(nowMs / DAY) + 1) * DAY;
  const dayCount = await increment(database, dayBucketKey(nowMs), new Date(dayEnd));
  // Premier appel du jour : purge des compteurs expirés (une fois par jour, toutes instances confondues).
  if (dayCount === 1) await database.delete(assistantRateLimits).where(lt(assistantRateLimits.expiresAt, new Date(nowMs)));
  if (dayCount > config.dailyLimit) return { ok: false, code: "DAILY_LIMIT", retryAfterSec: Math.max(1, Math.ceil((dayEnd - nowMs) / 1000)) };
  return { ok: true };
}
