import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { RENTERS, getRenter } from "@/lib/content/directory";
import { Breadcrumbs, Notice } from "@/components/ui/misc";

export function generateStaticParams() {
  return RENTERS.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const r = getRenter((await params).slug);
  if (!r) return {};
  return { title: `${r.name} — loueur de voitures`, description: `${r.name} : informations générales et site officiel.`, robots: r.indexable ? undefined : { index: false, follow: true } };
}

export default async function RenterPage({ params }: { params: Promise<{ slug: string }> }) {
  const r = getRenter((await params).slug);
  if (!r) notFound();
  return (
    <div className="container-page max-w-3xl pt-8">
      <Breadcrumbs items={[{ href: "/", label: "Accueil" }, { href: "/loueurs", label: "Loueurs" }, { label: r.name }]} />
      <h1 className="mt-6 font-serif text-title">{r.name}</h1>
      <p className="mt-4 text-lead">{r.summary}</p>
      <p className="mt-4 text-sm text-ink-soft">{r.countriesNote}</p>
      <p className="mt-6">
        <a href={r.website} target="_blank" rel="noopener" className="inline-flex items-center gap-2 font-semibold text-forest underline underline-offset-4">
          Site officiel <ExternalLink aria-hidden className="size-4" />
        </a>
      </p>
      <Notice className="mt-8" title="Conditions propres à chaque agence">
        Dépôt de garantie, cartes acceptées, franchise, âge minimum et frais de jeune conducteur dépendent de l&apos;offre et de l&apos;agence de retrait. Nomadia les affiche offre par offre lorsqu&apos;ils sont fournis.
      </Notice>
      <p className="mt-6 text-xs text-ink-soft">Aucun partenariat avec Nomadia. Aucune offre de ce loueur n&apos;est disponible en démonstration.</p>
    </div>
  );
}
