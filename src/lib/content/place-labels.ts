/**
 * Lieux du référentiel dans la langue de la page : nom de ville, d'aéroport et de pays, libellé non ambigu de
 * l'autocomplétion. Recherche tolérante aux noms dans toutes les langues du site (« Рим », « روما », « 罗马 »).
 */
import "server-only";
import type { Locale } from "@/i18n/config";
import { LOCALES } from "@/i18n/config";
import { formatMessage, regionName } from "@/i18n/format";
import { getMessages } from "@/i18n/messages";
import { cityName, contentPack } from "@/lib/content/localized";
import { getPlace, normalize, places, type Place, type PlaceKind } from "@/lib/content/places";

export interface LocalizedPlace {
  id: string;
  kind: PlaceKind;
  code: string;
  city: string;
  name: string;
  country: string;
  label: string;
}

export function countryName(p: Place, locale: Locale): string {
  return locale === "fr" ? p.country : regionName(locale, p.countryCode);
}

export function airportName(p: Place, locale: Locale): string {
  return contentPack(locale).places.airports[p.code] ?? p.name;
}

export function localizePlace(p: Place, locale: Locale): LocalizedPlace {
  const city = cityName(p.city, locale);
  const country = countryName(p, locale);
  const t = getMessages(locale).domain.places;
  if (p.kind === "airport") {
    const name = airportName(p, locale);
    return { id: p.id, kind: p.kind, code: p.code, city, name, country, label: formatMessage(locale, t.airportLabel, { city, name, code: p.code, country }) };
  }
  const label = formatMessage(locale, (p.airports?.length ?? 0) > 1 ? t.cityAllAirports : t.cityLabel, { city, country });
  return { id: p.id, kind: p.kind, code: p.code, city, name: city, country, label };
}

/** Libellé de l'autocomplétion pour un identifiant (« city:LIS ») ; `null` si inconnu. */
export function placeLabelIn(id: string | undefined, locale: Locale): { id: string; label: string } | null {
  const p = id ? getPlace(id) : undefined;
  return p ? { id: p.id, label: localizePlace(p, locale).label } : null;
}

/** Ville d'un aéroport ou d'une ville, dans la langue (« FCO » → « Rome »). */
export function placeCity(id: string, locale: Locale): string {
  const p = getPlace(id);
  return p ? cityName(p.city, locale) : id;
}

/** Recherche de lieux : noms dans la langue de la page, en français et dans les autres langues du site. */
export function searchPlacesIn(query: string, locale: Locale, opts: { kinds?: PlaceKind[]; limit?: number } = {}): LocalizedPlace[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const kinds = opts.kinds ?? ["airport", "city"];
  const scored = places
    .filter((p) => kinds.includes(p.kind))
    .map((p) => {
      const local = [cityName(p.city, locale), airportName(p, locale), countryName(p, locale)];
      const others = LOCALES.flatMap((l) => [contentPack(l).places.cities[p.city] ?? "", p.kind === "airport" ? (contentPack(l).places.airports[p.code] ?? "") : ""]);
      const hay = [p.code, p.city, p.name, p.country, ...(p.keywords ?? []), ...local, ...others].filter(Boolean).map(normalize);
      let score = 0;
      if (normalize(p.code) === q) score = 100;
      else if (hay.some((h) => h.startsWith(q))) score = 60;
      else if (hay.some((h) => h.includes(q))) score = 30;
      if (score && p.kind === "city") score += 5;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .map((x) => ({ ...x, l: localizePlace(x.p, locale) }))
    .sort((x, y) => y.score - x.score || x.l.label.localeCompare(y.l.label, locale));
  return scored.slice(0, opts.limit ?? 8).map((x) => x.l);
}
