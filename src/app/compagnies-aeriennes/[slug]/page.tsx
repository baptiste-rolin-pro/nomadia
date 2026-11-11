import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { AIRLINES, getAirline } from "@/lib/content/directory";
import { SOURCES_CHECKED_ON } from "@/lib/content/destinations";
import { formatCivilDate } from "@/lib/dates";
import { Breadcrumbs, Notice } from "@/components/ui/misc";

export function generateStaticParams() {
  return AIRLINES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = getAirline((await params).slug);
  if (!a) return {};
  // Fiche courte : non indexée tant qu'elle n'apporte pas de valeur éditoriale suffisante.
  return { title: `${a.name} (${a.iata})`, description: `${a.name} : codes IATA ${a.iata} et OACI ${a.icao}, pays, site officiel.`, robots: a.indexable ? undefined : { index: false, follow: true } };
}

export default async function AirlinePage({ params }: { params: Promise<{ slug: string }> }) {
  const a = getAirline((await params).slug);
  if (!a) notFound();
  return (
    <div className="container-page max-w-3xl pt-8">
      <Breadcrumbs items={[{ href: "/", label: "Accueil" }, { href: "/compagnies-aeriennes", label: "Compagnies aériennes" }, { label: a.name }]} />
      <div className="mt-6 flex items-center gap-4">
        <span aria-hidden className="flex size-16 items-center justify-center rounded-full bg-forest text-xl font-semibold text-white">
          {a.iata}
        </span>
        <h1 className="font-serif text-title">{a.name}</h1>
      </div>
      <p className="mt-6 text-lead">{a.summary}</p>
      <dl className="mt-6 grid gap-3 rounded-[var(--radius-lg)] border border-line bg-white p-5 text-sm sm:grid-cols-3">
        <div>
          <dt className="font-semibold">Code IATA</dt>
          <dd>{a.iata}</dd>
        </div>
        <div>
          <dt className="font-semibold">Code OACI</dt>
          <dd>{a.icao}</dd>
        </div>
        <div>
          <dt className="font-semibold">Pays</dt>
          <dd>{a.country}</dd>
        </div>
      </dl>
      <p className="mt-6">
        <a href={a.website} target="_blank" rel="noopener" className="inline-flex items-center gap-2 font-semibold text-forest underline underline-offset-4">
          Site officiel <ExternalLink aria-hidden className="size-4" />
        </a>
      </p>
      <Notice className="mt-8" title="Bagages, modification, remboursement">
        Ces règles dépendent du tarif acheté (et parfois de la compagnie qui opère réellement le vol). Consultez toujours les conditions affichées dans le détail de l&apos;offre. Une compagnie peut commercialiser un vol opéré par une autre.
      </Notice>
      <p className="mt-6 text-xs text-ink-soft">Informations générales relevées le {formatCivilDate(SOURCES_CHECKED_ON)}. Aucun partenariat avec Nomadia. Aucune offre de cette compagnie n&apos;est disponible en démonstration.</p>
    </div>
  );
}
