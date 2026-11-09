import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AMBIANCES, DESTINATIONS, type Ambiance } from "@/lib/content/destinations";
import { photo } from "@/lib/content/photos";
import { Badge, Breadcrumbs, SectionHeading } from "@/components/ui/misc";

export const metadata: Metadata = {
  title: "Destinations",
  description: "Douze destinations choisies pour préparer un voyage daté : Lisbonne, Rome, Reykjavik, Kyoto, les Lofoten et d'autres, avec saisons et liens vers les sources officielles.",
  alternates: { canonical: "/destinations" },
};

export default async function DestinationsPage({ searchParams }: { searchParams: Promise<{ ambiance?: string }> }) {
  const { ambiance } = await searchParams;
  const active = AMBIANCES.find((a) => a.id === ambiance)?.id as Ambiance | undefined;
  const list = active ? DESTINATIONS.filter((d) => d.ambiances.includes(active)) : DESTINATIONS;
  return (
    <div className="container-page pt-8">
      <Breadcrumbs items={[{ href: "/", label: "Accueil" }, { label: "Destinations" }]} />
      <div className="mt-6">
        <SectionHeading as="h1" eyebrow="Catalogue" title="Destinations" intro="Filtrez par ambiance. Chaque fiche renvoie aux sources officielles pour les informations qui changent (formalités, sécurité, santé)." />
      </div>
      <nav aria-label="Filtrer par ambiance" className="mt-8">
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link href="/destinations" aria-current={!active ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold ${!active ? "border-forest bg-forest text-white" : "border-line bg-white hover:border-forest"}`}>
              Toutes ({DESTINATIONS.length})
            </Link>
          </li>
          {AMBIANCES.map((a) => {
            const count = DESTINATIONS.filter((d) => d.ambiances.includes(a.id)).length;
            const on = active === a.id;
            return (
              <li key={a.id}>
                <Link href={`/destinations?ambiance=${a.id}`} aria-current={on ? "page" : undefined} className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold ${on ? "border-forest bg-forest text-white" : "border-line bg-white hover:border-forest"}`}>
                  {a.label} ({count})
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <p className="sr-only" aria-live="polite">
        {list.length} destinations affichées
      </p>
      <ul className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((d, i) => {
          const p = photo(d.heroPhoto);
          return (
            <li key={d.slug}>
              <Link href={`/destinations/${d.slug}`} className="group block">
                <div className={`media-zoom relative overflow-hidden rounded-[var(--radius-lg)] bg-ivory-deep ${i % 5 === 0 ? "aspect-[4/5]" : "aspect-[4/3]"}`}>
                  <Image src={p.src} alt={p.alt} fill quality={70} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw" className="object-cover" priority={i < 3} />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <p className="font-serif text-2xl">{d.name}</p>
                  {d.demoOffers ? <Badge tone="terracotta">Offres de démonstration</Badge> : null}
                </div>
                <p className="text-sm text-ink-soft">
                  {d.country} · {d.stayType} · {d.duration.min} à {d.duration.max} jours
                </p>
                <p className="mt-2 text-ink-soft">{d.tagline}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
