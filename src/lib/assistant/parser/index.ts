/**
 * Assistant LOCAL : analyse déterministe d'une demande en français, sans service extérieur ni coût.
 * Il produit les MÊMES entrées d'outils que le modèle (src/lib/assistant/tools.ts), validées et converties en
 * chemins par le même code (src/lib/assistant/actions.ts : buildAction → finalize) : aucun second chemin de
 * construction d'URL. Résultat : des actions avec leurs hypothèses, UNE question précise quand il manque une
 * information, un message fixe pour une tentative d'injection ou une demande de réservation / paiement, ou
 * « non compris » (ni service ni lieu reconnus) : seul ce dernier cas peut être confié au modèle (repli).
 *
 * Tours successifs : la demande initiale et chaque réponse sont des segments (séparés par
 * ASSISTANT_TURN_SEPARATOR) ; chacun est analysé seul, puis le plus récent l'emporte pour chaque information.
 */
import { addDays, type CivilDate } from "@/lib/dates";
import { getDestination } from "@/lib/content/destinations";
import { getPlace, places } from "@/lib/content/places";
import { resultFromCalls, type ActionContext } from "@/lib/assistant/actions";
import { ASSISTANT_TURN_SEPARATOR, type AssistantResult } from "@/lib/assistant/types";
import { normalize, normalizeText, type Token } from "@/lib/assistant/parser/text";
import { DEFAULT_DROPOFF_TIME, DEFAULT_PICKUP_TIME, extractDates, resolveDates, type DateFacts } from "@/lib/assistant/parser/dates";
import { emptyPeople, extractDriver, extractFlightOptions, extractPeople, extractResidence, hasCounts, type Driver, type FlightOptions, type People } from "@/lib/assistant/parser/people";
import { destinationNames, findPlaces, previousWord, targetById, type PlaceMention, type Target } from "@/lib/assistant/parser/places";
import { BOOKING_WORDS, CAR_WORDS, DISCOVER_PHRASES, DISCOVER_WORDS, FLIGHT_WORDS, HOTEL_WORDS, PLAN_STRONG, PLAN_WEAK } from "@/lib/assistant/parser/vocabulary";

export type LocalOutcome =
  | { understood: true; confidence: "high" | "medium" | "low"; result: AssistantResult }
  | { understood: false; confidence: "none" };

export interface LocalInput {
  text: string;
  previous?: { request: string; question: string } | null;
}

type Kind = "open_destination" | "plan_trip" | "search_flights" | "search_hotels" | "search_cars";
type Hint = "travellers" | "childAges" | "driverAge" | "nights" | "origin" | "end" | "dates" | null;
type Role = "origin" | "destination" | "dropoff" | null;

export const INJECTION_MESSAGE =
  "Je prépare uniquement des recherches de vols, d'hébergements et de voitures, des fiches destination et des voyages sur Nomadia : je ne suis pas d'autres consignes. Décrivez votre voyage : destination, dates et voyageurs.";
export const BOOKING_MESSAGE =
  "Je ne réserve et ne paie rien : je prépare des recherches de vols, d'hébergements et de voitures, des fiches destination et des voyages, que vous vérifiez puis réservez vous-même. Décrivez votre voyage : destination, dates et voyageurs.";
export const BOOKING_NOTE = "Rien n'est réservé ni payé : l'assistant prépare seulement la recherche.";
export const LOCAL_EXAMPLES = ["Vol Paris–Rome du 12 au 16 juin pour 2", "Hôtel à Lisbonne 3 nuits à partir du 10 avril", "Organise-moi 5 jours en Islande en famille"];

/** Réponse quand rien n'est compris et qu'aucun repli n'est configuré : exemples + onglets classiques (interface). */
export function localHelp(): AssistantResult {
  return {
    type: "help",
    message: "Je n'ai pas compris votre demande. Indiquez une destination ou un service (vol, hôtel, voiture), par exemple :",
    examples: [...LOCAL_EXAMPLES],
  };
}

const MAX_ASSUMPTIONS = 6;
const ORIGINS_LIST = "Paris, Lyon, Marseille, Nice, Bordeaux, Nantes ou Toulouse";

