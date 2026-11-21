/**
 * Conversion d'une entrée d'outil en action affichable : revalidation par les schémas de recherche du site,
 * contrôle des dates par rapport à aujourd'hui, construction du chemin par le serveur, puis relecture de ce
 * chemin par le même analyseur que la page de destination (aller-retour identique, sinon refus).
 * Le modèle ne fournit jamais d'URL : seulement des identifiants de lieux, des dates et des nombres.
 * Titres, détails, remarques et problèmes sont rendus dans la langue de la page (`ctx.locale`) ; le chemin porte
 * le préfixe de cette langue (« /en/vols?… »), le français n'en a pas.
 */
import { addDays, compareCivil, isCivilDate, nightsBetween, type CivilDate } from "@/lib/dates";
import { getPlace } from "@/lib/content/places";
import { getDestination } from "@/lib/content/destinations";
import { destinationText } from "@/lib/content/localized";
import { DEFAULT_LOCALE, localizePath, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { sayFor, type Say } from "@/lib/assistant/parser/say";
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
  issueText,
  type SearchIssue,
} from "@/lib/search/params";
import { demoCarsCovered, demoFlightCovered, demoHotelsCovered } from "@/lib/assistant/catalog";
import { isToolName, toolInputSchemas, type ToolInput, type ToolName } from "@/lib/assistant/tools";
import { ASSISTANT_MAX_QUESTION, isAssistantHref, type AssistantAction, type AssistantResult } from "@/lib/assistant/types";

/** Étapes au plus par demande (modèle ou analyse locale). */
export const MAX_ACTIONS = 4;

export type ActionOutcome = { ok: true; action: AssistantAction } | { ok: false; step: string; issues: string[] };

export interface ActionContext {
  today: CivilDate;
  /** Services en mode DEMO (remarque « aucune offre de démonstration » quand la recherche sort de la couverture). */
  demo: { flights: boolean; hotels: boolean; cars: boolean };
  /** Langue de la page : textes et chemins des actions (français par défaut). */
  locale?: Locale;
}

const sayOf = (ctx: { locale?: Locale }) => sayFor(ctx.locale ?? DEFAULT_LOCALE);
const stepLabel = (say: Say, name: Exclude<ToolName, "ask_clarification"> | "assistant") => say.m.steps[name];

/** Hypothèses affichées par étape (le modèle en donne 4 au plus ; l'analyse locale regroupe au-delà de 6). */
export const MAX_ASSUMPTIONS = 6;
export const MAX_ASSUMPTION_LENGTH = 140;
const URL_LIKE = /\b(?:https?:\/\/|www\.)\S+|\b[\w-]+(?:\.[\w-]+)*\.(?:com|net|org|fr|io|ai|co|info|biz|xyz|ru|cn|app|dev|link|ly)(?:\/\S*)?/gi;
// Caractères de contrôle, de mise en forme bidirectionnelle et balises : retirés du texte affiché.
const CONTROL = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩<>]/g;

