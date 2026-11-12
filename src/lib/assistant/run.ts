/**
 * REPLI de l'assistant : appelé seulement quand l'analyse locale (src/lib/assistant/parser) ne comprend pas la
 * demande et qu'une clé est configurée (src/lib/assistant/service.ts).
 * Une demande = une seule requête au modèle (pas de boucle : le référentiel des lieux est dans
 * le prompt, aucun outil de recherche de lieu n'est nécessaire). Le modèle répond par des appels d'outils ;
 * le serveur les valide et renvoie au navigateur une liste blanche d'actions avec des chemins qu'il a construits.
 * Le client du modèle est injecté : SDK officiel en exploitation, faux client dans les tests et le mode e2e.
 */
import Anthropic from "@anthropic-ai/sdk";
import type { CivilDate } from "@/lib/dates";
import { cleanQuestion, resultFromCalls, type ActionContext } from "@/lib/assistant/actions";
import { ASSISTANT_SYSTEM_PROMPT, volatileContext } from "@/lib/assistant/prompt";
import { ASSISTANT_TOOLS, toolInputSchemas } from "@/lib/assistant/tools";
import type { AssistantErrorCode, AssistantResult } from "@/lib/assistant/types";

export { MAX_ACTIONS } from "@/lib/assistant/actions";

type CreateParams = Anthropic.Beta.Messages.MessageCreateParamsNonStreaming;
type Message = Anthropic.Beta.Messages.BetaMessage;
type ToolUse = Anthropic.Beta.Messages.BetaToolUseBlock;

/** Seule méthode du SDK utilisée : `client.beta.messages.create` (bêta requise par `fallbacks`). */
export interface AssistantModelClient {
  create(params: CreateParams): Promise<Message>;
}

export const ASSISTANT_MODEL = "claude-opus-5-5";
/**
 * Effort « low » : tâche de routage et d'extraction (lieux, dates, voyageurs vers des appels d'outils), courte et
 * sensible à la latence ; un effort plus élevé allonge la réflexion sans améliorer ce type de sortie. La réflexion
 * reste adaptative (elle ne peut pas être désactivée sur ce modèle) et compte dans `max_tokens`.
 */
export const ASSISTANT_EFFORT = "low" as const;
/** Plafond de sortie par demande (réflexion + appels d'outils, quelques centaines de jetons en pratique). */
export const ASSISTANT_MAX_TOKENS = 4096;
/** Repli côté serveur en cas de refus par les classifieurs de sécurité (modèle choisi par l'API selon la catégorie). */
export const ASSISTANT_BETAS = ["server-side-fallback-2026-07-01"] as const;

export interface AssistantInput {
  text: string;
  previous?: { request: string; question: string } | null;
}

export class AssistantFailure extends Error {
  constructor(
    readonly code: Extract<AssistantErrorCode, "UNAVAILABLE" | "TIMEOUT">,
    readonly reason: string,
  ) {
    super(reason);
    this.name = "AssistantFailure";
  }
}

export const OUT_OF_SCOPE_MESSAGE =
  "Je prépare uniquement des recherches de vols, d'hébergements et de voitures, des fiches destination et des voyages sur Nomadia. Décrivez votre voyage : destination, dates et voyageurs.";
const REFUSAL_MESSAGE = "Je ne peux pas traiter cette demande. Décrivez un voyage à préparer : destination, dates et voyageurs.";
const GENERIC_QUESTION = "Pouvez-vous préciser votre demande : destination, dates et nombre de voyageurs ?";

/** Le texte du visiteur ne peut pas fermer les balises qui l'encadrent. */
function fence(text: string): string {
  return text.replace(/[<>]/g, (c) => (c === "<" ? "‹" : "›")).trim();
}

export function userContent(input: AssistantInput): string {
  if (input.previous) {
    return [
      `<demande_initiale>\n${fence(input.previous.request)}\n</demande_initiale>`,
      `<question_posee>\n${fence(input.previous.question)}\n</question_posee>`,
      `<reponse>\n${fence(input.text)}\n</reponse>`,
    ].join("\n");
  }
  return `<demande>\n${fence(input.text)}\n</demande>`;
}