// ---------------------------------------------------------------------------
// Injections et hors-sujet

const INJECTION = [
  /\b(ignore|ignorez|ignorer|oublie|oubliez|oublier|neglige|negligez)\b.{0,40}\b(instructions?|consignes?|regles?|prompt|ordres?|directives?)\b/,
  /\b(prompt|message|instructions?|consignes?) (systeme|system)\b/,
  /\bsystem prompt\b/,
  /\bjailbreak\b/,
  /\bmode (developpeur|developer|dev|admin|debug|dieu)\b/,
  /\btu es (maintenant|desormais|a present)\b/,
  /\b(ta|tes|votre|vos) (configuration|config|prompt|consignes|instructions|regles)\b/,
  /\b(cle|cles) (d )?api\b/,
  /\bapi key\b/,
];
const TAGS = /<\s*\/?\s*(system|demande|reponse|réponse|question_posee|demande_initiale|assistant|user|instructions?)\b/i;

export function isInjection(text: string): boolean {
  if (TAGS.test(text)) return true;
  const n = normalizeText(text);
  return INJECTION.some((re) => re.test(n));
}

// ---------------------------------------------------------------------------
// Analyse d'un segment

interface Located {
  mention: PlaceMention;
  role: Role;
  seg: number;
}

interface SegmentFacts {
  seg: number;
  dates: DateFacts;
  people: People;
  driver: Driver;
  flight: FlightOptions;
  located: Located[];
  words: string[];
}

const ORIGIN_PREPS = new Set(["de", "d", "du", "des", "depuis"]);
const DEST_PREPS = new Set(["a", "au", "aux", "en", "vers", "pour", "sur", "destination", "direction", "dans", "jusqu", "jusquau", "visiter", "decouvrir", "voir"]);
const HOME_VERBS = new Set(["habite", "habitons", "vis", "vivons", "suis", "sommes", "reside", "residons"]);
const DROPOFF_VERBS = new Set(["rendre", "rendue", "rendu", "rends", "restituer", "restitution", "restituee", "deposer", "deposee", "depot", "laisser", "laissee", "retour"]);
/** « l'aéroport de Lisbonne » : le lieu prend le rôle du mot « aéroport ». */
const PLACE_NOUNS = new Set(["aeroport", "aeroports", "ville", "centre", "region", "gare", "cote"]);

function roleAt(tokens: Token[], index: number): Role {
  const prev = previousWord(tokens, index);
  if (!prev) return null;
  if ((prev.word === "de" || prev.word === "d" || prev.word === "du") && PLACE_NOUNS.has(previousWord(tokens, prev.index)?.word ?? "")) {
    return roleAt(tokens, previousWord(tokens, prev.index)!.index);
  }
  if (ORIGIN_PREPS.has(prev.word) || prev.word === "entre") return "origin";
  if (DEST_PREPS.has(prev.word)) {
    const before = previousWord(tokens, prev.index)?.word ?? "";
    if (HOME_VERBS.has(before)) return "origin";
    if (DROPOFF_VERBS.has(before)) return "dropoff";
    return "destination";
  }
  return null;
}

function assignRoles(norm: string, tokens: Token[], mentions: PlaceMention[], seg: number, hint: Hint): Located[] {
  const located: Located[] = mentions.map((mention) => ({ mention, role: roleAt(tokens, mention.first), seg }));
  for (let k = 0; k + 1 < located.length; k++) {
    const a = located[k]!;
    const b = located[k + 1]!;
    const gap = norm.slice(tokens[a.mention.last]!.end, tokens[b.mention.first]!.start);
    // « Paris–Rome », « Paris → Rome », « Paris Rome » ; « entre Paris et Rome ».
    if (a.role === null && b.role === null && /^[\s\-→>/]+$/.test(gap) && !gap.includes("\n")) {
      a.role = "origin";
      b.role = "destination";
    } else if (a.role === null && b.role === "destination" && b.mention.first - a.mention.last <= 2) {
      a.role = "origin";
    } else if (a.role === "origin" && b.role === null && tokens[b.mention.first - 1]?.t === "et") {
      b.role = "destination";
    }
  }
  if (hint === "origin") for (const l of located) if (l.role === null) l.role = "origin";
  return located;
}

