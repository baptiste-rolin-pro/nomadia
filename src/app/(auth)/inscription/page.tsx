import type { Metadata } from "next";
import Link from "next/link";
import { devMailboxEnabled } from "@/lib/mail";
import { SignUpForm } from "@/components/auth/auth-forms";

export const metadata: Metadata = { title: "Créer un compte", robots: { index: false, follow: true } };
export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return (
    <>
      <h1 className="font-serif text-title">Créer un compte</h1>
      <p className="mb-8 mt-3 text-ink-soft">Retrouvez vos voyages, réservations et favoris sur tous vos appareils. Le compte n&apos;est pas nécessaire pour explorer ou comparer.</p>
      <SignUpForm devMailbox={devMailboxEnabled()} />
      <p className="mt-6 text-sm">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="font-semibold text-forest underline underline-offset-4">
          Se connecter
        </Link>
      </p>
    </>
  );
}
