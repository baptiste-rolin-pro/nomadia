import type { Metadata } from "next";
import Link from "next/link";
import { devMailboxEnabled } from "@/lib/mail";
import { safeReturnPath } from "@/lib/auth/session";
import { SignInForm } from "@/components/auth/auth-forms";
import { Notice } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Se connecter", robots: { index: false, follow: true } };
export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ retour?: string; reinitialise?: string }> }) {
  const { retour, reinitialise } = await searchParams;
  return (
    <>
      <h1 className="font-serif text-title">Se connecter</h1>
      <p className="mb-8 mt-3 text-ink-soft">Accédez à vos voyages, réservations et favoris.</p>
      {reinitialise ? (
        <Notice tone="success" className="mb-6" title="Mot de passe modifié">
          Connectez-vous avec votre nouveau mot de passe.
        </Notice>
      ) : null}
      <SignInForm returnTo={safeReturnPath(retour)} devMailbox={devMailboxEnabled()} />
      <p className="mt-6 text-sm">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-forest underline underline-offset-4">
          Créer un compte
        </Link>
      </p>
    </>
  );
}
