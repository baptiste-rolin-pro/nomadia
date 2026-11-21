import "server-only";
import { LOCALES, type Locale } from "@/i18n/config";
import type { ClientMessages, ClientNamespace, Messages } from "@/i18n/types";
import fr from "@/i18n/messages/fr";
import en from "@/i18n/messages/en";
import zh from "@/i18n/messages/zh";
import hi from "@/i18n/messages/hi";
import es from "@/i18n/messages/es";
import ar from "@/i18n/messages/ar";
import bn from "@/i18n/messages/bn";
import pt from "@/i18n/messages/pt";
import ru from "@/i18n/messages/ru";
import id from "@/i18n/messages/id";

/**
 * Dictionnaires de toutes les langues, côté serveur uniquement (`server-only`) : un composant client ne reçoit
 * que les espaces de noms de sa page, dans la langue active (voir `pickClientMessages`).
 */
export const MESSAGES: Record<Locale, Messages> = { fr, en, zh, hi, es, ar, bn, pt, ru, id };

export function getMessages(locale: Locale): Messages {
  return MESSAGES[locale];
}

export function pickClientMessages(locale: Locale, namespaces: readonly ClientNamespace[]): Partial<ClientMessages> {
  const m = MESSAGES[locale];
  const out: Partial<Record<ClientNamespace, unknown>> = {};
  for (const ns of namespaces) out[ns] = m[ns];
  return out as Partial<ClientMessages>;
}

export { LOCALES };