/** Texte du modèle affiché tel quel (React l'échappe) : nettoyé, sans lien, borné. */
export function cleanModelText(text: string, max: number, locale: Locale = DEFAULT_LOCALE): string {
  const cleaned = text.replace(CONTROL, " ").replace(URL_LIKE, getMessages(locale).assistant.issues.linkRemoved).replace(/\s+/g, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max - 1).trimEnd()}…` : cleaned;
}

export function cleanAssumptions(list: string[], locale: Locale = DEFAULT_LOCALE): string[] {
  return list
    .map((a) => cleanModelText(a, MAX_ASSUMPTION_LENGTH, locale))
    .filter(Boolean)
    .slice(0, MAX_ASSUMPTIONS);
}

export function cleanQuestion(question: string, locale: Locale = DEFAULT_LOCALE): string {
  return cleanModelText(question, ASSISTANT_MAX_QUESTION, locale);
}

/** Problèmes de validation (codes des schémas de recherche) dans la langue de réponse. */
function issueMessages(issues: SearchIssue[], say: Say): string[] {
  return [...new Set(issues.map((i) => issueText(i, getMessages(say.locale).search.validation, (msg, params) => say.t(msg, params))))];
}

function zodIssues(error: { issues: { message: string; path: PropertyKey[] }[] }, say: Say): string[] {
  return issueMessages(
    error.issues.map((i) => ({ field: String(i.path[0] ?? ""), code: i.message as SearchIssue["code"] })),
    say,
  );
}

/** Vérifie que le chemin construit est relu à l'identique par la page (même analyseur) et reste interne. */
function finalize(action: AssistantAction, reparsed: boolean, say: Say): ActionOutcome {
  const href = localizePath(say.locale, action.href);
  if (!reparsed || !isAssistantHref(href)) return { ok: false, step: stepLabel(say, action.kind), issues: [say.m.issues.incoherent] };
  return { ok: true, action: { ...action, href } };
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ---------------------------------------------------------------------------

function flights(input: ToolInput<"search_flights">, ctx: ActionContext): ActionOutcome {
  const say = sayOf(ctx);
  const d = say.m.details;
  const step = stepLabel(say, "search_flights");
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
  if (!parsed.success) return { ok: false, step, issues: zodIssues(parsed.error, say) };
  const p = parsed.data;
  const dates = [{ field: "departDate", date: p.departDate }, ...(p.returnDate ? [{ field: "returnDate", date: p.returnDate }] : [])];
  const window = dateWindowIssues(dates, ctx.today);
  if (window.length) return { ok: false, step, issues: issueMessages(window, say) };
  const query = flightSearchToQuery(p);
  const notes: string[] = [];
  if (ctx.demo.flights && !demoFlightCovered(p.origin, p.destination)) notes.push(d.noFlightDemo);
  const m = getMessages(say.locale).search;
  return finalize(
    {
      kind: "search_flights",
      title: say.t(d.flightTitle, { from: say.placeShort(p.origin), to: say.placeShort(p.destination) }),
      details: [
        say.t(d.route, { from: say.placeLabel(p.origin), to: say.placeLabel(p.destination) }),
        p.returnDate ? say.t(d.roundTrip, { from: say.day(p.departDate), to: say.day(p.returnDate) }) : say.t(d.oneWay, { date: say.day(p.departDate) }),
        say.t(d.travellers, { summary: say.t(m.travelers.flightSummary, { adults: p.adults, children: p.childrenAges.length, infants: p.infants }) }),
        say.t(d.cabin, { cabin: (m.cabins as Record<string, string>)[p.cabin] ?? p.cabin }),
      ],
      assumptions: cleanAssumptions(input.assumptions, say.locale),
      notes,
      href: `/vols?${query.toString()}`,
    },
    same(parseFlightSearch(query).params, p),
    say,
  );
}

function hotels(input: ToolInput<"search_hotels">, ctx: ActionContext): ActionOutcome {
  const say = sayOf(ctx);
  const d = say.m.details;
  const step = stepLabel(say, "search_hotels");
  if (getPlace(input.destination)?.kind !== "city") return { ok: false, step, issues: [say.m.issues.cityForHotel] };
  const parsed = hotelSearchSchema.safeParse({ destination: input.destination, checkIn: input.checkIn, checkOut: input.checkOut, rooms: input.rooms });
  if (!parsed.success) return { ok: false, step, issues: zodIssues(parsed.error, say) };
  const p = parsed.data;
  const window = dateWindowIssues([{ field: "checkIn", date: p.checkIn }], ctx.today);
  if (window.length) return { ok: false, step, issues: issueMessages(window, say) };
  const query = hotelSearchToQuery(p);
  const nights = nightsBetween(p.checkIn, p.checkOut);
  const notes: string[] = [];
  if (ctx.demo.hotels && !demoHotelsCovered(p.destination)) notes.push(d.noHotelDemo);
  const adults = p.rooms.reduce((n, r) => n + r.adults, 0);
  const children = p.rooms.reduce((n, r) => n + r.childrenAges.length, 0);
  return finalize(
    {
      kind: "search_hotels",
      title: say.t(d.hotelTitle, { place: say.placeShort(p.destination) }),
      details: [
        say.placeLabel(p.destination),
        say.t(d.stay, { from: say.day(p.checkIn), to: say.day(p.checkOut), nights }),
        say.t(getMessages(say.locale).search.travelers.roomsSummary, { rooms: p.rooms.length, adults, children }),
      ],
      assumptions: cleanAssumptions(input.assumptions, say.locale),
      notes,
      href: `/hotels?${query.toString()}`,
    },
    same(parseHotelSearch(query).params, p),
    say,
  );
}

function cars(input: ToolInput<"search_cars">, ctx: ActionContext): ActionOutcome {
  const say = sayOf(ctx);
  const d = say.m.details;
  const step = stepLabel(say, "search_cars");
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
  if (!parsed.success) return { ok: false, step, issues: zodIssues(parsed.error, say) };
  const p = parsed.data;
  const window = dateWindowIssues([{ field: "pickupDate", date: p.pickupDate }], ctx.today);
  if (window.length) return { ok: false, step, issues: issueMessages(window, say) };
  const query = carSearchToQuery(p);
  const notes: string[] = [];
  if (ctx.demo.cars && !demoCarsCovered(p.pickupPlace)) notes.push(d.noCarDemo);
  const oneWay = p.dropoffPlace !== p.pickupPlace;
  const residences = getMessages(say.locale).search.residences as Record<string, string>;
  return finalize(
    {
      kind: "search_cars",
      title: say.t(d.carTitle, { place: say.placeShort(p.pickupPlace) }),
      details: [
        say.t(d.pickup, { place: say.placeLabel(p.pickupPlace), date: say.day(p.pickupDate), time: say.time(p.pickupTime) }),
        say.t(d.dropoff, { place: oneWay ? say.placeLabel(p.dropoffPlace) : d.samePlace, date: say.day(p.dropoffDate), time: say.time(p.dropoffTime) }),
        say.t(d.driver, { age: p.driverAge, country: residences[p.residence] ?? p.residence }),
      ],
      assumptions: cleanAssumptions(input.assumptions, say.locale),
      notes,
      href: `/voitures?${query.toString()}`,
    },
    same(parseCarSearch(query).params, p),
    say,
  );
}

function destination(input: ToolInput<"open_destination">, ctx: ActionContext): ActionOutcome {
  const say = sayOf(ctx);
  const t = say.m.details;
  const d = getDestination(input.destination);
  if (!d) return { ok: false, step: stepLabel(say, "open_destination"), issues: [say.m.issues.unknownDestination] };
  const text = destinationText(d, say.locale);
  const name = text.name;
  return finalize(
    {
      kind: "open_destination",
      title: say.t(t.discoverTitle, { name }),
      details: [say.t(t.destination, { name, country: text.country }), say.t(t.destinationStay, { stayType: text.stayType, min: d.duration.min, max: d.duration.max })],
      assumptions: [],
      notes: d.demoOffers ? [] : [t.noDemoOffers],
      href: `/destinations/${d.slug}`,
    },
    true,
    say,
  );
}

/** Mêmes règles que le préremplissage de /voyage/nouveau et que la création du voyage (actions.ts). */
function trip(input: ToolInput<"plan_trip">, ctx: ActionContext): ActionOutcome {
  const say = sayOf(ctx);
  const t = say.m.details;
  const is = say.m.issues;
  const step = stepLabel(say, "plan_trip");
  const d = getDestination(input.destination);
  const issues: string[] = [];
  if (!d) issues.push(is.unknownDestination);
  if (!isCivilDate(input.startDate)) issues.push(is.startInvalid);
  if (!isCivilDate(input.endDate)) issues.push(is.endInvalid);
  if (!Number.isInteger(input.adults) || input.adults < 1 || input.adults > 9) issues.push(is.adults);
  if (!Number.isInteger(input.children) || input.children < 0 || input.children > 8) issues.push(is.children);
  if (!issues.length) {
    if (compareCivil(input.endDate, input.startDate) < 0) issues.push(is.endBeforeStart);
    else if (nightsBetween(input.startDate, input.endDate) > 60) issues.push(is.tooLong);
    issues.push(...issueMessages(dateWindowIssues([{ field: "startDate", date: input.startDate }], ctx.today), say));
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
  const units = getMessages(say.locale).common.units;
  return finalize(
    {
      kind: "plan_trip",
      title: say.t(t.tripTitle, { name: destinationText(d, say.locale).name }),
      details: [
        say.t(t.tripDates, { from: say.day(input.startDate), to: say.day(input.endDate), days }),
        [say.t(units.adults, { n: input.adults }), input.children ? say.t(units.children, { n: input.children }) : null].filter(Boolean).join(say.m.sep),
      ],
      assumptions: cleanAssumptions(input.assumptions, say.locale),
      notes: [t.tripNote],
      href: `/voyage/nouveau?${query.toString()}`,
    },
    true,
    say,
  );
}

/** Valide une entrée d'outil (hors `ask_clarification`) et construit l'action correspondante. */
export function buildAction(name: string, rawInput: unknown, ctx: ActionContext): ActionOutcome {
  const say = sayOf(ctx);
  const incomplete = say.m.issues.incomplete;
  if (!isToolName(name) || name === "ask_clarification") return { ok: false, step: stepLabel(say, "assistant"), issues: [say.m.issues.unknownAction] };
  const step = stepLabel(say, name);
  switch (name) {
    case "search_flights": {
      const r = toolInputSchemas.search_flights.safeParse(rawInput);
      return r.success ? flights(r.data, ctx) : { ok: false, step, issues: [incomplete] };
    }
    case "search_hotels": {
      const r = toolInputSchemas.search_hotels.safeParse(rawInput);
      return r.success ? hotels(r.data, ctx) : { ok: false, step, issues: [incomplete] };
    }
    case "search_cars": {
      const r = toolInputSchemas.search_cars.safeParse(rawInput);
      return r.success ? cars(r.data, ctx) : { ok: false, step, issues: [incomplete] };
    }
    case "open_destination": {
      const r = toolInputSchemas.open_destination.safeParse(rawInput);
      return r.success ? destination(r.data, ctx) : { ok: false, step, issues: [say.m.issues.unknownDestination] };
    }
    case "plan_trip": {
      const r = toolInputSchemas.plan_trip.safeParse(rawInput);
      return r.success ? trip(r.data, ctx) : { ok: false, step, issues: [incomplete] };
    }
  }
}

/**
 * Appels d'outils (du modèle ou de l'analyse locale) => résultat pour le navigateur. Chaque appel passe par
 * buildAction ; une étape invalide n'est jamais retirée en silence : toute la demande revient en question.
 */
export function resultFromCalls(calls: { name: string; input: unknown }[], ctx: ActionContext): AssistantResult {
  const say = sayOf(ctx);
  if (calls.length > MAX_ACTIONS) {
    return { type: "clarification", question: say.t(say.m.questions.tooMany, { max: MAX_ACTIONS }) };
  }
  const actions: AssistantAction[] = [];
  const problems: string[] = [];
  for (const call of calls) {
    const outcome = buildAction(call.name, call.input, ctx);
    if (outcome.ok) actions.push(outcome.action);
    else problems.push(say.t(say.m.questions.problem, { step: outcome.step, issues: outcome.issues.join(" ") }));
  }
  if (problems.length) {
    return { type: "clarification", question: cleanQuestion(say.t(say.m.questions.failed, { problems: problems.join(" ") }), say.locale) };
  }
  return { type: "actions", actions };
}

/** Dernier jour réservable (indiqué au modèle dans la partie variable du prompt). */
export function bookingHorizon(today: CivilDate): CivilDate {
  return addDays(today, MAX_BOOKING_HORIZON_DAYS);
}