function parseSegment(text: string, seg: number, hint: Hint, today: CivilDate): SegmentFacts {
  const { norm, tokens } = normalize(text);
  const used = tokens.map(() => false);
  // Résidence d'abord : « je réside au Canada » ne fait pas du Canada une destination.
  const residence = extractResidence(tokens, used);
  const dates = extractDates(norm, tokens, used, today, hint === "end" ? "end" : "start");
  if (hint === "nights" && !dates.duration) {
    const k = tokens.findIndex((t, i) => !used[i] && t.n !== null && t.n >= 1 && t.n <= 30);
    if (k >= 0) {
      dates.duration = { nights: tokens[k]!.n!, label: `${tokens[k]!.n} nuits`, weekend: false };
      used[k] = true;
      dates.any = true;
    }
  }
  const people = extractPeople(tokens, used, hint === "travellers" || hint === "childAges" ? hint : null);
  const driver = extractDriver(tokens, used, hint === "driverAge" ? "driverAge" : null);
  driver.residence = residence;
  const flight = extractFlightOptions(tokens);
  const mentions = findPlaces(norm, tokens, used);
  return { seg, dates, people, driver, flight, located: assignRoles(norm, tokens, mentions, seg, hint), words: tokens.map((t) => t.t) };
}

// ---------------------------------------------------------------------------
// Fusion des segments (le plus récent l'emporte)

interface Merged {
  dates: DateFacts;
  people: People;
  driver: Driver;
  flight: FlightOptions;
  located: Located[];
  words: Set<string>;
}

function lastWith<T>(list: T[], pick: (x: T) => boolean): T | undefined {
  for (let k = list.length - 1; k >= 0; k--) if (pick(list[k]!)) return list[k];
  return undefined;
}

function merge(facts: SegmentFacts[]): Merged {
  const startOf = (f: SegmentFacts) => f.dates.atoms.some((a) => a.role === "start") || !!f.dates.weekend || !!f.dates.period;
  const startSrc = lastWith(facts, startOf);
  const endSrc = startSrc && startSrc.dates.atoms.some((a) => a.role === "end") ? startSrc : lastWith(facts, (f) => f.dates.atoms.some((a) => a.role === "end"));
  const lastDated = lastWith(facts, (f) => f.dates.any);
  const dates: DateFacts = {
    atoms: [...(startSrc?.dates.atoms.filter((a) => a.role === "start") ?? []), ...(endSrc?.dates.atoms.filter((a) => a.role === "end") ?? [])],
    period: startSrc?.dates.period ?? null,
    weekend: startSrc?.dates.weekend ?? null,
    duration: lastWith(facts, (f) => !!f.dates.duration)?.dates.duration ?? null,
    times: {
      pickup: lastWith(facts, (f) => !!f.dates.times.pickup)?.dates.times.pickup ?? null,
      dropoff: lastWith(facts, (f) => !!f.dates.times.dropoff)?.dates.times.dropoff ?? null,
      notes: facts.flatMap((f) => f.dates.times.notes),
    },
    invalid: lastDated?.dates.invalid ?? null,
    any: facts.some((f) => f.dates.any),
  };
  // Si la période vient d'un segment et le début explicite d'un autre, le plus récent a déjà gagné (startSrc).
  if (dates.atoms.some((a) => a.role === "start")) {
    dates.period = null;
    dates.weekend = null;
  }

  const counts = lastWith(facts, (f) => hasCounts(f.people));
  const people: People = counts ? { ...counts.people, childAges: [...counts.people.childAges] } : emptyPeople();
  people.family = facts.some((f) => f.people.family);
  const ages = lastWith(facts, (f) => f.people.childAges.length > 0);
  if (ages && ages !== counts) people.childAges = [...ages.people.childAges];
  people.kidsUnknown = facts.some((f) => f.people.kidsUnknown) && people.children === null && !people.childAges.length;
  people.group = facts.some((f) => f.people.group) && people.adults === null && people.total === null;
  people.rooms = lastWith(facts, (f) => f.people.rooms !== null)?.people.rooms ?? null;

  const driver: Driver = {
    age: lastWith(facts, (f) => f.driver.age !== null)?.driver.age ?? null,
    young: false,
    residence: lastWith(facts, (f) => f.driver.residence !== null)?.driver.residence ?? null,
  };
  driver.young = facts.some((f) => f.driver.young) && driver.age === null;
  const flight: FlightOptions = {
    cabin: lastWith(facts, (f) => f.flight.cabin !== null)?.flight.cabin ?? null,
    tripType: lastWith(facts, (f) => f.flight.tripType !== null)?.flight.tripType ?? null,
  };
  return { dates, people, driver, flight, located: facts.flatMap((f) => f.located), words: new Set(facts.flatMap((f) => f.words)) };
}

