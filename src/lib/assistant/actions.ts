/**
 * Conversion d'une entrée d'outil en action affichable : revalidation par les schémas de recherche du site,
 * contrôle des dates par rapport à aujourd'hui, construction du chemin par le serveur, puis relecture de ce
 * chemin par le même analyseur que la page de destination (aller-retour identique, sinon refus).
 * Le modèle ne fournit jamais d'URL : seulement des identifiants de lieux, des dates et des nombres.
 */
import { addDays, compareCivil, formatCivilDate, isCivilDate, nightsBetween, type CivilDate } from "@/lib/dates";
import { getPlace } from "@/lib/content/places";
import { getDestination } from "@/lib/content/destinations";
import { CABIN_LABELS } from "@/lib/providers/types";
import { flightTravelersSummary, roomsSummary } from "@/lib/search/summary";
import { residenceName } from "@/lib/search/residences";
import {
  MAX_BOOKING_HORIZON_DAYS,
  carSearchSchema,
  carSearchToQuery,
  dateWindowIssues,
  flightSearchSchema,
  flightSearchToQuery,
  hotelSearchSchema,
  hotelSearchToQuery,
  parseCarSearch,
  parseFlightSearch,
  parseHotelSearch,
  type SearchIssue,
} from "@/lib/search/params";
import { demoCarsCovered, demoFlightCovered, demoHotelsCovered, placeLabel, placeShortName } from "@/lib/assistant/catalog";
import { isToolName, toolInputSchemas, type ToolInput, type ToolName } from "@/lib/assistant/tools";
import { ASSISTANT_MAX_QUESTION, isAssistantHref, type AssistantAction } from "@/lib/assistant/types";

export type ActionOutcome = { ok: true; action: AssistantAction } | { ok: false; step: string; issues: string[] };

export interface ActionContext {
  today: CivilDate;
  /** Services en mode DEMO (remarque « aucune offre de démonstration » quand la recherche sort de la couverture). */
  demo: { flights: boolean; hotels: boolean; cars: boolean };
}

const STEP_LABELS: Record<Exclude<ToolName, "ask_clarification">, string> = {
  search_flights: "Vols",
  search_hotels: "Hébergement",
  search_cars: "Location de voiture",
  open_destination: "Destination",
  plan_trip: "Voyage",
};

const MAX_ASSUMPTIONS = 4;
const MAX_ASSUMPTION_LENGTH = 140;
const URL_LIKE = /\b(?:https?:\/\/|www\.)\S+|\b[\w-]+(?:\.[\w-]+)*\.(?:com|net|org|fr|io|ai|co|info|biz|xyz|ru|cn|app|dev|link|ly)(?:\/\S*)?/gi;
// Caractères de contrôle, de mise en forme bidirectionnelle et balises : retirés du texte affiché.
const CONTROL = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩<>]/g;

