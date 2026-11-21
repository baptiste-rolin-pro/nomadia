import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/auth";
import { localeFromPath, localizePath } from "@/i18n/config";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string;
  /** Langue préférée (e-mails) ; absente des sessions construites hors Better Auth (tests, seed). */
  locale?: string;
}

/** Session courante vérifiée en base (contrôle réel, pas seulement la présence d'un cookie). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user as typeof session.user & { role?: string | null; locale?: string | null };
  return { id: u.id, name: u.name, email: u.email, emailVerified: u.emailVerified, role: u.role ?? "user", locale: u.locale ?? "fr" };
});

/** `returnTo` : chemin de la page (avec son préfixe de langue) ; la connexion s'ouvre dans la même langue. */
export async function requireUser(returnTo: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(localizePath(localeFromPath(returnTo) ?? "fr", `/connexion?retour=${encodeURIComponent(returnTo)}`));
  return user;
}

/** Contrôle d'accès administrateur côté serveur : la page affiche « accès refusé » si `allowed` est faux. */
export async function requireAdmin(returnTo = "/admin"): Promise<{ user: CurrentUser; allowed: boolean }> {
  const user = await requireUser(returnTo);
  return { user, allowed: user.role === "admin" };
}

/** N'accepte que des chemins internes pour les redirections post-connexion. */
export function safeReturnPath(value: string | null | undefined, fallback = "/compte"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
