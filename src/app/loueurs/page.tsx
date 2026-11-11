import type { Metadata } from "next";
import { RENTERS } from "@/lib/content/directory";
import { DEMO_AGENCIES, DEMO_SUPPLIERS } from "@/lib/providers/demo/cars";
import { Breadcrumbs, Notice, SectionHeading } from "@/components/ui/misc";
import { DirectoryFilter } from "@/components/content/directory-filter";

export const metadata: Metadata = {
  title: "Loueurs de voitures",
  description: "Annuaire des loueurs de voitures avec liens officiels. Cautions, franchises et cartes acceptées dépendent de l'offre et de l'agence.",
  alternates: { canonical: "/loueurs" },
};

export default function RentersPage() {
  return (
    <div className="container-page pt-8">
      <Breadcrumbs items={[{ href: "/", label: "Accueil" }, { label: "Loueurs" }]} />
      <div className="mt-6">
        <SectionHeading as="h1" eyebrow="Annuaire" title="Loueurs de voitures" intro="Liens officiels et informations générales. Les dépôts de garantie, cartes acceptées, franchises et restrictions dépendent de l'offre et de l'agence concernées." />
      </div>
      <Notice className="mt-6" title="Aucun partenariat implicite">
        La présence d&apos;un loueur dans cet annuaire ne signifie pas qu&apos;il est partenaire de Nomadia. Une politique observée dans une agence ne vaut pas pour toutes les agences d&apos;un même réseau.
      </Notice>
      <div className="mt-8">
        <DirectoryFilter label="Rechercher un loueur" basePath="/loueurs" items={RENTERS.map((r) => ({ slug: r.slug, name: r.name, meta: r.summary, codes: [] }))} />
      </div>
      <section aria-labelledby="demo-suppliers" className="mt-12 rounded-[var(--radius-lg)] border border-dashed border-terracotta/50 bg-white p-5">
        <h2 id="demo-suppliers" className="font-serif text-2xl">
          Loueurs présents dans les résultats de démonstration
        </h2>
        <p className="mt-1 text-sm text-ink-soft">Loueurs fictifs du fournisseur de démonstration, avec leurs agences (adresses fictives) :</p>
        <ul className="mt-3 space-y-2 text-sm">
          {Object.values(DEMO_SUPPLIERS).map((s) => (
            <li key={s.id}>
              <strong>{s.name}</strong> — {DEMO_AGENCIES.filter((a) => a.supplierId === s.id).map((a) => a.name.split(" — ")[1] ?? a.name).join(", ")}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
