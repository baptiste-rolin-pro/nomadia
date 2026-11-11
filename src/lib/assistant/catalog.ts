/**
 * Référentiels exposés à l'assistant : lieux (identifiants normalisés de l'autocomplétion), destinations
 * éditoriales, pays de résidence, heures. Tout est dérivé de listes statiques dans un ordre fixe : le texte
 * produit est identique d'une requête à l'autre (préfixe du prompt mis en cache).
 */
import { airportsFor, getPlace, places, type Place } from "@/lib/content/places";
import { DESTINATIONS, getDestination } from "@/lib/content/destinations";
import { CABINS } from "@/lib/search/params";
import { RESIDENCES } from "@/lib/search/residences";
import { DEMO_FLIGHT_DESTINATIONS, FRENCH_ORIGINS } from "@/lib/providers/demo/flights";
import { hotelsForPlace } from "@/lib/providers/demo/hotels";
import { agenciesForPlace } from "@/lib/providers/demo/cars";

type NonEmpty = [string, ...string[]];

function nonEmpty(list: string[]): NonEmpty {
  if (!list.length) throw new Error("Référentiel vide");
  return list as NonEmpty;
}

export const PLACE_IDS: NonEmpty = nonEmpty(places.map((p) => p.id));
/** Les hôtels se cherchent par ville (comme dans le formulaire). */
export const CITY_IDS: NonEmpty = nonEmpty(places.filter((p) => p.kind === "city").map((p) => p.id));
export const DESTINATION_SLUGS: NonEmpty = nonEmpty(DESTINATIONS.map((d) => d.slug));
export const RESIDENCE_CODES: NonEmpty = nonEmpty(RESIDENCES.map(([code]) => code));
export const CABIN_IDS: NonEmpty = nonEmpty([...CABINS]);
/** Heures proposées pour la location (pas de 30 min, comme une saisie usuelle). */
export const HALF_HOURS: NonEmpty = nonEmpty(Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`));

/** Nom court d'un lieu pour les titres (« Paris », « Rome-Fiumicino (FCO) »). */
export function placeShortName(id: string): string {
  const p = getPlace(id);
  if (!p) return id;
  return p.kind === "city" ? p.city : `${p.city} (${p.code})`;
}

export function placeLabel(id: string): string {
  return getPlace(id)?.label ?? id;
}

function codes(place: Place): string[] {
  return airportsFor(place).map((a) => a.code);
}

/** Vol couvert par les offres de démonstration : un aéroport français d'un côté, LIS / FCO / KEF de l'autre. */
export function demoFlightCovered(originId: string, destinationId: string): boolean {
  const o = getPlace(originId);
  const d = getPlace(destinationId);
  if (!o || !d) return false;
  const oc = codes(o);
  const dc = codes(d);
  const covers = (from: string[], to: string[]) => from.some((a) => FRENCH_ORIGINS.includes(a)) && to.some((b) => DEMO_FLIGHT_DESTINATIONS.includes(b));
  return covers(oc, dc) || covers(dc, oc);
}

export function demoHotelsCovered(placeId: string): boolean {
  return hotelsForPlace(placeId).length > 0;
}

export function demoCarsCovered(placeId: string): boolean {
  return agenciesForPlace(placeId).length > 0;
}

/** Texte stable du référentiel, inséré dans la partie mise en cache du prompt système. */
export function catalogText(): string {
  const placeLines = places.map((p) => {
    const extra = p.kind === "city" && p.airports?.length ? ` ; aéroports : ${p.airports.join(", ")}` : "";
    const dest = p.destinationSlug ? ` ; destination « ${p.destinationSlug} »` : "";
    return `- ${p.id} — ${p.label}${extra}${dest}`;
  });
  const destinationLines = DESTINATIONS.map((d) => {
    const offers = d.demoOffers ? "offres de démonstration (vols, hôtels, voitures)" : "fiche et voyage seulement, pas d'offres de démonstration";
    return `- ${d.slug} — ${d.name}, ${d.country} — ${d.stayType}, ${d.duration.min} à ${d.duration.max} jours — ${offers} ; recherche de vols vers ${d.search.flights}`;
  });
  return [
    "## Lieux connus (identifiant — libellé)",
    "Utilise uniquement ces identifiants pour les vols, hôtels et voitures. Les identifiants « city:N-… » sont des codes internes, pas des codes IATA.",
    ...placeLines,
    "",
    "## Destinations éditoriales (identifiant — nom)",
    ...destinationLines,
    "",
    "## Couverture des offres de démonstration",
    `- Vols : entre les aéroports français (${FRENCH_ORIGINS.join(", ")} ; city:PAR = CDG et ORY) et Lisbonne (LIS), Rome-Fiumicino (FCO, compris dans city:ROM) ou Keflavík (KEF, compris dans city:REK), dans les deux sens.`,
    "- Hôtels : city:LIS, city:ROM, city:REK.",
    "- Voitures : airport:LIS, city:LIS, airport:FCO, city:ROM, airport:KEF, city:REK.",
    "Une recherche ailleurs reste possible mais n'affichera aucune offre.",
    "",
    "## Pays de résidence acceptés pour la location",
    RESIDENCES.map(([code, name]) => `${code} (${name})`).join(", "),
  ].join("\n");
}

export function destinationName(slug: string): string {
  return getDestination(slug)?.name ?? slug;
}
