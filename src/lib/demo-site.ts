import "server-only";
import { env } from "@/lib/env";
import { DEMO_ADMIN, DEMO_USER, demoPasswords } from "@/lib/demo-accounts";

/**
 * Site de démonstration public sans collecte de données personnelles.
 *
 * NOMADIA_PUBLIC_SIGNUP=false (défaut) : comptes de démonstration PARTAGÉS uniquement.
 * - Fermés côté serveur (Better Auth + actions serveur) : inscription, réinitialisation du mot de passe par email,
 *   renvoi d'email de vérification, changement de mot de passe / d'email / de nom, suppression de compte,
 *   révocation des sessions des autres visiteurs, voyageurs enregistrés, formulaire de contact.
 * - Adresses email de contact des réservations limitées aux domaines réservés (RFC 2606 / 6761).
 * - Les pages affichent une explication à la place des formulaires fermés.
 * NOMADIA_PUBLIC_SIGNUP=true : comportement complet (inscription, réinitialisation, profil modifiable).
 */
export function publicSignupEnabled(): boolean {
  return env().NOMADIA_PUBLIC_SIGNUP;
}

/** Vrai quand les visiteurs partagent les comptes de démonstration (inscription publique fermée). */
export function sharedDemoAccounts(): boolean {
  return !publicSignupEnabled();
}

export interface DemoCredential {
  label: string;
  description: string;
  email: string;
  password: string;
}

/** Identifiants affichés sur la page de connexion (valeurs de test, jamais de vrais mots de passe). */
export function demoCredentials(): DemoCredential[] {
  const e = env();
  const passwords = demoPasswords({ DEMO_USER_PASSWORD: e.DEMO_USER_PASSWORD, DEMO_ADMIN_PASSWORD: e.DEMO_ADMIN_PASSWORD });
  return [
    { label: "Voyageur", description: "3 voyages de référence, réservations", email: DEMO_USER.email, password: passwords.user },
    { label: "Administrateur", description: "zone /admin en consultation", email: DEMO_ADMIN.email, password: passwords.admin },
  ];
}

export const SHARED_ACCOUNT_NOTICE =
  "Site de démonstration : n'indiquez aucune donnée personnelle réelle. Les comptes de démonstration sont partagés : ce que vous saisissez peut être vu par les autres visiteurs.";

export const FICTITIOUS_EMAIL_MESSAGE =
  "Site de démonstration : utilisez une adresse fictive sur un domaine réservé (par exemple voyageur@exemple.test ou nom@example.com).";

const RESERVED_DOMAINS = ["example.com", "example.net", "example.org"];
const RESERVED_TLDS = ["test", "example", "invalid", "localhost"];

/**
 * Adresse sur un domaine réservé à la documentation et aux tests (RFC 2606 / RFC 6761) : elle ne peut appartenir
 * à personne. Seules ces adresses sont acceptées comme email de contact en mode démonstration partagé.
 */
export function isFictitiousEmail(email: string): boolean {
  const at = email.trim().toLowerCase().lastIndexOf("@");
  if (at < 1) return false;
  const domain = email.trim().toLowerCase().slice(at + 1).replace(/\.$/, "");
  if (!domain) return false;
  if (RESERVED_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) return true;
  const tld = domain.split(".").at(-1)!;
  return RESERVED_TLDS.includes(tld);
}
