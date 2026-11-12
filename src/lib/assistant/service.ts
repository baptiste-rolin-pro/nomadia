import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { CivilDate } from "@/lib/dates";
import type { Database } from "@/lib/db";
import { env } from "@/lib/env";
import { nowMs, today } from "@/lib/clock";
import { sameOrigin } from "@/lib/http";
import { modeFor } from "@/lib/providers/registry";
import type { ActionContext } from "@/lib/assistant/actions";
import { createMockClient } from "@/lib/assistant/mock";
import { localHelp, parseLocally } from "@/lib/assistant/parser";
import { clientIp, consumeAssistantQuota, consumeLocalQuota, type AssistantQuotaConfig, type QuotaOutcome } from "@/lib/assistant/rate-limit";
import { AssistantFailure, runAssistant, type AssistantModelClient } from "@/lib/assistant/run";
import { ASSISTANT_MAX_INPUT, ASSISTANT_MAX_QUESTION, type AssistantEngine, type AssistantErrorCode, type AssistantResponseBody, type AssistantResult, type AssistantStatusBody } from "@/lib/assistant/types";

/**
 * Mode du REPLI vers le modèle (l'analyse locale fonctionne toujours) : live = API Anthropic ; mock = modèle
 * simulé (tests de parcours) ; off = aucun repli (pas de clé, ou plafond journalier à 0) : rien n'est envoyé.
 */
export type AssistantMode = "live" | "mock" | "off";

export function assistantMode(): AssistantMode {
  const e = env();
  if (e.NOMADIA_ASSISTANT_MOCK === "e2e") return "mock";
  return e.ANTHROPIC_API_KEY && e.NOMADIA_ASSISTANT_DAILY_LIMIT > 0 ? "live" : "off";
}

/** Délai par tentative (millisecondes, SDK TypeScript) ; une seule nouvelle tentative (429, 5xx, réseau). */
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 1;

let cachedClient: { apiKey: string; client: AssistantModelClient } | null = null;

/** Client officiel construit avec la seule clé de la configuration (aucune autre source d'identifiants). */
function anthropicClient(apiKey: string): AssistantModelClient {
  if (cachedClient?.apiKey !== apiKey) {
    const sdk = new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: MAX_RETRIES });
    cachedClient = { apiKey, client: { create: (params) => sdk.beta.messages.create(params) } };
  }
  return cachedClient.client;
}

export interface AssistantDeps {
  /** Mode du repli vers le modèle. */
  mode: AssistantMode;
  client: (today: CivilDate) => AssistantModelClient;
  database: () => Promise<Database>;
  /** Quotas du repli (par visiteur et plafond journalier) et de l'analyse locale (`localHourlyLimit`). */
  quota: AssistantQuotaConfig & { localHourlyLimit: number };
  today: () => CivilDate;
  now: () => number;
  demo: ActionContext["demo"];
  checkOrigin: (request: Request) => boolean;
}

export async function defaultAssistantDeps(): Promise<AssistantDeps> {
  const e = env();
  const mode = assistantMode();
  const { db } = await import("@/lib/db");
  return {
    mode,
    client: (t) => (mode === "mock" ? createMockClient(t) : anthropicClient(e.ANTHROPIC_API_KEY ?? "")),
    database: db,
    quota: {
      ipHourlyLimit: e.NOMADIA_ASSISTANT_IP_HOURLY_LIMIT,
      dailyLimit: e.NOMADIA_ASSISTANT_DAILY_LIMIT,
      localHourlyLimit: e.NOMADIA_ASSISTANT_LOCAL_HOURLY_LIMIT,
      secret: e.BETTER_AUTH_SECRET,
    },
    today: () => today(),
    now: nowMs,
    demo: { flights: modeFor("flights") === "demo", hotels: modeFor("hotels") === "demo", cars: modeFor("cars") === "demo" },
    checkOrigin: sameOrigin,
  };
}

const MESSAGES: Record<AssistantErrorCode, string> = {
  INVALID: `Votre demande doit contenir entre 1 et ${ASSISTANT_MAX_INPUT} caractères.`,
  FORBIDDEN: "Requête refusée.",
  RATE_LIMITED: "Vous avez envoyé beaucoup de demandes en peu de temps. Réessayez un peu plus tard ; les onglets de recherche restent disponibles.",
  DAILY_LIMIT: "L'assistant a atteint sa limite d'utilisation pour aujourd'hui pour les demandes complexes. Reformulez avec une destination et des dates, ou réessayez demain ; les onglets de recherche restent disponibles.",
  UNAVAILABLE: "L'assistant est indisponible pour le moment. Les onglets Mon voyage, Vols, Hôtels et Voitures fonctionnent normalement.",
  TIMEOUT: "L'assistant a mis trop de temps à répondre. Réessayez dans un instant.",
};

const STATUS: Record<AssistantErrorCode, number> = { INVALID: 400, FORBIDDEN: 403, RATE_LIMITED: 429, DAILY_LIMIT: 429, UNAVAILABLE: 503, TIMEOUT: 504 };
const NO_STORE = { "Cache-Control": "private, no-store" };
/** Corps JSON accepté (le texte lui-même est limité à 500 caractères). */
const MAX_BODY_BYTES = 4096;

