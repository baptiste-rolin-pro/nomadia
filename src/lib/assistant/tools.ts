/**
 * Outils proposés au modèle (`strict: true`, `tool_choice` auto) et schémas Zod qui revalident chaque entrée
 * côté serveur. Les schémas JSON n'utilisent que ce que le mode strict accepte (types, `enum`, `anyOf`,
 * `format: "date"`, `additionalProperties: false`) : les bornes numériques et les règles métier sont vérifiées
 * ensuite par les schémas de recherche du site (src/lib/search/params.ts) dans actions.ts.
 * Toutes les propriétés sont requises ; « absent » s'exprime par `null` ou une liste vide.
 * Ordre et contenu figés : ils font partie du préfixe mis en cache.
 */
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { CABIN_IDS, CITY_IDS, DESTINATION_SLUGS, HALF_HOURS, PLACE_IDS, RESIDENCE_CODES } from "@/lib/assistant/catalog";

type Tool = Anthropic.Beta.Messages.BetaTool;

export const TOOL_NAMES = ["search_flights", "search_hotels", "search_cars", "open_destination", "plan_trip", "ask_clarification"] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

const date = (description: string) => ({ type: "string", format: "date", description });
const assumptions = {
  type: "array",
  items: { type: "string" },
  description:
    "Ce que tu as supposé faute de précision dans la demande, en français, une courte phrase par élément (par exemple « Départ supposé : Paris », « Dates choisies : premier week-end de mars »). Liste vide si rien n'a été supposé.",
};

function tool(name: ToolName, description: string, properties: Record<string, unknown>): Tool {
  return {
    name,
    description,
    strict: true,
    input_schema: { type: "object", properties, required: Object.keys(properties), additionalProperties: false },
  };
}

export const ASSISTANT_TOOLS: Tool[] = [
  tool(
    "search_flights",
    "Ouvre la recherche de vols de Nomadia, préremplie. Appelle-le quand la demande implique de prendre l'avion (vol, billet, aller-retour, ou un séjour dans une destination éloignée du départ). Ne réserve rien.",
    {
      origin: { type: "string", enum: PLACE_IDS, description: "Lieu de départ. Une ville (city:…) sauf si un aéroport est nommé. Si la demande ne le précise pas : city:PAR, à signaler dans assumptions." },
      destination: { type: "string", enum: PLACE_IDS, description: "Lieu d'arrivée. Une ville (city:…) sauf si un aéroport est nommé." },
      departDate: date("Date de l'aller (AAAA-MM-JJ)."),
      returnDate: { anyOf: [{ type: "string", format: "date" }, { type: "null" }], description: "Date du retour (AAAA-MM-JJ), ou null pour un aller simple." },
      adults: { type: "integer", description: "Adultes (12 ans et plus), de 1 à 9." },
      childrenAges: { type: "array", items: { type: "integer" }, description: "Âge de chaque enfant de 2 à 11 ans ; liste vide s'il n'y en a pas." },
      infants: { type: "integer", description: "Bébés de moins de 2 ans, sur les genoux d'un adulte ; 0 s'il n'y en a pas." },
      cabin: { type: "string", enum: CABIN_IDS, description: "Cabine ; economy si rien n'est précisé." },
      assumptions,
    },
  ),
  tool(
    "search_hotels",
    "Ouvre la recherche d'hébergements de Nomadia, préremplie, pour une ville. Appelle-le quand la demande implique de dormir sur place (hôtel, nuits, séjour, week-end). Ne réserve rien.",
    {
      destination: { type: "string", enum: CITY_IDS, description: "Ville de l'hébergement (identifiant city:…)." },
      checkIn: date("Date d'arrivée (AAAA-MM-JJ)."),
      checkOut: date("Date de départ (AAAA-MM-JJ), au moins le lendemain de l'arrivée, 30 nuits au plus."),
      rooms: {
        type: "array",
        description: "Chambres (5 au plus). Par défaut une seule chambre pour tout le groupe si elle compte 4 adultes au plus.",
        items: {
          type: "object",
          properties: {
            adults: { type: "integer", description: "Adultes dans la chambre, de 1 à 4." },
            childrenAges: { type: "array", items: { type: "integer" }, description: "Âge de chaque enfant (0 à 17 ans), 3 au plus ; liste vide sinon." },
          },
          required: ["adults", "childrenAges"],
          additionalProperties: false,
        },
      },
      assumptions,
    },
  ),
  tool(
    "search_cars",
    "Ouvre la recherche de location de voitures de Nomadia, préremplie. Appelle-le quand la demande mentionne une voiture, une location ou un road trip. Avec un vol, prends la voiture à l'aéroport d'arrivée le jour de l'arrivée et rends-la le jour du retour. Ne réserve rien.",
    {
      pickupPlace: { type: "string", enum: PLACE_IDS, description: "Lieu de prise en charge (aéroport ou ville)." },
      dropoffPlace: { type: "string", enum: PLACE_IDS, description: "Lieu de restitution ; le même que la prise en charge si rien n'est précisé." },
      pickupDate: date("Date de prise en charge (AAAA-MM-JJ)."),
      pickupTime: { type: "string", enum: HALF_HOURS, description: "Heure locale de prise en charge ; 12:00 si non précisée (à signaler)." },
      dropoffDate: date("Date de restitution (AAAA-MM-JJ), 60 jours au plus après la prise en charge."),
      dropoffTime: { type: "string", enum: HALF_HOURS, description: "Heure locale de restitution ; 10:00 si non précisée (à signaler)." },
      driverAge: { type: "integer", description: "Âge du conducteur principal (18 à 99) ; 30 si non précisé, à signaler." },
      residence: { type: "string", enum: RESIDENCE_CODES, description: "Pays de résidence du conducteur ; FR si non précisé." },
      assumptions,
    },
  ),
  tool(
    "open_destination",
    "Ouvre la fiche d'une destination éditoriale (idées, saisons, formalités). Appelle-le quand l'utilisateur veut découvrir ou se renseigner sur une destination sans dates précises.",
    {
      destination: { type: "string", enum: DESTINATION_SLUGS, description: "Identifiant de la destination." },
    },
  ),
  tool(
    "plan_trip",
    "Préremplit le formulaire « Organiser mon voyage » (carnet daté qui rassemblera ensuite vols, hébergements et voiture). Appelle-le quand l'utilisateur demande d'organiser ou de préparer un voyage, un séjour de plusieurs jours ou un itinéraire. Le voyage n'est créé qu'après sa validation du formulaire.",
    {
      destination: { type: "string", enum: DESTINATION_SLUGS, description: "Destination éditoriale du voyage." },
      startDate: date("Premier jour du voyage (AAAA-MM-JJ)."),
      endDate: date("Dernier jour du voyage (AAAA-MM-JJ) ; pour « 5 jours », 4 jours après le premier."),
      adults: { type: "integer", description: "Adultes, de 1 à 9." },
      children: { type: "integer", description: "Enfants, de 0 à 8." },
      assumptions,
    },
  ),
  tool(
    "ask_clarification",
    "Pose une seule question courte en français quand une information indispensable manque (dates ou période, destination, composition d'une famille, âge des enfants pour un vol) ou quand la demande est ambiguë. N'appelle aucun autre outil dans la même réponse.",
    {
      question: { type: "string", description: "La question, une phrase de 200 caractères au plus, sans lien." },
    },
  ),
];

