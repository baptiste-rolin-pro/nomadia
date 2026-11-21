/**
 * Mise en forme complète (serveur) : celle de format-core.ts (messages, nombres, montants, dates, heures, durées)
 * plus les mois isolés, les listes et les noms de pays (Intl.DisplayNames), et l'objet `Formatter` lié à une langue.
 */
import { LOCALE_INFO, type Locale } from "@/i18n/config";
import { dtf, formatDate, formatDurationIn, formatMessage, formatMoneyIn, formatNumber, formatTime, type DateStyle, type MessageParams } from "@/i18n/format-core";
import type { Money } from "@/lib/money";
import type { CivilDate } from "@/lib/dates";

export * from "@/i18n/format-core";

/** Nom d'un mois (1–12) dans la langue. */
export function monthName(locale: Locale, month: number): string {
  return dtf(locale, "month", { month: "long" }).format(new Date(Date.UTC(2027, month - 1, 15, 12)));
}

/** Nom du mois tel qu’il apparaît dans une date complète (génitif russe « июня »). */
export function monthInDate(locale: Locale, month: number): string {
  const parts = dtf(locale, "dayMonth", { day: "numeric", month: "long" }).formatToParts(new Date(Date.UTC(2027, month - 1, 15, 12)));
  const i = parts.findIndex((p) => p.type === "month");
  const value = parts[i]?.value;
  if (!value) return monthName(locale, month);
  // Chinois : « 6 » + « 月 » (le mois numérique n’a de sens qu’avec son suffixe).
  return /^\d+$/.test(value) ? `${value}${parts[i + 1]?.value.trim() ?? ""}` : value;
}

const lists = new Map<string, Intl.ListFormat>();

/** « A, B et C » / « A, B ou C » dans la langue. */
export function formatList(locale: Locale, items: string[], type: "conjunction" | "disjunction" = "conjunction"): string {
  const key = `${locale}|${type}`;
  let f = lists.get(key);
  if (!f) {
    f = new Intl.ListFormat(LOCALE_INFO[locale].intl, { style: "long", type });
    lists.set(key, f);
  }
  return f.format(items);
}

const regions = new Map<Locale, Intl.DisplayNames>();

/** Nom d'un pays (code ISO 3166-1 alpha-2) dans la langue. */
export function regionName(locale: Locale, code: string): string {
  let f = regions.get(locale);
  if (!f) {
    f = new Intl.DisplayNames([LOCALE_INFO[locale].intl], { type: "region" });
    regions.set(locale, f);
  }
  try {
    return f.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Raccourcis liés à une langue (passés aux composants). */
export interface Formatter {
  locale: Locale;
  t: (message: string, params?: MessageParams) => string;
  number: (n: number, opts?: Intl.NumberFormatOptions) => string;
  money: (m: Money, opts?: { hideZeroDecimals?: boolean }) => string;
  date: (d: CivilDate, style?: DateStyle) => string;
  time: (local: string) => string;
  duration: (minutes: number) => string;
  list: (items: string[], type?: "conjunction" | "disjunction") => string;
  region: (code: string) => string;
}

export function formatter(locale: Locale): Formatter {
  return {
    locale,
    t: (message, params) => formatMessage(locale, message, params),
    number: (n, opts) => formatNumber(locale, n, opts),
    money: (m, opts) => formatMoneyIn(locale, m, opts),
    date: (d, style) => formatDate(locale, d, style),
    time: (local) => formatTime(locale, local),
    duration: (minutes) => formatDurationIn(locale, minutes),
    list: (items, type) => formatList(locale, items, type),
    region: (code) => regionName(locale, code),
  };
}
