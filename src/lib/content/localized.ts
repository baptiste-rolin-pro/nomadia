/**
 * Contenu éditorial dans la langue de la page. Le français reste la source (fichiers de src/lib/content) ; chaque
 * autre langue fournit un « pack » de traductions (src/i18n/content/<langue>.ts) avec exactement les mêmes clés et
 * les mêmes longueurs de listes (vérifié par tests/unit/i18n.test.ts). Côté serveur uniquement : un composant
 * client reçoit des textes déjà traduits.
 */
import "server-only";
import type { Locale } from "@/i18n/config";
import { AMBIANCES, DESTINATIONS, type Ambiance, type Destination } from "@/lib/content/destinations";
import { GUIDES, type Guide } from "@/lib/content/guides";
import { AIRLINES, RENTERS, type AirlineEntry, type RenterEntry } from "@/lib/content/directory";
import { PHOTOS, photo as basePhoto, type Photo } from "@/lib/content/photos";
import { FAQ_FR } from "@/lib/content/faq";
import { PRACTICAL_AIRPORTS, PRACTICAL_TOWNS } from "@/lib/content/practical";
import { places as PLACES } from "@/lib/content/places";
import { DEMO_HOTELS } from "@/lib/providers/demo/hotels-data";
import { DEMO_AGENCIES } from "@/lib/providers/demo/cars";
import en from "@/i18n/content/en";
import zh from "@/i18n/content/zh";
import hi from "@/i18n/content/hi";
import es from "@/i18n/content/es";
import ar from "@/i18n/content/ar";
import bn from "@/i18n/content/bn";
import pt from "@/i18n/content/pt";
import ru from "@/i18n/content/ru";
import id from "@/i18n/content/id";

export interface DestinationText {
  name: string;
  country: string;
  region: string;
  tagline: string;
  intro: string[];
  stayType: string;
  locationSummary: string;
  ideas: { title: string; text: string }[];
  seasons: { period: string; text: string }[];
  seasonSources: string[];
  formalities: string;
}

export interface GuideText {
  title: string;
  description: string;
  sections: { heading: string; paragraphs: string[]; list?: string[] }[];
  related: string[];
}

export interface ContentPack {
  ambiances: Record<string, { label: string; description: string }>;
  destinations: Record<string, DestinationText>;
  guides: Record<string, GuideText>;
  photos: Record<string, { alt: string; place: string }>;
  airlines: Record<string, { summary: string; country: string }>;
  renters: Record<string, { summary: string; countriesNote: string }>;
  faq: { q: string; a: string }[];
  /**
   * Informations pratiques (src/lib/content/practical.ts) : aéroports absents du référentiel de recherche (clé = code
   * IATA) et localités qui ne sont pas des destinations éditoriales. Les autres lieux viennent de `places` ci-dessous.
   */
  practical: { airports: Record<string, string>; towns: Record<string, string> };
  /**
   * Lieux du référentiel (src/lib/content/places.ts) : nom de ville (clé = nom français de `Place.city`) et nom
   * d'aéroport (clé = code IATA). Les pays viennent d'Intl.DisplayNames (code ISO).
   */
  places: { cities: Record<string, string>; airports: Record<string, string> };
  /** Établissements fictifs de démonstration (src/lib/providers/demo/hotels-data.ts), par identifiant. */
  hotels: Record<string, HotelText>;
  /** Agences simulées des loueurs cités par la démonstration (src/lib/providers/demo/cars.ts), par identifiant. */
  agencies: Record<string, { name: string; address: string; accessNote: string }>;
}

export interface HotelText {
  description: string;
  receptionNote: string;
  address: string;
  neighborhood: string;
  categoryNote: string;
  rooms: Record<string, { name: string; beds: string }>;
}

