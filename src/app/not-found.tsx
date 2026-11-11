import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page max-w-2xl py-20">
      <p className="eyebrow">Erreur 404</p>
      <h1 className="mt-3 font-serif text-title">Page introuvable ou accès refusé</h1>
      <p className="mt-4 text-lead text-ink-soft">
        Cette page n&apos;existe pas, ou elle concerne un voyage ou une réservation auquel vous n&apos;avez pas accès. Pour des raisons de confidentialité, nous ne précisons pas lequel des deux.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-forest px-5 font-semibold text-white">
          Retour à l&apos;accueil
        </Link>
        <Link href="/connexion" className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-forest px-5 font-semibold text-forest">
          Se connecter
        </Link>
      </div>
    </div>
  );
}
