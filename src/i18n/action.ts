import "server-only";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, LOCALE_HEADER, isLocale, localeFromPath, localizePath, toLocale, type Locale } from "@/i18n/config";

/**
 * Langue d'une action serveur ou d'une route : en-tête posé par le proxy (langue de la page qui a envoyé le
 * formulaire), sinon le chemin du Referer, sinon le cookie de langue choisie, sinon le français.
 * Hors requête (tests unitaires), renvoie le français.
 */
export async function actionLocale(): Promise<Locale> {
  try {
    const h = await headers();
    const fromHeader = h.get(LOCALE_HEADER);
    if (isLocale(fromHeader)) return fromHeader;
    const referer = h.get("referer");
    if (referer) {
      try {
        const path = new URL(referer).pathname;
        return localeFromPath(path) ?? "fr";
      } catch {
        /* Referer illisible : on continue. */
      }
    }
    const jar = await cookies();
    return toLocale(jar.get(LOCALE_COOKIE)?.value);
  } catch {
    return "fr";
  }
}

/**
 * Revalide une page dans la langue de l'action : chemin visible (`/en/vols`, `/vols`) et, pour le français, chemin
 * interne réécrit par le proxy (`/fr/vols`, segment `[locale]`).
 */
export async function revalidateLocalized(path: string, type?: "page" | "layout"): Promise<void> {
  const { revalidatePath } = await import("next/cache");
  const locale = await actionLocale();
  revalidatePath(localizePath(locale, path), type);
  if (locale === "fr") revalidatePath(`/fr${path === "/" ? "" : path}`, type);
}