// ---------------------------------------------------------------------------
// Revalidation serveur des entrées (le mode strict ne remplace pas une vérification : elle protège aussi le
// mode simulé et toute sortie inattendue). `.strict()` : toute propriété en plus (par exemple une URL) est refusée.

const civilString = z.string().max(10);
const assumptionsInput = z.array(z.string().max(400)).max(8);
const placeId = z.enum(PLACE_IDS);

export const toolInputSchemas = {
  search_flights: z
    .object({
      origin: placeId,
      destination: placeId,
      departDate: civilString,
      returnDate: civilString.nullable(),
      adults: z.number().int(),
      childrenAges: z.array(z.number().int()).max(8),
      infants: z.number().int(),
      cabin: z.enum(CABIN_IDS),
      assumptions: assumptionsInput,
    })
    .strict(),
  search_hotels: z
    .object({
      destination: z.enum(CITY_IDS),
      checkIn: civilString,
      checkOut: civilString,
      rooms: z.array(z.object({ adults: z.number().int(), childrenAges: z.array(z.number().int()).max(3) }).strict()).min(1).max(5),
      assumptions: assumptionsInput,
    })
    .strict(),
  search_cars: z
    .object({
      pickupPlace: placeId,
      dropoffPlace: placeId,
      pickupDate: civilString,
      pickupTime: z.enum(HALF_HOURS),
      dropoffDate: civilString,
      dropoffTime: z.enum(HALF_HOURS),
      driverAge: z.number().int(),
      residence: z.enum(RESIDENCE_CODES),
      assumptions: assumptionsInput,
    })
    .strict(),
  open_destination: z.object({ destination: z.enum(DESTINATION_SLUGS) }).strict(),
  plan_trip: z
    .object({
      destination: z.enum(DESTINATION_SLUGS),
      startDate: civilString,
      endDate: civilString,
      adults: z.number().int(),
      children: z.number().int(),
      assumptions: assumptionsInput,
    })
    .strict(),
  ask_clarification: z.object({ question: z.string().min(1).max(1000) }).strict(),
} as const;

export type ToolInput<N extends ToolName> = z.infer<(typeof toolInputSchemas)[N]>;

export function isToolName(name: string): name is ToolName {
  return (TOOL_NAMES as readonly string[]).includes(name);
}
