import type { Metadata } from "next";
import { DEFAULT_LOCALE, LOCALES, LOCALE_INFO, localizePath, type Locale } from "@/i18n/config";

/**
 * URL canonique de la page dans sa langue et variantes hreflang (+ x-default = français, sans préfixe).
 * `path` est le chemin français sans préfixe (« /destinations/rome »).
 */
export function localeAlternates(locale: Locale, path: string): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[LOCALE_INFO[l].tag] = localizePath(l, path);
  languages["x-default"] = localizePath(DEFAULT_LOCALE, path);
  return { canonical: localizePath(locale, path), languages };
}