function errorResponse(code: AssistantErrorCode, retryAfterSec?: number) {
  const headers: Record<string, string> = { ...NO_STORE };
  if (retryAfterSec) headers["Retry-After"] = String(retryAfterSec);
  return NextResponse.json<AssistantResponseBody>({ status: "error", code, message: MESSAGES[code] }, { status: STATUS[code], headers });
}

function okResponse(engine: AssistantEngine, result: AssistantResult) {
  return NextResponse.json<AssistantResponseBody>({ status: "ok", engine, result }, { headers: NO_STORE });
}

const bodySchema = z
  .object({
    text: z.string().trim().min(1).max(ASSISTANT_MAX_INPUT),
    previous: z
      .object({ request: z.string().trim().min(1).max(ASSISTANT_MAX_INPUT), question: z.string().trim().min(1).max(ASSISTANT_MAX_QUESTION) })
      .strict()
      .nullish(),
  })
  .strict();

/** GET /api/assistant : toujours disponible (analyse locale) ; `fallback` indique si le repli vers Claude est actif. */
export function assistantStatus(mode: AssistantMode) {
  return NextResponse.json<AssistantStatusBody>({ available: true, fallback: mode !== "off" }, { headers: NO_STORE });
}

/**
 * Quota de l'analyse locale. Base indisponible : la demande est servie quand même (aucun coût ni service
 * extérieur sur ce chemin) et l'incident est journalisé ; le repli vers le modèle, lui, reste fermé dans ce cas.
 */
async function localQuota(request: Request, deps: AssistantDeps): Promise<QuotaOutcome> {
  try {
    const database = await deps.database();
    return await consumeLocalQuota(database, clientIp(request.headers), { hourlyLimit: deps.quota.localHourlyLimit, secret: deps.quota.secret }, deps.now());
  } catch (err) {
    console.error("[assistant] limitation de débit (analyse locale) indisponible", { error: err instanceof Error ? err.name : typeof err });
    return { ok: true };
  }
}

/**
 * POST /api/assistant. Ordre : origine, corps (taille, schéma), puis ANALYSE LOCALE (src/lib/assistant/parser) ;
 * - comprise : quota local (compteur séparé, limite haute), réponse immédiate, `engine: "local"` ;
 * - non comprise et repli configuré : quotas du modèle (visiteur/heure, plafond/jour), UNE requête au modèle,
 *   validation des appels d'outils, `engine: "ia"` ;
 * - non comprise sans repli : aide (exemples + onglets classiques), `engine: "local"`. Rien n'est envoyé à Anthropic.
 * Le texte saisi n'est ni journalisé ni stocké.
 */
export async function handleAssistantPost(request: Request, deps: AssistantDeps): Promise<NextResponse> {
  if (!deps.checkOrigin(request)) return errorResponse("FORBIDDEN");

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return errorResponse("INVALID");
  const raw = await request.text().catch(() => "");
  if (!raw || new TextEncoder().encode(raw).length > MAX_BODY_BYTES) return errorResponse("INVALID");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return errorResponse("INVALID");
  }
  const body = bodySchema.safeParse(json);
  if (!body.success) return errorResponse("INVALID");

  const t = deps.today();
  const ctx: ActionContext = { today: t, demo: deps.demo };
  const input = { text: body.data.text, previous: body.data.previous ?? null };

  let local: ReturnType<typeof parseLocally>;
  try {
    local = parseLocally(input, ctx);
  } catch (err) {
    // Défense en profondeur : une erreur de l'analyse locale vaut « non compris » (journal sans le texte saisi).
    console.error("[assistant] erreur de l'analyse locale", { error: err instanceof Error ? err.name : typeof err });
    local = { understood: false, confidence: "none" };
  }
  if (local.understood || deps.mode === "off") {
    const quota = await localQuota(request, deps);
    if (!quota.ok) return errorResponse(quota.code, quota.retryAfterSec);
    return okResponse("local", local.understood ? local.result : localHelp());
  }

  // Repli vers le modèle : seules ces demandes consomment les quotas du modèle.
  try {
    const database = await deps.database();
    const quota = await consumeAssistantQuota(database, clientIp(request.headers), deps.quota, deps.now());
    if (!quota.ok) return errorResponse(quota.code, quota.retryAfterSec);
  } catch (err) {
    console.error("[assistant] limitation de débit indisponible", { error: err instanceof Error ? err.name : typeof err });
    return errorResponse("UNAVAILABLE");
  }
  try {
    const result = await runAssistant(input, { client: deps.client(t), ctx });
    return okResponse("ia", result);
  } catch (err) {
    if (err instanceof AssistantFailure) return errorResponse(err.code);
    console.error("[assistant] erreur inattendue", { error: err instanceof Error ? err.name : typeof err });
    return errorResponse("UNAVAILABLE");
  }
}
