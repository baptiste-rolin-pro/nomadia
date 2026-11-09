"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page max-w-2xl py-20">
      <p className="eyebrow">Erreur</p>
      <h1 className="mt-3 font-serif text-title">Un problème est survenu</h1>
      <p className="mt-4 text-lead text-ink-soft">La page n&apos;a pas pu être affichée. Aucune action de réservation n&apos;a été relancée automatiquement.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-forest px-5 font-semibold text-white">
          Réessayer
        </button>
        <Link href="/" className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-forest px-5 font-semibold text-forest">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
