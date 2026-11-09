import type { Metadata } from "next";
import { AIRLINES } from "@/lib/content/directory";
import { DEMO_CARRIERS } from "@/lib/providers/demo/flights";
import { Breadcrumbs, Notice, SectionHeading } from "@/components/ui/misc";
import { DirectoryFilter } from "@/components/content/directory-filter";

export const metadata: Metadata = {
  title: "Compagnies aériennes",
  description: "Annuaire des compagnies aériennes : codes IATA et OACI, pays et site officiel. Les conditions de bagages et de remboursement dépendent toujours de l'offre choisie.",
  alternates: { canonical: "/compagnies-aeriennes" },
};

export default function AirlinesPage() {
  return (
    <div className="container-page pt-8">
      <Breadcrumbs items={[{ href: "/", label: "Accueil" }, { label: "Compagnies aériennes" }]} />
      <div className="mt-6">
        <SectionHeading as="h1" eyebrow="Annuaire" title="Compagnies aériennes" intro="Codes utiles et liens officiels. Les règles de bagages, de changement et de remboursement dépendent du tarif sélectionné, jamais du seul nom de la compagnie." />
      </div>
      <Notice className="mt-6" title="Aucun partenariat implicite">
        La présence d&apos;une compagnie dans cet annuaire ne signifie pas qu&apos;elle est partenaire de Nomadia ni qu&apos;elle est réservable ici. Les logos ne sont pas affichés faute de droit d&apos;usage documenté.
      </Notice>
      <div className="mt-8">
        <DirectoryFilter label="Rechercher une compagnie" basePath="/compagnies-aeriennes" items={AIRLINES.map((a) => ({ slug: a.slug, name: a.name, meta: `${a.country} · IATA ${a.iata} · OACI ${a.icao}`, codes: [a.iata, a.icao] }))} />
      </div>
      <section aria-labelledby="demo-carriers" className="mt-12 rounded-[var(--radius-lg)] border border-dashed border-terracotta/50 bg-white p-5">
        <h2 id="demo-carriers" className="font-serif text-2xl">
          Compagnies présentes dans les résultats de démonstration
        </h2>
        <p className="mt-1 text-sm text-ink-soft">Compagnies fictives, utilisées uniquement par le fournisseur de démonstration. Leurs codes ne doivent pas être confondus avec ceux de compagnies réelles.</p>
        <ul className="mt-3 flex flex-wrap gap-3 text-sm">
          {Object.values(DEMO_CARRIERS).map((c) => (
            <li key={c.code} className="rounded-full bg-terracotta-soft px-3 py-1 font-semibold text-terracotta">
              {c.name} ({c.code}, fictive)
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
