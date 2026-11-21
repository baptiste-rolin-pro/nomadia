/**
 * Langues du site (configuration partagée serveur / navigateur, sans dépendance).
 * - Français : langue par défaut, URL sans préfixe (`/vols`) ; les autres langues sont préfixées (`/en/vols`).
 * - Les dix langues les plus parlées (Ethnologue, locuteurs au total).
 * - `tag` : langue BCP 47 du document (`<html lang>`, hreflang) ; `intl` : étiquette de formatage (Intl), avec un
 *   système de chiffres explicite quand il compte (arabe : chiffres arabes orientaux ; bengali : chiffres bengalis),
 *   pour que le rendu serveur et le navigateur produisent exactement les mêmes chaînes.
 */
export const LOCALES = ["fr", "en", "zh", "hi", "es", "ar", "bn", "pt", "ru", "id"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";
/** Cookie de la langue choisie avec le sélecteur (jamais de redirection automatique). */
export const LOCALE_COOKIE = "nomadia_lang";
/** En-tête posé par le proxy sur chaque requête de page (actions serveur comprises). */
export const LOCALE_HEADER = "x-nomadia-locale";

export interface LocaleInfo {
  /** Étiquette BCP 47 (`<html lang>`, hreflang). */
  tag: string;
  /** Étiquette de formatage Intl. */
  intl: string;
  dir: "ltr" | "rtl";
  /** Nom de la langue dans cette langue (sélecteur). */
  name: string;
  /** Open Graph `og:locale`. */
  og: string;
}

export const LOCALE_INFO: Record<Locale, LocaleInfo> = {
  fr: { tag: "fr", intl: "fr-FR", dir: "ltr", name: "Français", og: "fr_FR" },
  en: { tag: "en", intl: "en-GB", dir: "ltr", name: "English", og: "en_GB" },
  zh: { tag: "zh-Hans", intl: "zh-Hans-CN", dir: "ltr", name: "中文（简体）", og: "zh_CN" },
  hi: { tag: "hi", intl: "hi-IN", dir: "ltr", name: "हिन्दी", og: "hi_IN" },
  es: { tag: "es", intl: "es-ES", dir: "ltr", name: "Español", og: "es_ES" },
  ar: { tag: "ar", intl: "ar-u-nu-arab", dir: "rtl", name: "العربية", og: "ar_AR" },
  bn: { tag: "bn", intl: "bn-BD", dir: "ltr", name: "বাংলা", og: "bn_BD" },
  pt: { tag: "pt-BR", intl: "pt-BR", dir: "ltr", name: "Português", og: "pt_BR" },
  ru: { tag: "ru", intl: "ru-RU", dir: "ltr", name: "Русский", og: "ru_RU" },
  id: { tag: "id", intl: "id-ID", dir: "ltr", name: "Bahasa Indonesia", og: "id_ID" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function toLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function dirOf(locale: Locale): "ltr" | "rtl" {
  return LOCALE_INFO[locale].dir;
}

/**
 * Chemin interne dans une langue : `/vols?x=1` → `/en/vols?x=1` (inchangé en français).
 * Les liens externes, les ancres seules et les chemins déjà préfixés sont rendus tels quels.
 */
export function localizePath(locale: Locale, href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const current = localeFromPath(href);
  const bare = current ? stripLocale(href) : href;
  if (locale === DEFAULT_LOCALE) return bare;
  if (bare === "/") return `/${locale}`;
  if (bare.startsWith("/?") || bare.startsWith("/#")) return `/${locale}${bare.slice(1)}`;
  return `/${locale}${bare}`;
}

/** Langue portée par un chemin (`/en/vols` → en) ; `null` pour un chemin français sans préfixe. */
export function localeFromPath(path: string): Locale | null {
  const m = /^\/([a-z]{2})(?=$|[/?#])/.exec(path);
  return m && isLocale(m[1]) && m[1] !== DEFAULT_LOCALE ? m[1] : null;
}

/** Chemin sans préfixe de langue (`/en/vols?x` → `/vols?x`, `/en` → `/`). */
export function stripLocale(path: string): string {
  const locale = localeFromPath(path);
  if (!locale) return path;
  const rest = path.slice(locale.length + 1);
  return rest === "" ? "/" : rest.startsWith("/") ? rest : `/${rest}`;
}

/**
 * Chemin de la page sans aucune langue, préfixe interne `/fr` compris : le rendu serveur d'une page française voit
 * l'adresse réécrite par le proxy (`/fr/vols`), le navigateur l'adresse publique (`/vols`). Pour les composants
 * qui comparent ou reconstruisent l'adresse courante (`usePathname()`).
 */
export function pagePath(path: string): string {
  const m = /^\/([a-z]{2})(?=$|[/?#])/.exec(path);
  if (!m || !isLocale(m[1])) return path;
  const rest = path.slice(3);
  return rest === "" ? "/" : rest.startsWith("/") ? rest : `/${rest}`;
}
