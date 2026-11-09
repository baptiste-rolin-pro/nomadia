import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Redirection optimiste vers la connexion pour les zones privées (absence de cookie de session).
 * Ce n'est PAS le contrôle d'accès : chaque page et action vérifie la session en base côté serveur.
 */
export function proxy(request: NextRequest) {
  const res = getSessionCookie(request) ? NextResponse.next() : NextResponse.redirect(new URL(`/connexion?retour=${encodeURIComponent(request.nextUrl.pathname)}`, request.url));
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  matcher: ["/compte/:path*", "/admin/:path*"],
};
