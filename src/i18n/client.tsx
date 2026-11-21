"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { formatDate, formatDurationIn, formatMessage, formatMoneyIn, formatNumber, formatTime } from "@/i18n/format-core";
import type { Formatter } from "@/i18n/format";
import type { ClientMessages } from "@/i18n/types";

/**
 * Messages côté navigateur : la mise en page fournit la langue active et les espaces de noms communs ; une page
 * ajoute les siens (`MessagesScope`). Aucun fichier de traduction n'est importé par un module client : seuls les
 * messages de la langue affichée arrivent dans la page (charge utile du rendu serveur).
 */
interface I18nValue {
  locale: Locale;
  m: Partial<ClientMessages>;
}

const I18nContext = createContext<I18nValue>({ locale: DEFAULT_LOCALE, m: {} });

export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Partial<ClientMessages>; children: ReactNode }) {
  const parent = useContext(I18nContext);
  const value = useMemo(() => ({ locale, m: { ...parent.m, ...messages } }), [locale, messages, parent.m]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Ajoute des espaces de noms à ceux déjà fournis (même langue). */
export function MessagesScope({ messages, children }: { messages: Partial<ClientMessages>; children: ReactNode }) {
  const parent = useContext(I18nContext);
  const value = useMemo(() => ({ locale: parent.locale, m: { ...parent.m, ...messages } }), [messages, parent]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Mise en forme côté navigateur : sans listes ni noms de pays (inutilisés par les composants clients). */
export type ClientFormatter = Omit<Formatter, "list" | "region">;

const formatters = new Map<Locale, ClientFormatter>();

function formatterFor(locale: Locale): ClientFormatter {
  let f = formatters.get(locale);
  if (!f) {
    f = {
      locale,
      t: (message, params) => formatMessage(locale, message, params),
      number: (n, opts) => formatNumber(locale, n, opts),
      money: (m, opts) => formatMoneyIn(locale, m, opts),
      date: (d, style) => formatDate(locale, d, style),
      time: (local) => formatTime(locale, local),
      duration: (minutes) => formatDurationIn(locale, minutes),
    };
    formatters.set(locale, f);
  }
  return f;
}

export function useLocale(): Locale {
  return useContext(I18nContext).locale;
}

/** Langue, messages (espaces de noms fournis par la page) et mise en forme. */
export function useI18n(): { locale: Locale; m: ClientMessages; f: ClientFormatter } {
  const { locale, m } = useContext(I18nContext);
  return { locale, m: m as ClientMessages, f: formatterFor(locale) };
}
