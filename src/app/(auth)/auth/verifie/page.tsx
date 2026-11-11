import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { Notice } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Confirmation de l'adresse email", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Retour d'authentification après le lien de vérification d'adresse. */
export default async function VerifiedPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const user = await getCurrentUser();
  return (
    <>
      <h1 className="font-serif text-title">{error ? "Lien invalide" : "Adresse confirmée"}</h1>
      {error ? (
        <Notice tone="danger" className="mt-6" title="Ce lien de confirmation est invalide ou a expiré.">
          Connectez-vous avec votre adresse et votre mot de passe : un nouveau lien sera généré automatiquement.
        </Notice>
      ) : (
        <Notice tone="success" className="mt-6" title="Votre adresse email est confirmée.">
          {user ? `Vous êtes connecté en tant que ${user.name}.` : "Vous pouvez maintenant vous connecter."}
        </Notice>
      )}
      <div className="mt-6">
        <Link href={user ? "/compte" : "/connexion"} className="inline-flex min-h-12 items-center rounded-[var(--radius-md)] bg-forest px-6 font-semibold text-white">
          {user ? "Accéder à mon compte" : "Se connecter"}
        </Link>
      </div>
    </>
  );
}
