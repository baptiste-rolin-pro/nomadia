import { NextResponse, type NextRequest } from "next/server";
import { GUEST_COOKIE_PREFIX } from "@/lib/viewer";
import { GUEST_LINK_TTL_DAYS } from "@/lib/booking/service";

export const dynamic = "force-dynamic";

/**
 * Lien invité : /reservation/<id>/acces?cle=<jeton opaque>.
 * Le jeton est déplacé dans un cookie httpOnly puis retiré de l'URL (historique, en-tête Referer).
 * Sa validité est vérifiée côté serveur à chaque consultation (empreinte + expiration).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = request.nextUrl.searchParams.get("cle");
  const res = NextResponse.redirect(new URL(`/reservation/${encodeURIComponent(id)}`, request.url), 303);
  if (token && /^[A-Za-z0-9_-]{20,100}$/.test(token)) {
    res.cookies.set(`${GUEST_COOKIE_PREFIX}${id}`, token, { httpOnly: true, sameSite: "lax", path: "/", secure: request.nextUrl.protocol === "https:", maxAge: GUEST_LINK_TTL_DAYS * 86400 });
  }
  res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