// ---------------------------------------------------------------------------
// Lieux : rôles finaux, ambiguïtés, lieux non proposés

const isAmbiguous = (m: PlaceMention) => m.options.length > 1 || (m.options[0]!.kind !== "unsupported" && m.options[0]!.targets.length > 1);
const groupsOf = (m: PlaceMention) => m.options.flatMap((o) => o.targets.map((t) => t.group));

interface PlacePick {
  origin: Located | null;
  destination: Located | null;
  dropoff: Located | null;
  question: string | null;
}

function pickPlaces(all: Located[]): PlacePick {
  // Ambiguïté levée par un autre lieu cité (« Portugal » puis « Lisbonne »).
  const resolved = all.filter((l) => !isAmbiguous(l.mention) && l.mention.options[0]!.kind !== "unsupported");
  let list = all.filter((l) => !isAmbiguous(l.mention) || !resolved.some((r) => groupsOf(l.mention).includes(r.mention.options[0]!.targets[0]!.group)));
  // Pour chaque rôle, seul le segment le plus récent compte (une réponse remplace la demande initiale).
  const latest = (roles: Role[]) => {
    const of = list.filter((l) => roles.includes(l.role));
    const seg = Math.max(-1, ...of.map((l) => l.seg));
    return of.filter((l) => l.seg === seg);
  };
  const destinations = latest(["destination", null]);
  const origins = latest(["origin"]);
  const dropoffs = latest(["dropoff"]);
  list = [...origins, ...destinations, ...dropoffs];

  for (const l of list) {
    const o = l.mention.options;
    if (o.length === 1 && o[0]!.kind === "unsupported") {
      return {
        origin: null,
        destination: null,
        dropoff: null,
        question:
          l.role === "origin"
            ? `Les départs de ${o[0]!.label} ne sont pas proposés sur Nomadia. De quelle ville partez-vous : ${ORIGINS_LIST} ?`
            : `${o[0]!.label} n'est pas proposé sur Nomadia. Quelle destination choisissez-vous : ${destinationNames().join(", ")} ?`,
      };
    }
    if (isAmbiguous(l.mention)) {
      const names = o.length > 1 ? o.map((e) => (e.kind === "place" ? e.targets[0]!.name : e.label)) : o[0]!.targets.map((t) => t.name);
      const choice = `${names.slice(0, -1).join(", ")} ou ${names[names.length - 1]}`;
      return { origin: null, destination: null, dropoff: null, question: o.length > 1 ? `Vous voulez dire ${choice} ?` : `${o[0]!.label} : quelle destination choisissez-vous, ${choice} ?` };
    }
  }
  // Même ville citée deux fois (« Rome (FCO) », « Paris CDG ») : le nom le plus précis (aéroport) l'emporte.
  const dedupe = (ls: Located[]) => {
    const byGroup = new Map<string, Located>();
    for (const l of ls) {
      const t = l.mention.options[0]!.targets[0]!;
      const prev = byGroup.get(t.group);
      if (!prev || (t.kind === "airport" && prev.mention.options[0]!.targets[0]!.kind === "city")) byGroup.set(t.group, l);
    }
    return [...byGroup.values()];
  };
  const dest = dedupe(destinations);
  if (dest.length > 1) {
    const names = dest.map((l) => l.mention.options[0]!.targets[0]!.name);
    return { origin: null, destination: null, dropoff: null, question: `Je prépare une destination à la fois : ${names.slice(0, -1).join(", ")} ou ${names[names.length - 1]} ?` };
  }
  return { origin: dedupe(origins).at(-1) ?? null, destination: dest[0] ?? null, dropoff: dedupe(dropoffs).at(-1) ?? null, question: null };
}

