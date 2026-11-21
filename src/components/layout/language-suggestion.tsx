"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { LOCALES, LOCALE_INFO, localizePath, type Locale } from "@/i18n/config";
import { matchAcceptLanguage } from "@/i18n/negotiate";
import { useI18n } from "@/i18n/client";
import { readLocaleCookie, rememberLocale } from "@/components/layout/language-switcher";

const noSubscription = () => () => {};
/** Langue mémorisée (cookie), sinon première langue du navigateur prise en charge ; null pour le français. */
function suggestedLocale(): Locale | null {
  const cookie = readLocaleCookie();
  const pick = cookie ? ((LOCALES as readonly string[]).includes(cookie) ? (cookie as Locale) : null) : matchAcceptLanguage(navigator.languages.join(","));
  return pick && pick !== "fr" ? pick : null;
}
const noSuggestion = () => null;

/**
 * Sur l'accueil français seulement : discret lien vers la langue mémorisée (cookie) ou, à défaut, vers la
 * première langue du navigateur prise en charge. Jamais de redirection ni de fenêtre ; rien si le visiteur a
 * choisi le français ou si sa langue est le français. Chargé après l'hydratation (hors JavaScript initial).
 */
export default function LanguageSuggestion({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const { locale } = useI18n();
  const pathname = usePathname();
  const pick = useSyncExternalStore(noSubscription, suggestedLocale, noSuggestion);
  const suggested = locale === "fr" && pathname === "/" ? pick : null;
  if (!suggested) return null;
  return (
    <a
      href={localizePath(suggested, "/")}
      hrefLang={LOCALE_INFO[suggested].tag}
      lang={LOCALE_INFO[suggested].tag}
      dir={LOCALE_INFO[suggested].dir}
      onClick={() => rememberLocale(suggested)}
      data-testid="language-suggestion"
      className={`hidden min-h-9 items-center rounded-full border px-3 text-xs font-semibold md:inline-flex ${tone === "light" ? "border-white/50 text-white hover:bg-white/15" : "border-line text-ink hover:bg-ivory-deep"}`}
    >
      {LOCALE_INFO[suggested].name}
    </a>
  );
}
