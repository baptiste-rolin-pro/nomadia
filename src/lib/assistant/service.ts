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
import { clientIp, consumeAssistantQuota, type AssistantQuotaConfig } from "@/lib/assistant/rate-limit";
import { AssistantFailure, runAssistant, type AssistantModelClient } from "@/lib/assistant/run";
import { ASSISTANT_MAX_INPUT, ASSISTANT_MAX_QUESTION, type AssistantErrorCode, type AssistantResponseBody, type AssistantStatusBody } from "@/lib/assistant/types";

/** live : API Anthropic ; mock : modèle simulé (tests de parcours) ; off : pas de clé, assistant « indisponible ». */
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
  mode: AssistantMode;
  client: (today: CivilDate) => AssistantModelClient;
  database: () => Promise<Database>;
  quota: AssistantQuotaConfig;
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
    quota: { ipHourlyLimit: e.NOMADIA_ASSISTANT_IP_HOURLY_LIMIT, dailyLimit: e.NOMADIA_ASSISTANT_DAILY_LIMIT, secret: e.BETTER_AUTH_SECRET },
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
  DAILY_LIMIT: "L'assistant a atteint sa limite d'utilisation pour aujourd'hui. Réessayez demain ; les onglets de recherche restent disponibles.",
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

const bodySchema = z
  .object({
    text: z.string().trim().min(1).max(ASSISTANT_MAX_INPUT),
    previous: z
      .object({ request: z.string().trim().min(1).max(ASSISTANT_MAX_INPUT), question: z.string().trim().min(1).max(ASSISTANT_MAX_QUESTION) })
      .strict()
      .nullish(),
  })
  .strict();

export function assistantStatus(mode: AssistantMode) {
  return NextResponse.json<AssistantStatusBody>({ available: mode !== "off" }, { headers: NO_STORE });
}

/**
 * POST /api/assistant. Ordre : configuration (sans clé => 503 sans rien consommer), origine, corps (taille,
 * schéma), quotas (base partagée), appel au modèle, validation des appels d'outils. Le texte saisi n'est ni
 * journalisé ni stocké.
 */
export async function handleAssistantPost(request: Request, deps: AssistantDeps): Promise<NextResponse> {
  if (deps.mode === "off") return errorResponse("UNAVAILABLE");
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

  try {
    const database = await deps.database();
    const quota = await consumeAssistantQuota(database, clientIp(request.headers), deps.quota, deps.now());
    if (!quota.ok) return errorResponse(quota.code, quota.retryAfterSec);
  } catch (err) {
    console.error("[assistant] limitation de débit indisponible", { error: err instanceof Error ? err.name : typeof err });
    return errorResponse("UNAVAILABLE");
  }

  const t = deps.today();
  try {
    const result = await runAssistant({ text: body.data.text, previous: body.data.previous ?? null }, { client: deps.client(t), ctx: { today: t, demo: deps.demo } });
    return NextResponse.json<AssistantResponseBody>({ status: "ok", result }, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof AssistantFailure) return errorResponse(err.code);
    console.error("[assistant] erreur inattendue", { error: err instanceof Error ? err.name : typeof err });
    return errorResponse("UNAVAILABLE");
  }
}