/** Texte du modèle affiché tel quel (React l'échappe) : nettoyé, sans lien, borné. */
export function cleanModelText(text: string, max: number): string {
  const cleaned = text.replace(CONTROL, " ").replace(URL_LIKE, "[lien retiré]").replace(/\s+/g, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1).trimEnd()}…` : cleaned;
}

export function cleanAssumptions(list: string[]): string[] {
  return list
    .map((a) => cleanModelText(a, MAX_ASSUMPTION_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_ASSUMPTIONS);
}

export function cleanQuestion(question: string): string {
  return cleanModelText(question, ASSISTANT_MAX_QUESTION);
}

const day = (d: CivilDate) => formatCivilDate(d, "weekday");
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

function issueMessages(issues: SearchIssue[] | { message: string }[]): string[] {
  return [...new Set(issues.map((i) => i.message))];
}

function zodIssues(error: { issues: { message: string }[] }): string[] {
  return issueMessages(error.issues);
}

/** Vérifie que le chemin construit est relu à l'identique par la page (même analyseur) et reste interne. */
function finalize(action: AssistantAction, reparsed: boolean): ActionOutcome {
  if (!reparsed || !isAssistantHref(action.href)) return { ok: false, step: STEP_LABELS[action.kind], issues: ["Paramètres de recherche incohérents."] };
  return { ok: true, action };
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ---------------------------------------------------------------------------

function flights(input: ToolInput<"search_flights">, ctx: ActionContext): ActionOutcome {
  const step = STEP_LABELS.search_flights;
  const candidate = {
    origin: input.origin,
    destination: input.destination,
    tripType: input.returnDate ? ("roundtrip" as const) : ("oneway" as const),
    departDate: input.departDate,
    returnDate: input.returnDate,
    adults: input.adults,
    childrenAges: input.childrenAges,
    infants: input.infants,
    cabin: input.cabin,
  };
  const parsed = flightSearchSchema.safeParse(candidate);
  if (!parsed.success) return { ok: false, step, issues: zodIssues(parsed.error) };
  const p = parsed.data;
  const dates = [{ field: "departDate", date: p.departDate }, ...(p.returnDate ? [{ field: "returnDate", date: p.returnDate }] : [])];
  const window = dateWindowIssues(dates, ctx.today);
  if (window.length) return { ok: false, step, issues: issueMessages(window) };
  const query = flightSearchToQuery(p);
  const notes: string[] = [];
  if (ctx.demo.flights && !demoFlightCovered(p.origin, p.destination)) notes.push("Aucune offre de démonstration sur ce trajet : la recherche risque d'être vide.");
  return finalize(
    {
      kind: "search_flights",
      title: `Vols ${placeShortName(p.origin)} → ${placeShortName(p.destination)}`,
      details: [
        `${placeLabel(p.origin)} → ${placeLabel(p.destination)}`,
        p.returnDate ? `Aller ${day(p.departDate)} · retour ${day(p.returnDate)}` : `Aller simple ${day(p.departDate)}`,
        `Voyageurs : ${flightTravelersSummary(p)}`,
        `Cabine : ${CABIN_LABELS[p.cabin]}`,
      ],
      assumptions: cleanAssumptions(input.assumptions),
      notes,
      href: `/vols?${query.toString()}`,
    },
    same(parseFlightSearch(query).params, p),
  );
}

function hotels(input: ToolInput<"search_hotels">, ctx: ActionContext): ActionOutcome {
  const step = STEP_LABELS.search_hotels;
  if (getPlace(input.destination)?.kind !== "city") return { ok: false, step, issues: ["Choisissez une ville pour l'hébergement."] };
  const parsed = hotelSearchSchema.safeParse({ destination: input.destination, checkIn: input.checkIn, checkOut: input.checkOut, rooms: input.rooms });
  if (!parsed.success) return { ok: false, step, issues: zodIssues(parsed.error) };
  const p = parsed.data;
  const window = dateWindowIssues([{ field: "checkIn", date: p.checkIn }], ctx.today);
  if (window.length) return { ok: false, step, issues: issueMessages(window) };
  const query = hotelSearchToQuery(p);
  const nights = nightsBetween(p.checkIn, p.checkOut);
  const notes: string[] = [];
  if (ctx.demo.hotels && !demoHotelsCovered(p.destination)) notes.push("Aucun hébergement de démonstration dans cette ville : la recherche risque d'être vide.");
  return finalize(
    {
      kind: "search_hotels",
      title: `Hébergement à ${placeShortName(p.destination)}`,
      details: [placeLabel(p.destination), `Arrivée ${day(p.checkIn)} · départ ${day(p.checkOut)} · ${plural(nights, "nuit", "nuits")}`, roomsSummary(p.rooms)],
      assumptions: cleanAssumptions(input.assumptions),
      notes,
      href: `/hotels?${query.toString()}`,
    },
    same(parseHotelSearch(query).params, p),
  );
}

function cars(input: ToolInput<"search_cars">, ctx: ActionContext): ActionOutcome {
  const step = STEP_LABELS.search_cars;
  const parsed = carSearchSchema.safeParse({
    pickupPlace: input.pickupPlace,
    dropoffPlace: input.dropoffPlace,
    pickupDate: input.pickupDate,
    pickupTime: input.pickupTime,
    dropoffDate: input.dropoffDate,
    dropoffTime: input.dropoffTime,
    driverAge: input.driverAge,
    residence: input.residence,
  });
  if (!parsed.success) return { ok: false, step, issues: zodIssues(parsed.error) };
  const p = parsed.data;
  const window = dateWindowIssues([{ field: "pickupDate", date: p.pickupDate }], ctx.today);
  if (window.length) return { ok: false, step, issues: issueMessages(window) };
  const query = carSearchToQuery(p);
  const notes: string[] = [];
  if (ctx.demo.cars && !demoCarsCovered(p.pickupPlace)) notes.push("Aucune agence de démonstration à ce lieu : la recherche risque d'être vide.");
  const oneWay = p.dropoffPlace !== p.pickupPlace;
  return finalize(
    {
      kind: "search_cars",
      title: `Voiture à ${placeShortName(p.pickupPlace)}`,
      details: [
        `Prise en charge : ${placeLabel(p.pickupPlace)}, ${day(p.pickupDate)} à ${p.pickupTime.replace(":", " h ")}`,
        `Restitution : ${oneWay ? `${placeLabel(p.dropoffPlace)}, ` : "même lieu, "}${day(p.dropoffDate)} à ${p.dropoffTime.replace(":", " h ")}`,
        `Conducteur : ${p.driverAge} ans · résidence ${residenceName(p.residence) ?? p.residence}`,
      ],
      assumptions: cleanAssumptions(input.assumptions),
      notes,
      href: `/voitures?${query.toString()}`,
    },
    same(parseCarSearch(query).params, p),
  );
}

function destination(input: ToolInput<"open_destination">): ActionOutcome {
  const d = getDestination(input.destination);
  if (!d) return { ok: false, step: STEP_LABELS.open_destination, issues: ["Destination inconnue."] };
  return finalize(
    {
      kind: "open_destination",
      title: `Découvrir ${d.name}`,
      details: [`${d.name}, ${d.country}`, `${d.stayType} · ${d.duration.min} à ${d.duration.max} jours conseillés`],
      assumptions: [],
      notes: d.demoOffers ? [] : ["Destination sans offres de démonstration : fiche et préparation du voyage seulement."],
      href: `/destinations/${d.slug}`,
    },
    true,
  );
}

/** Mêmes règles que le préremplissage de /voyage/nouveau et que la création du voyage (actions.ts). */
function trip(input: ToolInput<"plan_trip">, ctx: ActionContext): ActionOutcome {
  const step = STEP_LABELS.plan_trip;
  const d = getDestination(input.destination);
  const issues: string[] = [];
  if (!d) issues.push("Destination inconnue.");
  if (!isCivilDate(input.startDate)) issues.push("Date de début invalide.");
  if (!isCivilDate(input.endDate)) issues.push("Date de fin invalide.");
  if (!Number.isInteger(input.adults) || input.adults < 1 || input.adults > 9) issues.push("De 1 à 9 adultes.");
  if (!Number.isInteger(input.children) || input.children < 0 || input.children > 8) issues.push("De 0 à 8 enfants.");
  if (!issues.length) {
    if (compareCivil(input.endDate, input.startDate) < 0) issues.push("La fin du voyage précède son début.");
    else if (nightsBetween(input.startDate, input.endDate) > 60) issues.push("60 jours de voyage au plus.");
    issues.push(...issueMessages(dateWindowIssues([{ field: "startDate", date: input.startDate }], ctx.today)));
  }
  if (issues.length || !d) return { ok: false, step, issues };
  const days = nightsBetween(input.startDate, input.endDate) + 1;
  const query = new URLSearchParams({
    destination: d.slug,
    debut: input.startDate,
    fin: input.endDate,
    adultes: String(input.adults),
    enfants: String(input.children),
    origine: "assistant",
  });
  return finalize(
    {
      kind: "plan_trip",
      title: `Voyage à ${d.name}`,
      details: [`Du ${day(input.startDate)} au ${day(input.endDate)} · ${plural(days, "jour", "jours")}`, [plural(input.adults, "adulte", "adultes"), input.children ? plural(input.children, "enfant", "enfants") : null].filter(Boolean).join(", ")],
      assumptions: cleanAssumptions(input.assumptions),
      notes: ["Le voyage n'est créé qu'après votre validation du formulaire."],
      href: `/voyage/nouveau?${query.toString()}`,
    },
    true,
  );
}

/** Valide une entrée d'outil (hors `ask_clarification`) et construit l'action correspondante. */
export function buildAction(name: string, rawInput: unknown, ctx: ActionContext): ActionOutcome {
  if (!isToolName(name) || name === "ask_clarification") return { ok: false, step: "Assistant", issues: ["Action inconnue."] };
  const step = STEP_LABELS[name];
  switch (name) {
    case "search_flights": {
      const r = toolInputSchemas.search_flights.safeParse(rawInput);
      return r.success ? flights(r.data, ctx) : { ok: false, step, issues: ["Critères incomplets ou inattendus."] };
    }
    case "search_hotels": {
      const r = toolInputSchemas.search_hotels.safeParse(rawInput);
      return r.success ? hotels(r.data, ctx) : { ok: false, step, issues: ["Critères incomplets ou inattendus."] };
    }
    case "search_cars": {
      const r = toolInputSchemas.search_cars.safeParse(rawInput);
      return r.success ? cars(r.data, ctx) : { ok: false, step, issues: ["Critères incomplets ou inattendus."] };
    }
    case "open_destination": {
      const r = toolInputSchemas.open_destination.safeParse(rawInput);
      return r.success ? destination(r.data) : { ok: false, step, issues: ["Destination inconnue."] };
    }
    case "plan_trip": {
      const r = toolInputSchemas.plan_trip.safeParse(rawInput);
      return r.success ? trip(r.data, ctx) : { ok: false, step, issues: ["Critères incomplets ou inattendus."] };
    }
  }
}

/** Dernier jour réservable (indiqué au modèle dans la partie variable du prompt). */
export function bookingHorizon(today: CivilDate): CivilDate {
  return addDays(today, MAX_BOOKING_HORIZON_DAYS);
}