const targetOf = (l: Located): Target => l.mention.options[0]!.targets[0]!;

/** Ville d'hébergement d'un lieu (un aéroport se ramène à sa ville seulement si elle porte le même nom). */
function hotelCity(t: Target): Target | null {
  if (t.kind === "city") return t;
  const airport = getPlace(t.placeId);
  if (!airport) return null;
  const name = normalizeText(airport.city);
  const city = places.find((c) => c.kind === "city" && c.airports?.includes(airport.code) && normalizeText(c.city).includes(name));
  return city ? (targetById(city.id) ?? null) : null;
}

/** Aéroport d'arrivée d'un vol vers ce lieu (pour la voiture prise sur place). */
function arrivalAirport(t: Target): Target {
  if (t.kind === "airport") return t;
  const code = getPlace(t.placeId)?.airports?.[0];
  return (code && targetById(`airport:${code}`)) || t;
}

// ---------------------------------------------------------------------------
// Questions (une seule à la fois)

function questionHint(question: string): Hint {
  const n = normalizeText(question);
  if (/\bage\b/.test(n) && /enfant/.test(n)) return "childAges";
  if (/\bage\b/.test(n) && /conduct/.test(n)) return "driverAge";
  if (/combien de nuits/.test(n)) return "nights";
  if (/combien/.test(n) && /(adulte|enfant|voyageur|personne)/.test(n)) return "travellers";
  if (/partez vous|ville de depart/.test(n)) return "origin";
  if (/retour|rendrez/.test(n)) return "end";
  if (/date|quand|weekend|jusqu/.test(n)) return "dates";
  return null;
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

function capAssumptions(list: string[]): string[] {
  const unique = [...new Set(list.filter(Boolean))];
  if (unique.length <= MAX_ASSUMPTIONS) return unique;
  return [...unique.slice(0, MAX_ASSUMPTIONS - 1), unique.slice(MAX_ASSUMPTIONS - 1).join(" ; ")];
}

interface Party {
  adults: number;
  children: number;
  ages: (number | null)[];
  infants: number;
  assumption: string | null;
}

function resolveParty(p: People): { party: Party } | { question: string } {
  if (p.kidsUnknown && p.children === null) return { question: "Combien d'adultes et d'enfants êtes-vous ?" };
  let children = p.children ?? 0;
  if (p.childAges.length > children) children = p.childAges.length;
  let adults = p.adults;
  if (adults === null && p.total !== null) {
    const rest = p.total - children - p.infants;
    adults = rest >= 1 ? rest : p.total;
  }
  if (adults === null && p.companions) adults = 1 + p.companions;
  let assumption: string | null = null;
  if (adults === null) {
    if (p.group) return { question: "Combien de voyageurs êtes-vous ?" };
    if (p.family && children === 0 && p.infants === 0) return { question: "Combien d'adultes et d'enfants êtes-vous ?" };
    if (children > 0 || p.infants > 0 || p.family) {
      adults = 2;
      assumption = "2 adultes (nombre d'adultes non précisé)";
    } else {
      adults = 1;
      assumption = "1 adulte (nombre de voyageurs non précisé)";
    }
  }
  return { party: { adults, children, ages: Array.from({ length: children }, (_, k) => p.childAges[k] ?? null), infants: p.infants, assumption } };
}

// ---------------------------------------------------------------------------

function clarification(question: string): LocalOutcome {
  return { understood: true, confidence: "low", result: { type: "clarification", question } };
}

function splitTurns(input: LocalInput): string[] {
  const previous = input.previous ? input.previous.request.split(ASSISTANT_TURN_SEPARATOR).map((s) => s.trim()).filter(Boolean) : [];
  return [...previous, input.text];
}

/** Analyse locale d'une demande (et du tour précédent quand l'assistant a posé une question). */
export function parseLocally(input: LocalInput, ctx: ActionContext): LocalOutcome {
  const segments = splitTurns(input);
  if (segments.some(isInjection)) return { understood: true, confidence: "high", result: { type: "out_of_scope", message: INJECTION_MESSAGE } };
  const hint = input.previous ? questionHint(input.previous.question) : null;
  const facts = segments.map((s, k) => parseSegment(s, k, k === segments.length - 1 ? hint : null, ctx.today));
  const m = merge(facts);
  const has = (set: Set<string>) => [...m.words].some((w) => set.has(w));

  // Intentions.
  const hotelNoun = ["appartement", "chambre", "chambres", "gite", "logement", "hotel", "hotels"].some((w) => m.words.has(w));
  const carWords = [...m.words].filter((w) => CAR_WORDS.has(w));
  const flights = has(FLIGHT_WORDS) || m.flight.cabin !== null || m.flight.tripType !== null;
  const hotels = has(HOTEL_WORDS);
  const cars = carWords.length > 0 && !(hotelNoun && carWords.every((w) => ["location", "louer", "loue"].includes(w)));
  const strong = has(PLAN_STRONG);
  const weak = has(PLAN_WEAK);
  const discover = has(DISCOVER_WORDS) || segments.some((s) => DISCOVER_PHRASES.test(normalizeText(s)));
  const booking = has(BOOKING_WORDS);
  const explicit = flights || hotels || cars;

  if (!explicit && !strong && !weak && !discover && !m.located.length) {
    if (booking) return { understood: true, confidence: "high", result: { type: "out_of_scope", message: BOOKING_MESSAGE } };
    return { understood: false, confidence: "none" };
  }

  const kinds: Kind[] = [];
  const plan = (strong || weak) && (!explicit || (strong && weak));
  if (discover && !explicit && !plan) kinds.push("open_destination");
  if (plan) kinds.push("plan_trip");
  if (flights) kinds.push("search_flights");
  if (hotels) kinds.push("search_hotels");
  if (cars) kinds.push("search_cars");

  // Lieux.
  const picked = pickPlaces(m.located);
  if (picked.question) return clarification(picked.question);
  let destL = picked.destination;
  let originL = picked.origin;
  const carOnly = kinds.length === 1 && kinds[0] === "search_cars";
  if (!destL && originL && !flights) {
    destL = originL;
    originL = null;
  }
  if (!destL) {
    if (carOnly) return clarification("Où souhaitez-vous prendre la voiture ?");
    if (originL) return clarification(`Où souhaitez-vous aller au départ de ${targetOf(originL).name} ?`);
    return clarification(`Où souhaitez-vous aller ? Destinations proposées : ${destinationNames().join(", ")}.`);
  }
  const dest = targetOf(destL);
  const origin = originL ? targetOf(originL) : null;

  // Aucun service cité : selon ce que dit la demande.
  if (!kinds.length) {
    const detailed = m.dates.any || hasCounts(m.people) || m.people.family;
    // « Un week-end à Lisbonne » : le vol et l'hébergement ; sinon un voyage daté (ou un vol hors destinations).
    if (m.dates.duration?.weekend || m.dates.weekend) kinds.push("search_flights", "search_hotels");
    else if (detailed) kinds.push(dest.slug ? "plan_trip" : "search_flights");
    else if (dest.slug) kinds.push("open_destination");
    else return clarification(`Que souhaitez-vous préparer pour ${dest.name} : un vol, un hébergement ou une voiture ?`);
  }
  const needs = (k: Kind) => kinds.includes(k);

  // Hypothèses de lieux.
  const corrections: string[] = [];
  for (const l of [originL, destL, picked.dropoff]) {
    if (!l) continue;
    const entry = l.mention.options[0]!;
    if (l.mention.typo > 0) corrections.push(`« ${l.mention.raw.slice(0, 30)} » compris comme ${entry.kind === "country" ? entry.label : entry.targets[0]!.name}`);
    if (entry.kind === "country") corrections.push(`${entry.label} : ${entry.targets[0]!.name} (seule destination proposée dans ce pays)`);
  }

  if ((needs("plan_trip") || needs("open_destination")) && !dest.slug) {
    return clarification(`Nomadia n'a pas de fiche voyage pour ${dest.name}. Quelle destination choisissez-vous : ${destinationNames().join(", ")} ?`);
  }
  const city = needs("search_hotels") ? hotelCity(dest) : null;
  if (needs("search_hotels") && !city) {
    const cities = places.filter((p) => p.kind === "city").map((p) => targetById(p.id)!.name);
    return clarification(`Nomadia ne propose pas d'hébergement à ${dest.name}. Quelle ville choisissez-vous : ${cities.join(", ")} ?`);
  }
  if (needs("search_flights") && !origin && dest.group === "paris") return clarification("De quelle ville partez-vous ?");

  // Dates.
  const destination = dest.slug ? getDestination(dest.slug) : undefined;
  const adviceDays = destination?.duration.min ?? 7;
  const fallback = { nights: adviceDays - 1, label: destination ? `durée conseillée pour ${destination.name} : ${adviceDays} jours` : "7 jours, durée non précisée" };
  const dated = kinds.some((k) => k !== "open_destination");
  const r = resolveDates(m.dates, ctx.today, fallback);
  const dateAssumptions = [...r.assumptions];
  const start = r.start;
  let end = r.end;
  if (dated) {
    if (r.invalid) return clarification(`La date « ${r.invalid} » n'existe pas. Pour quelles dates ?`);
    if (!start) {
      if (m.dates.duration?.weekend) return clarification("Pour quel week-end ?");
      if (m.dates.duration) return clarification("À partir de quelle date ?");
      if (carOnly) return clarification("Pour quelles dates souhaitez-vous la voiture ?");
      if (kinds.length === 1 && needs("search_hotels")) return clarification("Pour quelles dates d'arrivée et de départ ?");
      return clarification("Pour quelles dates ?");
    }
    if (!end) {
      if (needs("plan_trip")) {
        end = addDays(start, fallback.nights);
        dateAssumptions.push(`Durée supposée : ${adviceDays} jours${destination ? ` (durée conseillée pour ${destination.name})` : ""}`);
      } else if (needs("search_hotels")) return clarification("Combien de nuits restez-vous ?");
      else if (needs("search_cars")) return clarification("Quand rendrez-vous la voiture ? Indiquez la date de retour.");
      else if (m.flight.tripType === "roundtrip") return clarification("Quelle est la date de retour ?");
    }
  }

  // Voyageurs.
  let party: Party | null = null;
  if (needs("search_flights") || needs("search_hotels") || needs("plan_trip")) {
    const pr = resolveParty(m.people);
    if ("question" in pr) return clarification(pr.question);
    party = pr.party;
    if ((needs("search_flights") || needs("search_hotels")) && party.ages.some((a) => a === null)) {
      return clarification(party.children > 1 ? `Quel âge ont les ${party.children} enfants ?` : "Quel âge a l'enfant ?");
    }
  }
  if (needs("search_cars") && m.driver.young) return clarification("Quel âge a le conducteur ?");

  // Entrées d'outils (mêmes formes que tools.ts), validées ensuite par buildAction.
  const calls: { name: Kind; input: unknown }[] = [];
  const travellerAssumption = party?.assumption ? [party.assumption] : [];
  for (const kind of kinds) {
    if (kind === "open_destination") calls.push({ name: kind, input: { destination: dest.slug } });
    if (kind === "plan_trip" && party) {
      calls.push({
        name: kind,
        input: { destination: dest.slug, startDate: start, endDate: end, adults: party.adults, children: party.children + party.infants, assumptions: capAssumptions([...corrections, ...dateAssumptions, ...travellerAssumption]) },
      });
    }
    if (kind === "search_flights" && party) {
      const ages = party.ages as number[];
      const teens = ages.filter((a) => a >= 12).length;
      const oneWay = m.flight.tripType === "oneway" || !end;
      calls.push({
        name: kind,
        input: {
          origin: origin?.placeId ?? "city:PAR",
          destination: dest.placeId,
          departDate: start,
          returnDate: oneWay ? null : end,
          adults: party.adults + teens,
          childrenAges: ages.filter((a) => a >= 2 && a < 12),
          infants: party.infants + ages.filter((a) => a < 2).length,
          cabin: m.flight.cabin ?? "economy",
          assumptions: capAssumptions([
            ...corrections,
            origin ? "" : "Départ supposé : Paris",
            ...dateAssumptions,
            oneWay && m.flight.tripType !== "oneway" ? "Aller simple (aucune date de retour indiquée)" : "",
            ...travellerAssumption,
            teens ? `${plural(teens, "enfant de 12 ans ou plus compté", "enfants de 12 ans ou plus comptés")} comme adulte${teens > 1 ? "s" : ""} (règle des compagnies)` : "",
          ]),
        },
      });
    }
    if (kind === "search_hotels" && party && city) {
      const kids = [...(party.ages as number[]), ...Array<number>(party.infants).fill(0)];
      const count = m.people.rooms ?? Math.max(1, Math.ceil(party.adults / 4), Math.ceil(kids.length / 3));
      const rooms = Array.from({ length: count }, () => ({ adults: 0, childrenAges: [] as number[] }));
      for (let k = 0; k < party.adults; k++) rooms[k % count]!.adults += 1;
      kids.forEach((age, k) => rooms[k % count]!.childrenAges.push(age));
      calls.push({
        name: kind,
        input: {
          destination: city.placeId,
          checkIn: start,
          checkOut: end,
          rooms,
          assumptions: capAssumptions([
            ...corrections,
            city.placeId !== dest.placeId ? `Hébergement cherché à ${city.name}` : "",
            ...dateAssumptions,
            ...travellerAssumption,
            count > 1 ? `Répartition supposée : ${rooms.map((room) => room.adults).join(" + ")} adultes en ${count} chambres` : "",
          ]),
        },
      });
    }
    if (kind === "search_cars") {
      // « une voiture de Lisbonne à Porto » (location seule, deux lieux voisins) : aller simple.
      const oneWayRoute = carOnly && !!originL && !!destL && originL.seg === destL.seg && destL.mention.first - originL.mention.last <= 2;
      const pickup = needs("search_flights") ? arrivalAirport(dest) : oneWayRoute && origin ? origin : dest;
      const oneWayTo = picked.dropoff ? targetOf(picked.dropoff) : oneWayRoute ? dest : null;
      const sameDay = start === end;
      const pickupTime = m.dates.times.pickup ?? (sameDay ? "09:00" : DEFAULT_PICKUP_TIME);
      const dropoffTime = m.dates.times.dropoff ?? (sameDay ? "18:00" : DEFAULT_DROPOFF_TIME);
      const times =
        !m.dates.times.pickup && !m.dates.times.dropoff
          ? `Prise à ${pickupTime.replace(":", " h ")} et retour à ${dropoffTime.replace(":", " h ")} (heures non précisées)`
          : !m.dates.times.pickup
            ? `Prise à ${pickupTime.replace(":", " h ")} (heure non précisée)`
            : !m.dates.times.dropoff
              ? `Retour à ${dropoffTime.replace(":", " h ")} (heure non précisée)`
              : "";
      const driver =
        m.driver.age === null && m.driver.residence === null
          ? "Conducteur de 30 ans résidant en France (non précisé)"
          : m.driver.age === null
            ? "Conducteur de 30 ans (âge non précisé)"
            : m.driver.residence === null
              ? "Conducteur résidant en France (non précisé)"
              : "";
      calls.push({
        name: kind,
        input: {
          pickupPlace: pickup.placeId,
          dropoffPlace: oneWayTo?.placeId ?? pickup.placeId,
          pickupDate: start,
          pickupTime,
          dropoffDate: end,
          dropoffTime,
          driverAge: m.driver.age ?? 30,
          residence: m.driver.residence ?? "FR",
          assumptions: capAssumptions([
            ...corrections,
            needs("search_flights") && pickup.placeId !== dest.placeId ? `Voiture prise à l'aéroport d'arrivée : ${pickup.name}` : "",
            ...dateAssumptions,
            times,
            ...m.dates.times.notes,
            driver,
          ]),
        },
      });
    }
  }

  const result = resultFromCalls(calls, ctx);
  if (result.type === "actions" && booking && result.actions[0]) result.actions[0].notes.unshift(BOOKING_NOTE);
  const assumed = result.type === "actions" && result.actions.some((a) => a.assumptions.length > 0);
  return { understood: true, confidence: result.type !== "actions" ? "low" : assumed ? "medium" : "high", result };
}
