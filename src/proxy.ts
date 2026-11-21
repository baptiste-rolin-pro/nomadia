import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { DEFAULT_LOCALE, LOCALE_HEADER, localeFromPath, localizePath, stripLocale } from "@/i18n/config";

/**
 * Langue et zones privées, pour chaque requête de page (actions serveur comprises).
 *
 * Langue (jamais de redirection selon le navigateur : une URL explicite est toujours servie telle quelle) :
 * - `/en/vols`, `/ar`… : servis directement (segment `[locale]`) ;
 * - `/vols`, `/` (français, sans préfixe — URL historiques inchangées) : réécriture interne vers `/fr/…` ;
 * - `/fr/vols` : redirection permanente vers `/vols` (une seule URL par page française).
 * La langue de la page est transmise aux actions serveur par l'en-tête `x-nomadia-locale`.
 *
 * Zones privées (`/compte`, `/admin`, dans toutes les langues) : redirection OPTIMISTE vers la connexion en
 * l'absence de cookie de session. Ce n'est PAS le contrôle d'accès : chaque page et action vérifie la session.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname === `/${DEFAULT_LOCALE}` || pathname.startsWith(`/${DEFAULT_LOCALE}/`)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(DEFAULT_LOCALE.length + 1) || "/";
    return NextResponse.redirect(url, 308);
  }

  const prefixed = localeFromPath(pathname);
  const locale = prefixed ?? DEFAULT_LOCALE;
  const bare = stripLocale(pathname);
  const isPrivate = /^\/(compte|admin)(\/|$)/.test(bare);

  if (isPrivate && !getSessionCookie(request)) {
    const login = new URL(localizePath(locale, `/connexion?retour=${encodeURIComponent(pathname)}`), request.url);
    const res = NextResponse.redirect(login);
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }

  const headers = new Headers(request.headers);
  headers.set(LOCALE_HEADER, locale);
  let res: NextResponse;
  if (prefixed) {
    res = NextResponse.next({ request: { headers } });
  } else {
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
    url.search = search;
    res = NextResponse.rewrite(url, { request: { headers } });
  }
  if (isPrivate) res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  // Toutes les pages ; pas les API, les fichiers de Next.js, les médias ni les fichiers à extension (robots.txt…).
  matcher: ["/((?!api/|_next/|images/|videos/|.*\\.[a-zA-Z0-9]+$).*)"],
};