/** Requête complète : outils et consignes stables d'abord (mis en cache), contexte du jour ensuite. */
export function buildAssistantRequest(input: AssistantInput, today: CivilDate): CreateParams {
  return {
    model: ASSISTANT_MODEL,
    max_tokens: ASSISTANT_MAX_TOKENS,
    betas: [...ASSISTANT_BETAS],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: ASSISTANT_EFFORT },
    tool_choice: { type: "auto" },
    tools: ASSISTANT_TOOLS,
    system: [
      { type: "text", text: ASSISTANT_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      { type: "text", text: volatileContext(today) },
    ],
    messages: [{ role: "user", content: userContent(input) }],
  };
}

/** Traduit la réponse du modèle en résultat sûr pour le navigateur (jamais de texte libre comme lien). */
export function interpretResponse(message: Message, ctx: ActionContext): AssistantResult {
  if (message.stop_reason === "refusal") return { type: "out_of_scope", message: REFUSAL_MESSAGE };
  if (message.stop_reason === "max_tokens" || message.stop_reason === "model_context_window_exceeded") {
    throw new AssistantFailure("UNAVAILABLE", `stop_reason ${message.stop_reason}`);
  }
  const calls = message.content.filter((b): b is ToolUse => b.type === "tool_use");
  // Aucun outil : demande hors sujet (le texte libre du modèle n'est pas affiché).
  if (calls.length === 0) return { type: "out_of_scope", message: OUT_OF_SCOPE_MESSAGE };

  const clarification = calls.find((c) => c.name === "ask_clarification");
  if (clarification) {
    const parsed = toolInputSchemas.ask_clarification.safeParse(clarification.input);
    const question = parsed.success ? cleanQuestion(parsed.data.question) : "";
    return { type: "clarification", question: question || GENERIC_QUESTION };
  }
  // Même validation et même construction des chemins que l'analyse locale (actions.ts).
  return resultFromCalls(calls, ctx);
}

/**
 * Appel au modèle avec les erreurs typées du SDK (de la plus précise à la plus générale). Aucun journal ne
 * contient le texte du visiteur : seulement la classe d'erreur, le statut HTTP et l'identifiant de requête.
 */
export async function callModel(client: AssistantModelClient, params: CreateParams): Promise<Message> {
  try {
    return await client.create(params);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) throw failure("UNAVAILABLE", "authentication", err);
    if (err instanceof Anthropic.RateLimitError) throw failure("UNAVAILABLE", "upstream_rate_limited", err);
    if (err instanceof Anthropic.APIConnectionTimeoutError) throw failure("TIMEOUT", "timeout", err);
    if (err instanceof Anthropic.APIConnectionError) throw failure("UNAVAILABLE", "connection", err);
    if (err instanceof Anthropic.BadRequestError) throw failure("UNAVAILABLE", "bad_request", err);
    if (err instanceof Anthropic.InternalServerError) throw failure("UNAVAILABLE", "upstream_error", err);
    if (err instanceof Anthropic.APIError) throw failure("UNAVAILABLE", "api_error", err);
    throw failure("UNAVAILABLE", "unexpected", err);
  }
}

function failure(code: AssistantFailure["code"], reason: string, err: unknown): AssistantFailure {
  const api = err instanceof Anthropic.APIError ? err : null;
  console.error("[assistant] échec de l'appel au modèle", {
    reason,
    error: err instanceof Error ? err.name : typeof err,
    status: api?.status ?? null,
    type: api?.type ?? null,
    errorCode: api?.errorCode ?? null,
    requestId: api?.requestID ?? null,
  });
  return new AssistantFailure(code, reason);
}

export async function runAssistant(input: AssistantInput, deps: { client: AssistantModelClient; ctx: ActionContext }): Promise<AssistantResult> {
  const message = await callModel(deps.client, buildAssistantRequest(input, deps.ctx.today));
  return interpretResponse(message, deps.ctx);
}
