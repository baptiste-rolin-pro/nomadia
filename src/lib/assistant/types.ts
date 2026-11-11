/**
 * Contrat entre la route `/api/assistant` et l'interface (aucune dépendance serveur : importable côté client).
 * Le serveur ne renvoie que ces types d'action, avec des chemins internes qu'il a construits lui-même à partir
 * de paramètres validés ; le texte du modèle n'est jamais une URL suivie par le navigateur.
 */

/** Longueur maximale d'une demande (et d'une réponse à une question de l'assistant). */
export const ASSISTANT_MAX_INPUT = 500;
/** Longueur maximale d'une question de précision renvoyée au client (et réémise par lui au tour suivant). */
export const ASSISTANT_MAX_QUESTION = 300;

export type AssistantActionKind = "search_flights" | "search_hotels" | "search_cars" | "open_destination" | "plan_trip";

export interface AssistantAction {
  kind: AssistantActionKind;
  /** Libellé court de l'étape (« Vols Paris → Rome »), construit par le serveur. */
  title: string;
  /** Ce qui a été compris (lieux, dates, voyageurs), construit par le serveur à partir des paramètres validés. */
  details: string[];
  /** Hypothèses signalées par le modèle quand la demande était imprécise (texte brut, borné, sans lien). */
  assumptions: string[];
  /** Remarques du serveur (couverture des offres de démonstration, rien n'est réservé…). */
  notes: string[];
  /** Chemin interne construit par le serveur (voir isAssistantHref). */
  href: string;
}

export type AssistantResult =
  | { type: "actions"; actions: AssistantAction[] }
  | { type: "clarification"; question: string }
  | { type: "out_of_scope"; message: string };

export type AssistantErrorCode = "INVALID" | "FORBIDDEN" | "RATE_LIMITED" | "DAILY_LIMIT" | "UNAVAILABLE" | "TIMEOUT";

export type AssistantResponseBody = { status: "ok"; result: AssistantResult } | { status: "error"; code: AssistantErrorCode; message: string };

export interface AssistantStatusBody {
  available: boolean;
}

export interface AssistantRequestBody {
  text: string;
  /** Tour précédent quand l'assistant a posé une question : demande initiale et question posée. */
  previous?: { request: string; question: string } | null;
}

/**
 * Chemins que le navigateur accepte de suivre. Défense en profondeur : le serveur ne construit déjà que ceux-là
 * (`URLSearchParams` encode tout caractère hors de cette liste).
 */
const HREF = /^\/(?:vols|hotels|voitures|voyage\/nouveau|destinations\/[a-z0-9-]+)(?:\?[A-Za-z0-9_.~*%&=+-]*)?$/;

export function isAssistantHref(href: unknown): href is string {
  return typeof href === "string" && href.length <= 600 && HREF.test(href);
}
