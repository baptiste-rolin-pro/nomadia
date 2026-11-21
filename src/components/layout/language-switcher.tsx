"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type MouseEvent } from "react";
import { Globe } from "lucide-react";
import { LOCALES, LOCALE_COOKIE, LOCALE_INFO, localizePath, stripLocale, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

/** Mémorise le choix (cookie nécessaire, 1 an) : jamais de redirection automatique à partir de lui. */
export function rememberLocale(locale: Locale) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax${secure}`;
}

export function readLocaleCookie(): string | null {
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${LOCALE_COOKIE}=`));
  return raw ? raw.slice(LOCALE_COOKIE.length + 1) : null;
}

/**
 * Même page dans une autre langue : chemin conservé ; paramètres et ancre ajoutés au moment du clic (les filtres
 * de recherche changent l'adresse sans navigation) ou du survol/focus (copie de lien, clic du milieu).
 */
function useTargets(pathname: string) {
  const bare = stripLocale(pathname);
  const withQuery = (l: Locale) => localizePath(l, `${bare}${window.location.search}${window.location.hash}`);
  return {
    hrefFor: (l: Locale) => localizePath(l, bare),
    refresh: (l: Locale) => (e: { currentTarget: HTMLAnchorElement }) => {
      e.currentTarget.href = withQuery(l);
    },
    onPick: (l: Locale) => (e: MouseEvent<HTMLAnchorElement>) => {
      rememberLocale(l);
      e.currentTarget.href = withQuery(l);
    },
  };
}

/**
 * Sélecteur de langue. `menu` : divulgation native (`<details>`, état ouvert annoncé par le navigateur, Échap et
 * clic extérieur referment) ; `list` : liste de liens (pied de page, menu mobile). Liens ordinaires (`<a>` avec
 * `hreflang` et `lang`) : chargement complet de la page dans la langue choisie (sens d'écriture, polices et
 * métadonnées compris).
 */
export function LanguageSwitcher({ variant = "menu", tone = "dark", className = "" }: { variant?: "menu" | "list"; tone?: "dark" | "light"; className?: string }) {
  const { locale, m } = useI18n();
  const pathname = usePathname();
  const { hrefFor, refresh, onPick } = useTargets(pathname);
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const onDoc = (e: Event) => {
      const d = ref.current;
      if (d?.open && !d.contains(e.target as Node)) d.open = false;
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const links = (
    <ul className={variant === "menu" ? "py-1" : "flex flex-wrap gap-x-4 gap-y-2"} aria-label={m.common.language.choose}>
      {LOCALES.map((l) => {
        const current = l === locale;
        return (
          <li key={l}>
            <a
              href={hrefFor(l)}
              hrefLang={LOCALE_INFO[l].tag}
              lang={LOCALE_INFO[l].tag}
              dir={LOCALE_INFO[l].dir}
              aria-current={current ? "true" : undefined}
              onClick={onPick(l)}
              onFocus={refresh(l)}
              onMouseEnter={refresh(l)}
              data-locale={l}
              className={
                variant === "menu"
                  ? `flex min-h-10 items-center px-3 text-sm hover:bg-ivory-deep ${current ? "font-semibold text-forest" : "text-ink"}`
                  : `inline-flex min-h-8 items-center gap-1 text-sm ${current ? "font-semibold underline underline-offset-4" : "hover:underline hover:underline-offset-4"}`
              }
            >
              {LOCALE_INFO[l].name}
            </a>
          </li>
        );
      })}
    </ul>
  );

  if (variant === "list") return <div className={className}>{links}</div>;

  const toneClasses = tone === "light" ? "text-white hover:bg-white/15" : "text-ink hover:bg-ivory-deep";
  return (
    <details
      ref={ref}
      className={`relative ${className}`}
      onKeyDown={(e) => {
        const d = ref.current;
        if (e.key === "Escape" && d?.open) {
          d.open = false;
          d.querySelector("summary")?.focus();
        }
      }}
    >
      <summary
        aria-label={`${m.common.language.choose} — ${m.common.language.current.replace("{name}", LOCALE_INFO[locale].name)}`}
        data-testid="language-switcher"
        className={`inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors [&::-webkit-details-marker]:hidden ${toneClasses}`}
      >
        <Globe aria-hidden className="size-4" />
        <span className="uppercase">{locale}</span>
        <span aria-hidden className="text-xs">▾</span>
      </summary>
      <div className="absolute end-0 top-full z-[var(--z-overlay)] mt-1 w-56 rounded-[var(--radius-md)] border border-line bg-white py-1 shadow-[var(--shadow-panel)]">
        {links}
      </div>
    </details>
  );
}
