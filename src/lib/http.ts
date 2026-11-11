import "server-only";
import { siteUrl } from "@/lib/env";

/** Protection CSRF complémentaire aux cookies SameSite=Lax : l'origine doit être celle du site. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const o = new URL(origin);
    const host = request.headers.get("host");
    return o.origin === new URL(siteUrl()).origin || (!!host && o.host === host);
  } catch {
    return false;
  }
}