function frenchPack(): ContentPack {
  return {
    ambiances: Object.fromEntries(AMBIANCES.map((a) => [a.id, { label: a.label, description: a.description }])),
    destinations: Object.fromEntries(
      DESTINATIONS.map((d) => [
        d.slug,
        {
          name: d.name,
          country: d.country,
          region: d.region,
          tagline: d.tagline,
          intro: d.intro,
          stayType: d.stayType,
          locationSummary: d.location.summary,
          ideas: d.ideas,
          seasons: d.seasons,
          seasonSources: d.seasonSources.map((s) => s.label),
          formalities: d.formalities.label,
        },
      ]),
    ),
    guides: Object.fromEntries(GUIDES.map((g) => [g.slug, { title: g.title, description: g.description, sections: g.sections, related: g.related.map((r) => r.label) }])),
    photos: Object.fromEntries(PHOTOS.map((p) => [p.id, { alt: p.alt, place: p.place }])),
    airlines: Object.fromEntries(AIRLINES.map((a) => [a.slug, { summary: a.summary, country: a.country }])),
    renters: Object.fromEntries(RENTERS.map((r) => [r.slug, { summary: r.summary, countriesNote: r.countriesNote }])),
    faq: FAQ_FR,
    practical: { airports: { ...PRACTICAL_AIRPORTS }, towns: { ...PRACTICAL_TOWNS } },
    places: {
      cities: Object.fromEntries(PLACES.map((p) => [p.city, p.city])),
      airports: Object.fromEntries(PLACES.filter((p) => p.kind === "airport").map((p) => [p.code, p.name])),
    },
    hotels: Object.fromEntries(
      DEMO_HOTELS.map((h) => [
        h.id,
        { description: h.description, receptionNote: h.receptionNote, address: h.address, neighborhood: h.neighborhood, categoryNote: h.categoryNote, rooms: Object.fromEntries(h.rooms.map((r) => [r.id, { name: r.name, beds: r.beds }])) },
      ]),
    ),
    agencies: Object.fromEntries(DEMO_AGENCIES.map((a) => [a.id, { name: a.name, address: a.address, accessNote: a.accessNote }])),
  };
}

// Construit à la première utilisation (et non au chargement du module) : évite les dépendances circulaires avec
// les modules de données (hôtels, agences) qui utilisent eux-mêmes ces traductions.
let built: Record<Locale, ContentPack> | null = null;

function packs(): Record<Locale, ContentPack> {
  if (!built) {
    const FR = frenchPack();
    const raw: Record<Locale, ContentPack | null> = { fr: FR, en, zh, hi, es, ar, bn, pt, ru, id };
    built = Object.fromEntries(Object.entries(raw).map(([l, p]) => [l, p ?? FR])) as Record<Locale, ContentPack>;
  }
  return built;
}

export function contentPack(locale: Locale): ContentPack {
  return packs()[locale];
}

export function ambiances(locale: Locale): { id: Ambiance; label: string; description: string }[] {
  const pack = contentPack(locale).ambiances;
  return AMBIANCES.map((a) => ({ id: a.id, ...(pack[a.id] ?? a) }));
}

export function destinationText(d: Destination, locale: Locale): DestinationText {
  return contentPack(locale).destinations[d.slug] ?? contentPack("fr").destinations[d.slug]!;
}

export function guideText(g: Guide, locale: Locale): GuideText {
  return contentPack(locale).guides[g.slug] ?? contentPack("fr").guides[g.slug]!;
}

/** Photo avec texte alternatif et lieu dans la langue (crédits inchangés). */
export function photoIn(id: string, locale: Locale): Photo {
  const p = basePhoto(id);
  const t = contentPack(locale).photos[id];
  return t ? { ...p, alt: t.alt, place: t.place } : p;
}

export function airlineText(a: AirlineEntry, locale: Locale) {
  return contentPack(locale).airlines[a.slug] ?? { summary: a.summary, country: a.country };
}

export function renterText(r: RenterEntry, locale: Locale) {
  return contentPack(locale).renters[r.slug] ?? { summary: r.summary, countriesNote: r.countriesNote };
}

export function faq(locale: Locale): { q: string; a: string }[] {
  return contentPack(locale).faq;
}

// ---------------------------------------------------------------------------
// Lieux

/** Nom d'une ville du référentiel dans la langue (« Lisbonne » → « Lisbon »). */
export function cityName(frenchCity: string, locale: Locale): string {
  return contentPack(locale).places.cities[frenchCity] ?? frenchCity;
}

/** Nom affiché d'une destination éditoriale (par son identifiant). */
export function destinationName(slug: string, locale: Locale): string {
  return contentPack(locale).destinations[slug]?.name ?? contentPack("fr").destinations[slug]?.name ?? slug;
}

/**
 * Nom d'un aéroport cité dans les informations pratiques : référentiel de recherche d'abord, puis aéroports propres
 * aux informations pratiques ; `undefined` si le code est inconnu (vérifié par tests/unit/practical.test.ts).
 */
export function practicalAirportName(code: string, locale: Locale): string | undefined {
  const pack = contentPack(locale);
  return pack.places.airports[code] ?? pack.practical.airports[code];
}

/** Nom d'une localité des informations pratiques : localité propre (« svolvaer ») ou destination éditoriale (« kyoto »). */
export function practicalTownName(key: string, locale: Locale): string {
  return contentPack(locale).practical.towns[key] ?? destinationName(key, locale);
}
