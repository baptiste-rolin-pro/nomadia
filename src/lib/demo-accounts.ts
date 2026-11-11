/**
 * Comptes de démonstration créés par `npm run db:seed` (identifiants stables, adresses sur le domaine réservé
 * `.test`). Les mots de passe sont des valeurs de TEST publiques : affichés sur la page de connexion quand
 * l'inscription publique est fermée (NOMADIA_PUBLIC_SIGNUP=false). Ne jamais y mettre un vrai mot de passe.
 * Module sans dépendance serveur : partagé par le script de seed et les pages.
 */
export const DEMO_USER = { id: "usr_demo_voyageur", name: "Camille (démo)", email: "voyageur@nomadia.test", role: "user" } as const;
export const DEMO_ADMIN = { id: "usr_demo_admin", name: "Admin (démo)", email: "admin@nomadia.test", role: "admin" } as const;

export const DEFAULT_DEMO_PASSWORDS = { user: "voyage-demo-2026", admin: "admin-demo-2026" } as const;

export function demoPasswords(source: Record<string, string | undefined> = process.env): { user: string; admin: string } {
  return {
    user: source.DEMO_USER_PASSWORD || DEFAULT_DEMO_PASSWORDS.user,
    admin: source.DEMO_ADMIN_PASSWORD || DEFAULT_DEMO_PASSWORDS.admin,
  };
}
