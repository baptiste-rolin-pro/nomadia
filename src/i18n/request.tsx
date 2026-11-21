import "server-only";
import type { ReactNode } from "react";
import { locale as rootLocale } from "next/root-params";
import { toLocale, type Locale } from "@/i18n/config";
import { formatter, type Formatter } from "@/i18n/format";
import { getMessages, pickClientMessages } from "@/i18n/messages";
import { MessagesScope } from "@/i18n/client";
import type { ClientNamespace, Messages } from "@/i18n/types";

/**
 * Langue de la page en cours (paramètre racine `[locale]`), pour les composants serveur.
 * Ne pas importer depuis src/lib ni depuis une action serveur ou une route : `next/root-params` n'y est pas
 * disponible (les fonctions métier reçoivent la langue en paramètre ; actions : src/i18n/action.ts).
 */
export async function getLocale(): Promise<Locale> {
  return toLocale(await rootLocale());
}

export async function getI18n(): Promise<{ locale: Locale; m: Messages; f: Formatter }> {
  const locale = await getLocale();
  return { locale, m: getMessages(locale), f: formatter(locale) };
}

/** Transmet aux composants client de `children` les espaces de noms demandés (langue de la page). */
export async function ClientMessages({ ns, children }: { ns: readonly ClientNamespace[]; children: ReactNode }) {
  const locale = await getLocale();
  return <MessagesScope messages={pickClientMessages(locale, ns)}>{children}</MessagesScope>;
}
