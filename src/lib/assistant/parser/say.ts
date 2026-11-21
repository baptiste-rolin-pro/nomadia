/**
 * Textes de l'assistant dans la langue de RÉPONSE (langue de la page du visiteur), indépendamment de la langue
 * dans laquelle la demande est écrite : questions, hypothèses, détails des étapes, noms de lieux et de pays.
 * En français, chaque texte est identique à celui produit avant l'internationalisation (tests du parseur).
 */
import { DEFAULT_LOCALE, LOCALE_INFO, type Locale } from "@/i18n/config";
import { formatter, monthInDate, monthName, type Formatter } from "@/i18n/format";
import { getMessages } from "@/i18n/messages";
import type { Messages } from "@/i18n/types";
import type { CivilDate } from "@/lib/dates";
import { getPlace, places } from "@/lib/content/places";
import { getDestination } from "@/lib/content/destinations";
import { cityName, destinationName } from "@/lib/content/localized";
import { localizePlace } from "@/lib/content/place-labels";
import { otherPlaceName } from "@/lib/assistant/parser/lang/places";

export interface Say {
  locale: Locale;
  m: Messages["assistant"];
  f: Formatter;
  t(message: string, params?: Record<string, string | number>): string;
  /** « jeu. 12 nov. » (style des hypothèses et des détails). */
  day(d: CivilDate): string;
  /** « 10 h 00 » en français, « 10:00 » ailleurs. */
  time(hhmm: string): string;
  /** « A, B ou C ». */
  or(items: string[]): string;
  /** Énumération simple (« A, B, C »). */
  join(items: string[]): string;
  month(m: number): string;
  /** Mois dans une date (« 12 июня » : génitif russe), identique à month() ailleurs. */
  monthOf(m: number): string;
  weekday(wd: number): string;
  /** Nom d'un lieu du référentiel dans les questions et hypothèses (« Rome », « Rome (FCO) »). */
  placeName(placeId: string): string;
  /** Nom court pour un titre d'étape (« Paris », « Rome (FCO) »). */
  placeShort(placeId: string): string;
  /** Libellé complet de l'autocomplétion. */
  placeLabel(placeId: string): string;
  /** Pays ou lieu non proposé (libellé français du lexique, code ISO éventuel). */
  otherName(label: string, code?: string): string;
  country(code: string): string;
}

const cache = new Map<Locale, Say>();

export function sayFor(locale: Locale = DEFAULT_LOCALE): Say {
  const hit = cache.get(locale);
  if (hit) return hit;
  const f = formatter(locale);
  const m = getMessages(locale).assistant;
  const fr = locale === DEFAULT_LOCALE;
  const weekdayFmt = new Intl.DateTimeFormat(LOCALE_INFO[locale].intl, { weekday: "long", timeZone: "UTC" });
  const say: Say = {
    locale,
    m,
    f,
    t: (message, params) => f.t(message, params),
    day: (d) => f.date(d, "weekday"),
    time: (hhmm) => (fr ? hhmm.replace(":", " h ") : f.time(hhmm)),
    or: (items) => (items.length < 2 ? (items[0] ?? "") : f.list(items, "disjunction")),
    join: (items) => items.join(m.sep),
    month: (n) => (fr ? FR_MONTHS[n - 1]! : locale === "zh" ? monthInDate(locale, n) : monthName(locale, n)),
    monthOf: (n) => (fr ? FR_MONTHS[n - 1]! : monthInDate(locale, n)),
    // 3 janvier 2027 : un dimanche (wd = 0).
    weekday: (wd) => weekdayFmt.format(new Date(Date.UTC(2027, 0, 3 + wd, 12))),
    placeName: (id) => {
      const p = getPlace(id);
      if (!p) return id;
      if (p.kind === "city") {
        const dest = p.destinationSlug ? getDestination(p.destinationSlug) : undefined;
        return dest ? destinationName(dest.slug, locale) : cityName(p.city, locale);
      }
      const hasCity = places.some((c) => c.kind === "city" && c.city === p.city);
      const city = cityName(p.city, locale);
      return hasCity ? `${city} (${p.code})` : city.replace(/\s*\(.*\)$/, "");
    },
    placeShort: (id) => {
      const p = getPlace(id);
      if (!p) return id;
      const city = cityName(p.city, locale);
      return p.kind === "city" ? city : `${city} (${p.code})`;
    },
    placeLabel: (id) => {
      const p = getPlace(id);
      if (!p) return id;
      return fr ? p.label : localizePlace(p, locale).label;
    },
    otherName: (label, code) => (fr ? label : code ? f.region(code) : (otherPlaceName(label, locale) ?? label)),
    country: (code) => f.region(code),
  };
  cache.set(locale, say);
  return say;
}

const FR_MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

