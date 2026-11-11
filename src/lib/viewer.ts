import "server-only";
import { cookies } from "next/headers";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/session";
import { opaqueId, sha256 } from "@/lib/security";
import { secureCookies } from "@/lib/env";

/**
 * Identité du visiteur : utilisateur authentifié et/ou brouillon anonyme.
 * Le cookie anonyme est opaque, httpOnly ; seule son empreinte est stockée en base.
 */
export const ANON_COOKIE = "nomadia_anon";
export const GUEST_COOKIE_PREFIX = "nomadia_g_";

export interface Viewer {
  user: CurrentUser | null;
  anonHash: string | null;
}

export async function getViewer(): Promise<Viewer> {
  const user = await getCurrentUser();
  const jar = await cookies();
  const anon = jar.get(ANON_COOKIE)?.value;
  return { user, anonHash: anon ? sha256(anon) : null };
}

/** À appeler uniquement depuis une action serveur ou un gestionnaire de route (écriture de cookie). */
export async function ensureAnonHash(): Promise<string> {
  const jar = await cookies();
  let anon = jar.get(ANON_COOKIE)?.value;
  if (!anon) {
    anon = opaqueId(24);
    jar.set(ANON_COOKIE, anon, { httpOnly: true, sameSite: "lax", secure: secureCookies(), path: "/", maxAge: 60 * 60 * 24 * 90 });
  }
  return sha256(anon);
}

export async function guestTokenFor(bookingId: string): Promise<string | null> {
  const jar = await cookies();
  return jar.get(`${GUEST_COOKIE_PREFIX}${bookingId}`)?.value ?? null;
}
