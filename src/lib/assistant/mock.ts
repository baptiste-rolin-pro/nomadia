/**
 * Modèle SIMULÉ pour les tests de parcours (`NOMADIA_ASSISTANT_MOCK=e2e`, interdit sur Vercel et en production,
 * voir src/lib/env.ts) et les tests unitaires : aucune requête réseau. Il reçoit la vraie requête construite
 * par run.ts et renvoie des messages au format de l'API (appels d'outils), qui passent ensuite par la même
 * validation serveur que les réponses réelles. Scénarios choisis par mots-clés du texte saisi. Comme le vrai
 * modèle, il n'est appelé par la route qu'en repli (demande non comprise par src/lib/assistant/parser).
 */
import Anthropic from "@anthropic-ai/sdk";
import { addDays, weekday, type CivilDate } from "@/lib/dates";
import type { AssistantModelClient } from "@/lib/assistant/run";
import type { ToolName } from "@/lib/assistant/tools";

type Message = Anthropic.Beta.Messages.BetaMessage;
type ContentBlock = Anthropic.Beta.Messages.BetaContentBlock;

let counter = 0;

function message(content: ContentBlock[], stopReason: Message["stop_reason"]): Message {
  counter += 1;
  return {
    id: `msg_simule_${counter}`,
    type: "message",
    role: "assistant",
    model: "claude-opus-5-5",
    content,
    stop_reason: stopReason,
    stop_sequence: null,
    stop_details: null,
    container: null,
    context_management: null,
    diagnostics: null,
    usage: {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation: null,
      cache_creation_input_tokens: null,
      cache_read_input_tokens: null,
      fallback_credit: null,
      inference_geo: null,
      iterations: null,
      output_tokens_details: null,
      server_tool_use: null,
      service_tier: "standard",
      speed: null,
    },
  };
}

/** Réponse du modèle composée d'appels d'outils (entrées non validées, comme une sortie réelle). */
export function toolUseMessage(calls: { name: ToolName | string; input: unknown }[], stopReason: Message["stop_reason"] = "tool_use"): Message {
  return message(
    calls.map((c, i) => ({ type: "tool_use" as const, id: `toolu_simule_${counter}_${i}`, name: c.name, input: c.input })),
    stopReason,
  );
}

export function textMessage(text: string, stopReason: Message["stop_reason"] = "end_turn"): Message {
  return message([{ type: "text", text, citations: null }], stopReason);
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function lastUserText(params: Anthropic.Beta.Messages.MessageCreateParamsNonStreaming): string {
  const last = params.messages[params.messages.length - 1];
  return typeof last?.content === "string" ? last.content : "";
}

/** Prochain vendredi au moins `lead` jours après aujourd'hui. */
function nextFriday(today: CivilDate, lead: number): CivilDate {
  const start = addDays(today, lead);
  return addDays(start, (5 - weekday(start) + 7) % 7);
}

function count(text: string, word: RegExp, fallback: number): number {
  const m = word.exec(text);
  return m ? Number(m[1]) : fallback;
}

export function createMockClient(today: CivilDate): AssistantModelClient {
  return {
    async create(params) {
      const raw = normalize(lastUserText(params));
      const answer = /<reponse>([\s\S]*)<\/reponse>/.exec(raw)?.[1] ?? null;

      if (raw.includes("panne")) throw new Anthropic.APIConnectionError({ message: "Panne simulée" });

      // Le modèle n'est appelé qu'en repli, pour des demandes que l'analyse locale ne comprend pas (ni service ni
      // lieu reconnus) : ces scénarios utilisent donc des périphrases (« la ville éternelle », « le pays des geysers »).
      if (answer !== null && raw.includes("geysers")) {
        const start = addDays(today, 45);
        return toolUseMessage([
          {
            name: "plan_trip",
            input: { destination: "reykjavik", startDate: start, endDate: addDays(start, 4), adults: count(answer, /(\d+)\s*adulte/, 2), children: count(answer, /(\d+)\s*enfant/, 0), assumptions: [`Dates choisies : du ${start} pour 5 jours`] },
          },
        ]);
      }
      if (raw.includes("geysers")) {
        return toolUseMessage([{ name: "ask_clarification", input: { question: "Pour quelles dates partez-vous, et combien d'adultes et d'enfants êtes-vous ?" } }], "tool_use");
      }
      if (raw.includes("soleil levant")) return toolUseMessage([{ name: "open_destination", input: { destination: "kyoto" } }]);
      if (raw.includes("ville eternelle")) {
        const dep = addDays(today, 40);
        const ret = addDays(today, 44);
        // Sorties invalides : date passée (refusée par la validation serveur), propriété injectée (une URL).
        if (raw.includes("hier")) {
          return toolUseMessage([{ name: "search_flights", input: { origin: "city:PAR", destination: "city:ROM", departDate: addDays(today, -1), returnDate: null, adults: 1, childrenAges: [], infants: 0, cabin: "economy", assumptions: [] } }]);
        }
        if (raw.includes("lien")) return toolUseMessage([{ name: "open_destination", input: { destination: "rome", href: "https://exemple.invalid/piege" } }]);
        const adults = /pour 2|a deux|en amoureux/.test(raw) ? 2 : 1;
        const flight = { name: "search_flights", input: { origin: "city:PAR", destination: "city:ROM", departDate: dep, returnDate: ret, adults, childrenAges: [], infants: 0, cabin: "economy", assumptions: ["Départ supposé : Paris", ...(adults === 1 ? ["1 adulte (nombre non précisé)"] : [])] } };
        if (!raw.includes("tout compris")) return toolUseMessage([flight]);
        return toolUseMessage([flight, { name: "search_hotels", input: { destination: "city:ROM", checkIn: dep, checkOut: ret, rooms: [{ adults, childrenAges: [] }], assumptions: [] } }]);
      }

      // Scénarios directs (tests unitaires de run.ts, sans passer par l'analyse locale).
      // Réponse à une question de précision sur l'Islande en famille.
      if (answer !== null && raw.includes("islande")) {
        const start = addDays(today, 45);
        return toolUseMessage([
          {
            name: "plan_trip",
            input: { destination: "reykjavik", startDate: start, endDate: addDays(start, 4), adults: count(answer, /(\d+)\s*adulte/, 2), children: count(answer, /(\d+)\s*enfant/, 0), assumptions: [`Dates choisies : du ${start} pour 5 jours`] },
          },
        ]);
      }
      if (raw.includes("islande") && raw.includes("famille")) {
        return toolUseMessage([{ name: "ask_clarification", input: { question: "Pour quelles dates partez-vous, et combien d'adultes et d'enfants êtes-vous ?" } }], "tool_use");
      }
      if (raw.includes("lisbonne") && raw.includes("week-end")) {
        const fri = nextFriday(today, 14);
        const sun = addDays(fri, 2);
        const adults = /pour 2|a deux|en couple/.test(raw) ? 2 : 1;
        return toolUseMessage([
          { name: "search_flights", input: { origin: "city:PAR", destination: "city:LIS", departDate: fri, returnDate: sun, adults, childrenAges: [], infants: 0, cabin: "economy", assumptions: ["Départ supposé : Paris", "Dates choisies : un week-end du vendredi au dimanche"] } },
          { name: "search_hotels", input: { destination: "city:LIS", checkIn: fri, checkOut: sun, rooms: [{ adults, childrenAges: [] }], assumptions: [] } },
        ]);
      }
      if (raw.includes("rome")) {
        const dep = addDays(today, 40);
        const ret = addDays(today, 44);
        const adults = /pour 2|a deux|en couple/.test(raw) ? 2 : 1;
        const flight = { name: "search_flights", input: { origin: "city:PAR", destination: "city:ROM", departDate: dep, returnDate: ret, adults, childrenAges: [], infants: 0, cabin: "economy", assumptions: adults === 1 ? ["1 adulte (nombre non précisé)"] : [] } };
        if (!raw.includes("voiture")) return toolUseMessage([flight]);
        return toolUseMessage([
          flight,
          { name: "search_cars", input: { pickupPlace: "airport:FCO", dropoffPlace: "airport:FCO", pickupDate: dep, pickupTime: "12:00", dropoffDate: ret, dropoffTime: "10:00", driverAge: 30, residence: "FR", assumptions: ["Prise à 12 h et retour à 10 h", "Conducteur de 30 ans"] } },
        ]);
      }
      if (raw.includes("kyoto")) return toolUseMessage([{ name: "open_destination", input: { destination: "kyoto" } }]);
      // Sortie invalide : date passée (refusée par la validation serveur).
      if (raw.includes("hier")) {
        return toolUseMessage([{ name: "search_flights", input: { origin: "city:PAR", destination: "city:LIS", departDate: addDays(today, -1), returnDate: null, adults: 1, childrenAges: [], infants: 0, cabin: "economy", assumptions: [] } }]);
      }
      // Sortie « injectée » : propriété inattendue (une URL) ; refusée par le schéma strict.
      if (raw.includes("lien")) {
        return toolUseMessage([{ name: "open_destination", input: { destination: "rome", href: "https://exemple.invalid/piege" } }]);
      }
      return textMessage("Je ne peux aider qu'à préparer un voyage sur ce site.");
    },
  };
}
